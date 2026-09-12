import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { utils } from '@railmapgen/svg-assets';
import {
    EdgeAttributes,
    ExternalStationAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    StnId,
} from '../constants/constants';
import stations from '../components/svgs/stations/stations';
import SvgLayer from '../components/svg-layer';
import { StationType } from '../constants/stations';
import { isElementEntry, TimelineDocument, TimelineEntry } from '../constants/timeline';
import i18n from '../i18n/config';
import store from '../redux';
import { TextLanguage } from './fonts';
import { changeStationType, checkAndChangeStationIntType } from './change-types';
import { makeRenderReadySVGElement } from './download';
import { calculateCanvasSize } from './helpers';
import { getLines, getNodes } from './process-elements';
import { createVideoTimelinePlayback, VideoCameraFocus } from './video-export-timeline';
import { createVideoExportCanvas } from './video-export-canvas';
import { createVideoFrameWriter, NativeVideoEncodingError, VideoEncodingOptions } from './video-encoder';

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

const StaticMarkupProvider = Provider as React.ComponentType<
    React.PropsWithChildren<{
        store: typeof store;
    }>
>;

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
    scale: number;
    fullscreenScale: number;
    isSystemFontsOnly: boolean;
    hideWatermark: boolean;
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
export const videoExportSpeedRange = { min: 0.5, max: 2, step: 0.1, default: 1 } as const;
const NodeRevealSeconds = 0.2;
const NodeTextDelaySeconds = 0.05;
const NodeTextRevealSeconds = 0.8;
const CameraRepositionPauseSeconds = 1;
const OverviewSeconds = 1;
const StationTransitionScale = 0.96;
const HorizontalGroupingThreshold = 50;
const CameraViewportZoom = 40;
const CameraViewportAspectRatio = 16 / 9;
const CameraViewportBaseHeight = 360;
const StationRevealViewportLookaheadRatio = 0.75;
const CameraFocusSmoothing = 0.14;
const OverviewZoomTransitionRatio = 0.5;
const CameraViewportHeight = (CameraViewportBaseHeight * CameraViewportZoom) / 100;
const CameraViewportWidth = CameraViewportHeight * CameraViewportAspectRatio;
const VideoWatermarkWidth = 350;
const VideoWatermarkHeight = 50;
const VideoWatermarkMargin = 24;
const VideoExportStyleId = 'rmp_video_export_styles';
const VideoExportCSS = `
.rmp-name-outline {
    paint-order: stroke;
    stroke: #ffffff;
    stroke-linejoin: round;
}
`;

let watermarkLogoMarkupCache: string | undefined;

type CameraFocus = VideoCameraFocus;

const isStationNodeId = (id: Id): id is StnId => id.startsWith('stn_');

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const getVideoExportDimensions = (resolution: VideoExportResolution) => videoExportResolutions[resolution];

const getNodeRevealProgress = (frame: number, startFrame: number, fps: number): number => {
    const revealFrames = Math.max(6, Math.round(fps * NodeRevealSeconds));
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
    sourceCanvas?: SVGSVGElement
): Promise<Map<LineId, number>> => {
    const { elem } = await makeRenderReadySVGElement(
        graph,
        store.getState().param.present.mapEnabled,
        true,
        isSystemFontsOnly,
        languages,
        false,
        2,
        renderGeometry ? clone => renderVideoFrameGeometry(graph, clone) : undefined,
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

    return edgeLengths;
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

export const renderBasicStationMarkup = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stationId: StnId
): string | undefined => {
    const stationType = graph.getNodeAttribute(stationId, 'type') as StationType;
    const basicType = BasicToIntStationTypeMap[stationType];
    if (!basicType) return undefined;

    const basicStation = stations[basicType];
    if (!basicStation) return undefined;

    const basicGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    basicGraph.import(structuredClone(graph.export()));
    changeStationType(basicGraph, stationId, basicType);

    return renderStationMarkup(basicGraph, stationId);
};

export const renderStationMarkup = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stationId: StnId
): string | undefined => {
    const stationType = graph.getNodeAttribute(stationId, 'type') as StationType;
    const station = stations[stationType];
    if (!station) return undefined;

    const stationAttrs = graph.getNodeAttribute(stationId, stationType) as ExternalStationAttributes | undefined;
    const attrs = stationAttrs
        ? ({ [stationType]: structuredClone(stationAttrs) } as ExternalStationAttributes)
        : ({} as ExternalStationAttributes);

    return renderToStaticMarkup(
        React.createElement(
            StaticMarkupProvider,
            { store },
            React.createElement(station.component, {
                id: stationId,
                attrs,
                x: 0,
                y: 0,
                handlePointerDown: () => {},
                handlePointerMove: () => {},
                handlePointerUp: () => {},
            })
        )
    );
};

const getStationTransitionProgress = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    focus: CameraFocus,
    stationId: StnId
): number => {
    if (focus.kind === 'edge' && focus.progress < 1 && graph.hasEdge(focus.id)) {
        const [source, target] = graph.extremities(focus.id);
        if (source === stationId || target === stationId) {
            return focus.progress;
        }
    }

    return 1;
};

export const getOverviewZoom = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): number => {
    const bounds = calculateCanvasSize(graph);
    const graphWidth = Math.max(bounds.xMax - bounds.xMin, 1);
    const graphHeight = Math.max(bounds.yMax - bounds.yMin, 1);
    const fitWidthZoom = (CameraViewportWidth / (graphWidth * 1.12)) * 100;
    const fitHeightZoom = (CameraViewportHeight / (graphHeight * 1.12)) * 100;
    return Math.min(fitWidthZoom, fitHeightZoom);
};

export const applyZoomScale = (fitToElementsZoom: number, scale: number): number => fitToElementsZoom * (scale / 100);

export const interpolateCameraZoom = (currentScale: number, fullscreenScale: number, progress: number): number => {
    const transitionProgress = smoothstep(0, 1, progress);
    return currentScale + (fullscreenScale - currentScale) * transitionProgress;
};

export const getOverviewZoomProgress = (overviewFrame: number, overviewFrames: number): number => {
    const transitionFrames = Math.max(1, Math.ceil(overviewFrames * OverviewZoomTransitionRatio));
    if (transitionFrames === 1) return 1;
    return clamp01(overviewFrame / (transitionFrames - 1));
};

const getWatermarkLogoMarkup = async (): Promise<string> => {
    if (!watermarkLogoMarkupCache) {
        const logoSVGRep = await fetch('logo.svg');
        const logoSVG = await logoSVGRep.text();
        const temp = document.createElement('div');
        temp.innerHTML = logoSVG;
        watermarkLogoMarkupCache = temp.querySelector('svg')?.innerHTML ?? '';
    }

    return watermarkLogoMarkupCache;
};

const createVideoWatermarkElement = async (zoom: number, outputWidth: number, outputHeight: number) => {
    const zoomFactor = Math.max(zoom, 1) / 100;
    const viewportWidth = CameraViewportWidth / zoomFactor;
    const worldUnitsPerPixel = viewportWidth / outputWidth;
    const resolutionScale = outputHeight / videoExportResolutions['720p'].height;
    const watermarkWidth = VideoWatermarkWidth * resolutionScale;
    const watermarkHeight = VideoWatermarkHeight * resolutionScale;
    const watermarkMargin = VideoWatermarkMargin * resolutionScale;
    const watermarkX = (outputWidth - watermarkWidth - watermarkMargin) * worldUnitsPerPixel;
    const watermarkY = (outputHeight - watermarkHeight - watermarkMargin) * worldUnitsPerPixel;

    const info = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    info.setAttribute('id', 'rmp_info');
    info.setAttribute('opacity', '0.5');
    info.setAttribute(
        'transform',
        `translate(${watermarkX}, ${watermarkY}) scale(${worldUnitsPerPixel * resolutionScale})`
    );

    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logo.setAttribute('transform', `scale(0.1)`);
    logo.setAttribute('font-family', 'Arial, sans-serif');
    logo.innerHTML = await getWatermarkLogoMarkup();

    const rmp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rmp.setAttribute('font-family', 'Arial, sans-serif');
    rmp.setAttribute('font-size', '32');
    rmp.setAttribute('x', '60');
    rmp.setAttribute('y', '25');
    rmp.appendChild(document.createTextNode(i18n.t('header.about.rmp')));

    const link = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    link.setAttribute('font-family', 'Arial, sans-serif');
    link.setAttribute('font-size', '20');
    link.setAttribute('x', '60');
    link.setAttribute('y', '50');
    let url = window.location.origin;
    if (url.includes('github')) url = 'https://railmapgen.github.io/';
    else if (url.includes('gitlab')) url = 'https://railmapgen.gitlab.io/';
    url += '?app=rmp';
    link.appendChild(document.createTextNode(url));

    info.appendChild(logo);
    info.appendChild(rmp);
    info.appendChild(link);

    return info;
};

export const applyNodeRevealAnimation = (
    nodeGroup: SVGElement,
    nodeProgress: number,
    _textProgress: number,
    transitionProgress: number | undefined,
    isStationNode: boolean
) => {
    if (transitionProgress !== undefined) {
        const baseTransform = nodeGroup.getAttribute('transform') ?? '';
        const scale = StationTransitionScale + (1 - StationTransitionScale) * transitionProgress;
        if (baseTransform.includes('scale(')) {
            nodeGroup.setAttribute('transform', baseTransform);
        } else {
            nodeGroup.setAttribute('transform', `${baseTransform} scale(${scale})`);
        }
    }

    if (isStationNode) {
        const originalOpacity = Number(nodeGroup.getAttribute('opacity') ?? 1);
        nodeGroup.setAttribute('opacity', `${(Number.isFinite(originalOpacity) ? originalOpacity : 1) * nodeProgress}`);
        return;
    }

    nodeGroup.querySelectorAll<SVGElement>('*').forEach(el => {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'text' || tagName === 'tspan') return;
        const originalOpacity = Number(el.getAttribute('opacity') ?? 1);
        el.setAttribute('opacity', `${(Number.isFinite(originalOpacity) ? originalOpacity : 1) * nodeProgress}`);
    });

    nodeGroup.querySelectorAll<SVGTextElement>('text').forEach(textEl => {
        textEl.setAttribute('opacity', `${nodeProgress}`);
    });
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

const getNodeFocusPoint = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
) => {
    const attr = graph.getNodeAttributes(nodeId);
    return { x: attr.x, y: attr.y };
};

const getEdgeFocusPoint = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    edgeId: LineId,
    progress: number,
    reverse: boolean
) => {
    const edgeElem = elem.getElementById(edgeId);
    const path = edgeElem?.querySelector('path');
    if (path) {
        const totalLength = path.getTotalLength();
        const distance = totalLength * (reverse ? 1 - progress : progress);
        const point = path.getPointAtLength(Math.max(0, Math.min(totalLength, distance)));
        return { x: point.x, y: point.y };
    }

    if (graph.hasEdge(edgeId)) {
        const [source, target] = graph.extremities(edgeId);
        const focusNode = reverse ? source : target;
        if (graph.hasNode(focusNode as NodeId)) {
            return getNodeFocusPoint(graph, focusNode as NodeId);
        }
    }

    return undefined;
};

const getCameraTargetPointForFrame = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    focus: CameraFocus
) => {
    if (focus.kind === 'node') {
        return getNodeFocusPoint(graph, focus.id);
    }

    if (focus.kind === 'edge') {
        return getEdgeFocusPoint(graph, elem, focus.id, focus.progress, focus.reverse);
    }

    return undefined;
};

const applyCameraViewBox = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    center: { x: number; y: number },
    zoom: number,
    outputWidth: number,
    outputHeight: number
) => {
    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const cameraFocus = center ?? fallbackCenter;
    const viewBox = getCameraViewBox(cameraFocus, zoom);

    elem.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    elem.setAttribute('width', outputWidth.toString());
    elem.setAttribute('height', outputHeight.toString());
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

const applyEdgeProgress = (edgeElem: Element, progress: number, reverse: boolean) => {
    const pathElements = Array.from(edgeElem.querySelectorAll('path'));
    if (pathElements.length === 0) return;

    for (const pathElem of pathElements) {
        const totalLength = pathElem.getTotalLength();
        const dashLength = totalLength * progress;
        pathElem.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
        pathElem.setAttribute('stroke-dashoffset', reverse ? `${-(totalLength - dashLength)}` : '0');
    }
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

const getBasicStations = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Set<StnId> => {
    const basicStations = new Set<StnId>();
    graph.forEachNode(node => {
        const nodeId = node as Id;
        if (!isStationNodeId(nodeId)) return;

        const nodeType = graph.getNodeAttribute(nodeId, 'type') as string | undefined;
        if (typeof nodeType === 'string' && nodeType.endsWith('-basic')) {
            basicStations.add(nodeId);
        }
    });
    return basicStations;
};

const getBasicStationsForFrame = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleEdges: Set<LineId>,
    autoChangeStationType: boolean
): Set<StnId> => getBasicStations(createFrameStationGraph(graph, visibleEdges, autoChangeStationType));

const applyFrameStationAppearance = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    frameStationGraph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement
) => {
    frameStationGraph.forEachNode(node => {
        const stationId = node as Id;
        if (!isStationNodeId(stationId)) return;

        const stationGroup = elem.getElementById(stationId);
        if (!stationGroup) return;

        const originalType = graph.getNodeAttribute(stationId, 'type') as StationType;
        const frameType = frameStationGraph.getNodeAttribute(stationId, 'type') as StationType;
        const originalAttrs = graph.getNodeAttribute(stationId, originalType);
        const frameAttrs = frameStationGraph.getNodeAttribute(stationId, frameType);
        if (originalType === frameType && JSON.stringify(originalAttrs) === JSON.stringify(frameAttrs)) return;

        const markup = renderStationMarkup(frameStationGraph, stationId);
        if (!stationGroup || !markup) return;
        stationGroup.innerHTML = markup;
    });
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
    elem: SVGSVGElement
) => {
    let layer = elem.querySelector<SVGGElement>('[data-editor-layer]');
    if (!layer) {
        layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('data-editor-layer', '');
        elem.appendChild(layer);
    }
    layer.removeAttribute('display');
    const state = store.getState();
    layer.innerHTML = renderToStaticMarkup(
        React.createElement(
            StaticMarkupProvider,
            { store },
            React.createElement(
                utils.SvgAssetsContextProvider,
                null,
                React.createElement(SvgLayer, {
                    elements: [...getLines(graph, { showReconcileWarnings: false }), ...getNodes(graph)],
                    selected: new Set<Id>(),
                    mapEnabled: state.param.present.mapEnabled,
                    isSubscriber: !!state.account.activeSubscriptions.RMP_CLOUD,
                    handlePointerDown: () => {},
                    handlePointerMove: () => {},
                    handlePointerUp: () => {},
                    handleEdgePointerDown: () => {},
                    handleEdgeDoubleClick: () => {},
                })
            )
        )
    );
};

const getElementGroups = (elem: SVGSVGElement, id: Id): SVGElement[] =>
    [id, `${id}.pre`, `${id}.post`]
        .map(groupId => elem.getElementById(groupId))
        .filter((group): group is SVGElement => group !== null);

const createFrameSVG = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>,
    nodeProgress: Map<NodeId, number>,
    textProgress: Map<NodeId, number>,
    edgeProgress: Map<LineId, number>,
    edgeDirections: Map<LineId, boolean>,
    focus: CameraFocus,
    cameraCenter: { x: number; y: number } | undefined,
    previousBasicStations: Set<StnId>,
    autoChangeStationType: boolean,
    zoom: number,
    outputWidth: number,
    outputHeight: number,
    hideWatermark: boolean,
    isSystemFontsOnly: boolean,
    languages: TextLanguage[],
    renderGeometry = false,
    disabledNodeAnimations = new Set<NodeId>(),
    sourceCanvas?: SVGSVGElement
): Promise<{ elem: SVGSVGElement; cameraCenter: { x: number; y: number } }> => {
    const frameStationGraph = createFrameStationGraph(graph, visibleEdges, autoChangeStationType);
    const basicStations = getBasicStations(frameStationGraph);
    const { elem } = await makeRenderReadySVGElement(
        graph,
        store.getState().param.present.mapEnabled,
        true,
        isSystemFontsOnly,
        languages,
        false,
        2,
        renderGeometry ? clone => renderVideoFrameGeometry(frameStationGraph, clone) : undefined,
        sourceCanvas
    );

    graph.forEachNode(node => {
        if (!visibleNodes.has(node as NodeId)) {
            getElementGroups(elem, node as NodeId).forEach(group => group.remove());
        }
    });

    if (!renderGeometry) applyFrameStationAppearance(graph, frameStationGraph, elem);
    embedVideoExportStyles(elem);

    const changedStations = new Set<StnId>();
    for (const stationId of basicStations) {
        if (!previousBasicStations.has(stationId)) {
            changedStations.add(stationId);
        }
    }
    for (const stationId of previousBasicStations) {
        if (!basicStations.has(stationId)) {
            changedStations.add(stationId);
        }
    }

    graph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        if (!visibleEdges.has(edgeId)) {
            getElementGroups(elem, edgeId).forEach(group => group.remove());
            return;
        }

        const progress = edgeProgress.get(edgeId) ?? 1;
        if (progress < 1) {
            getElementGroups(elem, edgeId).forEach(group =>
                applyEdgeProgress(group, progress, edgeDirections.get(edgeId) ?? false)
            );
        }
    });

    graph.forEachNode(node => {
        const nodeId = node as NodeId;
        if (!visibleNodes.has(nodeId)) return;

        const revealProgress = nodeProgress.get(nodeId) ?? 1;
        const nodeTextProgress = textProgress.get(nodeId) ?? revealProgress;
        const transitionProgress =
            isStationNodeId(nodeId) && !disabledNodeAnimations.has(nodeId)
                ? getStationTransitionProgress(graph, focus, nodeId as StnId)
                : undefined;
        getElementGroups(elem, nodeId).forEach(nodeGroup => {
            applyNodeRevealAnimation(
                nodeGroup,
                revealProgress,
                nodeTextProgress,
                transitionProgress,
                isStationNodeId(nodeId)
            );

            if (transitionProgress !== undefined && isStationNodeId(nodeId) && changedStations.has(nodeId)) {
                const revealOpacity = Number(nodeGroup.getAttribute('opacity') ?? 1);
                const transitionOpacity = clamp01(0.92 + transitionProgress * 0.08);
                nodeGroup.setAttribute(
                    'opacity',
                    `${(Number.isFinite(revealOpacity) ? revealOpacity : 1) * transitionOpacity}`
                );
            }
        });
    });

    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const targetCenter = getCameraTargetPointForFrame(graph, elem, focus) ?? fallbackCenter;
    const nextCameraCenter = cameraCenter
        ? {
              x: cameraCenter.x + (targetCenter.x - cameraCenter.x) * CameraFocusSmoothing,
              y: cameraCenter.y + (targetCenter.y - cameraCenter.y) * CameraFocusSmoothing,
          }
        : targetCenter;

    applyCameraViewBox(graph, elem, nextCameraCenter, zoom, outputWidth, outputHeight);

    if (!hideWatermark) {
        elem.appendChild(await createVideoWatermarkElement(zoom, outputWidth, outputHeight));
    }

    return {
        elem,
        cameraCenter: nextCameraCenter,
    };
};
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
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    const { mapEnabled, mapStyle, svgViewBoxMin, svgViewBoxZoom } = store.getState().param.present;
    const source = createVideoExportCanvas(
        mapEnabled,
        mapStyle,
        { ...svgViewBoxMin, zoom: svgViewBoxZoom },
        getVideoExportDimensions(options.resolution)
    );
    try {
        try {
            return await renderVideo(graph, timeline, languages, options, bgColor, source, onProgress);
        } catch (error) {
            if (!(error instanceof NativeVideoEncodingError)) throw error;
            console.warn('Browser video encoding failed; retrying with software encoding.', error);
            onProgress?.(0);
            return await renderVideo(graph, timeline, languages, options, bgColor, source, onProgress, true);
        }
    } finally {
        source.dispose();
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
    forceSoftware = false
): Promise<Blob> => {
    const {
        fps,
        speedMultiplier,
        resolution,
        isTransparent,
        autoChangeStationType,
        scale,
        fullscreenScale,
        isSystemFontsOnly,
        hideWatermark,
    } = options;
    const usesAuthoredPlayback = timeline.track.some(
        entry => entry.kind === 'keyframe' || entry.phase === 'exit' || entry.showAnimation === false
    );
    const renderGeometry = usesAuthoredPlayback || source.renderGeometry;
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
    const currentZoom = applyZoomScale(fitToElementsZoom, scale);
    const fullscreenZoom = applyZoomScale(fitToElementsZoom, fullscreenScale);
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
    const measuredEdgeLengths = await measureRenderedEdgeLengths(
        graph,
        sequence.edges,
        isSystemFontsOnly,
        languages,
        renderGeometry,
        source.canvas
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
              { fps, drawingSpeed: BaseDrawingSpeed * multiplier, nodeSeconds: NodeRevealSeconds / multiplier }
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
        fps,
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
    const cumulativeWeights: number[] = [];
    let runningWeight = 0;
    for (const segment of playbackSegments) {
        cumulativeWeights.push(runningWeight);
        runningWeight += segment.duration;
    }
    let cameraCenter: { x: number; y: number } | undefined;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    let videoWriter: Awaited<ReturnType<typeof createVideoFrameWriter>> | undefined;
    try {
        videoWriter = await createVideoFrameWriter(canvas, options, forceSoftware);
        const allNodes = new Set<NodeId>();
        const allEdges = new Set<LineId>();
        graph.forEachNode(node => {
            allNodes.add(node as NodeId);
        });
        graph.forEachEdge(edge => {
            const edgeId = edge as LineId;
            allEdges.add(edgeId);
        });
        let previousVisibleEdges = new Set<LineId>();
        const nodeFirstVisibleFrame = new Map<NodeId, number>();

        for (let frame = 0; frame < totalFrames; frame++) {
            let visibleNodes = new Set<NodeId>();
            let visibleEdges = new Set<LineId>();
            let nodeProgress = new Map<NodeId, number>();
            let textProgress = new Map<NodeId, number>();
            let edgeProgress = new Map<LineId, number>();
            let edgeDirections = new Map<LineId, boolean>();
            let focus: CameraFocus = { kind: 'none' };
            let nextZoom = currentZoom;
            let frameGraph = graph;
            let disabledNodeAnimations = new Set<NodeId>();

            if (authoredPlayback) {
                const state = authoredPlayback.frameAt(Math.min(frame / fps, animationDuration));
                ({ visibleNodes, visibleEdges, nodeProgress, edgeProgress, edgeDirections, disabledNodeAnimations } =
                    state);
                textProgress = nodeProgress;
                focus = state.focus;
                frameGraph = graph.copy();
                state.positions.forEach((position, nodeId) => frameGraph.mergeNodeAttributes(nodeId, position));
                if (frame >= animationFrames) {
                    focus = { kind: 'none' };
                    const finalFullscreenZoom = applyZoomScale(getOverviewZoom(frameGraph), fullscreenScale);
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
                            if (!nodeFirstVisibleFrame.has(nodeId)) {
                                nodeFirstVisibleFrame.set(nodeId, frame);
                            }
                            const nodeStartFrame = nodeFirstVisibleFrame.get(nodeId) ?? frame;
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

                    const progress = Math.max(
                        0,
                        Math.min(1, (weightedProgress - startWeight) / Math.max(weight, 1e-6))
                    );
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

            const previousBasicStations = getBasicStationsForFrame(
                frameGraph,
                previousVisibleEdges,
                autoChangeStationType
            );

            const { elem, cameraCenter: nextCameraCenter } = await createFrameSVG(
                frameGraph,
                visibleNodes,
                visibleEdges,
                nodeProgress,
                textProgress,
                edgeProgress,
                edgeDirections,
                focus,
                cameraCenter,
                previousBasicStations,
                autoChangeStationType,
                nextZoom,
                outputWidth,
                outputHeight,
                hideWatermark,
                isSystemFontsOnly,
                languages,
                renderGeometry,
                disabledNodeAnimations,
                source.canvas
            );
            cameraCenter = nextCameraCenter;
            try {
                await renderSVGToCanvas(elem, canvas, isTransparent && options.format === 'webm', bgColor);
                await videoWriter.addFrame(frame);
            } finally {
                elem.remove();
            }

            if (onProgress) {
                onProgress((frame + 1) / (totalFrames + 1));
            }

            previousVisibleEdges = new Set(visibleEdges);
        }

        const blob = await videoWriter.complete();
        onProgress?.(1);
        return blob;
    } finally {
        try {
            await videoWriter?.dispose();
        } finally {
            canvas.width = 0;
            canvas.height = 0;
        }
    }
};
