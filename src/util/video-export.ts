import { MultiDirectedGraph } from 'graphology';
import WebMWriter from 'webm-writer';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    EdgeAttributes,
    ExternalStationAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    StnId,
    TimelineEntry,
} from '../constants/constants';
import stations from '../components/svgs/stations/stations';
import { StationType } from '../constants/stations';
import i18n from '../i18n/config';
import { TextLanguage } from './fonts';
import { changeStationType, checkAndChangeStationIntType } from './change-types';
import { makeRenderReadySVGElement } from './download';
import { calculateCanvasSize } from './helpers';

export interface VideoExportOptions {
    fps: number;
    duration: number;
    isTransparent: boolean;
    scale: number;
    isSystemFontsOnly: boolean;
    quality: number;
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

const NODE_ANIMATION_RATIO = 0;
const EDGE_ANIMATION_RATIO = 1;
const NODE_REVEAL_RATIO = 1;
const NODE_TEXT_DELAY_RATIO = 0;
const NODE_TEXT_REVEAL_RATIO = 1;
const NODE_TEXT_CHAR_STAGGER = 0.3;
const NODE_TEXT_CHAR_FADE = 0.5;
const DISCONNECTED_EDGE_PAUSE_RATIO = 1;
const STATION_TRANSITION_SCALE = 0.96;
const HORIZONTAL_GROUPING_THRESHOLD = 50;
const CAMERA_VIEWPORT_ZOOM = 40;
const CAMERA_VIEWPORT_ASPECT_RATIO = 16 / 9;
const CAMERA_VIEWPORT_BASE_HEIGHT = 360;
const VIDEO_EXPORT_OUTPUT_HEIGHT = 720;
const VIDEO_EXPORT_OUTPUT_WIDTH = VIDEO_EXPORT_OUTPUT_HEIGHT * CAMERA_VIEWPORT_ASPECT_RATIO;
const NODE_CAMERA_OVERLAP_RATIO = 1;
const CAMERA_FOCUS_SMOOTHING = 0.14;
const CAMERA_VIEWPORT_HEIGHT = (CAMERA_VIEWPORT_BASE_HEIGHT * CAMERA_VIEWPORT_ZOOM) / 100;
const CAMERA_VIEWPORT_WIDTH = CAMERA_VIEWPORT_HEIGHT * CAMERA_VIEWPORT_ASPECT_RATIO;
const VIDEO_WATERMARK_WIDTH = 350;
const VIDEO_WATERMARK_HEIGHT = 50;
const VIDEO_WATERMARK_MARGIN = 24;

let watermarkLogoMarkupCache: string | undefined;

type CameraFocus =
    | { kind: 'none' }
    | { kind: 'node'; id: NodeId }
    | { kind: 'edge'; id: LineId; progress: number; reverse: boolean };

const isNodeId = (id: Id): id is NodeId => id.startsWith('stn_') || id.startsWith('misc_node_');
const isStationNodeId = (id: Id): id is StnId => id.startsWith('stn_');
const isLineId = (id: Id): id is LineId => id.startsWith('line_');

const normalizeTimeline = (timeline: Array<Id | TimelineEntry> | undefined): TimelineEntry[] => {
    return (timeline ?? []).map(item =>
        typeof item === 'string' ? { id: item } : { id: item.id, ...(item.reverse ? { reverse: true } : {}) }
    );
};

const getBaseEdgeReverse = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId
): boolean => {
    if (!graph.hasEdge(edgeId)) return false;
    const attr = graph.getEdgeAttributes(edgeId);
    const pathAttrs = attr[attr.type] as { startFrom?: 'from' | 'to' } | undefined;
    return pathAttrs?.startFrom === 'to';
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getNodeRevealProgress = (frame: number, startFrame: number, fps: number): number => {
    const delayFrames = Math.max(1, Math.round(fps * 0.03));
    const revealFrames = Math.max(8, Math.round(fps * 0.3));
    return clamp01((frame - startFrame - delayFrames) / revealFrames);
};

const getNodeTextRevealProgress = (frame: number, startFrame: number, fps: number): number => {
    const delayFrames = Math.max(6, Math.round(fps * 0.22 + NODE_TEXT_DELAY_RATIO * fps * 0.15));
    const revealFrames = Math.max(36, Math.round(fps * 1.4 * NODE_TEXT_REVEAL_RATIO));
    return clamp01((frame - startFrame - delayFrames) / revealFrames);
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

const buildTimelineSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineEntry[]
): AnimationSequence => {
    const steps: AnimationStep[] = [];
    const nodes: NodeId[] = [];
    const edges: LineId[] = [];
    const seenNodes = new Set<NodeId>();
    const seenEdges = new Set<LineId>();

    for (const entry of timeline) {
        if (isNodeId(entry.id) && graph.hasNode(entry.id)) {
            steps.push({ id: entry.id, kind: 'node', reverse: false });
            if (!seenNodes.has(entry.id)) {
                seenNodes.add(entry.id);
                nodes.push(entry.id);
            }
            continue;
        }

        if (isLineId(entry.id) && graph.hasEdge(entry.id)) {
            const reverse = getBaseEdgeReverse(graph, entry.id) !== !!entry.reverse;
            steps.push({ id: entry.id, kind: 'edge', reverse });
            if (!seenEdges.has(entry.id)) {
                seenEdges.add(entry.id);
                edges.push(entry.id);
            }
        }
    }

    return { steps, nodes, edges };
};

const BASIC_STATION_TYPE_MAP: Partial<Record<StationType, StationType>> = {
    [StationType.ShmetroInt]: StationType.ShmetroBasic,
    [StationType.ShmetroOutOfSystemInt]: StationType.ShmetroBasic,
    [StationType.GzmtrInt]: StationType.GzmtrBasic,
    [StationType.GzmtrInt2024]: StationType.GzmtrBasic,
    [StationType.BjsubwayInt]: StationType.BjsubwayBasic,
    [StationType.SuzhouRTInt]: StationType.SuzhouRTBasic,
    [StationType.KunmingRTInt]: StationType.KunmingRTBasic,
    [StationType.MRTInt]: StationType.MRTBasic,
    [StationType.TokyoMetroInt]: StationType.TokyoMetroBasic,
    [StationType.LondonTubeInt]: StationType.LondonTubeBasic,
    [StationType.ChongqingRTInt]: StationType.ChongqingRTBasic,
    [StationType.ChongqingRTInt2021]: StationType.ChongqingRTBasic2021,
    [StationType.ChengduRTInt]: StationType.ChengduRTBasic,
    [StationType.WuhanRTInt]: StationType.WuhanRTBasic,
    [StationType.CsmetroInt]: StationType.CsmetroBasic,
    [StationType.HzmetroInt]: StationType.HzmetroBasic,
};

const getBasicStationType = (stationType: StationType): StationType | undefined => {
    const mappedType = BASIC_STATION_TYPE_MAP[stationType];
    if (mappedType) return mappedType;

    const yearMatch = stationType.match(/^(.*)-int-(\d+)$/);
    if (yearMatch) {
        return `${yearMatch[1]}-basic-${yearMatch[2]}` as StationType;
    }

    if (stationType.endsWith('-int')) {
        return `${stationType.slice(0, -4)}basic` as StationType;
    }

    return undefined;
};

const renderBasicStationMarkup = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stationId: StnId
): string | undefined => {
    const stationType = graph.getNodeAttribute(stationId, 'type') as StationType;
    const basicType = getBasicStationType(stationType);
    if (!basicType) return undefined;

    const basicStation = stations[basicType];
    if (!basicStation) return undefined;

    const basicGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    basicGraph.import(structuredClone(graph.export()));
    changeStationType(basicGraph, stationId, basicType);

    const stationAttrs = basicGraph.getNodeAttribute(stationId, basicType) as ExternalStationAttributes | undefined;
    const attrs = stationAttrs
        ? ({ [basicType]: structuredClone(stationAttrs) } as ExternalStationAttributes)
        : ({} as ExternalStationAttributes);

    return renderToStaticMarkup(
        React.createElement(basicStation.component, {
            id: stationId,
            attrs,
            x: 0,
            y: 0,
            handlePointerDown: () => {},
            handlePointerMove: () => {},
            handlePointerUp: () => {},
        })
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

const getOverviewZoom = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): number => {
    const bounds = calculateCanvasSize(graph);
    const graphWidth = Math.max(bounds.xMax - bounds.xMin, 1);
    const graphHeight = Math.max(bounds.yMax - bounds.yMin, 1);
    const fitWidthZoom = (CAMERA_VIEWPORT_WIDTH / (graphWidth * 1.12)) * 100;
    const fitHeightZoom = (CAMERA_VIEWPORT_HEIGHT / (graphHeight * 1.12)) * 100;
    return Math.max(8, Math.min(100, Math.min(fitWidthZoom, fitHeightZoom)));
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

const createVideoWatermarkElement = async (zoom: number) => {
    const zoomFactor = Math.max(zoom, 1) / 100;
    const viewportWidth = CAMERA_VIEWPORT_WIDTH / zoomFactor;
    const worldUnitsPerPixel = viewportWidth / VIDEO_EXPORT_OUTPUT_WIDTH;
    const watermarkX =
        (VIDEO_EXPORT_OUTPUT_WIDTH - VIDEO_WATERMARK_WIDTH - VIDEO_WATERMARK_MARGIN) * worldUnitsPerPixel;
    const watermarkY =
        (VIDEO_EXPORT_OUTPUT_HEIGHT - VIDEO_WATERMARK_HEIGHT - VIDEO_WATERMARK_MARGIN) * worldUnitsPerPixel;

    const info = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    info.setAttribute('id', 'rmp_info');
    info.setAttribute('opacity', '0.5');
    info.setAttribute('transform', `translate(${watermarkX}, ${watermarkY}) scale(${worldUnitsPerPixel})`);

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

const applyNodeRevealAnimation = (
    nodeGroup: SVGElement,
    nodeProgress: number,
    textProgress: number,
    transitionProgress: number | undefined,
    isStationNode: boolean
) => {
    if (transitionProgress !== undefined) {
        const baseTransform = nodeGroup.getAttribute('transform') ?? '';
        const scale = STATION_TRANSITION_SCALE + (1 - STATION_TRANSITION_SCALE) * transitionProgress;
        if (baseTransform.includes('scale(')) {
            nodeGroup.setAttribute('transform', baseTransform);
        } else {
            nodeGroup.setAttribute('transform', `${baseTransform} scale(${scale})`);
        }
    }

    nodeGroup.querySelectorAll<SVGElement>('*').forEach(el => {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'text' || tagName === 'tspan') return;
        el.setAttribute('opacity', `${nodeProgress}`);
    });

    if (!isStationNode) {
        nodeGroup.querySelectorAll<SVGTextElement>('text').forEach(textEl => {
            textEl.setAttribute('opacity', `${nodeProgress}`);
        });
        return;
    }

    const nameGroups = nodeGroup.querySelectorAll<SVGGElement>('g.rmp-name-outline');
    nameGroups.forEach(nameGroup => {
        nameGroup.querySelectorAll<SVGTextElement>('text').forEach(textEl => {
            const directText = textEl.childElementCount === 0 ? (textEl.textContent ?? '') : '';
            if (!directText) {
                textEl.setAttribute('opacity', `${textProgress}`);
                return;
            }

            const characters = Array.from(directText);
            textEl.textContent = '';
            textEl.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
            textEl.setAttribute('opacity', '1');
            textEl.setAttribute('fill-opacity', '1');
            textEl.setAttribute('stroke-opacity', '1');

            characters.forEach((character, index) => {
                const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                span.textContent = character;
                const charProgress = smoothstep(
                    index * NODE_TEXT_CHAR_STAGGER,
                    index * NODE_TEXT_CHAR_STAGGER + NODE_TEXT_CHAR_FADE,
                    textProgress
                );
                span.setAttribute('opacity', `${charProgress}`);
                span.setAttribute('fill-opacity', `${charProgress}`);
                span.setAttribute('stroke-opacity', `${charProgress}`);
                textEl.appendChild(span);
            });
        });
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
        if (Math.abs(a.x - b.x) > HORIZONTAL_GROUPING_THRESHOLD) {
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
        ...edges.map(id => ({ id, kind: 'edge' as const, reverse: getBaseEdgeReverse(graph, id) })),
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
    zoom: number
) => {
    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const cameraFocus = center ?? fallbackCenter;
    const zoomFactor = Math.max(zoom, 1) / 100;
    const viewportWidth = CAMERA_VIEWPORT_WIDTH / zoomFactor;
    const viewportHeight = CAMERA_VIEWPORT_HEIGHT / zoomFactor;

    elem.setAttribute(
        'viewBox',
        `${cameraFocus.x - viewportWidth / 2} ${cameraFocus.y - viewportHeight / 2} ${viewportWidth} ${viewportHeight}`
    );
    elem.setAttribute('width', VIDEO_EXPORT_OUTPUT_WIDTH.toString());
    elem.setAttribute('height', VIDEO_EXPORT_OUTPUT_HEIGHT.toString());
};

export const generateAnimationSequence = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): AnimationSequence => {
    const timeline = normalizeTimeline(graph.getAttribute('timeline'));
    if (timeline.length > 0) {
        const sequence = buildTimelineSequence(graph, timeline);
        if (sequence.steps.length > 0) {
            return sequence;
        }
    }
    return buildFallbackSequence(graph);
};

const applyEdgeProgress = (edgeElem: HTMLElement, progress: number, reverse: boolean) => {
    const pathElements = Array.from(edgeElem.querySelectorAll('path'));
    if (pathElements.length === 0) return;

    for (const pathElem of pathElements) {
        const totalLength = pathElem.getTotalLength();
        const dashLength = totalLength * progress;
        pathElem.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
        pathElem.setAttribute('stroke-dashoffset', reverse ? `${-(totalLength - dashLength)}` : '0');
    }
};

const getBasicStationsForFrame = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleEdges: Set<LineId>
): Set<StnId> => {
    const analysisGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    analysisGraph.import(structuredClone(graph.export()));

    const edgesToRemove: LineId[] = [];
    analysisGraph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        if (!visibleEdges.has(edgeId)) {
            edgesToRemove.push(edgeId);
        }
    });
    edgesToRemove.forEach(edgeId => analysisGraph.dropEdge(edgeId));

    const basicStations = new Set<StnId>();
    analysisGraph.forEachNode(node => {
        const nodeId = node as Id;
        if (!isStationNodeId(nodeId)) return;

        if (graph.directedEdges(nodeId).every(edgeId => !visibleEdges.has(edgeId as LineId))) {
            basicStations.add(nodeId);
            return;
        }

        checkAndChangeStationIntType(analysisGraph, nodeId);
        const nodeType = analysisGraph.getNodeAttribute(nodeId, 'type') as string | undefined;
        if (typeof nodeType === 'string' && nodeType.endsWith('-basic')) {
            basicStations.add(nodeId);
        }
    });

    return basicStations;
};

const applyFrameStationAppearance = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    basicStations: Set<StnId>
) => {
    basicStations.forEach(stationId => {
        const stationGroup = elem.getElementById(stationId);
        const markup = renderBasicStationMarkup(graph, stationId);
        if (!stationGroup || !markup) return;
        stationGroup.innerHTML = markup;
    });
};

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
    zoom: number,
    hideWatermark: boolean,
    isSystemFontsOnly: boolean,
    languages: TextLanguage[],
    existsNodeTypes: Set<any>
): Promise<{ elem: SVGSVGElement; width: number; height: number; cameraCenter: { x: number; y: number } }> => {
    const basicStations = getBasicStationsForFrame(graph, visibleEdges);
    const { elem } = await makeRenderReadySVGElement(
        graph,
        false,
        isSystemFontsOnly,
        languages,
        existsNodeTypes,
        2,
        true
    );

    graph.forEachNode(node => {
        if (!visibleNodes.has(node as NodeId)) {
            elem.getElementById(node)?.remove();
        }
    });

    applyFrameStationAppearance(graph, elem, basicStations);

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
            elem.getElementById(edgeId)?.remove();
            return;
        }

        const edgeElem = elem.getElementById(edgeId) as HTMLElement | null;
        if (!edgeElem) return;

        const progress = edgeProgress.get(edgeId) ?? 1;
        if (progress < 1) {
            applyEdgeProgress(edgeElem, progress, edgeDirections.get(edgeId) ?? false);
        }
    });

    graph.forEachNode(node => {
        const nodeId = node as NodeId;
        if (!visibleNodes.has(nodeId)) return;

        const nodeGroup = elem.getElementById(nodeId) as SVGElement | null;
        if (!nodeGroup) return;

        const revealProgress = nodeProgress.get(nodeId) ?? 1;
        const nodeTextProgress = textProgress.get(nodeId) ?? revealProgress;
        const transitionProgress = isStationNodeId(nodeId)
            ? getStationTransitionProgress(graph, focus, nodeId as StnId)
            : undefined;
        applyNodeRevealAnimation(
            nodeGroup,
            revealProgress,
            nodeTextProgress,
            transitionProgress,
            isStationNodeId(nodeId)
        );

        if (transitionProgress !== undefined && isStationNodeId(nodeId) && changedStations.has(nodeId)) {
            nodeGroup.setAttribute('opacity', `${clamp01(0.92 + transitionProgress * 0.08)}`);
        }
    });

    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const targetCenter = getCameraTargetPointForFrame(graph, elem, focus) ?? fallbackCenter;
    const nextCameraCenter = cameraCenter
        ? {
              x: cameraCenter.x + (targetCenter.x - cameraCenter.x) * CAMERA_FOCUS_SMOOTHING,
              y: cameraCenter.y + (targetCenter.y - cameraCenter.y) * CAMERA_FOCUS_SMOOTHING,
          }
        : targetCenter;

    applyCameraViewBox(graph, elem, nextCameraCenter, zoom);

    if (!hideWatermark) {
        elem.appendChild(await createVideoWatermarkElement(zoom));
    }

    return {
        elem,
        width: VIDEO_EXPORT_OUTPUT_WIDTH,
        height: VIDEO_EXPORT_OUTPUT_HEIGHT,
        cameraCenter: nextCameraCenter,
    };
};
const renderSVGToCanvas = async (
    svgElem: SVGSVGElement,
    width: number,
    height: number,
    isTransparent: boolean,
    bgColor: string
): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    if (!isTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }

    const svgString = svgElem.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
    const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas);
        };
        img.onerror = reject;
        img.src = src;
    });
};

export const exportVideo = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<any>,
    options: VideoExportOptions,
    bgColor: string,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    const { fps, duration, isTransparent, scale, isSystemFontsOnly, quality, hideWatermark } = options;
    const sequence = generateAnimationSequence(graph);

    if (sequence.steps.length === 0) {
        throw new Error('No timeline steps to animate');
    }

    const totalFrames = Math.max(1, Math.floor(fps * duration));
    const overviewFrames = Math.max(1, Math.round(totalFrames * 0.1));
    const animationFrames = Math.max(1, totalFrames - overviewFrames);
    const overviewZoom = getOverviewZoom(graph);
    const playbackSegments: PlaybackSegment[] = [];
    let previousEdgeForPause: LineId | undefined;
    sequence.steps.forEach(step => {
        if (step.kind === 'edge') {
            const edgeId = step.id as LineId;
            if (previousEdgeForPause && !sharesEdgeEndpoint(graph, previousEdgeForPause, edgeId)) {
                playbackSegments.push({
                    kind: 'pause',
                    previousEdgeId: previousEdgeForPause,
                    duration: EDGE_ANIMATION_RATIO * DISCONNECTED_EDGE_PAUSE_RATIO,
                });
            }
            playbackSegments.push({ kind: 'step', step, duration: EDGE_ANIMATION_RATIO });
            previousEdgeForPause = edgeId;
            return;
        }

        playbackSegments.push({ kind: 'step', step, duration: NODE_ANIMATION_RATIO });
    });
    const totalWeight = Math.max(
        playbackSegments.reduce<number>((sum, segment) => sum + segment.duration, 0),
        1
    );
    const cumulativeWeights: number[] = [];
    let runningWeight = 0;
    for (const segment of playbackSegments) {
        cumulativeWeights.push(runningWeight);
        runningWeight += segment.duration;
    }
    let cameraCenter: { x: number; y: number } | undefined;

    const videoWriter = new WebMWriter({
        quality: quality / 100,
        frameRate: fps,
        transparent: isTransparent,
    });
    const allNodes = new Set<NodeId>();
    const allEdges = new Set<LineId>();
    const allEdgeDirections = new Map<LineId, boolean>();
    graph.forEachNode(node => {
        allNodes.add(node as NodeId);
    });
    graph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        allEdges.add(edgeId);
        allEdgeDirections.set(edgeId, getBaseEdgeReverse(graph, edgeId));
    });
    let previousVisibleEdges = new Set<LineId>();
    const nodeFirstVisibleFrame = new Map<NodeId, number>();

    for (let frame = 0; frame < totalFrames; frame++) {
        const visibleNodes = new Set<NodeId>();
        const visibleEdges = new Set<LineId>();
        const nodeProgress = new Map<NodeId, number>();
        const textProgress = new Map<NodeId, number>();
        const edgeProgress = new Map<LineId, number>();
        const edgeDirections = new Map<LineId, boolean>();
        let focus: CameraFocus = { kind: 'none' };
        let nextZoom = scale;

        if (frame < animationFrames) {
            const frameProgress = animationFrames === 1 ? 1 : frame / (animationFrames - 1);
            const weightedProgress = frameProgress * totalWeight;
            let lastEdgeStartWeight = 0;
            let lastEdgeWeight = 0;

            playbackSegments.forEach((segment, index) => {
                const startWeight = cumulativeWeights[index];
                const weight = segment.duration;
                const endWeight = startWeight + weight;

                if (segment.kind === 'step' && segment.step.kind === 'edge') {
                    lastEdgeStartWeight = startWeight;
                    lastEdgeWeight = weight;
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
                    const activationWeight =
                        index === 0 || lastEdgeWeight === 0
                            ? 0
                            : lastEdgeStartWeight + lastEdgeWeight * NODE_CAMERA_OVERLAP_RATIO;
                    if (weightedProgress >= activationWeight) {
                        const nodeId = step.id as NodeId;
                        visibleNodes.add(nodeId);
                        if (!nodeFirstVisibleFrame.has(nodeId)) {
                            nodeFirstVisibleFrame.set(nodeId, frame);
                        }
                        const nodeStartFrame = nodeFirstVisibleFrame.get(nodeId) ?? frame;
                        nodeProgress.set(nodeId, getNodeRevealProgress(frame, nodeStartFrame, fps));
                        textProgress.set(nodeId, getNodeTextRevealProgress(frame, nodeStartFrame, fps));
                        focus = { kind: 'node', id: nodeId };
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
            const overviewProgress = overviewFrames === 1 ? 1 : (frame - animationFrames) / (overviewFrames - 1);
            const overviewT = smoothstep(0, 1, overviewProgress);
            nextZoom = scale + (overviewZoom - scale) * overviewT;
            allNodes.forEach(nodeId => {
                visibleNodes.add(nodeId);
                nodeProgress.set(nodeId, 1);
                textProgress.set(nodeId, 1);
            });
            allEdges.forEach(edgeId => {
                visibleEdges.add(edgeId);
                edgeDirections.set(edgeId, allEdgeDirections.get(edgeId) ?? false);
                edgeProgress.set(edgeId, 1);
            });
        }

        const previousBasicStations = getBasicStationsForFrame(graph, previousVisibleEdges);

        const {
            elem,
            width,
            height,
            cameraCenter: nextCameraCenter,
        } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            nodeProgress,
            textProgress,
            edgeProgress,
            edgeDirections,
            focus,
            cameraCenter,
            previousBasicStations,
            nextZoom,
            hideWatermark,
            isSystemFontsOnly,
            languages,
            existsNodeTypes
        );
        cameraCenter = nextCameraCenter;
        const canvas = await renderSVGToCanvas(elem, width, height, isTransparent, bgColor);
        videoWriter.addFrame(canvas);
        elem.remove();

        if (onProgress) {
            onProgress((frame + 1) / totalFrames);
        }

        previousVisibleEdges = new Set(visibleEdges);
    }

    return await videoWriter.complete();
};
