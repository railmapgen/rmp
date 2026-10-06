import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { utils } from '@railmapgen/svg-assets';
import i18n from '../i18n/config';
import videoWatermarkSVG from '../assets/rmp-video-watermark.svg?raw';
import { EdgeAttributes, GraphAttributes, Id, LineId, NodeAttributes, NodeId, StnId } from '../constants/constants';
import SvgLayer from '../components/svg-layer';
import { SvgRenderProvider } from '../components/svg-render-context';
import { StationType } from '../constants/stations';
import { MiscNodeType } from '../constants/nodes';
import { ImageAttributes } from '../components/svgs/nodes/image';
import {
    getTimelineSettings,
    isElementEntry,
    TimelineDocument,
    TimelineEntry,
    TimelineLabelEntry,
    TimelineLengthUnit,
} from '../constants/timeline';
import { createGeographicLengthProfile } from '../map/geographic-length';
import { DEFAULT_MAP_STYLE, MapStyle } from '../map/map-style';
import { renderMapLayerForExport } from '../map/map-tile-controller';
import { positionMapAttribution } from '../map/map-attribution';
import { loadFont, TextLanguage } from './fonts';
import { changeStationType, checkAndChangeStationIntType } from './change-types';
import { makeRenderReadySVGElement } from './download';
import { calculateCanvasSize } from './helpers';
import { Element as RenderElement, getLines, getNodes } from './process-elements';
import { createVideoTimelinePlayback, VideoCameraFocus } from './video-export-timeline';
import { createVideoExportCanvas } from './video-export-canvas';
import { createVideoFrameWriter, NativeVideoEncodingError, VideoEncodingOptions } from './video-encoder';
import { createVideoLineOverlay, getVideoLineAnnotation } from './video-overlay';
import { getTimelineAudioRange, getTimelineClipRange } from './timeline-playback';
import { imageStoreIndexedDB } from './image-store-indexed-db';
import { isOpenPath } from './path';
import { getOpenPathPrimitives } from './open-path-primitives';
import { getPointAtPrimitiveArcLength, getPrimitiveListLength } from './open-path-length';
import { createVideoFrameScene, VIDEO_FRAME_BASE_VARIANT } from './video-frame-scene';

export const BasicToIntStationTypeMap: Partial<Record<StationType, StationType>> = {
    [StationType.ShmetroInt]: StationType.ShmetroBasic,
    [StationType.GzmtrInt]: StationType.GzmtrBasic,
    [StationType.GzmtrInt2024]: StationType.GzmtrBasic,
    [StationType.BjsubwayInt]: StationType.BjsubwayBasic,
    [StationType.SuzhouRTInt]: StationType.SuzhouRTBasic,
    [StationType.KunmingRTInt]: StationType.KunmingRTBasic,
    [StationType.MRTInt]: StationType.MRTBasic,
    [StationType.TokyoMetroInt]: StationType.TokyoMetroBasic,
    [StationType.ChongqingRTInt]: StationType.ChongqingRTBasic,
    [StationType.ChongqingRTInt2021]: StationType.ChongqingRTBasic2021,
    [StationType.ChengduRTInt]: StationType.ChengduRTBasic,
    [StationType.WuhanRTInt]: StationType.WuhanRTBasic,
    [StationType.CsmetroInt]: StationType.CsmetroBasic,
    [StationType.HzmetroInt]: StationType.HzmetroBasic,
};

export type VideoExportResolution = '720p' | '1080p' | '2k' | '4k';

export const videoExportResolutions: Record<VideoExportResolution, { width: number; height: number }> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '2k': { width: 2560, height: 1440 },
    '4k': { width: 3840, height: 2160 },
} as const;

export interface VideoExportOptions extends VideoEncodingOptions {
    speedMultiplier: number;
    resolution: VideoExportResolution;
    autoChangeStationType: boolean;
    isSystemFontsOnly: boolean;
    hideWatermark: boolean;
    showYear?: boolean;
    showLineName?: boolean;
    showLineLength?: boolean;
    lineLengthUnit?: TimelineLengthUnit;
}

export interface VideoExportEnvironment {
    mapEnabled: boolean;
    mapStyle: MapStyle;
    svgViewBoxMin: { x: number; y: number };
    svgViewBoxZoom: number;
    isSubscriber?: boolean;
    getAudio?: (id: string) => Promise<Blob | undefined>;
    getImage?: (id: string) => Promise<string | undefined>;
}

export interface AnimationStep {
    id: Id;
    kind: 'node' | 'edge';
    reverse: boolean;
}

export interface AnimationSequence {
    steps: AnimationStep[];
    nodes: NodeId[];
    edges: LineId[];
}

// Drawing speed is measured in SVG/map coordinate units per second, regardless of output resolution or zoom.
const BaseDrawingSpeed = 100;
// Encoding and preview frame rates sample the same authored timing and camera path.
const VideoTimelineTimingFps = 30;
export const videoExportSpeedRange = { min: 0.5, max: 2, step: 0.1, default: 1 } as const;
const NodeRevealSeconds = 0.4;
const NodeTextDelaySeconds = 0.05;
const NodeTextRevealSeconds = 0.8;
const CameraRepositionPauseSeconds = 1;
const OverviewSeconds = 1;
const HorizontalGroupingThreshold = 50;
const CameraViewportZoom = 40;
const CameraViewportAspectRatio = 16 / 9;
const CameraViewportBaseHeight = 360;
const StationRevealViewportLookaheadRatio = 0.75;
const CameraFocusSmoothing = 0.14;
const OverviewZoomTransitionRatio = 0.5;
const CameraViewportHeight = (CameraViewportBaseHeight * CameraViewportZoom) / 100;
const CameraViewportWidth = CameraViewportHeight * CameraViewportAspectRatio;
const VideoWatermarkContentWidth = 280;
const VideoWatermarkContentHeight = 110;
const VideoWatermarkDisplayScale = 0.55;
const VideoWatermarkMargin = 20;
const VideoExportStyleId = 'rmp_video_export_styles';
const VideoExportCSS = `
.rmp-name-outline {
    paint-order: stroke;
    stroke: #ffffff;
    stroke-linejoin: round;
}
`;

let videoWatermarkGraphic: SVGSVGElement | undefined;

type CameraFocus = VideoCameraFocus;

const isStationNodeId = (id: Id): id is StnId => id.startsWith('stn_');

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const getVideoExportDimensions = (resolution: VideoExportResolution) => videoExportResolutions[resolution];

const getNodeRevealProgress = (frame: number, startFrame: number, fps: number): number => {
    const revealFrames = Math.max(1, fps * NodeRevealSeconds);
    return clamp01((frame - startFrame) / revealFrames);
};

const getNodeTextRevealProgress = (frame: number, startFrame: number, fps: number): number => {
    const delayFrames = Math.max(1, Math.round(fps * NodeTextDelaySeconds));
    const revealFrames = Math.max(12, Math.round(fps * NodeTextRevealSeconds));
    return clamp01((frame - startFrame - delayFrames) / revealFrames);
};

export const getNodeRevealProgressForFrame = (
    nodeId: NodeId,
    frame: number,
    startFrame: number,
    fps: number
): { nodeProgress: number; textProgress: number } => {
    if (isStationNodeId(nodeId)) {
        const stationProgress = getNodeRevealProgress(frame, startFrame, fps);
        return { nodeProgress: stationProgress, textProgress: stationProgress };
    }

    return {
        nodeProgress: getNodeRevealProgress(frame, startFrame, fps),
        textProgress: getNodeTextRevealProgress(frame, startFrame, fps),
    };
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
    if (edge0 === edge1) return x >= edge1 ? 1 : 0;
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

const sharesEdgeEndpoint = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    previousEdgeId: LineId,
    currentEdgeId: LineId
) => {
    const [previousSource, previousTarget] = graph.extremities(previousEdgeId);
    const [currentSource, currentTarget] = graph.extremities(currentEdgeId);
    return (
        previousSource === currentSource ||
        previousSource === currentTarget ||
        previousTarget === currentSource ||
        previousTarget === currentTarget
    );
};

type PlaybackSegment =
    | { kind: 'step'; step: AnimationStep; duration: number }
    | { kind: 'pause'; previousEdgeId: LineId; duration: number };

export const getPlaybackSegmentDurations = (
    fps: number,
    edgeLengths: number[],
    pauseCount: number,
    speedMultiplier: number = videoExportSpeedRange.default
): { edgeDurations: number[]; pauseDuration: number } => {
    if (edgeLengths.length === 0 || !Number.isFinite(fps) || fps <= 0) {
        return { edgeDurations: [], pauseDuration: 0 };
    }

    const multiplier = Number.isFinite(speedMultiplier)
        ? Math.max(videoExportSpeedRange.min, Math.min(videoExportSpeedRange.max, speedMultiplier))
        : videoExportSpeedRange.default;
    const drawingSpeed = BaseDrawingSpeed * multiplier;
    const minimumEdgeDuration = 1 / fps;
    return {
        edgeDurations: edgeLengths.map(length =>
            Number.isFinite(length) && length > 0
                ? Math.max(minimumEdgeDuration, length / drawingSpeed)
                : minimumEdgeDuration
        ),
        pauseDuration: pauseCount > 0 ? CameraRepositionPauseSeconds : 0,
    };
};

/**
 * Seconds at each insertion cursor for the non-authored (quick) schedule.
 * `validTrackIndices` maps each step of the generated animation sequence back to
 * its index in the visual track so audio clips can be resolved to real times.
 */
const getPlaybackCursorTimes = (
    trackLength: number,
    validTrackIndices: number[],
    playbackSegments: PlaybackSegment[],
    animationDuration: number
): number[] => {
    const cursorTimes = new Array<number>(trackLength + 1).fill(0);
    if (validTrackIndices.length === 0) {
        for (let index = 0; index <= trackLength; index++) {
            cursorTimes[index] = trackLength > 0 ? (index / trackLength) * animationDuration : 0;
        }
        return cursorTimes;
    }

    let cursor = 0;
    let duration = 0;
    let stepIndex = 0;
    for (const segment of playbackSegments) {
        if (segment.kind === 'pause') {
            duration += segment.duration;
            continue;
        }
        const trackIndex = validTrackIndices[stepIndex];
        stepIndex++;
        if (trackIndex === undefined) {
            duration += segment.duration;
            continue;
        }
        while (cursor <= trackIndex) {
            cursorTimes[cursor] = duration;
            cursor++;
        }
        duration += segment.duration;
    }
    while (cursor <= trackLength) {
        cursorTimes[cursor] = duration;
        cursor++;
    }
    return cursorTimes;
};

export const getRenderedEdgeLength = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    edgeId: LineId
): number => {
    const path = elem.getElementById(edgeId)?.querySelector('path');
    if (path) {
        try {
            const renderedLength = path.getTotalLength();
            if (Number.isFinite(renderedLength) && renderedLength > 0) {
                return renderedLength;
            }
        } catch {
            // Fall through to the graph-based distance when an SVG implementation
            // cannot measure detached paths.
        }
    }

    if (!graph.hasEdge(edgeId)) return 0;
    const [source, target] = graph.extremities(edgeId);
    const sourceAttrs = graph.getNodeAttributes(source);
    const targetAttrs = graph.getNodeAttributes(target);
    const fallbackLength = Math.hypot(targetAttrs.x - sourceAttrs.x, targetAttrs.y - sourceAttrs.y);
    return Number.isFinite(fallbackLength) && fallbackLength > 0 ? fallbackLength : 0;
};

const measureRenderedEdgeLengths = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeIds: LineId[],
    isSystemFontsOnly: boolean,
    languages: TextLanguage[],
    renderGeometry = false,
    sourceCanvas?: SVGSVGElement,
    mapEnabled = false,
    isSubscriber = false,
    imageAssets = new Map<string, string>()
): Promise<{ edgeLengths: Map<LineId, number>; geometry: SVGSVGElement }> => {
    const { elem } = await makeRenderReadySVGElement(
        graph,
        mapEnabled,
        true,
        isSystemFontsOnly,
        languages,
        false,
        2,
        renderGeometry
            ? clone => renderVideoFrameGeometry(graph, clone, mapEnabled, isSubscriber, imageAssets)
            : undefined,
        sourceCanvas
    );
    const edgeLengths = new Map<LineId, number>();

    try {
        edgeIds.forEach(edgeId => {
            edgeLengths.set(edgeId, getRenderedEdgeLength(graph, elem, edgeId));
        });
    } finally {
        elem.remove();
    }

    return { edgeLengths, geometry: elem };
};

const buildTimelineSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineEntry[]
): AnimationSequence => {
    // Resolve traversal from entrance order. Authored playback applies exits and
    // keyframes separately, without treating them as extra line entrances.
    const validTimeline = timeline
        .filter(isElementEntry)
        .filter(
            entry =>
                entry.phase === 'enter' &&
                (entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId))
        );
    const edgeDirections: Array<boolean | undefined> = Array(validTimeline.length).fill(undefined);

    const getEdgeExtremities = (index: number): [NodeId, NodeId] => {
        const entry = validTimeline[index];
        return graph.extremities(entry.refId) as [NodeId, NodeId];
    };
    const getDirectionStartingAt = (index: number, nodeId: NodeId): boolean | undefined => {
        const [source, target] = getEdgeExtremities(index);
        if (nodeId === source) return false;
        if (nodeId === target) return true;
        return undefined;
    };
    const getDirectionEndingAt = (index: number, nodeId: NodeId): boolean | undefined => {
        const [source, target] = getEdgeExtremities(index);
        if (nodeId === target) return false;
        if (nodeId === source) return true;
        return undefined;
    };
    const getResolvedEdgeStart = (index: number): NodeId | undefined => {
        const direction = edgeDirections[index];
        if (direction === undefined) return undefined;
        const [source, target] = getEdgeExtremities(index);
        return direction ? target : source;
    };
    const getResolvedEdgeEnd = (index: number): NodeId | undefined => {
        const direction = edgeDirections[index];
        if (direction === undefined) return undefined;
        const [source, target] = getEdgeExtremities(index);
        return direction ? source : target;
    };

    // Adjacent stations are the strongest signal. The previous station wins
    // when both sides provide conflicting traversal information.
    validTimeline.forEach((entry, index) => {
        if (entry.kind !== 'edge') return;

        const previousEntry = validTimeline[index - 1];
        const nextEntry = validTimeline[index + 1];
        if (previousEntry?.kind === 'node') {
            edgeDirections[index] = getDirectionStartingAt(index, previousEntry.refId);
        }
        if (edgeDirections[index] === undefined && nextEntry?.kind === 'node') {
            edgeDirections[index] = getDirectionEndingAt(index, nextEntry.refId);
        }
    });

    // Carry a known arrival point into a directly following line. A station
    // entry, including an unrelated one, deliberately breaks this propagation.
    validTimeline.forEach((entry, index) => {
        if (entry.kind !== 'edge' || edgeDirections[index] !== undefined) return;
        if (validTimeline[index - 1]?.kind !== 'edge') return;

        const previousEnd = getResolvedEdgeEnd(index - 1);
        if (previousEnd !== undefined) {
            edgeDirections[index] = getDirectionStartingAt(index, previousEnd);
        }
    });

    // Resolve the same continuity from the other end when only a later line is
    // anchored by a station.
    for (let index = validTimeline.length - 1; index >= 0; index--) {
        const entry = validTimeline[index];
        if (entry.kind !== 'edge' || edgeDirections[index] !== undefined) continue;
        if (validTimeline[index + 1]?.kind !== 'edge') continue;

        const nextStart = getResolvedEdgeStart(index + 1);
        if (nextStart !== undefined) {
            edgeDirections[index] = getDirectionEndingAt(index, nextStart);
        }
    }

    // Unanchored runs start in graph source → target order, after which their
    // directly connected lines can still follow that arrival point.
    validTimeline.forEach((entry, index) => {
        if (entry.kind !== 'edge' || edgeDirections[index] !== undefined) return;

        if (validTimeline[index - 1]?.kind === 'edge') {
            const previousEnd = getResolvedEdgeEnd(index - 1);
            if (previousEnd !== undefined) {
                edgeDirections[index] = getDirectionStartingAt(index, previousEnd);
            }
        }
        edgeDirections[index] ??= false;
    });

    const steps: AnimationStep[] = [];
    const nodes: NodeId[] = [];
    const edges: LineId[] = [];
    const seenNodes = new Set<NodeId>();
    const seenEdges = new Set<LineId>();

    for (const [index, entry] of validTimeline.entries()) {
        if (entry.kind === 'node') {
            steps.push({ id: entry.refId, kind: 'node', reverse: false });
            if (!seenNodes.has(entry.refId)) {
                seenNodes.add(entry.refId);
                nodes.push(entry.refId);
            }
            continue;
        }

        steps.push({ id: entry.refId, kind: 'edge', reverse: edgeDirections[index] ?? false });
        if (!seenEdges.has(entry.refId)) {
            seenEdges.add(entry.refId);
            edges.push(entry.refId);
        }
    }

    return { steps, nodes, edges };
};

export const getOverviewZoom = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): number => {
    const bounds = calculateCanvasSize(graph);
    const graphWidth = Math.max(bounds.xMax - bounds.xMin, 1);
    const graphHeight = Math.max(bounds.yMax - bounds.yMin, 1);
    const fitWidthZoom = (CameraViewportWidth / (graphWidth * 1.12)) * 100;
    const fitHeightZoom = (CameraViewportHeight / (graphHeight * 1.12)) * 100;
    return Math.min(fitWidthZoom, fitHeightZoom);
};

export const interpolateCameraZoom = (currentZoom: number, overviewZoom: number, progress: number): number => {
    const transitionProgress = smoothstep(0, 1, progress);
    return currentZoom + (overviewZoom - currentZoom) * transitionProgress;
};

export const getOverviewZoomProgress = (overviewFrame: number, overviewFrames: number): number => {
    const transitionFrames = Math.max(1, Math.ceil(overviewFrames * OverviewZoomTransitionRatio));
    if (transitionFrames === 1) return 1;
    return clamp01(overviewFrame / (transitionFrames - 1));
};

export const getVideoWatermarkLayout = (
    viewBox: { x: number; y: number; width: number; height: number },
    outputWidth: number,
    outputHeight: number
) => {
    const worldUnitsPerPixel = viewBox.width / outputWidth;
    const resolutionScale = outputHeight / videoExportResolutions['720p'].height;
    const scale = worldUnitsPerPixel * resolutionScale * VideoWatermarkDisplayScale;
    const width = VideoWatermarkContentWidth * scale;
    const height = VideoWatermarkContentHeight * scale;
    const margin = VideoWatermarkMargin * resolutionScale * worldUnitsPerPixel;

    return {
        x: viewBox.x + viewBox.width - width - margin,
        y: viewBox.y + margin,
        width,
        height,
        scale,
    };
};

const createVideoWatermarkElement = (
    viewBox: { x: number; y: number; width: number; height: number },
    outputWidth: number,
    outputHeight: number
) => {
    const watermark = getVideoWatermarkLayout(viewBox, outputWidth, outputHeight);

    const info = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    info.setAttribute('id', 'rmp_info');
    info.setAttribute('aria-label', 'RMP watermark');
    info.setAttribute('opacity', '0.72');
    info.setAttribute('transform', `translate(${watermark.x}, ${watermark.y}) scale(${watermark.scale})`);

    if (!videoWatermarkGraphic) {
        videoWatermarkGraphic = new DOMParser().parseFromString(videoWatermarkSVG, 'image/svg+xml')
            .documentElement as unknown as SVGSVGElement;
    }
    Array.from(videoWatermarkGraphic.children).forEach(child => info.appendChild(document.importNode(child, true)));

    return info;
};

const buildFallbackSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): AnimationSequence => {
    const nodePositions: Array<{ id: NodeId; x: number; y: number }> = [];
    graph.forEachNode((node, attr) => {
        nodePositions.push({ id: node as NodeId, x: attr.x, y: attr.y });
    });

    nodePositions.sort((a, b) => {
        if (Math.abs(a.x - b.x) > HorizontalGroupingThreshold) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    const nodes = nodePositions.map(node => node.id);
    const edgeList: Array<{ id: LineId; sourceIndex: number; targetIndex: number }> = [];
    graph.forEachEdge((edge, _attr, source, target) => {
        edgeList.push({
            id: edge as LineId,
            sourceIndex: nodes.indexOf(source as NodeId),
            targetIndex: nodes.indexOf(target as NodeId),
        });
    });

    edgeList.sort((a, b) => Math.max(a.sourceIndex, a.targetIndex) - Math.max(b.sourceIndex, b.targetIndex));

    const edges = edgeList.map(edge => edge.id);
    const steps: AnimationStep[] = [
        ...nodes.map(id => ({ id, kind: 'node' as const, reverse: false })),
        ...edges.map(id => ({ id, kind: 'edge' as const, reverse: false })),
    ];

    return { steps, nodes, edges };
};

export const getCameraViewBox = (center: { x: number; y: number }, zoom: number) => {
    const zoomFactor = Math.max(zoom, 1) / 100;
    const viewportWidth = CameraViewportWidth / zoomFactor;
    const viewportHeight = CameraViewportHeight / zoomFactor;

    return {
        x: center.x - viewportWidth / 2,
        y: center.y - viewportHeight / 2,
        width: viewportWidth,
        height: viewportHeight,
    };
};

export const getStationActivationProgress = (edgeLength: number, zoom: number): number => {
    if (!Number.isFinite(edgeLength) || edgeLength <= 0) return 1;

    const viewport = getCameraViewBox({ x: 0, y: 0 }, zoom);
    const revealDistance = Math.min(viewport.width, viewport.height) * StationRevealViewportLookaheadRatio;
    return clamp01(1 - revealDistance / edgeLength);
};

export const generateAnimationSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineDocument
): AnimationSequence => {
    if (timeline.track.length > 0) {
        const sequence = buildTimelineSequence(graph, timeline.track);
        if (sequence.steps.length > 0) {
            return sequence;
        }
    }
    return buildFallbackSequence(graph);
};

export const createFrameStationGraph = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleEdges: Set<LineId>,
    autoChangeStationType = true
): MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> => {
    const analysisGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    analysisGraph.import(structuredClone(graph.export()));

    if (!autoChangeStationType) {
        return analysisGraph;
    }

    const edgesToRemove: LineId[] = [];
    analysisGraph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        if (!visibleEdges.has(edgeId)) {
            edgesToRemove.push(edgeId);
        }
    });
    edgesToRemove.forEach(edgeId => analysisGraph.dropEdge(edgeId));

    analysisGraph.forEachNode(node => {
        const nodeId = node as Id;
        if (!isStationNodeId(nodeId)) return;

        if (graph.directedEdges(nodeId).every(edgeId => !visibleEdges.has(edgeId as LineId))) {
            const basicType = BasicToIntStationTypeMap[analysisGraph.getNodeAttribute(nodeId, 'type') as StationType];
            if (basicType) {
                changeStationType(analysisGraph, nodeId, basicType);
            }
            return;
        }

        checkAndChangeStationIntType(analysisGraph, nodeId);
    });

    return analysisGraph;
};

export const embedVideoExportStyles = (elem: SVGSVGElement) => {
    if (elem.getElementById(VideoExportStyleId)) return;

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.id = VideoExportStyleId;
    style.textContent = VideoExportCSS;
    elem.prepend(style);
};

/** Rebuild the detached graph layer before export cleanup embeds fonts and facility symbols. */
export const renderVideoFrameGeometry = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    mapEnabled = false,
    isSubscriber = false,
    imageAssets = new Map<string, string>()
) => {
    let layer = elem.querySelector<SVGGElement>('[data-editor-layer]');
    if (!layer) {
        layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('data-editor-layer', '');
        elem.appendChild(layer);
    }
    layer.removeAttribute('display');
    layer.innerHTML = renderVideoElementsGeometry(
        graph,
        [...getLines(graph, { showReconcileWarnings: false }), ...getNodes(graph)],
        mapEnabled,
        isSubscriber
    );
    graph.forEachNode((node, attrs) => {
        if (attrs.type !== MiscNodeType.Image) return;
        const imageAttrs = attrs[MiscNodeType.Image] as ImageAttributes | undefined;
        const href = imageAttrs?.href && imageAssets.get(imageAttrs.href);
        const group = elem.getElementById(node);
        if (!href || !group || !imageAttrs) return;
        const imageGroup = document.createElementNS(elem.namespaceURI, 'g');
        imageGroup.setAttribute(
            'transform',
            'rotate(' + (imageAttrs.rotate ?? 0) + ') scale(' + (imageAttrs.scale ?? 1) + ')'
        );
        const image = document.createElementNS(elem.namespaceURI, 'image');
        image.setAttribute('href', href);
        image.setAttribute('opacity', String(imageAttrs.opacity ?? 1));
        imageGroup.append(image);
        group.append(imageGroup);
    });
};

/** Render only elements whose geometry or station appearance has changed. */
const renderVideoElementsGeometry = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elements: RenderElement[],
    mapEnabled: boolean,
    isSubscriber: boolean
) =>
    renderToStaticMarkup(
        React.createElement(
            I18nextProvider,
            { i18n },
            React.createElement(
                SvgRenderProvider,
                {
                    value: {
                        graph,
                        graphRefresh: graph,
                        imageRefresh: graph,
                        getImage: async () => undefined,
                        ensureFont: language => void loadFont(language),
                    },
                },
                React.createElement(
                    utils.SvgAssetsContextProvider,
                    null,
                    React.createElement(SvgLayer, {
                        elements,
                        selected: new Set<Id>(),
                        mapEnabled,
                        isSubscriber,
                        handlePointerDown: () => {},
                        handlePointerMove: () => {},
                        handlePointerUp: () => {},
                        handleEdgePointerDown: () => {},
                        handleEdgeDoubleClick: () => {},
                    })
                )
            )
        )
    );

const renderSVGToCanvas = async (
    svgElem: SVGSVGElement,
    canvas: HTMLCanvasElement,
    isTransparent: boolean,
    bgColor: string
): Promise<void> => {
    const { width, height } = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create video canvas');
    ctx.clearRect(0, 0, width, height);
    if (!isTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }

    const svgString = svgElem.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
    const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                ctx.drawImage(img, 0, 0, width, height);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = () => reject(new Error('Could not render video SVG'));
        img.src = src;
    });
};

export const exportVideo = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineDocument,
    languages: TextLanguage[],
    options: VideoExportOptions,
    bgColor: string,
    onProgress?: (progress: number) => void,
    environment: VideoExportEnvironment = {
        mapEnabled: false,
        mapStyle: DEFAULT_MAP_STYLE,
        svgViewBoxMin: { x: 0, y: 0 },
        svgViewBoxZoom: 100,
    }
): Promise<Blob> => {
    const { mapEnabled, mapStyle, svgViewBoxMin, svgViewBoxZoom } = environment;
    const source = createVideoExportCanvas(
        mapEnabled,
        mapStyle,
        { ...svgViewBoxMin, zoom: svgViewBoxZoom },
        getVideoExportDimensions(options.resolution),
        false
    );
    try {
        const audioClips: { blob: Blob; entry: NonNullable<TimelineDocument['audioTrack']>[number] }[] = [];
        for (const entry of timeline.audioTrack ?? []) {
            const blob = await environment.getAudio?.(entry.blobId);
            if (!blob) throw new Error(`Audio asset is missing: ${entry.blobId}`);
            audioClips.push({ blob, entry });
        }
        try {
            return await renderVideo(
                graph,
                timeline,
                languages,
                options,
                bgColor,
                source,
                onProgress,
                false,
                audioClips,
                environment
            );
        } catch (error) {
            if (!(error instanceof NativeVideoEncodingError)) throw error;
            console.warn('Browser video encoding failed; retrying with software encoding.', error);
            onProgress?.(0);
            return await renderVideo(
                graph,
                timeline,
                languages,
                options,
                bgColor,
                source,
                onProgress,
                true,
                audioClips,
                environment
            );
        }
    } finally {
        source.dispose();
    }
};

const DefaultVideoEnvironment: VideoExportEnvironment = {
    mapEnabled: false,
    mapStyle: DEFAULT_MAP_STYLE,
    svgViewBoxMin: { x: 0, y: 0 },
    svgViewBoxZoom: 100,
};

const createPreparedVideoRenderer = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineDocument,
    languages: TextLanguage[],
    options: VideoExportOptions,
    source: ReturnType<typeof createVideoExportCanvas>,
    environment: VideoExportEnvironment
) => {
    const { fps, speedMultiplier, resolution, autoChangeStationType, isSystemFontsOnly, hideWatermark } = {
        ...options,
        ...timeline.settings,
    };
    const { cameraZoom } = getTimelineSettings(timeline);
    const {
        showYear = false,
        showLineName = false,
        showLineLength: showLength = false,
        lineLengthUnit: lengthUnit = 'km',
    } = { ...options, ...timeline.settings };
    const lineLengthUnit = lengthUnit === 'mi' ? 'mi' : 'km';
    const showLineLength = environment.mapEnabled && showLength;
    const imageAssets = new Map<string, string>();
    const imageIds = new Set<string>();
    graph.forEachNode((_node, attrs) => {
        if (attrs.type === MiscNodeType.Image) {
            const href = (attrs[MiscNodeType.Image] as ImageAttributes | undefined)?.href;
            if (href) imageIds.add(href);
        }
    });
    await Promise.all(
        [...imageIds].map(async id => {
            const asset = await (environment.getImage ?? (id => imageStoreIndexedDB.get(id)))(id);
            if (asset) imageAssets.set(id, asset);
        })
    );
    const usesAuthoredPlayback = timeline.track.some(
        entry =>
            entry.kind === 'keyframe' ||
            entry.kind === 'pause' ||
            (isElementEntry(entry) && entry.phase === 'exit') ||
            (isElementEntry(entry) && entry.showAnimation === false)
    );
    const renderGeometry = usesAuthoredPlayback || source.renderGeometry || showLineLength;
    if (renderGeometry) {
        // Keep the editor graph untouched, and render each authored line independently so
        // one reconciled segment can enter/exit without affecting the rest of its group.
        graph = graph.copy();
        graph.forEachEdge(edge => graph.setEdgeAttribute(edge, 'reconcileId', ''));
    }
    const sequence = generateAnimationSequence(graph, timeline);
    const { width: outputWidth, height: outputHeight } = getVideoExportDimensions(resolution);

    if (sequence.steps.length === 0) {
        throw new Error('No timeline steps to animate');
    }

    const fitToElementsZoom = getOverviewZoom(graph);
    const currentZoom = fitToElementsZoom * cameraZoom;
    const fullscreenZoom = fitToElementsZoom;
    const playbackSegments: PlaybackSegment[] = [];
    let previousEdgeForPause: LineId | undefined;
    sequence.steps.forEach(step => {
        if (step.kind === 'edge') {
            const edgeId = step.id as LineId;
            if (previousEdgeForPause && !sharesEdgeEndpoint(graph, previousEdgeForPause, edgeId)) {
                playbackSegments.push({
                    kind: 'pause',
                    previousEdgeId: previousEdgeForPause,
                    duration: 0,
                });
            }
            playbackSegments.push({ kind: 'step', step, duration: 0 });
            previousEdgeForPause = edgeId;
            return;
        }

        playbackSegments.push({ kind: 'step', step, duration: 0 });
    });
    const { edgeLengths: measuredEdgeLengths, geometry } = await measureRenderedEdgeLengths(
        graph,
        sequence.edges,
        isSystemFontsOnly,
        languages,
        renderGeometry,
        source.canvas,
        environment.mapEnabled,
        !!environment.isSubscriber,
        imageAssets
    );
    const multiplier = Number.isFinite(speedMultiplier)
        ? Math.max(videoExportSpeedRange.min, Math.min(videoExportSpeedRange.max, speedMultiplier))
        : videoExportSpeedRange.default;
    const authoredPlayback = usesAuthoredPlayback
        ? createVideoTimelinePlayback(
              graph,
              timeline,
              measuredEdgeLengths,
              new Map(
                  sequence.steps.filter(step => step.kind === 'edge').map(step => [step.id as LineId, step.reverse])
              ),
              {
                  fps: VideoTimelineTimingFps,
                  drawingSpeed: BaseDrawingSpeed * multiplier,
                  nodeSeconds: NodeRevealSeconds / multiplier,
              }
          )
        : undefined;
    const playbackEdgeLengths: number[] = [];
    playbackSegments.forEach(segment => {
        if (segment.kind === 'step' && segment.step.kind === 'edge') {
            playbackEdgeLengths.push(measuredEdgeLengths.get(segment.step.id as LineId) ?? 0);
        }
    });
    const pauseSegmentCount = playbackSegments.filter(segment => segment.kind === 'pause').length;
    const { edgeDurations, pauseDuration } = getPlaybackSegmentDurations(
        VideoTimelineTimingFps,
        playbackEdgeLengths,
        pauseSegmentCount,
        speedMultiplier
    );
    let edgeDurationIndex = 0;
    playbackSegments.forEach(segment => {
        if (segment.kind === 'pause') {
            segment.duration = pauseDuration;
        } else if (segment.step.kind === 'edge') {
            segment.duration = edgeDurations[edgeDurationIndex] ?? 0;
            edgeDurationIndex++;
        }
    });
    const animationDuration = Math.max(
        authoredPlayback?.duration ?? playbackSegments.reduce<number>((sum, segment) => sum + segment.duration, 0),
        1
    );
    // Include the endpoint frame, and leave at least one second for node-only timelines to reveal their labels.
    const animationFrames = Math.ceil(animationDuration * fps) + 1;
    const overviewFrames = Math.max(1, Math.round(OverviewSeconds * fps));
    const totalFrames = animationFrames + overviewFrames;
    // Resolve each audio clip's cursor slots into real video seconds. The last cursor is
    // stretched to the end of the overview so music aimed at the timeline end covers it.
    const validTrackIndices: number[] = [];
    timeline.track.forEach((entry, index) => {
        if (!isElementEntry(entry) || entry.phase !== 'enter') return;
        const isValid = entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId);
        if (isValid) validTrackIndices.push(index);
    });
    const cursorTimes = authoredPlayback
        ? [...authoredPlayback.cursorTimes]
        : getPlaybackCursorTimes(timeline.track.length, validTrackIndices, playbackSegments, animationDuration);
    if (cursorTimes.length > 0) cursorTimes[cursorTimes.length - 1] = totalFrames / fps;

    const cumulativeWeights: number[] = [];
    let runningWeight = 0;
    for (const segment of playbackSegments) {
        cumulativeWeights.push(runningWeight);
        runningWeight += segment.duration;
    }
    const allNodes = new Set<NodeId>();
    const allEdges = new Set<LineId>();
    graph.forEachNode(node => allNodes.add(node as NodeId));
    graph.forEachEdge(edge => allEdges.add(edge as LineId));
    const computeFrame = (frame: number) => {
        let visibleNodes = new Set<NodeId>();
        let visibleEdges = new Set<LineId>();
        let nodeProgress = new Map<NodeId, number>();
        let textProgress = new Map<NodeId, number>();
        let edgeProgress = new Map<LineId, number>();
        let edgeDirections = new Map<LineId, boolean>();
        let focus: CameraFocus = { kind: 'none' };
        let nextZoom = currentZoom;
        let frameGraph = graph;

        if (authoredPlayback) {
            const state = authoredPlayback.frameAt(Math.min(frame / fps, animationDuration));
            ({ visibleNodes, visibleEdges, nodeProgress, edgeProgress, edgeDirections } = state);
            textProgress = nodeProgress;
            focus = state.focus;
            if (
                [...state.positions].some(([id, position]) => {
                    const original = graph.getNodeAttributes(id);
                    return original.x !== position.x || original.y !== position.y;
                })
            ) {
                frameGraph = graph.copy();
                state.positions.forEach((position, nodeId) => frameGraph.mergeNodeAttributes(nodeId, position));
            }
            if (frame >= animationFrames) {
                focus = { kind: 'none' };
                const finalFullscreenZoom = getOverviewZoom(frameGraph);
                nextZoom = interpolateCameraZoom(
                    currentZoom,
                    finalFullscreenZoom,
                    getOverviewZoomProgress(frame - animationFrames, overviewFrames)
                );
            }
        } else if (frame < animationFrames) {
            const weightedProgress = Math.min(frame / fps, animationDuration);
            let lastEdgeStartWeight = 0;
            let lastEdgeWeight = 0;
            let lastEdgeStep: AnimationStep | undefined;

            playbackSegments.forEach((segment, index) => {
                const startWeight = cumulativeWeights[index];
                const weight = segment.duration;
                const endWeight = startWeight + weight;

                if (segment.kind === 'step' && segment.step.kind === 'edge') {
                    lastEdgeStartWeight = startWeight;
                    lastEdgeWeight = weight;
                    lastEdgeStep = segment.step;
                }

                if (weightedProgress < startWeight) return;

                if (segment.kind === 'pause') {
                    const previousEdgeId = segment.previousEdgeId;
                    visibleEdges.add(previousEdgeId);
                    const previousEdgeReverse = edgeDirections.get(previousEdgeId) ?? false;
                    edgeDirections.set(previousEdgeId, previousEdgeReverse);
                    edgeProgress.set(previousEdgeId, 1);
                    focus = {
                        kind: 'edge',
                        id: previousEdgeId,
                        progress: 1,
                        reverse: previousEdgeReverse,
                    };
                    return;
                }

                const step = segment.step;

                if (step.kind === 'node') {
                    const nodeId = step.id as NodeId;
                    let activationProgress = 1;
                    if (isStationNodeId(nodeId) && lastEdgeStep && graph.hasEdge(lastEdgeStep.id)) {
                        const edgeId = lastEdgeStep.id as LineId;
                        const [source, target] = graph.extremities(edgeId);
                        const arrivalNode = lastEdgeStep.reverse ? source : target;
                        if (nodeId === arrivalNode) {
                            activationProgress = getStationActivationProgress(
                                measuredEdgeLengths.get(edgeId) ?? 0,
                                currentZoom
                            );
                        }
                    }
                    const activationWeight =
                        index === 0 || lastEdgeWeight === 0
                            ? 0
                            : lastEdgeStartWeight + lastEdgeWeight * activationProgress;
                    if (weightedProgress >= activationWeight) {
                        visibleNodes.add(nodeId);
                        const nodeStartFrame = Math.ceil(Math.max(activationWeight, startWeight) * fps);
                        const revealProgress = getNodeRevealProgressForFrame(nodeId, frame, nodeStartFrame, fps);
                        nodeProgress.set(nodeId, revealProgress.nodeProgress);
                        textProgress.set(nodeId, revealProgress.textProgress);
                        if (weightedProgress >= lastEdgeStartWeight + lastEdgeWeight) {
                            focus = { kind: 'node', id: nodeId };
                        }
                    }
                    return;
                }

                const edgeId = step.id as LineId;

                visibleEdges.add(edgeId);
                edgeDirections.set(edgeId, step.reverse);
                if (weightedProgress >= endWeight) {
                    edgeProgress.set(edgeId, 1);
                    focus = {
                        kind: 'edge',
                        id: edgeId,
                        progress: 1,
                        reverse: edgeDirections.get(edgeId) ?? false,
                    };
                    return;
                }

                const progress = Math.max(0, Math.min(1, (weightedProgress - startWeight) / Math.max(weight, 1e-6)));
                edgeProgress.set(edgeId, progress);
                focus = {
                    kind: 'edge',
                    id: edgeId,
                    progress,
                    reverse: edgeDirections.get(edgeId) ?? false,
                };
            });
        } else {
            const overviewProgress = getOverviewZoomProgress(frame - animationFrames, overviewFrames);
            nextZoom = interpolateCameraZoom(currentZoom, fullscreenZoom, overviewProgress);
            allNodes.forEach(nodeId => {
                visibleNodes.add(nodeId);
                nodeProgress.set(nodeId, 1);
                textProgress.set(nodeId, 1);
            });
            allEdges.forEach(edgeId => {
                visibleEdges.add(edgeId);
                edgeDirections.set(edgeId, false);
                edgeProgress.set(edgeId, 1);
            });
        }
        if (cameraZoom === 1) nextZoom = getOverviewZoom(frameGraph);
        return {
            frameGraph,
            visibleNodes,
            visibleEdges,
            nodeProgress,
            textProgress,
            edgeProgress,
            edgeDirections,
            focus,
            nextZoom,
        };
    };

    // A tiny frame cache reuses current/previous states without retaining a graph for every video frame.
    const frameStates = new Map<number, ReturnType<typeof computeFrame>>();
    const frameAt = (frame: number) => {
        let state = frameStates.get(frame);
        if (!state) {
            state = computeFrame(frame);
            frameStates.set(frame, state);
            if (frameStates.size > 3) frameStates.delete(frameStates.keys().next().value!);
        }
        return state;
    };
    const movingNodes = new Set<NodeId>(
        timeline.track.filter(entry => entry.kind === 'keyframe').map(entry => entry.refId)
    );
    const cameraGraph = movingNodes.size ? graph.copy() : graph;
    let cameraLines: Map<Id, RenderElement> | undefined;
    const updateCameraGraph = (time: number) => {
        let changed = false;
        for (const id of movingNodes) {
            if (!graph.hasNode(id) || !authoredPlayback) continue;
            const position = authoredPlayback.positionAt(id, time);
            const current = cameraGraph.getNodeAttributes(id);
            if (current.x !== position.x || current.y !== position.y) {
                cameraGraph.mergeNodeAttributes(id, position);
                changed = true;
            }
        }
        if (changed) cameraLines = undefined;
    };
    updateCameraGraph(animationDuration);
    const finalBounds = calculateCanvasSize(cameraGraph);
    const overviewCenter = {
        x: (finalBounds.xMin + finalBounds.xMax) / 2,
        y: (finalBounds.yMin + finalBounds.yMax) / 2,
    };
    const finalFullscreenZoom = getOverviewZoom(cameraGraph);
    const baseBounds = calculateCanvasSize(graph);
    const baseCenter = { x: (baseBounds.xMin + baseBounds.xMax) / 2, y: (baseBounds.yMin + baseBounds.yMax) / 2 };
    const originalPaths = new Map<LineId, { path: SVGPathElement; length: number }>();
    for (const id of allEdges) {
        const path = geometry.getElementById(id)?.querySelector('path');
        if (!path) continue;
        // Preserve original geometry even when a keyframe patches the live scene's d attribute.
        const clone = path.cloneNode(true) as SVGPathElement;
        if (Object.hasOwn(path, 'getPointAtLength')) clone.getPointAtLength = path.getPointAtLength.bind(path);
        originalPaths.set(id, { path: clone, length: measuredEdgeLengths.get(id) ?? 0 });
    }
    const segmentFocus: CameraFocus[] = [];
    const directions = new Map<LineId, boolean>();
    for (const segment of playbackSegments) {
        if (segment.kind === 'pause') {
            segmentFocus.push({
                kind: 'edge',
                id: segment.previousEdgeId,
                progress: 1,
                reverse: directions.get(segment.previousEdgeId) ?? false,
            });
        } else if (segment.step.kind === 'node') {
            segmentFocus.push({ kind: 'node', id: segment.step.id as NodeId });
        } else {
            const id = segment.step.id as LineId;
            directions.set(id, segment.step.reverse);
            segmentFocus.push({ kind: 'edge', id, progress: 1, reverse: segment.step.reverse });
        }
    }
    const lastStartedIndex = (starts: number[], time: number) => {
        let low = 0,
            high = starts.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (starts[middle] <= time) low = middle + 1;
            else high = middle;
        }
        return low - 1;
    };
    const cameraFocusAt = (frame: number): CameraFocus => {
        if (frame >= Math.ceil(animationDuration * VideoTimelineTimingFps) + 1) return { kind: 'none' };
        const time = Math.min(frame / VideoTimelineTimingFps, animationDuration);
        if (authoredPlayback) return authoredPlayback.cameraFocusAt(time);
        const index = lastStartedIndex(cumulativeWeights, time);
        const focus = segmentFocus[index] ?? { kind: 'none' };
        const segment = playbackSegments[index];
        return focus.kind === 'edge' && segment?.kind === 'step'
            ? { ...focus, progress: clamp01((time - cumulativeWeights[index]) / Math.max(segment.duration, 1e-6)) }
            : focus;
    };
    // Camera-only queries avoid generating visibility maps and copying the graph for skipped frames.
    const centers: { x: number; y: number }[] = [];
    const cameraTargetAt = (frame: number) => {
        if (frame >= Math.ceil(animationDuration * VideoTimelineTimingFps) + 1) return overviewCenter;
        const time = Math.min(frame / VideoTimelineTimingFps, animationDuration);
        const focus = cameraFocusAt(frame);
        updateCameraGraph(time);
        if (focus.kind === 'node') {
            const attrs = cameraGraph.getNodeAttributes(focus.id);
            return { x: attrs.x, y: attrs.y };
        }
        if (focus.kind === 'edge') {
            const [sourceId, targetId] = graph.extremities(focus.id);
            const sourcePosition = cameraGraph.getNodeAttributes(sourceId);
            const targetPosition = cameraGraph.getNodeAttributes(targetId);
            const originalSource = graph.getNodeAttributes(sourceId);
            const originalTarget = graph.getNodeAttributes(targetId);
            const ratio = focus.reverse ? 1 - focus.progress : focus.progress;
            if (
                sourcePosition.x !== originalSource.x ||
                sourcePosition.y !== originalSource.y ||
                targetPosition.x !== originalTarget.x ||
                targetPosition.y !== originalTarget.y
            ) {
                cameraLines ??= new Map(
                    getLines(cameraGraph, { showReconcileWarnings: false }).map(line => [line.id, line])
                );
                const path = cameraLines.get(focus.id)?.line?.path;
                if (path && isOpenPath(path)) {
                    const primitives = getOpenPathPrimitives(path);
                    if (primitives.length)
                        return getPointAtPrimitiveArcLength(primitives, getPrimitiveListLength(primitives) * ratio);
                }
            }
            const original = originalPaths.get(focus.id);
            if (original) {
                try {
                    const point = original.path.getPointAtLength(original.length * ratio);
                    return {
                        x:
                            point.x +
                            (sourcePosition.x - originalSource.x) * (1 - ratio) +
                            (targetPosition.x - originalTarget.x) * ratio,
                        y:
                            point.y +
                            (sourcePosition.y - originalSource.y) * (1 - ratio) +
                            (targetPosition.y - originalTarget.y) * ratio,
                    };
                } catch {
                    /* Non-browser renderers use the endpoint interpolation below. */
                }
            }
            return {
                x: sourcePosition.x + (targetPosition.x - sourcePosition.x) * ratio,
                y: sourcePosition.y + (targetPosition.y - sourcePosition.y) * ratio,
            };
        }
        if (!movingNodes.size) return baseCenter;
        const bounds = calculateCanvasSize(cameraGraph);
        return { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 };
    };
    const prepareCameraCenters = (frame: number) => {
        for (let index = centers.length; index <= frame; index++) {
            const target = cameraTargetAt(index);
            const previous = centers[index - 1];
            centers.push(
                previous
                    ? {
                          x: previous.x + (target.x - previous.x) * CameraFocusSmoothing,
                          y: previous.y + (target.y - previous.y) * CameraFocusSmoothing,
                      }
                    : target
            );
        }
    };
    const cameraCenterAt = (frame: number) => {
        if (frame === totalFrames - 1) return overviewCenter;
        if (cameraZoom === 1) {
            const frameGraph = frameAt(frame).frameGraph;
            const bounds = frameGraph === graph ? baseBounds : calculateCanvasSize(frameGraph);
            return { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 };
        }
        const position = (frame * VideoTimelineTimingFps) / fps;
        const before = Math.floor(position + 1e-6);
        const after = Math.ceil(position - 1e-6);
        prepareCameraCenters(after);
        const a = centers[before],
            b = centers[after];
        const ratio = clamp01(position - before);
        return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    };
    // The final 16:9 camera includes margins beyond graph bounds, even without keyframes.
    // Load that entire camera travel area once, instead of fetching/cloning tiles every frame.
    if (environment.mapEnabled) {
        const bounds = { ...baseBounds };
        for (const entry of timeline.track) {
            if (entry.kind !== 'keyframe' || !graph.hasNode(entry.refId)) continue;
            bounds.xMin = Math.min(bounds.xMin, entry.x);
            bounds.xMax = Math.max(bounds.xMax, entry.x);
            bounds.yMin = Math.min(bounds.yMin, entry.y);
            bounds.yMax = Math.max(bounds.yMax, entry.y);
        }
        const boundsZoom = Math.min(
            (CameraViewportWidth / (Math.max(1, bounds.xMax - bounds.xMin) * 1.12)) * 100,
            (CameraViewportHeight / (Math.max(1, bounds.yMax - bounds.yMin) * 1.12)) * 100
        );
        const viewport = getCameraViewBox(baseCenter, Math.min(currentZoom, finalFullscreenZoom, boundsZoom));
        const sourceMap = source.canvas.querySelector<SVGGElement>('[data-map-layer]');
        const targetMap = geometry.querySelector<SVGGElement>('[data-map-layer]');
        if (sourceMap && targetMap)
            await renderMapLayerForExport(sourceMap, targetMap, {
                xMin: bounds.xMin - viewport.width / 2,
                xMax: bounds.xMax + viewport.width / 2,
                yMin: bounds.yMin - viewport.height / 2,
                yMax: bounds.yMax + viewport.height / 2,
            });
    }
    const lineMarkers: { time: number; edgeId: LineId }[] = [];
    if (timeline.track.length) {
        timeline.track.forEach((entry, index) => {
            if (entry.kind === 'edge' && graph.hasEdge(entry.refId))
                lineMarkers.push({ time: cursorTimes[index] ?? 0, edgeId: entry.refId });
        });
    } else {
        playbackSegments.forEach((segment, index) => {
            if (segment.kind === 'step' && segment.step.kind === 'edge')
                lineMarkers.push({ time: cumulativeWeights[index], edgeId: segment.step.id as LineId });
        });
    }
    embedVideoExportStyles(geometry);
    geometry.setAttribute('width', String(outputWidth));
    geometry.setAttribute('height', String(outputHeight));
    const scene = createVideoFrameScene(geometry, { nodeIds: allNodes, edgeIds: allEdges });
    const baseStationKeys = new Map<StnId, string>();
    graph.forEachNode((id, attrs) => {
        if (isStationNodeId(id as Id))
            baseStationKeys.set(id as StnId, JSON.stringify([attrs.type, attrs[attrs.type]]));
    });
    type Appearance = { stations: Map<StnId, { key: string; attrs: NodeAttributes }> };
    const appearances = new Map<string, Appearance>();
    const stationAppearanceAt = (visibleEdges: Set<LineId>): Appearance => {
        const key = autoChangeStationType ? [...visibleEdges].join('|') : '';
        let appearance = appearances.get(key);
        if (appearance) return appearance;
        const analysis = autoChangeStationType ? createFrameStationGraph(graph, visibleEdges) : graph;
        appearance = { stations: new Map() };
        analysis.forEachNode((id, attrs) => {
            const stationId = id as StnId;
            if (!baseStationKeys.has(stationId)) return;
            const variant = JSON.stringify([attrs.type, attrs[attrs.type]]);
            if (variant !== baseStationKeys.get(stationId))
                appearance!.stations.set(stationId, { key: variant, attrs });
        });
        appearances.set(key, appearance);
        if (appearances.size > 8) appearances.delete(appearances.keys().next().value!);
        return appearance;
    };
    const currentStationKeys = new Map<StnId, string>();
    const stationTemplates = new Map<string, Map<string, SVGElement>>();
    const parseTemplates = (markup: string) => {
        const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        root.innerHTML = markup;
        // Apply the same editor-only cleanup used during initial resource preparation.
        root.querySelectorAll('[fill="url(#opaque)"],.removeMe').forEach(element => element.remove());
        return new Map(Array.from(root.children).map(child => [child.id, child as SVGElement]));
    };
    const baselineLineKeys = new Map<Id, string>();
    const geographicLengths = new Map<LineId, ReturnType<typeof createGeographicLengthProfile>>();
    const updateGeographicLength = (element: RenderElement) => {
        if (
            !showLineLength ||
            !element.line ||
            element.line.attr.visible === false ||
            !scene.getGroup(element.id) ||
            !isOpenPath(element.line.path)
        )
            return;
        geographicLengths.set(element.id as LineId, createGeographicLengthProfile(element.line.path));
    };
    if (showLineLength) getLines(graph, { showReconcileWarnings: false }).forEach(updateGeographicLength);
    let currentLineKeys = new Map<Id, string>();
    let lastGeometryGraph = graph;
    if (movingNodes.size) {
        for (const line of getLines(graph, { showReconcileWarnings: false }))
            baselineLineKeys.set(line.id, JSON.stringify(line.line?.path));
        currentLineKeys = new Map(baselineLineKeys);
    }
    const updateGeometry = (frameGraph: typeof graph) => {
        if (lastGeometryGraph === frameGraph) return;
        const changed: RenderElement[] = [];
        for (const line of getLines(frameGraph, { showReconcileWarnings: false })) {
            const key = JSON.stringify(line.line?.path);
            if (currentLineKeys.get(line.id) === key) continue;
            currentLineKeys.set(line.id, key);
            updateGeographicLength(line);
            if (key === baselineLineKeys.get(line.id)) {
                for (const suffix of ['', '.pre', '.post']) {
                    const id = line.id + suffix;
                    if (scene.getGroup(id)) scene.replaceGroup(id, VIDEO_FRAME_BASE_VARIANT);
                }
            } else changed.push(line);
        }
        if (changed.length) {
            const templates = parseTemplates(
                renderVideoElementsGeometry(frameGraph, changed, environment.mapEnabled, !!environment.isSubscriber)
            );
            for (const [id, template] of templates)
                scene.replaceGroup(id, currentLineKeys.get(id.replace(/\.(pre|post)$/, '') as Id)!, template);
        }
        lastGeometryGraph = frameGraph;
    };
    const updateStationAppearance = (appearance: Appearance) => {
        for (const id of baseStationKeys.keys()) {
            const variant = appearance.stations.get(id);
            const key = variant?.key ?? VIDEO_FRAME_BASE_VARIANT;
            if ((currentStationKeys.get(id) ?? VIDEO_FRAME_BASE_VARIANT) === key) continue;
            if (!variant) {
                for (const suffix of ['', '.pre', '.post'])
                    if (scene.getGroup(id + suffix)) scene.replaceGroup(id + suffix, VIDEO_FRAME_BASE_VARIANT);
            } else {
                const cacheKey = id + key;
                let templates = stationTemplates.get(cacheKey);
                if (!templates) {
                    templates = parseTemplates(
                        renderVideoElementsGeometry(
                            graph,
                            [{ id, type: 'station', station: variant.attrs }],
                            environment.mapEnabled,
                            !!environment.isSubscriber
                        )
                    );
                    stationTemplates.set(cacheKey, templates);
                    if (stationTemplates.size > 128) stationTemplates.delete(stationTemplates.keys().next().value!);
                }
                for (const [groupId, template] of templates)
                    if (scene.getGroup(id)) scene.replaceGroup(groupId, key, template);
            }
            currentStationKeys.set(id, key);
        }
    };
    // Fills depend on their surrounding paths, including the visible topology used by automatic station switching.
    const fills = getNodes(graph).filter(element => element.miscNode?.type === MiscNodeType.Fill);
    let fillStateKey: string | undefined;
    const fillVariantKeys = new Map<string, string>();
    const updateFills = (frameGraph: typeof graph, visibleEdges: Set<LineId>) => {
        if (!fills.length) return;
        const key = JSON.stringify([
            autoChangeStationType ? [...visibleEdges] : [],
            [...movingNodes].map(id => (graph.hasNode(id) ? frameGraph.getNodeAttributes(id) : undefined)),
        ]);
        if (key === fillStateKey) return;
        const fillGraph = autoChangeStationType ? frameGraph.copy() : frameGraph;
        if (autoChangeStationType) {
            for (const id of allEdges) if (!visibleEdges.has(id)) fillGraph.dropEdge(id);
        }
        const elements = fills.map(element => ({ ...element, miscNode: frameGraph.getNodeAttributes(element.id) }));
        const templates = parseTemplates(
            renderVideoElementsGeometry(fillGraph, elements, environment.mapEnabled, !!environment.isSubscriber)
        );
        for (const [id, template] of templates) {
            const variant = template.outerHTML;
            if (variant !== fillVariantKeys.get(id) && scene.getGroup(id)) scene.replaceGroup(id, variant, template);
            fillVariantKeys.set(id, variant);
        }
        fillStateKey = key;
    };
    const initialViewBox = getCameraViewBox(baseCenter, currentZoom);
    const mapAttribution = geometry.querySelector<SVGGElement>('[data-map-attribution]');
    const watermark = hideWatermark
        ? undefined
        : createVideoWatermarkElement(initialViewBox, outputWidth, outputHeight);
    if (watermark) geometry.append(watermark);
    const markerTimes = lineMarkers.map(marker => marker.time);
    let overlay: SVGGElement | undefined;
    let annotationKey: string | undefined;
    let lastFrame = -1;
    const placeLabels = (labels: readonly TimelineLabelEntry[]) =>
        labels.map(entry => ({
            entry,
            ...getTimelineClipRange(entry, cursorTimes, totalFrames / fps),
        }));
    let placedLabels = placeLabels(timeline.labelTrack ?? []);
    const setLabelTrack = (labels: readonly TimelineLabelEntry[]) => {
        placedLabels = placeLabels(labels);
        lastFrame = -1;
    };
    const renderPreviewFrame = async (time: number, request: { force?: boolean } = {}): Promise<SVGSVGElement> => {
        const frame = Math.max(
            0,
            Math.min(totalFrames - 1, Math.floor((Number.isFinite(time) ? time : 0) * fps + 1e-6))
        );
        if (lastFrame === frame && !request.force) return geometry;
        if (request.force) scene.invalidate();
        const state = frameAt(frame);
        const appearance = stationAppearanceAt(state.visibleEdges);
        updateGeometry(state.frameGraph);
        updateStationAppearance(appearance);
        updateFills(state.frameGraph, state.visibleEdges);
        const nodeTransforms = new Map<NodeId, string>();
        for (const id of state.visibleNodes) {
            if (movingNodes.has(id)) {
                const attrs = state.frameGraph.getNodeAttributes(id);
                nodeTransforms.set(id, `translate(${attrs.x}, ${attrs.y})`);
            }
        }
        const viewBox = getCameraViewBox(cameraCenterAt(frame), state.nextZoom);
        scene.applyFrame({ ...state, nodeTransforms, viewBox });
        if (mapAttribution) {
            const unit = viewBox.width / outputWidth;
            positionMapAttribution(mapAttribution, viewBox.x + 8 * unit, viewBox.y + viewBox.height - 8 * unit, unit);
        }
        if (watermark) {
            const layout = getVideoWatermarkLayout(viewBox, outputWidth, outputHeight);
            watermark.setAttribute('transform', `translate(${layout.x}, ${layout.y}) scale(${layout.scale})`);
        }
        const markerIndex = lastStartedIndex(markerTimes, frame / fps);
        const edgeId = lineMarkers[Math.max(0, markerIndex)]?.edgeId;
        const annotation = edgeId && getVideoLineAnnotation(graph, edgeId);
        let totalLength = '';
        if (showLineLength) {
            let totalKm = 0;
            for (const id of state.visibleEdges)
                totalKm +=
                    geographicLengths
                        .get(id)
                        ?.lengthAt(state.edgeProgress.get(id) ?? 1, state.edgeDirections.get(id)) ?? 0;
            const distance = lineLengthUnit === 'mi' ? totalKm / 1.609344 : totalKm;
            totalLength = `${distance.toFixed(1)}${lineLengthUnit}`;
        }
        const labels = placedLabels
            .filter(label => frame / fps >= label.start && frame / fps < label.end)
            .map(label => label.entry);
        const key = JSON.stringify([annotation, totalLength, labels.map(label => [label.id, label.text])]);
        if (key !== annotationKey) {
            overlay?.remove();
            overlay = createVideoLineOverlay(
                annotation || undefined,
                { showYear, showLineName },
                viewBox,
                labels,
                totalLength
            );
            if (overlay) geometry.append(overlay);
            annotationKey = key;
        } else
            overlay?.setAttribute('transform', `translate(${viewBox.x}, ${viewBox.y}) scale(${viewBox.width / 1280})`);
        lastFrame = frame;
        return geometry;
    };
    const renderFrame = async (time: number) => {
        await renderPreviewFrame(time);
        return scene.snapshot();
    };
    let disposed = false;
    let warmup: number | undefined;
    const cameraFrameCount = Math.ceil(((totalFrames - 1) * VideoTimelineTimingFps) / fps) + 1;
    const warmCamera = () => {
        if (cameraZoom === 1 || typeof requestIdleCallback !== 'function' || disposed) return;
        warmup = requestIdleCallback(deadline => {
            warmup = undefined;
            const start = performance.now();
            while (centers.length < cameraFrameCount && deadline.timeRemaining() > 1 && performance.now() - start < 4)
                prepareCameraCenters(centers.length);
            if (centers.length < cameraFrameCount) warmCamera();
        });
    };
    const dispose = () => {
        disposed = true;
        if (warmup !== undefined) cancelIdleCallback(warmup);
        geometry.remove();
        frameStates.clear();
        appearances.clear();
        stationTemplates.clear();
    };
    return {
        duration: totalFrames / fps,
        totalFrames,
        cursorTimes,
        renderFrame,
        renderPreviewFrame,
        setLabelTrack,
        warmCamera,
        dispose,
    };
};

export interface VideoPreviewRenderer {
    duration: number;
    cursorTimes: number[];
    renderFrame: (time: number) => Promise<SVGSVGElement>;
    renderPreviewFrame: (time: number, options?: { force?: boolean }) => Promise<SVGSVGElement>;
    setLabelTrack: (labels: readonly TimelineLabelEntry[]) => void;
    dispose: () => void;
}

export const videoPreviewDefaultOptions: VideoExportOptions = {
    format: 'mp4',
    fps: 30,
    quality: 95,
    isTransparent: false,
    speedMultiplier: 1,
    autoChangeStationType: true,
    resolution: '720p',
    isSystemFontsOnly: false,
    hideWatermark: false,
};

/** Prepare the export schedule and camera once, then seek to any real video time. */
export const createVideoPreviewRenderer = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineDocument,
    languages: TextLanguage[],
    options: VideoExportOptions = videoPreviewDefaultOptions,
    environment: VideoExportEnvironment = DefaultVideoEnvironment
): Promise<VideoPreviewRenderer> => {
    const source = createVideoExportCanvas(
        environment.mapEnabled,
        environment.mapStyle,
        { ...environment.svgViewBoxMin, zoom: environment.svgViewBoxZoom },
        getVideoExportDimensions(options.resolution),
        false
    );
    try {
        const renderer = await createPreparedVideoRenderer(graph, timeline, languages, options, source, environment);
        renderer.warmCamera();
        return {
            ...renderer,
            dispose: () => {
                renderer.dispose();
                source.dispose();
            },
        };
    } catch (error) {
        source.dispose();
        throw error;
    }
};

const renderVideo = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineDocument,
    languages: TextLanguage[],
    options: VideoExportOptions,
    bgColor: string,
    source: ReturnType<typeof createVideoExportCanvas>,
    onProgress?: (progress: number) => void,
    forceSoftware = false,
    audioClips: { blob: Blob; entry: NonNullable<TimelineDocument['audioTrack']>[number] }[] = [],
    environment: VideoExportEnvironment = DefaultVideoEnvironment
): Promise<Blob> => {
    const renderer = await createPreparedVideoRenderer(graph, timeline, languages, options, source, environment);
    const { width, height } = getVideoExportDimensions(options.resolution);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    let videoWriter: Awaited<ReturnType<typeof createVideoFrameWriter>> | undefined;
    try {
        const audioTracks = audioClips
            .map(clip => ({
                blob: clip.blob,
                ...getTimelineAudioRange(clip.entry, renderer.cursorTimes, renderer.duration),
            }))
            .filter(clip => clip.end > clip.start);
        videoWriter = await createVideoFrameWriter(canvas, { ...options, audioTracks }, forceSoftware);
        for (let frame = 0; frame < renderer.totalFrames; frame++) {
            const elem = await renderer.renderFrame(frame / options.fps);
            try {
                await renderSVGToCanvas(elem, canvas, options.isTransparent && options.format === 'webm', bgColor);
                await videoWriter.addFrame(frame);
            } finally {
                elem.remove();
            }
            onProgress?.((frame + 1) / (renderer.totalFrames + 1));
        }
        const blob = await videoWriter.complete();
        onProgress?.(1);
        return blob;
    } finally {
        renderer.dispose();
        try {
            await videoWriter?.dispose();
        } finally {
            canvas.width = 0;
            canvas.height = 0;
        }
    }
};
