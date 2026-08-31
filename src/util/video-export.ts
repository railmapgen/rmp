import WebMWriter from 'webm-writer';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import store from '../redux';
import {
    EdgeAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    NodeType,
    StnId,
} from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { ActionRow, CloseNodeStyle, LineGroup, TimelineDiff, TimelineLine } from '../constants/timeline';
import allStations from '../components/svgs/stations/stations';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import { getNodeVersion } from './timeline';
import { makeRenderReadySVGElement } from './download';
import { TextLanguage } from './fonts';
import { calculateCanvasSize } from './helpers';
import { getActionDuration, isQuickCompleteAction, scheduleActionRows } from './action-schedule';

export interface VideoExportOptions {
    fps?: number;
    quality?: number;
    format?: 'webm' | 'mp4';
    duration?: number;
    isTransparent?: boolean;
    scale?: number;
    isSystemFontsOnly?: boolean;
    timelineDiffs?: TimelineDiff[];
    existsNodeTypes?: Set<NodeType>;
    /** Action rows for animation sequencing */
    actionRows?: ActionRow[];
    /** Timeline line segments (references graph elements) */
    timelineLines?: TimelineLine[];
    /** Line groups (color + name) */
    lineGroups?: LineGroup[];
    /** 当前画布中的地图图层快照 */
    mapLayerMarkup?: string;
    /** Abort signal — aborting cancels the export (throws an AbortError) */
    signal?: AbortSignal;
}

/**
 * Throw a DOMException named 'AbortError' when the export has been aborted.
 * The caller can distinguish it from real failures via `error.name === 'AbortError'`.
 * An optional cleanup callback runs right before the throw (e.g. to stop a MediaRecorder).
 */
const throwIfAborted = (signal?: AbortSignal, cleanup?: () => void): void => {
    if (signal?.aborted) {
        cleanup?.();
        throw new DOMException('The video export was aborted.', 'AbortError');
    }
};

export interface AnimationStep {
    id: Id;
    kind: 'node' | 'edge';
    reverse: boolean;
    version?: number;
}

export interface AnimationPhase {
    type: 'open' | 'close' | 'overview' | 'wait' | 'focus';
    actionRowIndex: number;
    elements: AnimationStep[];
    activeLineIds: string[];
    date: string;
    remark: string;
    /** Weight units for frame distribution */
    durationWeight: number;
    /** User-set action duration in seconds (t in the speed formula) */
    duration: number;
    /** User-set station animation duration in seconds */
    nodeAnimationDuration: number;
    focusTarget?: AnimationStep;
    /** 聚焦时并行批次的全部目标元素 */
    focusTargets?: AnimationStep[];
    /** 聚焦时并行批次目标元素的联合包围盒 */
    focusTargetBounds?: GraphBounds;
    /** 聚焦目标动作批次，用于在整个批次内保持目标中心 */
    focusTargetBatch?: number;
    /** 该 open/close 动作目标线路段所属线路组 id（用于左上角线路徽章） */
    targetGroupId?: string;
    /** 停运后多版本换乘站的显示与版本配置 */
    closeNodeStyles?: Record<NodeId, CloseNodeStyle>;
    startTime: number;
    endTime: number;
    batchIndex: number;
    quickComplete?: boolean;
}

const getActionLineCounts = (line: TimelineLine | undefined) => ({
    stationCount: line?.elements.filter(element => isStationNodeId(element.id)).length ?? 0,
    edgeCount: line?.elements.filter(element => isLineId(element.id)).length ?? 0,
});

export const getActionLineMinimumDuration = (line: TimelineLine | undefined, nodeAnimationDuration = 1): number => {
    if (!line) return Math.max(0.1, nodeAnimationDuration);
    const { stationCount, edgeCount } = getActionLineCounts(line);
    return Math.max(0.1, stationCount * nodeAnimationDuration + edgeCount * 0.5);
};

export const getActionLineSuggestedDuration = (line: TimelineLine | undefined, nodeAnimationDuration = 1): number => {
    if (!line) return Math.max(0.1, nodeAnimationDuration);
    const { stationCount, edgeCount } = getActionLineCounts(line);
    return Math.max(0.1, stationCount * nodeAnimationDuration + edgeCount);
};

// ── Constants ──────────────────────────────────────────────────────────────────

const EDGE_ANIMATION_RATIO = 1;
const NODE_REVEAL_RATIO = 1;
const HORIZONTAL_GROUPING_THRESHOLD = 50;
const CAMERA_VIEWPORT_ZOOM = 40;
const CAMERA_VIEWPORT_ASPECT_RATIO = 16 / 9;
const CAMERA_VIEWPORT_BASE_HEIGHT = 360;
const VIDEO_EXPORT_OUTPUT_HEIGHT = 720;
const CAMERA_SAFE_INSETS = { top: 48, right: 264, bottom: 112, left: 204 };
const VIDEO_EXPORT_OUTPUT_WIDTH = VIDEO_EXPORT_OUTPUT_HEIGHT * CAMERA_VIEWPORT_ASPECT_RATIO;
const NODE_CAMERA_OVERLAP_RATIO = 0.5;
// 镜头惯性系统：弹簧-阻尼模型
// 每帧：velocity += (target - position) * stiffness; velocity *= damping; position += velocity
// 目标移动时镜头平滑追赶并带有速度延续（惯性），停顿时轻微回弹后静止，观感丝滑
const CAMERA_SPRING_STIFFNESS = 0.045;
const CAMERA_VELOCITY_DAMPING = 0.8;
/** 镜头每帧最大位移（视口宽度的比例）：限制长距离跳变时的峰值速度，避免镜头"甩"过目标 */
const CAMERA_MAX_VELOCITY_RATIO = 0.025;
/** 镜头距目标小于该世界距离时直接吸附（消除到达后的微小振荡/回摆） */
const CAMERA_SNAP_DISTANCE = 2;
/** 段间镜头预瞄的最大时长（秒）：保证镜头在下一段开始前基本就位，避免追焦点导致路径混乱 */
const CAMERA_PREVIEW_MAX_SECONDS = 2.5;
const CAMERA_VIEWPORT_HEIGHT = (CAMERA_VIEWPORT_BASE_HEIGHT * CAMERA_VIEWPORT_ZOOM) / 100;
const CAMERA_VIEWPORT_WIDTH = CAMERA_VIEWPORT_HEIGHT * CAMERA_VIEWPORT_ASPECT_RATIO;
const CAMERA_SAFE_WIDTH = VIDEO_EXPORT_OUTPUT_WIDTH - CAMERA_SAFE_INSETS.left - CAMERA_SAFE_INSETS.right;
const CAMERA_SAFE_HEIGHT = VIDEO_EXPORT_OUTPUT_HEIGHT - CAMERA_SAFE_INSETS.top - CAMERA_SAFE_INSETS.bottom;
const CAMERA_SAFE_VIEWPORT_WIDTH = CAMERA_VIEWPORT_WIDTH * (CAMERA_SAFE_WIDTH / VIDEO_EXPORT_OUTPUT_WIDTH);
const CAMERA_SAFE_VIEWPORT_HEIGHT = CAMERA_VIEWPORT_HEIGHT * (CAMERA_SAFE_HEIGHT / VIDEO_EXPORT_OUTPUT_HEIGHT);
const OVERVIEW_ZOOM_RATIO = 0.1;
const OVERVIEW_FRAME_RATIO = 0;
const EDGE_STEP_WEIGHT = 1;
const NODE_STEP_WEIGHT = 0.3;
const PAUSE_WEIGHT = 0.5;
/** Extra seconds appended at the end for the overview zoom-out */
export const VIDEO_OVERVIEW_SECONDS = 0;

/**
 * 聚焦动作完成后，下一段开通/停运阶段镜头的定位策略：
 * - 'nextLineStart'（默认）：聚焦结束后镜头保持在"下一条线路起点"（聚焦目标），
 *   并随开通动画继续跟随绘制元素，视觉上"聚焦目标 → 该目标继续绘制"，衔接最自然，
 *   适合聚焦即预告下一条线路绘制顺序的叙事。
 * - 'pullBackCenter'：聚焦结束后镜头平滑拉回当前所有可见元素的中心（不改变缩放），
 *   强调全局布局、让观众先看到整体，适合"聚焦示意后回到全景再绘制"的演示风格。
 * 修改该常量即可切换两种行为（供测试与选择）。
 */
export type FocusEndPolicy = 'nextLineStart' | 'pullBackCenter';
export const FOCUS_END_POLICY: FocusEndPolicy = 'nextLineStart';

// ── Types ──────────────────────────────────────────────────────────────────────

type CameraFocus =
    | { kind: 'none' }
    | { kind: 'overview'; center: { x: number; y: number } }
    | { kind: 'node'; id: NodeId }
    | { kind: 'edge'; id: LineId; progress: number; reverse: boolean }
    | { kind: 'center'; center: { x: number; y: number } };

type NodeAnimationState = 'not-drawn' | 'drawing' | 'drawn';

type ElementAnimation = {
    kind: 'node' | 'edge';
    progress: number;
    quickComplete?: boolean;
    textProgress: number;
    reverse: boolean;
    state: NodeAnimationState;
    versionTransition?: { from: number; progress: number };
};

// ── Utility helpers ────────────────────────────────────────────────────────────

const isNodeId = (id: Id): id is NodeId => id.startsWith('stn_') || id.startsWith('misc_node_');
const isStationNodeId = (id: Id): id is StnId => id.startsWith('stn_');
const isLineId = (id: Id): id is LineId => id.startsWith('line_');

const isVirtualNode = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, id: Id): boolean =>
    isNodeId(id) && graph.hasNode(id) && graph.getNodeAttribute(id as NodeId, 'type') === MiscNodeType.Virtual;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const smoothstep = (edge0: number, edge1: number, x: number): number => {
    if (edge0 === edge1) return x >= edge1 ? 1 : 0;
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

// 判断 SVG 元素的填充/描边是否为"线路色标识"（非白色、非透明、非渐变引用）。
// 用于换乘站圆点、站牌、箭头等彩色标识的动画优先级区分。
const isColoredElement = (value: string | null): boolean =>
    !!value &&
    value !== 'none' &&
    value !== 'transparent' &&
    value !== 'white' &&
    value !== '#fff' &&
    value !== '#ffffff' &&
    !value.startsWith('url(') &&
    !value.startsWith('var(');

const getNodeRevealProgress = (frame: number, startFrame: number, fps: number, durationSeconds = 1): number => {
    const revealFrames = Math.max(1, Math.round(fps * durationSeconds));
    return clamp01((frame - startFrame) / revealFrames);
};

const getNodeTextRevealProgress = (frame: number, startFrame: number, fps: number, durationSeconds = 1): number => {
    const revealFrames = Math.max(1, Math.round(fps * durationSeconds));
    return clamp01((frame - startFrame) / revealFrames);
};

// ── Animation phase generation from action rows ─────────────────────────────────

/**
 * Build animation phases from action rows.
 * Each action row becomes a phase with its TimelineLine elements resolved.
 */
export function buildAnimationPhases(
    actionRows: ActionRow[],
    lines: TimelineLine[],
    _graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): AnimationPhase[] {
    const schedule = scheduleActionRows(actionRows, actionRows.map(getActionDuration));
    const phases: AnimationPhase[] = [];
    // 按动作顺序自动推导已开通的线路组（不再读取用户手动维护的 activeLineIds）
    const openedGroupIds: Set<string> = new Set();

    for (let i = 0; i < actionRows.length; i++) {
        const action = actionRows[i];
        const elements: AnimationStep[] = [];
        let targetGroupId: string | undefined;

        if (action.actionType === 'open' || action.actionType === 'close') {
            if (action.actionLineId) {
                const timelineLine = lines.find(l => l.id === action.actionLineId);
                if (timelineLine) {
                    for (const elem of timelineLine.elements) {
                        if (isVirtualNode(_graph, elem.id)) continue;
                        const kind = isNodeId(elem.id) ? 'node' : 'edge';
                        if (kind === 'node' && !_graph.hasNode(elem.id as NodeId)) continue;
                        if (kind === 'edge' && !_graph.hasEdge(elem.id as LineId)) continue;
                        elements.push({
                            id: elem.id as Id,
                            kind,
                            reverse: elem.reverse ?? false,
                            ...(kind === 'node' ? { version: elem.version ?? 1 } : {}),
                        });
                    }
                    if (timelineLine.groupId) {
                        targetGroupId = timelineLine.groupId;
                        if (action.actionType === 'open') openedGroupIds.add(timelineLine.groupId);
                        else openedGroupIds.delete(timelineLine.groupId);
                    }
                }
            }
        }

        const baseWeight = getActionDuration(action);
        const durationWeight = baseWeight;

        const focusTargetAction =
            action.actionType === 'focus'
                ? actionRows
                      .slice(i + 1)
                      .find(next => (next.actionType === 'open' || next.actionType === 'close') && next.actionLineId)
                : undefined;
        const focusTargetBatch = focusTargetAction
            ? schedule.entries[actionRows.indexOf(focusTargetAction)]?.batchIndex
            : undefined;
        const focusTargetActions =
            focusTargetBatch === undefined
                ? []
                : actionRows.filter((next, nextIndex) => {
                      const entry = schedule.entries[nextIndex];
                      return (
                          entry?.batchIndex === focusTargetBatch &&
                          (next.actionType === 'open' || next.actionType === 'close') &&
                          next.actionLineId
                      );
                  });
        const focusTargets = Array.from(
            focusTargetActions
                .reduce((targets, next) => {
                    const targetLine = lines.find(line => line.id === next.actionLineId);
                    const targetElements =
                        next.actionType === 'close'
                            ? [...(targetLine?.elements ?? [])].reverse()
                            : targetLine?.elements;
                    (targetElements ?? [])
                        .filter(element => !isVirtualNode(_graph, element.id))
                        .forEach(element => {
                            const target = {
                                id: element.id as Id,
                                kind: isNodeId(element.id) ? ('node' as const) : ('edge' as const),
                                reverse: element.reverse ?? false,
                            };
                            if (!targets.has(target.id)) targets.set(target.id, target);
                        });
                    return targets;
                }, new Map<Id, AnimationStep>())
                .values()
        );
        const focusTarget = focusTargets[0];
        const targetLine = focusTargetAction
            ? lines.find(line => line.id === focusTargetAction.actionLineId)
            : undefined;
        // 停运按线路元素的反向顺序播放；聚焦必须预先定位到反向播放的首个元素（终点），
        // 而不是一律取正向第一个元素（起点）。
        const targetElements =
            focusTargetAction?.actionType === 'close'
                ? [...(targetLine?.elements ?? [])].reverse()
                : targetLine?.elements;
        const targetElement = targetElements?.find(element => !isVirtualNode(_graph, element.id));

        phases.push({
            type: action.actionType,
            actionRowIndex: i,
            elements,
            activeLineIds: [...openedGroupIds],
            date: action.date || '',
            remark: action.remark || '',
            durationWeight,
            duration: action.actionType === 'open' || action.actionType === 'close' ? durationWeight : baseWeight,
            focusTarget: targetElement
                ? {
                      id: targetElement.id as Id,
                      kind: isNodeId(targetElement.id) ? 'node' : 'edge',
                      reverse: targetElement.reverse ?? false,
                  }
                : undefined,
            focusTargets: action.actionType === 'focus' ? focusTargets : undefined,
            focusTargetBounds: action.actionType === 'focus' ? getElementBounds(_graph, focusTargets) : undefined,
            focusTargetBatch: action.actionType === 'focus' ? focusTargetBatch : undefined,
            targetGroupId,
            nodeAnimationDuration:
                action.actionType === 'open' || action.actionType === 'close'
                    ? Math.max(0.1, action.nodeAnimationDuration ?? 1)
                    : 1,
            closeNodeStyles: action.actionType === 'close' ? action.closeNodeStyles : undefined,
            startTime: schedule.entries[i].startTime,
            endTime: schedule.entries[i].endTime,
            batchIndex: schedule.entries[i].batchIndex,
            quickComplete: isQuickCompleteAction(action),
        });
    }

    return phases;
}

/**
 * Compute the total animation duration (seconds) for the given action rows.
 * Each phase contributes its effective durationWeight — the user-set duration
 * (t), or the minimum time required to animate all of its elements when t is
 * too short. The video export modal adds VIDEO_OVERVIEW_SECONDS on top of this
 * for the final zoom-out overview.
 */
export const getActionRowsTotalDuration = (
    actionRows: ActionRow[],
    lines: TimelineLine[],
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): number => {
    const phases = buildAnimationPhases(actionRows, lines, graph);
    return phases.reduce((max, phase) => Math.max(max, phase.endTime), 0);
};

/**
 * Fallback: Build a spatial-sorted animation sequence when no action rows exist.
 */
export function buildFallbackSequence(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): AnimationStep[] {
    const nodePositions: Array<{ id: NodeId; x: number; y: number }> = [];
    graph.forEachNode((node, attr) => {
        if (attr.type !== MiscNodeType.Virtual) nodePositions.push({ id: node as NodeId, x: attr.x, y: attr.y });
    });

    nodePositions.sort((a, b) => {
        if (Math.abs(a.x - b.x) > HORIZONTAL_GROUPING_THRESHOLD) return a.x - b.x;
        return a.y - b.y;
    });

    const nodes = nodePositions.map(n => n.id);
    const edgeList: Array<{ id: LineId; sourceIndex: number; targetIndex: number }> = [];
    graph.forEachEdge((edge, _attr, source, target) => {
        edgeList.push({
            id: edge as LineId,
            sourceIndex: nodes.indexOf(source as NodeId),
            targetIndex: nodes.indexOf(target as NodeId),
        });
    });
    edgeList.sort((a, b) => Math.max(a.sourceIndex, a.targetIndex) - Math.max(b.sourceIndex, b.targetIndex));

    return [
        ...nodes.map(id => ({ id, kind: 'node' as const, reverse: false })),
        ...edgeList.map(edge => ({ id: edge.id, kind: 'edge' as const, reverse: false })),
    ];
}

// ── Overview zoom ──────────────────────────────────────────────────────────────

const getOverviewZoom = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): number => {
    const bounds = calculateCanvasSize(graph);
    const graphWidth = Math.max(bounds.xMax - bounds.xMin, 1);
    const graphHeight = Math.max(bounds.yMax - bounds.yMin, 1);
    const fitWidthZoom = (CAMERA_SAFE_VIEWPORT_WIDTH / (graphWidth * 1.12)) * 100;
    const fitHeightZoom = (CAMERA_SAFE_VIEWPORT_HEIGHT / (graphHeight * 1.12)) * 100;
    return Math.max(0.1, Math.min(100, Math.min(fitWidthZoom, fitHeightZoom)));
};

const getVisibleBounds = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>
) => {
    const points: Array<{ x: number; y: number }> = [];
    visibleNodes.forEach(id => {
        if (!graph.hasNode(id)) return;
        const attr = graph.getNodeAttributes(id);
        points.push({ x: attr.x, y: attr.y });
    });
    visibleEdges.forEach(id => {
        if (!graph.hasEdge(id)) return;
        const [source, target] = graph.extremities(id);
        if (graph.hasNode(source)) {
            const attr = graph.getNodeAttributes(source);
            points.push({ x: attr.x, y: attr.y });
        }
        if (graph.hasNode(target)) {
            const attr = graph.getNodeAttributes(target);
            points.push({ x: attr.x, y: attr.y });
        }
    });
    if (points.length === 0) {
        const bounds = calculateCanvasSize(graph);
        return {
            xMin: bounds.xMin,
            xMax: bounds.xMax,
            yMin: bounds.yMin,
            yMax: bounds.yMax,
        };
    }
    return {
        xMin: Math.min(...points.map(point => point.x)),
        xMax: Math.max(...points.map(point => point.x)),
        yMin: Math.min(...points.map(point => point.y)),
        yMax: Math.max(...points.map(point => point.y)),
    };
};

const getVisibleOverviewZoom = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>
): number => {
    const bounds = getVisibleBounds(graph, visibleNodes, visibleEdges);
    const width = Math.max(bounds.xMax - bounds.xMin, 1);
    const height = Math.max(bounds.yMax - bounds.yMin, 1);
    return Math.max(
        0.1,
        Math.min(
            100,
            Math.min(
                (CAMERA_SAFE_VIEWPORT_WIDTH / (width * 1.12)) * 100,
                (CAMERA_SAFE_VIEWPORT_HEIGHT / (height * 1.12)) * 100
            )
        )
    );
};

const getVisibleCenter = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>
) => {
    const bounds = getVisibleBounds(graph, visibleNodes, visibleEdges);
    return { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2 };
};

/**
 * 基于"内容世界包围盒"计算全览安全相机。
 * bounds 应涵盖所有需展示的元素边界（节点、边端点以及站名文本等），
 * 本函数仅负责把该包围盒映射到扣除 HUD 后的安全矩形，不关心包围盒如何得到。
 */
const computeSafeCameraFromBounds = (bounds: GraphBounds): { center: { x: number; y: number }; zoom: number } => {
    const bboxW = Math.max(bounds.xMax - bounds.xMin, 1);
    const bboxH = Math.max(bounds.yMax - bounds.yMin, 1);

    // 输出像素安全矩形（像素坐标，左上角为原点）
    const safeL = CAMERA_SAFE_INSETS.left;
    const safeT = CAMERA_SAFE_INSETS.top;
    const safeR = VIDEO_EXPORT_OUTPUT_WIDTH - CAMERA_SAFE_INSETS.right;
    const safeB = VIDEO_EXPORT_OUTPUT_HEIGHT - CAMERA_SAFE_INSETS.bottom;
    const safeW = safeR - safeL;
    const safeH = safeB - safeT;

    // 世界单位/像素：让内容在安全矩形内额外留 12% 余量（与既有观感一致）
    const scale = Math.max(bboxW / safeW, bboxH / safeH) * 1.12;

    // zoom = CAMERA_VIEWPORT_HEIGHT * 100 / (scale * OUTPUT_HEIGHT)
    const zoom = (CAMERA_VIEWPORT_HEIGHT * 100) / (scale * VIDEO_EXPORT_OUTPUT_HEIGHT);

    const halfW = VIDEO_EXPORT_OUTPUT_WIDTH / 2;
    const halfH = VIDEO_EXPORT_OUTPUT_HEIGHT / 2;

    // 中心可行区间（保证 px 落在 [safeL, safeR]、py 落在 [safeT, safeB]），取中点避免偏向一侧
    const cxMin = bounds.xMax + (halfW - safeR) * scale;
    const cxMax = bounds.xMin + (halfW - safeL) * scale;
    const cyMin = bounds.yMax + (halfH - safeB) * scale;
    const cyMax = bounds.yMin + (halfH - safeT) * scale;

    return {
        center: { x: (cxMin + cxMax) / 2, y: (cyMin + cyMax) / 2 },
        zoom,
    };
};

const getSafeOverviewCamera = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>
): { center: { x: number; y: number }; zoom: number } =>
    computeSafeCameraFromBounds(getVisibleBounds(graph, visibleNodes, visibleEdges));

// ── 内容包围盒测量（纳入站名文本等真实渲染宽度） ─────────────────────────────────

/** 离屏测量容器：隐藏于视口外，用于让克隆 SVG 完成布局后读取 getBBox() */
let measureContentContainer: HTMLDivElement | null = null;
const getMeasureContentContainer = (): HTMLDivElement => {
    if (!measureContentContainer) {
        measureContentContainer = document.createElement('div');
        measureContentContainer.setAttribute('aria-hidden', 'true');
        measureContentContainer.style.position = 'fixed';
        measureContentContainer.style.left = '-100000px';
        measureContentContainer.style.top = '-100000px';
        measureContentContainer.style.width = '0';
        measureContentContainer.style.height = '0';
        measureContentContainer.style.overflow = 'hidden';
        measureContentContainer.style.pointerEvents = 'none';
        document.body.appendChild(measureContentContainer);
    }
    return measureContentContainer;
};

/**
 * 测量当前帧实际渲染内容（节点、边、站名文本等，不含背景地图层）在世界坐标系中的包围盒。
 * getVisibleBounds 只采样节点/边端点坐标，会漏掉站名文本标签的宽度；全览时若只用端点坐标，
 * 长站名（如"广州火车站"）会向左溢出、被左上统计卡片遮挡。这里改为读取真实渲染盒。
 */
const measureFrameContentBounds = (elem: SVGSVGElement): GraphBounds | null => {
    const mapLayer = elem.querySelector('[data-map-layer]');
    if (mapLayer) (mapLayer as SVGElement).setAttribute('visibility', 'hidden');
    try {
        const container = getMeasureContentContainer();
        container.appendChild(elem);
        const bbox = elem.getBBox();
        elem.remove();
        if (!bbox || (bbox.width === 0 && bbox.height === 0)) return null;
        return { xMin: bbox.x, xMax: bbox.x + bbox.width, yMin: bbox.y, yMax: bbox.y + bbox.height };
    } catch {
        elem.remove();
        return null;
    } finally {
        if (mapLayer) (mapLayer as SVGElement).setAttribute('visibility', '');
    }
};

const getElementBounds = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elements: AnimationStep[]
): GraphBounds | undefined => {
    const nodes = new Set<NodeId>();
    const edges = new Set<LineId>();
    elements.forEach(element =>
        element.kind === 'node' ? nodes.add(element.id as NodeId) : edges.add(element.id as LineId)
    );
    if (nodes.size === 0 && edges.size === 0) return undefined;
    return getVisibleBounds(graph, nodes, edges);
};

const getBoundsFitZoom = (bounds: GraphBounds): number => {
    const width = Math.max(bounds.xMax - bounds.xMin, 1);
    const height = Math.max(bounds.yMax - bounds.yMin, 1);
    return Math.max(
        8,
        Math.min(
            100,
            Math.min(
                (CAMERA_SAFE_VIEWPORT_WIDTH / (width * 1.12)) * 100,
                (CAMERA_SAFE_VIEWPORT_HEIGHT / (height * 1.12)) * 100
            )
        )
    );
};

// ── Edge progress animation ────────────────────────────────────────────────────

const applyEdgeProgress = (edgeElem: HTMLElement, progress: number, reverse: boolean) => {
    const pathElements = Array.from(edgeElem.querySelectorAll('path'));
    if (pathElements.length === 0) return;
    const clampedProgress = clamp01(progress);
    for (const pathElem of pathElements) {
        const totalLength = pathElem.getTotalLength();
        if (totalLength <= 0) continue;
        const dashLength = totalLength * clampedProgress;
        pathElem.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
        pathElem.setAttribute('stroke-dashoffset', reverse ? `${-(totalLength - dashLength)}` : '0');
    }
    edgeElem.querySelectorAll<SVGElement>('*').forEach(element => {
        element.setAttribute('visibility', clampedProgress > 0 ? 'visible' : 'hidden');
    });
};

// ── Node reveal animation ──────────────────────────────────────────────────────

const applyNodeRevealAnimation = (
    nodeGroup: SVGElement,
    nodeProgress: number,
    textProgress: number,
    isStation: boolean
) => {
    const dotProgress = isStation ? clamp01(nodeProgress / 0.35) : nodeProgress;
    const graphicProgress = isStation ? clamp01((nodeProgress - 0.35) / 0.65) : nodeProgress;
    const visualElements = nodeGroup.querySelectorAll<SVGElement>(
        'path, circle, rect, ellipse, polygon, polyline, line'
    );
    visualElements.forEach(el => {
        // 线路色标识（换乘站圆点、站牌、线路箭头等带彩色填充/描边的元素）使用 dotProgress
        // 优先快速显示，白色遮罩、黑白图形跟随主体 graphicProgress 渐显。
        // 避免依赖"第一个 circle"猜测圆点导致的特定类型换乘站圆点渐显后消失。
        if (el.id.startsWith('stn_core_') || el.getAttribute('fill') === 'transparent') return;
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        const isStationDot =
            isStation && el.tagName.toLowerCase() === 'circle' && (isColoredElement(fill) || isColoredElement(stroke));
        const isLineColorElement = isStationDot || isColoredElement(fill) || isColoredElement(stroke);
        el.setAttribute('opacity', `${isLineColorElement ? dotProgress : graphicProgress}`);
    });

    if (!isStation) {
        nodeGroup.querySelectorAll<SVGTextElement>('text').forEach(textEl => {
            textEl.setAttribute('opacity', `${nodeProgress}`);
        });
        return;
    }

    // 车站文本：g[id^="stn_name_"] 是所有车站共有的站名容器（导出时 rmp-name-outline class 会被移除，
    // 因此不能依赖 class 定位），另以 rmp-name-outline 兜底兼容特殊结构。
    const nameTexts: SVGTextElement[] = [];
    nodeGroup.querySelectorAll<SVGGElement>('g[id^="stn_name_"]').forEach(g => {
        g.querySelectorAll<SVGTextElement>('text').forEach(t => nameTexts.push(t));
    });
    nodeGroup.querySelectorAll<SVGTextElement>('text.rmp-name-outline').forEach(t => {
        if (!nameTexts.includes(t)) nameTexts.push(t);
    });

    nameTexts.forEach(textEl => {
        // 每帧 SVG 均为全新克隆：首次遇到时保存原始文本并拆分为逐字符 tspan
        const savedText = textEl.getAttribute('data-rmp-animation-text');
        if (!savedText && textEl.childElementCount === 0 && textEl.textContent) {
            textEl.setAttribute('data-rmp-animation-text', textEl.textContent);
            textEl.textContent = '';
            textEl.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
            Array.from(textEl.getAttribute('data-rmp-animation-text') ?? '').forEach(character => {
                const span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                span.textContent = character;
                textEl.appendChild(span);
            });
        }
        const opacity = `${clamp01(textProgress)}`;
        textEl.setAttribute('opacity', opacity);
        textEl.setAttribute('fill-opacity', opacity);
        textEl.setAttribute('stroke-opacity', opacity);
        const spans = Array.from(textEl.querySelectorAll<SVGTSpanElement>('tspan'));
        const charCount = spans.length;
        spans.forEach((span, index) => {
            // 字符时间窗口按字符数量均分到 [0,1] 总进度：
            // 无论站名长短，全部字符都能在 1 秒内播完，最后一个字符在 textProgress=1 时完整显示。
            const charStart = charCount > 1 ? index / charCount : 0;
            const charEnd = charCount > 1 ? (index + 1) / charCount : 1;
            const charProgress = smoothstep(charStart, charEnd, textProgress);
            span.setAttribute('opacity', `${charProgress}`);
            span.setAttribute('fill-opacity', `${charProgress}`);
            span.setAttribute('stroke-opacity', `${charProgress}`);
        });
    });
};

// ── Camera system ──────────────────────────────────────────────────────────────

const getNodeFocusPoint = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
) => {
    if (!graph.hasNode(nodeId)) return undefined;
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
    const paths = edgeElem ? Array.from(edgeElem.querySelectorAll<SVGPathElement>('path')) : [];
    if (paths.length > 0) {
        const lengths = paths.map(path => path.getTotalLength());
        const totalLength = lengths.reduce((sum, length) => sum + length, 0);
        let distance = totalLength * (reverse ? 1 - progress : progress);
        for (let i = 0; i < paths.length; i++) {
            if (distance <= lengths[i] || i === paths.length - 1) {
                try {
                    const point = paths[i].getPointAtLength(Math.max(0, Math.min(lengths[i], distance)));
                    return { x: point.x, y: point.y };
                } catch {
                    break;
                }
            }
            distance -= lengths[i];
        }
    }
    if (graph.hasEdge(edgeId)) {
        const [source, target] = graph.extremities(edgeId);
        const focusNode = reverse ? target : source;
        if (graph.hasNode(focusNode as NodeId)) return getNodeFocusPoint(graph, focusNode as NodeId);
    }
    return undefined;
};

const getCameraTargetPointForFrame = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    focus: CameraFocus
) => {
    if (focus.kind === 'overview') return focus.center;
    if (focus.kind === 'center') return focus.center;
    if (focus.kind === 'node') return getNodeFocusPoint(graph, focus.id);
    if (focus.kind === 'edge') return getEdgeFocusPoint(graph, elem, focus.id, focus.progress, focus.reverse);
    return undefined;
};

/**
 * 获取焦点的大致目标点（不依赖 SVG 元素，边用端点近似）。
 * 用于段间预瞄时按距离动态计算预瞄时长，保证镜头在下一段开始前基本就位。
 */
const getFocusApproxPoint = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    step: { kind: 'node' | 'edge'; id: Id; reverse?: boolean }
): { x: number; y: number } | undefined => {
    if (step.kind === 'node') {
        if (!graph.hasNode(step.id as NodeId)) return undefined;
        const attr = graph.getNodeAttributes(step.id as NodeId);
        return { x: attr.x, y: attr.y };
    }
    if (!graph.hasEdge(step.id as LineId)) return undefined;
    const [source, target] = graph.extremities(step.id as LineId);
    const nodeId = step.reverse ? target : source;
    if (!graph.hasNode(nodeId as NodeId)) return undefined;
    const attr = graph.getNodeAttributes(nodeId as NodeId);
    return { x: attr.x, y: attr.y };
};

const applyCameraViewBox = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    elem: SVGSVGElement,
    center: { x: number; y: number },
    effectiveZoom: number
) => {
    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const cameraFocus = center ?? fallbackCenter;
    const zoomFactor = Math.max(effectiveZoom, 0.1) / 100;
    const viewportWidth = CAMERA_VIEWPORT_WIDTH / zoomFactor;
    const viewportHeight = CAMERA_VIEWPORT_HEIGHT / zoomFactor;
    // 主画布始终居中，不做额外偏移。HUD（createVideoInfoOverlay）也用同一个 cameraFocus，
    // 两者坐标系完全对齐，内容居中于安全矩形内，不会被 HUD 遮挡。
    elem.setAttribute(
        'viewBox',
        `${cameraFocus.x - viewportWidth / 2} ${cameraFocus.y - viewportHeight / 2} ${viewportWidth} ${viewportHeight}`
    );
    elem.setAttribute('width', VIDEO_EXPORT_OUTPUT_WIDTH.toString());
    elem.setAttribute('height', VIDEO_EXPORT_OUTPUT_HEIGHT.toString());
};

// ── Video info overlay ─────────────────────────────────────────────────────────

/** Bounding box in world coordinates */
interface GraphBounds {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

const createVideoInfoOverlay = (
    date: string,
    remark: string,
    badgeGroup: { bgColor: string; text: string } | null | undefined,
    activeLineGroups: LineGroup[],
    visibleStationCount: number,
    mileage: number,
    fullGraphSnapshot: SVGSVGElement | null,
    cameraCenter: { x: number; y: number },
    effectiveZoom: number,
    graphBounds: GraphBounds
): SVGElement => {
    const zoomFactor = Math.max(effectiveZoom, 1) / 100;
    const viewportWidth = CAMERA_VIEWPORT_WIDTH / zoomFactor;
    const viewportHeight = CAMERA_VIEWPORT_HEIGHT / zoomFactor;
    const viewportMinX = cameraCenter.x - viewportWidth / 2;
    const viewportMinY = cameraCenter.y - viewportHeight / 2;
    const pw = viewportWidth / VIDEO_EXPORT_OUTPUT_WIDTH; // pixel → world X
    const ph = viewportHeight / VIDEO_EXPORT_OUTPUT_HEIGHT; // pixel → world Y
    const margin = 16 * pw;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.setAttribute('class', 'video-info-overlay');
    svg.setAttribute('font-family', 'Arial, sans-serif');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    shadow.setAttribute('id', 'video-info-shadow');
    shadow.setAttribute('x', '-20%');
    shadow.setAttribute('y', '-20%');
    shadow.setAttribute('width', '140%');
    shadow.setAttribute('height', '140%');
    const shadowEffect = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    shadowEffect.setAttribute('dx', '0');
    shadowEffect.setAttribute('dy', `${2 * ph}`);
    shadowEffect.setAttribute('stdDeviation', `${3 * ph}`);
    shadowEffect.setAttribute('flood-color', '#000000');
    shadowEffect.setAttribute('flood-opacity', '0.22');
    shadow.appendChild(shadowEffect);
    defs.appendChild(shadow);
    svg.appendChild(defs);

    // ── Top-left: Badge ──
    const topLeftY = viewportMinY + margin;
    let topLeftX = viewportMinX + margin;
    const overlayStartX = topLeftX;

    if (badgeGroup) {
        const badgeW = (badgeGroup.text.length * 16 + 30) * pw;
        const badgeH = 38 * ph;
        const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgeRect.setAttribute('x', topLeftX.toString());
        badgeRect.setAttribute('y', topLeftY.toString());
        badgeRect.setAttribute('width', badgeW.toString());
        badgeRect.setAttribute('height', badgeH.toString());
        badgeRect.setAttribute('rx', (8 * pw).toString());
        badgeRect.setAttribute('ry', (8 * ph).toString());
        badgeRect.setAttribute('fill', badgeGroup.bgColor || '#888');
        svg.appendChild(badgeRect);

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', (topLeftX + 14 * pw).toString());
        badgeText.setAttribute('y', (topLeftY + badgeH - 12 * ph).toString());
        badgeText.setAttribute('fill', '#ffffff');
        badgeText.setAttribute('font-size', (20 * ph).toString());
        badgeText.setAttribute('font-weight', 'bold');
        badgeText.textContent = badgeGroup.text;
        svg.appendChild(badgeText);

        topLeftX += badgeW;
    }

    if (badgeGroup && remark) {
        // 备注与线路徽章联动显示：徽章消失时备注同步消失（两者共用同一套显示状态，
        // 避免"徽章已隐藏但备注残留"的两套独立判断）。若徽章被隐藏，备注也不再绘制。
        const remarkFontSize = 26 * ph;
        const remarkX = topLeftX + 14 * pw;
        const remarkY = topLeftY + 19 * ph;
        const paddingX = 12 * pw;
        const paddingY = 7 * ph;
        // 文本宽度按字符估算（不依赖 getBBox：SVG 元素未挂载到文档时测量不可靠，
        // 会导致背景矩形尺寸为零或抛出异常被移除，表现为"备注没有底色"）。
        // 中日韩/全角字符按满宽计，其余字符按 0.62 倍宽计。
        const textWidth =
            [...remark].reduce(
                (w, ch) => w + (/[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.62),
                0
            ) * remarkFontSize;
        const bgW = textWidth + paddingX * 2;
        const bgH = Math.max(44 * ph, remarkFontSize + paddingY * 2);

        const remarkBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        remarkBg.setAttribute('x', (overlayStartX - 14 * pw).toString());
        remarkBg.setAttribute('y', (topLeftY - 3 * ph).toString());
        remarkBg.setAttribute('width', (topLeftX - overlayStartX + 14 * pw + bgW).toString());
        remarkBg.setAttribute('height', bgH.toString());
        remarkBg.setAttribute('rx', (8 * ph).toString());
        remarkBg.setAttribute('ry', (8 * ph).toString());
        remarkBg.setAttribute('fill', '#ffffff');
        remarkBg.setAttribute('filter', 'url(#video-info-shadow)');
        svg.insertBefore(remarkBg, defs.nextSibling);

        const remarkText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        remarkText.setAttribute('x', remarkX.toString());
        remarkText.setAttribute('y', remarkY.toString());
        remarkText.setAttribute('dominant-baseline', 'central');
        remarkText.setAttribute('fill', '#000000');
        remarkText.setAttribute('font-size', remarkFontSize.toString());
        remarkText.setAttribute('font-weight', 'bold');
        remarkText.textContent = remark;
        svg.appendChild(remarkText);
    }

    // ── Top-right: Mini-map ──
    const miniMapW = 240 * pw;
    const miniMapH = 160 * ph;
    const miniMapX = viewportMinX + viewportWidth - miniMapW - margin;
    const miniMapY = viewportMinY + margin;

    // Background
    const mmBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    mmBg.setAttribute('x', miniMapX.toString());
    mmBg.setAttribute('y', miniMapY.toString());
    mmBg.setAttribute('width', miniMapW.toString());
    mmBg.setAttribute('height', miniMapH.toString());
    mmBg.setAttribute('fill', '#ffffff');
    mmBg.setAttribute('stroke', 'none');
    mmBg.setAttribute('rx', (6 * pw).toString());
    mmBg.setAttribute('ry', (6 * ph).toString());
    svg.appendChild(mmBg);

    // Title
    const mmTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    mmTitle.setAttribute('x', (miniMapX + 8 * pw).toString());
    mmTitle.setAttribute('y', (miniMapY + 16 * ph).toString());
    mmTitle.setAttribute('fill', '#666');
    mmTitle.setAttribute('font-size', (11 * ph).toString());

    // Mini-map content: clone & scale the full graph
    if (fullGraphSnapshot && graphBounds.xMax > graphBounds.xMin && graphBounds.yMax > graphBounds.yMin) {
        const graphW = graphBounds.xMax - graphBounds.xMin;
        const graphH = graphBounds.yMax - graphBounds.yMin;
        const scaleX = (miniMapW - 16 * pw) / graphW;
        const scaleY = (miniMapH - 24 * ph) / graphH;
        const mmScale = Math.min(scaleX, scaleY);
        const mmOffsetX = (miniMapW - graphW * mmScale) / 2;
        const mmOffsetY = (miniMapH - 24 * ph - graphH * mmScale) / 2 + 24 * ph;

        // Clone the full graph for mini-map content
        const mmContent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mmContent.setAttribute(
            'transform',
            `translate(${miniMapX + mmOffsetX - graphBounds.xMin * mmScale}, ${
                miniMapY + mmOffsetY - graphBounds.yMin * mmScale
            }) scale(${mmScale})`
        );
        // 导入完整图形，但小地图只显示线路和节点主体，不显示站名文字。
        Array.from(fullGraphSnapshot.children).forEach(child => {
            const source = child as Element;
            if (
                source.matches(
                    '[data-map-layer], [data-map-raster], [data-map-tiles], style[data-map-style], [data-map-attribution]'
                )
            )
                return;
            const imported = document.importNode(child, true) as Element;
            if (
                imported.matches(
                    '[data-map-layer], [data-map-raster], [data-map-tiles], style[data-map-style], [data-map-attribution]'
                )
            )
                return;
            imported
                .querySelectorAll(
                    '[data-map-layer], [data-map-raster], [data-map-tiles], style[data-map-style], [data-map-attribution], text, [data-station-name], .station-name, .rmp-virtual-node, g[id^="stn_"] path, g[id^="misc_node_"] path, g[id^="node_"] path'
                )
                .forEach(label => label.remove());
            mmContent.appendChild(imported);
        });
        svg.appendChild(mmContent);
        const mmBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mmBorder.setAttribute('x', miniMapX.toString());
        mmBorder.setAttribute('y', miniMapY.toString());
        mmBorder.setAttribute('width', miniMapW.toString());
        mmBorder.setAttribute('height', miniMapH.toString());
        mmBorder.setAttribute('fill', 'none');
        mmBorder.setAttribute('stroke', '#000000');
        mmBorder.setAttribute('stroke-width', (4 * pw).toString());
        mmBorder.setAttribute('rx', (6 * pw).toString());
        mmBorder.setAttribute('ry', (6 * ph).toString());
        svg.appendChild(mmBorder);

        // Viewport indicator
        const vpW = viewportWidth;
        const vpH = viewportHeight;
        const vpX = (viewportMinX - graphBounds.xMin) * mmScale + miniMapX + mmOffsetX;
        const vpY = (viewportMinY - graphBounds.yMin) * mmScale + miniMapY + mmOffsetY;
        const vpScaledW = vpW * mmScale;
        const vpScaledH = vpH * mmScale;

        const vpRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        vpRect.setAttribute('x', Math.max(miniMapX + 2 * pw, vpX).toString());
        vpRect.setAttribute('y', Math.max(miniMapY + 22 * ph, vpY).toString());
        vpRect.setAttribute('width', Math.min(miniMapW - 4 * pw, vpScaledW).toString());
        vpRect.setAttribute('height', Math.min(miniMapH - 26 * ph, vpScaledH).toString());
        vpRect.setAttribute('fill', 'none');
        vpRect.setAttribute('stroke', '#e74c3c');
        vpRect.setAttribute('stroke-width', (2 * pw).toString());
        vpRect.setAttribute('rx', (2 * pw).toString());
        svg.appendChild(vpRect);
    }

    // ── Left-center: Stats card ──
    // 卡片固定在视口左侧、垂直约 22% 高度处（明显上移），并保持恒定屏幕像素位置
    const statsCardW = 180 * pw;
    const statsCardH = date ? 172 * ph : 120 * ph;
    const statsCardX = viewportMinX + margin;
    const statsCardY = viewportMinY + viewportHeight * 0.22 - statsCardH / 2;

    // Background
    const statsBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    statsBg.setAttribute('x', statsCardX.toString());
    statsBg.setAttribute('y', statsCardY.toString());
    statsBg.setAttribute('width', statsCardW.toString());
    statsBg.setAttribute('height', statsCardH.toString());
    statsBg.setAttribute('rx', (8 * pw).toString());
    statsBg.setAttribute('ry', (8 * ph).toString());
    statsBg.setAttribute('fill', 'rgba(255,255,255,0.92)');
    statsBg.setAttribute('stroke', 'rgba(0,0,0,0.1)');
    statsBg.setAttribute('stroke-width', (1 * pw).toString());
    svg.appendChild(statsBg);

    const statsLabelColor = '#888';
    const statsValueColor = '#333';
    const statsLabelSize = 11 * ph;
    const statsValueSize = 24 * ph;
    const statsRowGap = 17 * ph; // 大数字与下一行标签之间留足间距，避免视觉重叠
    const statsPaddingX = 16 * pw;
    let statsY = statsCardY + 18 * ph;

    // Mileage
    const mileLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    mileLabel.setAttribute('x', (statsCardX + statsPaddingX).toString());
    mileLabel.setAttribute('y', statsY.toString());
    mileLabel.setAttribute('fill', statsLabelColor);
    mileLabel.setAttribute('font-size', statsLabelSize.toString());
    mileLabel.textContent = '里程';
    svg.appendChild(mileLabel);
    statsY += statsLabelSize + 2 * ph;

    const mileValue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    mileValue.setAttribute('x', (statsCardX + statsPaddingX).toString());
    mileValue.setAttribute('y', (statsY + statsValueSize).toString());
    mileValue.setAttribute('fill', statsValueColor);
    mileValue.setAttribute('font-size', statsValueSize.toString());
    mileValue.setAttribute('font-weight', 'bold');
    mileValue.textContent = `${mileage.toFixed(1)} km`;
    svg.appendChild(mileValue);
    statsY += statsValueSize + statsRowGap;

    // Station count
    const stnLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stnLabel.setAttribute('x', (statsCardX + statsPaddingX).toString());
    stnLabel.setAttribute('y', statsY.toString());
    stnLabel.setAttribute('fill', statsLabelColor);
    stnLabel.setAttribute('font-size', statsLabelSize.toString());
    stnLabel.textContent = '车站';
    svg.appendChild(stnLabel);
    statsY += statsLabelSize + 2 * ph;

    const stnValue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stnValue.setAttribute('x', (statsCardX + statsPaddingX).toString());
    stnValue.setAttribute('y', (statsY + statsValueSize).toString());
    stnValue.setAttribute('fill', statsValueColor);
    stnValue.setAttribute('font-size', statsValueSize.toString());
    stnValue.setAttribute('font-weight', 'bold');
    stnValue.textContent = visibleStationCount.toString();
    svg.appendChild(stnValue);

    if (date) {
        const dateY = statsY + statsValueSize + 50 * ph;
        const dateBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        dateBg.setAttribute('x', statsCardX.toString());
        dateBg.setAttribute('y', (dateY - 32 * ph).toString());
        dateBg.setAttribute('width', statsCardW.toString());
        dateBg.setAttribute('height', (42 * ph).toString());
        dateBg.setAttribute('rx', (6 * pw).toString());
        dateBg.setAttribute('fill', 'rgba(255,255,255,0.92)');
        dateBg.setAttribute('stroke', 'rgba(0,0,0,0.1)');
        svg.appendChild(dateBg);

        const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dateText.setAttribute('x', (statsCardX + statsPaddingX).toString());
        dateText.setAttribute('y', dateY.toString());
        dateText.setAttribute('fill', statsValueColor);
        dateText.setAttribute('font-size', (28 * ph).toString());
        dateText.setAttribute('font-weight', 'bold');
        dateText.textContent = date;
        svg.appendChild(dateText);
    }

    // ── Bottom: Active line badges ──
    if (activeLineGroups.length > 0) {
        const badgePY = viewportMinY + viewportHeight - 48 * ph;
        const badgePH = 28 * ph;
        let badgePX = viewportMinX + margin;

        // Background strip
        const badgesBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgesBg.setAttribute('x', viewportMinX.toString());
        badgesBg.setAttribute('y', (badgePY - 6 * ph).toString());
        badgesBg.setAttribute('width', viewportWidth.toString());
        badgesBg.setAttribute('height', (badgePH + 12 * ph).toString());
        badgesBg.setAttribute('fill', 'rgba(0,0,0,0.35)');
        svg.appendChild(badgesBg);

        for (const group of activeLineGroups) {
            const textW = (group.text?.length ?? 0) * 12 * pw + 16 * pw;
            const badgeWW = Math.max(32 * pw, textW);

            const badgeR = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            badgeR.setAttribute('x', badgePX.toString());
            badgeR.setAttribute('y', badgePY.toString());
            badgeR.setAttribute('width', badgeWW.toString());
            badgeR.setAttribute('height', badgePH.toString());
            badgeR.setAttribute('rx', (4 * pw).toString());
            badgeR.setAttribute('ry', (4 * ph).toString());
            badgeR.setAttribute('fill', group.bgColor || '#888');
            svg.appendChild(badgeR);

            const badgeT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeT.setAttribute('x', (badgePX + 8 * pw).toString());
            badgeT.setAttribute('y', (badgePY + badgePH - 8 * ph).toString());
            badgeT.setAttribute('fill', '#ffffff');
            badgeT.setAttribute('font-size', (16 * ph).toString());
            badgeT.setAttribute('font-weight', 'bold');
            badgeT.textContent = group.text || '';
            svg.appendChild(badgeT);

            badgePX += badgeWW + 8 * pw;
        }
    }

    return svg;
};

// ── Frame SVG creation ─────────────────────────────────────────────────────────

let cachedMapLayerMarkup: string | undefined;
let cachedMapLayerTemplate: SVGSVGElement | undefined;

const getMapLayerTemplate = (markup?: string): SVGSVGElement | undefined => {
    if (!markup) return undefined;
    if (markup === cachedMapLayerMarkup && cachedMapLayerTemplate) {
        return cachedMapLayerTemplate;
    }
    const parsed = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${markup}</svg>`,
        'image/svg+xml'
    );
    cachedMapLayerMarkup = markup;
    cachedMapLayerTemplate = parsed.documentElement as unknown as SVGSVGElement;
    return cachedMapLayerTemplate;
};

const createFrameSVG = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    visibleNodes: Set<NodeId>,
    visibleEdges: Set<LineId>,
    animatingElements: Map<Id, ElementAnimation>,
    focus: CameraFocus,
    cameraCenter: { x: number; y: number } | undefined,
    cameraVelocity: { x: number; y: number } | undefined,
    _previousBasicStations: Set<StnId>,
    effectiveZoom: number,
    /** 全览缓动进度（0→1）：缩放自 userScale 向"包含文本的精确安全相机"平滑过渡的程度 */
    overviewEaseProgress = -1,
    /** 用户初始缩放：全览缩放从此值开始缓动 */
    userScale = 0,
    isSystemFontsOnly: boolean,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    // Overlay info
    date?: string,
    remark?: string,
    activeLineGroups?: LineGroup[],
    /** 左上角线路徽章（由 processFrame 计算，= 当前动作目标线路段所在线路） */
    badgeGroup?: { bgColor: string; text: string } | null,
    /** 聚焦插值相机位置：提供时跳过惯性模型，直接定位到该点（聚焦期间镜头沿"起点→目标"平滑插值） */
    cameraOverrideCenter?: { x: number; y: number } | null,
    /** 预览跳转至指定时间点时直接定位相机，避免沿用播放中的惯性过渡 */
    snapCameraToTarget = false,
    nodeVersions?: Map<NodeId, number>,
    /** 地图图层快照（当前画布地图图层序列化标记）：存在时注入帧 SVG 作为底层背景 */
    mapLayerMarkup?: string,
    /** 已解析的地图图层模板，预览时复用以避免每帧重复解析大体积 SVG */
    mapLayerTemplate?: SVGSVGElement,
    /** 全览专用安全相机（来自 processFrame 返回值）：存在时优先使用其精确值，跳过弹簧追赶系统 */
    safeOverviewCamera?: { center: { x: number; y: number }; zoom: number }
): Promise<{
    elem: SVGSVGElement;
    width: number;
    height: number;
    cameraCenter: { x: number; y: number };
    cameraVelocity: { x: number; y: number };
}> => {
    const { elem } = await makeRenderReadySVGElement(graph, false, true, isSystemFontsOnly, languages, false, 1.1);

    // 注入地图图层快照：预览复用已解析模板，避免每帧重新解析大体积地图 SVG。
    if (mapLayerTemplate || mapLayerMarkup) {
        try {
            const template = mapLayerTemplate ?? getMapLayerTemplate(mapLayerMarkup);
            if (template) {
                const mapLayer = elem.querySelector('[data-map-layer]') ?? elem;
                const snapshotMapLayer = template.querySelector('[data-map-layer]');
                mapLayer.replaceChildren();
                if (snapshotMapLayer) {
                    [...snapshotMapLayer.childNodes].forEach(child => mapLayer.appendChild(child.cloneNode(true)));
                    const snapshotStyle = template.querySelector('style[data-map-style]');
                    if (snapshotStyle) elem.prepend(snapshotStyle.cloneNode(true));
                } else {
                    [...template.childNodes].forEach(child => mapLayer.appendChild(child.cloneNode(true)));
                }
            }
        } catch {
            // 地图图层快照无效时静默跳过，不影响视频导出
        }
    }

    if (nodeVersions) {
        nodeVersions.forEach((versionNumber, nodeId) => {
            if (!graph.hasNode(nodeId)) return;
            const snapshot = getNodeVersion(graph, nodeId, versionNumber);
            if (!snapshot) return;
            const attrs = graph.getNodeAttributes(nodeId);
            const currentElement = elem.getElementById(nodeId);
            if (!currentElement) return;
            const renderVersion = (version: number, id: string) => {
                const versionSnapshot = getNodeVersion(graph, nodeId, version);
                if (!versionSnapshot) return null;
                const Component =
                    allStations[versionSnapshot.type as StationType]?.component ??
                    miscNodes[versionSnapshot.type as MiscNodeType]?.component;
                if (!Component) return null;
                const versionAttrs = {
                    ...attrs,
                    ...versionSnapshot,
                    ...(versionSnapshot[versionSnapshot.type as keyof typeof versionSnapshot] ?? {}),
                } as NodeAttributes;
                const markup = renderToStaticMarkup(
                    React.createElement(
                        'g',
                        { id, transform: `translate(${versionSnapshot.x}, ${versionSnapshot.y})` },
                        React.createElement(
                            Provider,
                            { store } as any,
                            React.createElement(Component, {
                                id: nodeId as any,
                                x: versionSnapshot.x,
                                y: versionSnapshot.y,
                                attrs: versionAttrs,
                                handlePointerDown: () => undefined,
                                handlePointerMove: () => undefined,
                                handlePointerUp: () => undefined,
                            })
                        )
                    )
                );
                return new DOMParser().parseFromString(
                    `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
                    'image/svg+xml'
                ).documentElement.firstElementChild;
            };
            const parsed = renderVersion(versionNumber, nodeId);
            if (parsed) {
                currentElement.setAttribute('transform', `translate(${snapshot.x}, ${snapshot.y})`);
                currentElement.innerHTML = parsed.innerHTML;
                elem.getElementById(`${nodeId}.pre`)?.remove();
                elem.getElementById(`${nodeId}.post`)?.remove();
                const transition = animatingElements.get(nodeId)?.versionTransition;
                if (transition && transition.from !== versionNumber) {
                    const oldElement = renderVersion(transition.from, `${nodeId}.history-old`);
                    if (oldElement) {
                        oldElement.setAttribute('opacity', `${1 - transition.progress}`);
                        oldElement.setAttribute('pointer-events', 'none');
                        currentElement.setAttribute('opacity', `${transition.progress}`);
                        currentElement.parentElement?.insertBefore(oldElement, currentElement);
                    }
                }
            }
        });
    }

    // Remove invisible nodes, but keep the old layer during a version cross-fade.
    graph.forEachNode(node => {
        const nodeId = node as NodeId;
        if (!visibleNodes.has(nodeId)) {
            elem.getElementById(nodeId)?.remove();
            elem.getElementById(`${nodeId}.history-old`)?.remove();
        }
    });

    // Apply edge progress and calculate real-time mileage from the currently drawn portion
    let mileage = 0;
    graph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        if (!visibleEdges.has(edgeId)) {
            elem.getElementById(edgeId)?.remove();
            return;
        }
        const edgeElem = elem.getElementById(edgeId) as HTMLElement | null;
        if (!edgeElem) return;
        const anim = animatingElements.get(edgeId);
        const progress = anim?.kind === 'edge' ? anim.progress : 1;
        applyEdgeProgress(edgeElem, anim?.quickComplete ? 1 : progress, anim?.reverse ?? false);
        if (anim?.quickComplete) edgeElem.setAttribute('opacity', `${progress}`);
        const edgeMileage = graph.getEdgeAttribute(edgeId, 'mileage');
        mileage += typeof edgeMileage === 'number' && Number.isFinite(edgeMileage) ? edgeMileage * progress : 0;
    });

    // Apply node reveal animation
    graph.forEachNode(node => {
        const nodeId = node as NodeId;
        if (!visibleNodes.has(nodeId)) return;
        const nodeGroup = elem.getElementById(nodeId) as SVGElement | null;
        if (!nodeGroup) return;
        const anim = animatingElements.get(nodeId);
        const revealProgress = anim?.kind === 'node' ? anim.progress : 1;
        const textProgress = anim?.kind === 'node' ? (anim.textProgress ?? anim.progress) : 1;
        if (anim?.quickComplete) {
            nodeGroup.removeAttribute('visibility');
            nodeGroup.setAttribute('opacity', `${revealProgress}`);
        } else if (revealProgress <= 0) {
            // 渐显过程开始之前：整组隐藏，绝不出现“一个点”在画布上
            // （用 visibility 而非 opacity，避免部分车站组件内部样式覆盖 opacity 属性）
            nodeGroup.setAttribute('visibility', 'hidden');
        } else {
            nodeGroup.removeAttribute('visibility');
            applyNodeRevealAnimation(nodeGroup, revealProgress, textProgress, isStationNodeId(nodeId));
        }
    });

    // 构建"含站名文本等真实渲染宽度"的全览安全相机目标。
    // 此前 safeOverviewCamera 直接覆盖 finalCameraCenter/finalZoom，跳过了弹簧-阻尼追击与 smoothstep 缩放缓动，
    // 导致全览时视口瞬间跳变。这里只把它作为目标：中心交给弹簧-阻尼逐帧收敛，缩放交给缓动过渡。
    let refinedSafeCamera: { center: { x: number; y: number }; zoom: number } | undefined;
    if (safeOverviewCamera) {
        const contentBounds = measureFrameContentBounds(elem);
        refinedSafeCamera = contentBounds ? computeSafeCameraFromBounds(contentBounds) : safeOverviewCamera;
    }

    // Camera system（惯性弹簧-阻尼模型）
    const fallbackBounds = calculateCanvasSize(graph);
    const fallbackCenter = {
        x: (fallbackBounds.xMin + fallbackBounds.xMax) / 2,
        y: (fallbackBounds.yMin + fallbackBounds.yMax) / 2,
    };
    const focusTarget =
        focus.kind === 'none' ? fallbackCenter : (getCameraTargetPointForFrame(graph, elem, focus) ?? fallbackCenter);
    // 全览时弹簧目标 = 含文本的精确安全相机中心；其余阶段仍跟踪镜头焦点
    const targetCenter = refinedSafeCamera?.center ?? focusTarget;
    let nextCameraCenter: { x: number; y: number };
    let nextCameraVelocity: { x: number; y: number };
    if (cameraOverrideCenter || snapCameraToTarget) {
        // 聚焦插值或预览跳转：直接定位到目标，跳过惯性模型。
        // 正常播放仍使用下方的弹簧-阻尼模型。
        nextCameraCenter = cameraOverrideCenter ?? targetCenter;
        nextCameraVelocity = { x: 0, y: 0 };
    } else if (cameraCenter) {
        const frameScale = 1;
        const damping = Math.pow(CAMERA_VELOCITY_DAMPING, frameScale);
        const dx = targetCenter.x - cameraCenter.x;
        const dy = targetCenter.y - cameraCenter.y;
        // 死区吸附：距目标足够近时直接定位并清零速度，消除到达后的微振荡/回摆
        if (Math.hypot(dx, dy) < CAMERA_SNAP_DISTANCE) {
            nextCameraCenter = targetCenter;
            nextCameraVelocity = { x: 0, y: 0 };
        } else {
            // 限制每帧最大位移：长距离跳变（如段与段之间的镜头预瞄）时限制峰值速度，
            // 避免镜头高速冲过目标后大幅过冲回弹（表现为"滑过去又滑回"）
            const maxVelocity = CAMERA_VIEWPORT_WIDTH * CAMERA_MAX_VELOCITY_RATIO;
            const clampV = (v: number): number => Math.max(-maxVelocity, Math.min(maxVelocity, v));
            const vx = (cameraVelocity?.x ?? 0) + dx * CAMERA_SPRING_STIFFNESS * frameScale;
            const vy = (cameraVelocity?.y ?? 0) + dy * CAMERA_SPRING_STIFFNESS * frameScale;
            nextCameraVelocity = {
                x: clampV(vx * damping),
                y: clampV(vy * damping),
            };
            nextCameraCenter = {
                x: cameraCenter.x + nextCameraVelocity.x,
                y: cameraCenter.y + nextCameraVelocity.y,
            };
        }
    } else {
        // 第一帧：直接定位到目标，初始速度为 0
        nextCameraCenter = targetCenter;
        nextCameraVelocity = { x: 0, y: 0 };
    }

    // Clone SVG for mini-map BEFORE viewBox modification (preserves original coordinates)
    const frameSnapshot = elem.cloneNode(true) as SVGSVGElement;

    // 视口渲染值：中心取弹簧-阻尼输出（保留惯性），缩放向"含文本精确安全相机"缓动（smoothstep）。
    // 非全览时使用外部计算好的 effectiveZoom（含 focusZoom 过渡）；全览时重算为平滑缓动值。
    const finalCameraCenter = nextCameraCenter;
    const finalZoom = refinedSafeCamera
        ? getEffectiveZoom(overviewEaseProgress, userScale, refinedSafeCamera.zoom)
        : effectiveZoom;
    applyCameraViewBox(graph, elem, finalCameraCenter, finalZoom);

    // 主画布和 HUD 始终使用同一个 finalCameraCenter，坐标系完全对齐
    // Add info overlay
    const stationCount = [...visibleNodes].filter(id => {
        if (!isStationNodeId(id)) return false;
        const nodeGroup = elem.getElementById(id);
        return nodeGroup?.getAttribute('visibility') !== 'hidden';
    }).length;
    const graphBounds: GraphBounds = {
        xMin: fallbackBounds.xMin,
        xMax: fallbackBounds.xMax,
        yMin: fallbackBounds.yMin,
        yMax: fallbackBounds.yMax,
    };
    elem.appendChild(
        createVideoInfoOverlay(
            date ?? '',
            remark ?? '',
            badgeGroup,
            activeLineGroups ?? [],
            stationCount,
            mileage,
            frameSnapshot,
            finalCameraCenter,
            finalZoom,
            graphBounds
        )
    );

    return {
        elem,
        width: VIDEO_EXPORT_OUTPUT_WIDTH,
        height: VIDEO_EXPORT_OUTPUT_HEIGHT,
        cameraCenter: nextCameraCenter,
        cameraVelocity: nextCameraVelocity,
    };
};

// ── SVG to Canvas rendering ────────────────────────────────────────────────────

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
    const src = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }));
    return new Promise((resolve, reject) => {
        const img = new Image();
        const cleanup = () => URL.revokeObjectURL(src);
        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            cleanup();
            resolve(canvas);
        };
        img.onerror = () => {
            cleanup();
            reject(new Error('Failed to load SVG image for video frame'));
        };
        img.src = src;
    });
};

// ── MP4 MIME type detection ────────────────────────────────────────────────────

const MP4_MIME_TYPES = ['video/mp4; codecs=h264,aac', 'video/mp4; codecs=h264', 'video/mp4; codecs=avc1', 'video/mp4'];

export function getSupportedMp4MimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    return MP4_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t));
}

// ── Frame animation loop ───────────────────────────────────────────────────────

interface FrameContext {
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    languages: TextLanguage[];
    existsNodeTypes: Set<NodeType>;
    fps: number;
    totalFrames: number;
    userScale: number;
    overviewZoom: number;
    isTransparent: boolean;
    isSystemFontsOnly: boolean;
    bgColor: string;
    activeLineGroups: LineGroup[];
    // Accumulated visible state across phases
    accumulatedVisibleNodes: Set<NodeId>;
    accumulatedVisibleEdges: Set<LineId>;
    // Per-element animation state
    elementStartFrame: Map<string, number>;
    /** Per-element animation duration (frames), 与 startFrame 一起由 scheduleElementFrames 写入 */
    elementDurationFrame: Map<string, number>;
    cameraCenter?: { x: number; y: number };
    /** 镜头惯性速度（每帧由弹簧-阻尼模型更新） */
    cameraVelocity?: { x: number; y: number };
    previousBasicStations: Set<StnId>;
    /** Last valid camera focus for smooth tracking during close/wait phases */
    lastFocus: CameraFocus;
    /** Pre-calculated SVG path length for each edge */
    edgeLengths: Map<LineId, number>;
    /** Phase action durations (seconds) for duration calculation */
    phaseDurations: number[];
    overviewZoomOverride?: number;
    overviewPhaseProgress?: number;
    currentZoom?: number;
    focusZoom?: number;
    focusZoomTransition?: { phaseIndex: number; start: number; target: number; progress: number } | null;
    /** 全览保持状态：overview 结束后继续保持全览缩放与视口，直到 focus 动作取消 */
    overviewHold?: { center: { x: number; y: number }; zoom: number } | null;
    focusCenterHold?: { center: { x: number; y: number }; zoom: number; batchIndex: number } | null;
    /** 聚焦插值起点：聚焦阶段首帧的相机位置，用于聚焦期间镜头沿"起点→目标"线性插值到位 */
    focusTransitionStart?: { x: number; y: number } | null;
    mapLayerMarkup?: string;
}

/**
 * Calculate accurate SVG path lengths for all edges in the graph.
 * Renders the graph once and measures each edge's path total length
 * (handles polylines, rounded corners, bezier curves, etc.).
 * Falls back to a Manhattan-distance estimate if rendering fails.
 */
async function calculateEdgeLengths(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    isSystemFontsOnly: boolean
): Promise<Map<LineId, number>> {
    const lengths = new Map<LineId, number>();
    const estimateManhattan = (edgeId: LineId) => {
        try {
            const [source, target] = graph.extremities(edgeId);
            const sx = graph.getNodeAttribute(source, 'x') as number;
            const sy = graph.getNodeAttribute(source, 'y') as number;
            const tx = graph.getNodeAttribute(target, 'x') as number;
            const ty = graph.getNodeAttribute(target, 'y') as number;
            return Math.max(Math.abs(tx - sx) + Math.abs(ty - sy), 1);
        } catch {
            return 100; // fallback
        }
    };
    try {
        const { elem } = await makeRenderReadySVGElement(graph, false, true, isSystemFontsOnly, languages, false, 1.1);
        // 临时挂载到文档：部分浏览器对脱离 DOM（或 display:none）的 SVG 调用
        // getTotalLength() 会返回 0，导致所有边长度相等、线段绘制速度与长度无关。
        // 使用 visibility:hidden + 移出屏幕，保证元素参与布局但不闪烁。
        elem.style.visibility = 'hidden';
        elem.style.position = 'fixed';
        elem.style.left = '-99999px';
        elem.style.top = '-99999px';
        document.body.appendChild(elem);
        try {
            graph.forEachEdge(edge => {
                const edgeId = edge as LineId;
                const edgeElem = elem.getElementById(edgeId);
                let total = 0;
                if (edgeElem) {
                    edgeElem.querySelectorAll('path').forEach(p => {
                        try {
                            total += p.getTotalLength();
                        } catch {
                            /* ignore individual path errors */
                        }
                    });
                }
                lengths.set(edgeId, Math.max(total, 1));
            });
        } finally {
            elem.remove();
        }
    } catch {
        // Fallback: estimate with Manhattan distance between endpoints
        graph.forEachEdge(edge => {
            lengths.set(edge as LineId, estimateManhattan(edge as LineId));
        });
    }
    // 兜底：测量结果异常（小于 10 世界单位，典型为脱离文档时的 0）时改用曼哈顿估算
    graph.forEachEdge(edge => {
        const edgeId = edge as LineId;
        const measured = lengths.get(edgeId) ?? 1;
        if (measured < 10) {
            lengths.set(edgeId, estimateManhattan(edgeId));
        }
    });
    return lengths;
}

/**
 * Schedule element start frames within an open phase.
 *
 * 第一步：按"无缝衔接"规则排定每个元素的起始帧与基础动画时长（节点 0.5s，
 * 边按长度成比例分配剩余时间 t - 0.5n）。
 * 第二步：把整个序列等比拉伸，使最后一个元素恰好画完到 phase 末尾——
 * 无论用户设置多长的 duration，动画都会连续填满整个阶段，消除
 * "元素画完后阶段尾部大量静止空转"（表现为线路段画完停好久）。
 *
 * Rules (for open):
 *   - Edge→Node: Node starts 0.5s BEFORE edge completes (overlap, never before the edge starts)
 *   - Edge→Edge: Next edge starts 0.1s before current edge completes
 *   - Node→Node: Next node starts 0.8s after current node starts (80% of 1.0s)
 *   - Node→Edge: Next edge starts 0.1s before the node animation completes,
 *                so "edge→node→edge" remains continuous without waiting for a phase tail
 * For close, elements are scheduled in reverse order (last element first).
 */
function scheduleElementFrames(
    ctx: FrameContext,
    phase: AnimationPhase,
    phaseRange: { start: number; end: number },
    phaseIndex: number
): void {
    const getKey = (id: Id) => `${phaseIndex}:${id}`;
    const unscheduled = phase.elements.filter(e => !ctx.elementStartFrame.has(getKey(e.id)));
    if (unscheduled.length === 0) return;

    const isClose = phase.type === 'close';
    const elements = isClose ? [...phase.elements].reverse() : phase.elements;

    // t = phase duration (seconds), n = node count, l = total edge path length
    const t = ctx.phaseDurations[phaseIndex] ?? 2;
    const nodeCount = elements.filter(e => e.kind === 'node' && !isVirtualNode(ctx.graph, e.id)).length;
    const edgeCount = elements.filter(e => e.kind === 'edge').length;
    const totalEdgeLen = elements
        .filter(e => e.kind === 'edge')
        .reduce((s, e) => s + (ctx.edgeLengths.get(e.id as LineId) ?? 100), 0);

    // 基础动画时长：车站时长由动作配置控制，边按长度成比例分配剩余时间。
    const baseNodeFrames = Math.max(1, Math.round(ctx.fps * phase.nodeAnimationDuration));
    const getBaseEdgeDur = (edgeId: Id): number => {
        const edgeLen = ctx.edgeLengths.get(edgeId as LineId) ?? 100;
        const minimumEdgeSec = 0.5;
        const remainingSec = Math.max(t - minimumEdgeSec * edgeCount, minimumEdgeSec * edgeCount);
        if (totalEdgeLen > 0) {
            const proportional = edgeLen * (remainingSec / totalEdgeLen);
            return Math.max(Math.ceil(ctx.fps * minimumEdgeSec), Math.round(proportional * ctx.fps));
        }
        return Math.max(baseNodeFrames, Math.ceil(ctx.fps * minimumEdgeSec));
    };

    // 第一步：排定基础起始帧与动画时长（暂不写入 ctx，供第二步整体拉伸）
    const scheduled: Array<{ step: AnimationStep; start: number; dur: number }> = [];
    for (const step of elements) {
        if (ctx.elementStartFrame.has(getKey(step.id))) continue;
        const prev = scheduled.length > 0 ? scheduled[scheduled.length - 1] : null;
        let thisStartFrame = prev ? prev.start + prev.dur : phaseRange.start;

        if (prev) {
            if (prev.step.kind === 'edge' && step.kind === 'node') {
                // Edge→Node: 节点在边完成前 0.5s 启动（不得早于边的起点）
                thisStartFrame = Math.max(prev.start, prev.start + prev.dur - baseNodeFrames);
            } else if (prev.step.kind === 'node' && step.kind === 'node') {
                // Node→Node: 下一个节点在当前节点启动后 0.8s 启动，节点间无缝
                thisStartFrame = prev.start + Math.max(1, Math.round(baseNodeFrames * 0.8));
            } else if (prev.step.kind === 'node' && step.kind === 'edge') {
                // Node→Edge: 后一条线在节点完成前 0.1s 启动，避免点线点序列停顿
                thisStartFrame = prev.start + baseNodeFrames - Math.max(1, Math.round(ctx.fps * 0.1));
            } else if (prev.step.kind === 'edge' && step.kind === 'edge') {
                // Edge→Edge: 下一条边在当前边完成前 0.1s 启动，保持连续
                thisStartFrame = Math.max(
                    phaseRange.start,
                    prev.start + prev.dur - Math.max(1, Math.round(ctx.fps * 0.1))
                );
            }
        }

        const clampedStart = Math.min(phaseRange.end, Math.max(phaseRange.start, thisStartFrame));
        const dur = step.kind === 'edge' ? getBaseEdgeDur(step.id) : baseNodeFrames;
        scheduled.push({ step, start: clampedStart, dur });
    }

    // 第二步：等比拉伸整个序列，使最后一个元素恰好画完到 phase 末尾（填满，消除尾部空转）
    const phaseSpan = Math.max(1, phaseRange.end - phaseRange.start);
    const firstStart = scheduled.length > 0 ? scheduled[0].start : phaseRange.start;
    const lastEnd = scheduled.reduce((m, s) => Math.max(m, s.start + s.dur), firstStart);
    const actualSpan = Math.max(1, lastEnd - firstStart);
    const stretch = Math.max(1, phaseSpan / actualSpan);

    for (const item of scheduled) {
        const newStart = Math.max(
            phaseRange.start,
            Math.round(phaseRange.start + (item.start - phaseRange.start) * stretch)
        );
        const newDur = Math.max(
            item.step.kind === 'edge' ? Math.ceil(ctx.fps * 0.5) : 1,
            Math.round(item.dur * stretch)
        );
        ctx.elementStartFrame.set(getKey(item.step.id), newStart);
        ctx.elementDurationFrame.set(getKey(item.step.id), newDur);
    }
}

const getEffectiveZoom = (overviewProgress: number, userScale: number, overviewZoom: number): number => {
    if (overviewProgress <= 0) return userScale;
    const t = smoothstep(0, 1, Math.min(overviewProgress, 1));
    return userScale + (overviewZoom - userScale) * t;
};

const getFrameEffectiveZoom = (ctx: FrameContext, overviewProgress: number): number => {
    const focusZoom = ctx.focusZoomTransition
        ? ctx.focusZoomTransition.start +
          (ctx.focusZoomTransition.target - ctx.focusZoomTransition.start) *
              smoothstep(0, 1, ctx.focusZoomTransition.progress)
        : ctx.focusZoom;
    const zoom =
        focusZoom ?? getEffectiveZoom(overviewProgress, ctx.userScale, ctx.overviewZoomOverride ?? ctx.overviewZoom);
    ctx.currentZoom = zoom;
    return zoom;
};

function processFrame(
    ctx: FrameContext,
    frameIndex: number,
    phases: AnimationPhase[],
    phaseFrameRanges: Array<{ start: number; end: number }>
) {
    // 同一批次的阶段可能重叠。以最后一个活动阶段提供镜头/文案，下面再合并其余活动阶段的元素状态。
    const activePhaseIndices = phases.flatMap((_, index) => {
        const range = phaseFrameRanges[index];
        return frameIndex >= range.start && frameIndex < range.end ? [index] : [];
    });
    const currentPhaseIndex = activePhaseIndices.at(-1) ?? -1;
    const currentRange = currentPhaseIndex === -1 ? undefined : phaseFrameRanges[currentPhaseIndex];
    const phaseLocalProgress =
        currentRange && currentRange.end > currentRange.start
            ? (frameIndex - currentRange.start) / (currentRange.end - currentRange.start)
            : 0;

    // If past all phases, overview mode
    const isOverview = currentPhaseIndex === -1;
    const phase = isOverview ? undefined : phases[currentPhaseIndex];

    // Rebuild visibility from phases before the current frame. Never seed this
    // with the final state, otherwise future elements appear at frame zero.
    const visibleNodes = new Set<NodeId>();
    const visibleEdges = new Set<LineId>();
    const nodeVersions = new Map<NodeId, number>();
    const previousNodeVersions = new Map<NodeId, number>();
    const animatingElements = new Map<Id, ElementAnimation>();

    let focus: CameraFocus = { kind: 'none' };
    let currentDate = '';
    let currentRemark = '';
    let currentActiveLineIds: string[] = [];
    /** 全览动作专用安全相机（由 getSafeOverviewCamera 计算），传递给 createFrameSVG 用于精确设置 viewBox 和 HUD */
    let safeOverviewCamera: { center: { x: number; y: number }; zoom: number } | undefined;

    const stateEnd = isOverview ? phases.length : Math.max(0, currentPhaseIndex);
    for (let i = 0; i < stateEnd; i++) {
        const previousPhase = phases[i];
        if (previousPhase.type === 'open' || previousPhase.type === 'close') {
            currentDate = previousPhase.date || currentDate;
            currentRemark = previousPhase.remark || currentRemark;
            currentActiveLineIds = previousPhase.activeLineIds;
        }
        if (previousPhase.type === 'open') {
            for (const elem of previousPhase.elements) {
                if (elem.kind === 'node') {
                    visibleNodes.add(elem.id as NodeId);
                    nodeVersions.set(elem.id as NodeId, elem.version ?? 1);
                } else visibleEdges.add(elem.id as LineId);
            }
        } else if (previousPhase.type === 'close') {
            for (const elem of previousPhase.elements) {
                if (elem.kind === 'node') {
                    const nodeId = elem.id as NodeId;
                    const closeStyle = previousPhase.closeNodeStyles?.[nodeId];
                    if (closeStyle?.visible) {
                        visibleNodes.add(nodeId);
                        nodeVersions.set(nodeId, closeStyle.version);
                    } else {
                        visibleNodes.delete(nodeId);
                        nodeVersions.delete(nodeId);
                    }
                } else if (ctx.graph.hasEdge(elem.id as LineId)) {
                    visibleEdges.delete(elem.id as LineId);
                }
            }
        }
    }

    previousNodeVersions.clear();
    nodeVersions.forEach((version, nodeId) => previousNodeVersions.set(nodeId, version));

    // 将同时进行但非主阶段的开通/停运动画合并到本帧；主阶段仍负责镜头和文案。
    for (const phaseIndex of activePhaseIndices.filter(index => index !== currentPhaseIndex)) {
        const activePhase = phases[phaseIndex];
        if (activePhase.type !== 'open' && activePhase.type !== 'close') continue;
        const range = phaseFrameRanges[phaseIndex];
        const steps = activePhase.type === 'close' ? [...activePhase.elements].reverse() : activePhase.elements;
        if (!activePhase.quickComplete) scheduleElementFrames(ctx, activePhase, range, phaseIndex);
        for (const step of steps) {
            const key = `${phaseIndex}:${step.id}`;
            const startFrame = activePhase.quickComplete ? range.start : (ctx.elementStartFrame.get(key) ?? range.end);
            const duration = activePhase.quickComplete
                ? Math.max(1, Math.round(ctx.fps))
                : (ctx.elementDurationFrame.get(key) ??
                  Math.max(1, Math.round(ctx.fps * activePhase.nodeAnimationDuration)));
            const openProgress = frameIndex < startFrame ? 0 : clamp01((frameIndex - startFrame) / duration);
            const progress = activePhase.type === 'close' ? 1 - openProgress : openProgress;
            if (step.kind === 'node') {
                const nodeId = step.id as NodeId;
                const closeStyle = activePhase.closeNodeStyles?.[nodeId];
                if (activePhase.type === 'close' && progress <= 0 && !closeStyle?.visible) {
                    visibleNodes.delete(nodeId);
                    nodeVersions.delete(nodeId);
                } else {
                    visibleNodes.add(nodeId);
                    nodeVersions.set(
                        nodeId,
                        activePhase.type === 'close' && closeStyle?.visible ? closeStyle.version : (step.version ?? 1)
                    );
                }
            } else if (activePhase.type === 'open' && isEdgeExportVisible(ctx.graph, step.id as LineId)) {
                visibleEdges.add(step.id as LineId);
            } else if (activePhase.type === 'close' && ctx.graph.hasEdge(step.id as LineId)) {
                if (progress <= 0) visibleEdges.delete(step.id as LineId);
                else visibleEdges.add(step.id as LineId);
            }
            animatingElements.set(step.id, {
                kind: step.kind,
                progress,
                textProgress: step.kind === 'node' ? progress : 1,
                reverse: step.reverse,
                state: progress <= 0 ? 'not-drawn' : progress >= 1 ? 'drawn' : 'drawing',
                quickComplete: activePhase.quickComplete,
            });
        }
    }

    ctx.overviewZoomOverride = undefined;
    ctx.overviewPhaseProgress = undefined;
    if (isOverview) {
        ctx.focusCenterHold = null;
        const safeCamera = getSafeOverviewCamera(ctx.graph, visibleNodes, visibleEdges);
        focus = { kind: 'overview', center: safeCamera.center };
        ctx.lastFocus = focus;
        ctx.overviewZoomOverride = safeCamera.zoom;
        safeOverviewCamera = safeCamera;
    } else if (phase?.type === 'overview') {
        ctx.focusCenterHold = null;
        const safeCamera = getSafeOverviewCamera(ctx.graph, visibleNodes, visibleEdges);
        focus = { kind: 'overview', center: safeCamera.center };
        ctx.lastFocus = focus;
        ctx.overviewZoomOverride = safeCamera.zoom;
        ctx.overviewPhaseProgress = phaseLocalProgress;
        safeOverviewCamera = safeCamera;
    } else if (phase) {
        const keepsFocusZoom =
            phase.quickComplete &&
            (phase.type === 'open' || phase.type === 'close') &&
            ctx.focusCenterHold?.batchIndex === phase.batchIndex;
        if (phase.type !== 'focus' && !keepsFocusZoom) {
            ctx.focusZoom = undefined;
            ctx.focusZoomTransition = null;
        }
        if (phase.type === 'open' || phase.type === 'close') {
            currentDate = phase.date || currentDate;
            // 备注严格跟随当前动作：当前动作无备注则不显示，绝不 fallback 到上一条动作的旧备注，
            // 与线路徽章（= 当前动作目标线路段所在线路）保持同一套显示逻辑、同步变化。
            currentRemark = phase.remark;
            currentActiveLineIds = phase.activeLineIds;
        } else {
            currentDate = '';
            currentRemark = '';
            currentActiveLineIds = [];
        }

        const getKey = (id: Id) => `${currentPhaseIndex}:${id}`;
        if (phase.type === 'open') {
            if (!phase.quickComplete)
                scheduleElementFrames(ctx, phase, phaseFrameRanges[currentPhaseIndex], currentPhaseIndex);
            for (const elem of phase.elements) {
                const startFrame = phase.quickComplete
                    ? phaseFrameRanges[currentPhaseIndex].start
                    : (ctx.elementStartFrame.get(getKey(elem.id)) ?? phaseFrameRanges[currentPhaseIndex].end);
                if (startFrame > frameIndex) continue;
                if (elem.kind === 'node' && !isVirtualNode(ctx.graph, elem.id)) {
                    visibleNodes.add(elem.id as NodeId);
                    nodeVersions.set(elem.id as NodeId, elem.version ?? 1);
                } else if (elem.kind === 'edge' && isEdgeExportVisible(ctx.graph, elem.id as LineId)) {
                    visibleEdges.add(elem.id as LineId);
                }
            }
        }

        // Apply animations for elements being opened in this phase
        if (phase.type === 'open') {
            if (!phase.quickComplete)
                scheduleElementFrames(ctx, phase, phaseFrameRanges[currentPhaseIndex], currentPhaseIndex);
            // Process animations and set focus
            let latestFocusElement: AnimationStep | undefined;
            for (const step of phase.elements) {
                const startFrame = phase.quickComplete
                    ? phaseFrameRanges[currentPhaseIndex].start
                    : (ctx.elementStartFrame.get(getKey(step.id)) ?? frameIndex);
                const frameSinceStart = frameIndex - startFrame;
                const quickProgress = phase.quickComplete
                    ? clamp01(frameSinceStart / Math.max(1, Math.round(ctx.fps)))
                    : undefined;
                if (step.kind === 'node') {
                    // 节点渐显时长与调度一致（可能被拉伸以填满 phase）
                    const nodeDuration =
                        ctx.elementDurationFrame.get(getKey(step.id)) ??
                        Math.max(1, Math.round(ctx.fps * phase.nodeAnimationDuration));
                    const progress =
                        quickProgress ?? (frameSinceStart < 0 ? 0 : clamp01(frameSinceStart / nodeDuration));
                    const previousVersion = previousNodeVersions.get(step.id as NodeId);
                    // 共享节点在新线路尚未绘制到之前，继续显示上一线路版本；
                    // 不要让未来动作的 progress=0 覆盖它并提前隐藏节点。
                    if (frameSinceStart < 0 && previousVersion !== undefined) continue;
                    const versionTransition =
                        previousVersion !== undefined && previousVersion !== (step.version ?? 1)
                            ? { from: previousVersion, progress }
                            : undefined;
                    animatingElements.set(step.id, {
                        kind: 'node',
                        progress,
                        textProgress: progress,
                        reverse: false,
                        state: progress <= 0 ? 'not-drawn' : progress >= 1 ? 'drawn' : 'drawing',
                        quickComplete: phase.quickComplete,
                        versionTransition,
                    });
                    if (frameSinceStart >= 0) latestFocusElement = step;
                } else {
                    const edgeDuration =
                        ctx.elementDurationFrame.get(getKey(step.id)) ?? Math.max(1, Math.round(ctx.fps * 0.5));
                    const progress =
                        quickProgress ?? (frameSinceStart < 0 ? 0 : clamp01(frameSinceStart / edgeDuration));
                    animatingElements.set(step.id, {
                        kind: 'edge',
                        progress,
                        textProgress: 1,
                        reverse: step.reverse,
                        state: progress <= 0 ? 'not-drawn' : progress >= 1 ? 'drawn' : 'drawing',
                        quickComplete: phase.quickComplete,
                    });
                    if (frameSinceStart >= 0) latestFocusElement = step;
                }
            }
            const keepFocusFromTransition =
                phases[currentPhaseIndex - 1]?.type === 'focus' && ctx.lastFocus.kind !== 'none';
            const keepQuickCompleteFocus =
                phase.quickComplete &&
                phases[currentPhaseIndex - 1]?.type === 'focus' &&
                ctx.lastFocus.kind === 'center';
            if (keepFocusFromTransition && FOCUS_END_POLICY === 'pullBackCenter') {
                // 方案A：聚焦完成后镜头拉回可见元素中心（仅平移、不缩放）。
                // 使用 kind:'center' 而非 'overview'，避免触发全览缩放/水印隐藏等全览专属行为。
                const canvasBounds = calculateCanvasSize(ctx.graph);
                const center: { kind: 'center'; center: { x: number; y: number } } = {
                    kind: 'center',
                    center: {
                        x: (canvasBounds.xMin + canvasBounds.xMax) / 2,
                        y: (canvasBounds.yMin + canvasBounds.yMax) / 2,
                    },
                };
                ctx.focusCenterHold = {
                    center: center.center,
                    zoom: ctx.currentZoom ?? ctx.userScale,
                    batchIndex: phase.batchIndex,
                };
                focus = center;
                ctx.lastFocus = focus;
            } else if (keepQuickCompleteFocus) {
                focus = ctx.lastFocus;
            } else if (latestFocusElement) {
                const step = latestFocusElement;
                if (step.kind === 'node') {
                    focus = { kind: 'node', id: step.id as NodeId };
                } else {
                    const startFrame = ctx.elementStartFrame.get(getKey(step.id)) ?? 0;
                    const edgeDuration =
                        ctx.elementDurationFrame.get(getKey(step.id)) ?? Math.max(1, Math.round(ctx.fps * 0.5));
                    const progress = clamp01((frameIndex - startFrame) / edgeDuration);
                    focus = { kind: 'edge', id: step.id as LineId, progress, reverse: step.reverse };
                }
                ctx.lastFocus = focus;
            }
        } else if (phase.type === 'focus') {
            ctx.focusCenterHold = null;
            const target = phase.focusTarget;
            const targetBounds = phase.focusTargetBounds;
            if (targetBounds) {
                const targetZoom = getBoundsFitZoom(targetBounds);
                if (ctx.focusZoomTransition?.phaseIndex !== currentPhaseIndex) {
                    ctx.focusZoomTransition = {
                        phaseIndex: currentPhaseIndex,
                        start: ctx.currentZoom ?? ctx.userScale,
                        target: targetZoom,
                        progress: phaseLocalProgress,
                    };
                } else {
                    ctx.focusZoomTransition.progress = phaseLocalProgress;
                }
                ctx.focusZoom = targetZoom;
                focus = {
                    kind: 'center',
                    center: {
                        x: (targetBounds.xMin + targetBounds.xMax) / 2,
                        y: (targetBounds.yMin + targetBounds.yMax) / 2,
                    },
                };
                ctx.focusCenterHold =
                    phase.focusTargetBatch === undefined
                        ? null
                        : { center: focus.center, zoom: targetZoom, batchIndex: phase.focusTargetBatch };
                ctx.lastFocus = focus;
            } else if (target?.kind === 'node') {
                focus = { kind: 'node', id: target.id as NodeId };
                ctx.lastFocus = focus;
            } else if (target?.kind === 'edge') {
                focus = { kind: 'edge', id: target.id as LineId, progress: 0, reverse: target.reverse };
                ctx.lastFocus = focus;
            }
            // 聚焦无后续目标时：回退到上一个镜头目标，保证聚焦动作始终有明确画面响应
            if (focus.kind === 'none' && ctx.lastFocus.kind !== 'none') {
                focus = ctx.lastFocus;
            }
        } else if (phase.type === 'close') {
            // 停运开始时必须立即退出全览保持状态。
            ctx.overviewHold = null;
            // 停运完全镜像开通：沿用相同的逐元素调度，只把每个元素的进度从 1 反向播到 0。
            scheduleElementFrames(ctx, phase, phaseFrameRanges[currentPhaseIndex], currentPhaseIndex);
            let latestFocusElement: AnimationStep | undefined;
            let latestFocusStartFrame = -1;
            const closeElements = [...phase.elements].reverse();
            for (const step of closeElements) {
                const startFrame = ctx.elementStartFrame.get(getKey(step.id)) ?? frameIndex;
                const duration = phase.quickComplete
                    ? Math.max(1, Math.round(ctx.fps))
                    : (ctx.elementDurationFrame.get(getKey(step.id)) ??
                      Math.max(1, Math.round(ctx.fps * phase.nodeAnimationDuration)));
                const closeStartFrame = phase.quickComplete ? phaseFrameRanges[currentPhaseIndex].start : startFrame;
                const openProgress =
                    frameIndex < closeStartFrame ? 0 : clamp01((frameIndex - closeStartFrame) / duration);
                const progress = 1 - openProgress;

                if (step.kind === 'node') {
                    const nodeId = step.id as NodeId;
                    const closeStyle = phase.closeNodeStyles?.[nodeId];
                    if (progress <= 0) {
                        if (closeStyle?.visible) {
                            visibleNodes.add(nodeId);
                            nodeVersions.set(nodeId, closeStyle.version);
                        } else {
                            visibleNodes.delete(nodeId);
                            nodeVersions.delete(nodeId);
                        }
                    } else {
                        visibleNodes.add(nodeId);
                    }
                    const renderProgress = closeStyle?.visible && progress <= 0 ? 1 : progress;
                    animatingElements.set(step.id, {
                        kind: 'node',
                        progress: renderProgress,
                        textProgress: renderProgress,
                        reverse: false,
                        state: renderProgress >= 1 ? 'drawn' : 'drawing',
                        quickComplete: phase.quickComplete,
                    });
                } else {
                    visibleEdges.add(step.id as LineId);
                    animatingElements.set(step.id, {
                        kind: 'edge',
                        progress,
                        textProgress: 1,
                        reverse: step.reverse,
                        state: progress <= 0 ? 'not-drawn' : progress >= 1 ? 'drawn' : 'drawing',
                        quickComplete: phase.quickComplete,
                    });
                }
                if (frameIndex >= startFrame && startFrame >= latestFocusStartFrame) {
                    latestFocusElement = step;
                    latestFocusStartFrame = startFrame;
                }
            }

            const keepQuickCompleteFocus =
                phase.quickComplete &&
                phases[currentPhaseIndex - 1]?.type === 'focus' &&
                ctx.lastFocus.kind === 'center';
            const closeFocusElement = latestFocusElement ?? closeElements[0];
            if (keepQuickCompleteFocus) {
                focus = ctx.lastFocus;
            } else if (closeFocusElement) {
                if (closeFocusElement.kind === 'node') {
                    focus = { kind: 'node', id: closeFocusElement.id as NodeId };
                } else {
                    const startFrame = ctx.elementStartFrame.get(getKey(closeFocusElement.id)) ?? frameIndex;
                    const duration =
                        ctx.elementDurationFrame.get(getKey(closeFocusElement.id)) ??
                        Math.max(1, Math.round(ctx.fps * phase.nodeAnimationDuration));
                    focus = {
                        kind: 'edge',
                        id: closeFocusElement.id as LineId,
                        progress: 1 - clamp01((frameIndex - startFrame) / duration),
                        reverse: closeFocusElement.reverse,
                    };
                }
                ctx.lastFocus = focus;
            }
        }
        if (
            phase.quickComplete &&
            (phase.type === 'open' || phase.type === 'close') &&
            ctx.focusCenterHold?.batchIndex === phase.batchIndex
        ) {
            focus = { kind: 'center', center: ctx.focusCenterHold.center };
            ctx.focusZoom = ctx.focusCenterHold.zoom;
            ctx.lastFocus = focus;
        }
        // 等待阶段保持当前镜头；全览阶段使用全图中心。
        if (phase.type === 'wait' && focus.kind === 'none' && ctx.lastFocus.kind !== 'none') {
            focus = ctx.lastFocus;
        }
    }

    // Current active line groups info
    const currentActiveLineGroups = ctx.activeLineGroups.filter(g => currentActiveLineIds.includes(g.id));

    // 左上角线路徽章 = 当前 open/close 动作目标线路段所在线路
    let badgeGroup: { bgColor: string; text: string } | null = null;
    if (phase && (phase.type === 'open' || phase.type === 'close') && phase.targetGroupId) {
        const target = ctx.activeLineGroups.find(g => g.id === phase.targetGroupId);
        if (target) badgeGroup = { bgColor: target.bgColor, text: target.text };
    }

    // 全览保持：overview 结束后保持缩放与视口，仅 focus 动作恢复（下一条线起点）
    if (phase?.type === 'overview') {
        // 全览阶段：使用扣除 HUD 安全矩形后的全览相机，保证所有元素落在安全区内
        const safeCamera = getSafeOverviewCamera(ctx.graph, visibleNodes, visibleEdges);
        focus = { kind: 'overview', center: safeCamera.center };
        ctx.lastFocus = focus;
        ctx.overviewZoomOverride = safeCamera.zoom;
        safeOverviewCamera = safeCamera;
        ctx.overviewHold = {
            center: safeCamera.center,
            zoom: safeCamera.zoom,
        };
    } else if (phase?.type === 'focus') {
        if (phase.focusTargetBounds) {
            ctx.overviewHold = null;
        } else if (ctx.overviewHold) {
            ctx.overviewZoomOverride = ctx.overviewHold.zoom;
            ctx.overviewPhaseProgress = 1 - phaseLocalProgress;
            const range = phaseFrameRanges[currentPhaseIndex];
            if (frameIndex >= range.end - 1) ctx.overviewHold = null;
        }
    } else if (ctx.overviewHold && !isOverview) {
        // 全览后的保持/过渡帧：同样扣除 HUD 安全矩形，避免内容被统计卡片/小地图遮挡
        const safeCamera = getSafeOverviewCamera(ctx.graph, visibleNodes, visibleEdges);
        focus = { kind: 'overview', center: safeCamera.center };
        ctx.lastFocus = focus;
        ctx.overviewZoomOverride = safeCamera.zoom;
        ctx.overviewPhaseProgress = 1;
        safeOverviewCamera = safeCamera;
    }

    // 聚焦插值：聚焦期间镜头沿"起点→聚焦目标"平滑移动（与缩放过渡同步），
    // 保证聚焦阶段内镜头一定到位，而非受惯性/速度上限限制追不上目标。
    let cameraOverrideCenter: { x: number; y: number } | null = null;
    if (phase?.type === 'focus' && (focus.kind === 'node' || focus.kind === 'edge' || focus.kind === 'center')) {
        if (phaseLocalProgress <= 0) ctx.focusTransitionStart = null; // 新聚焦阶段：重置插值起点
        const targetPoint =
            focus.kind === 'center'
                ? focus.center
                : getFocusApproxPoint(ctx.graph, {
                      kind: focus.kind,
                      id: focus.id as Id,
                      reverse: focus.kind === 'edge' ? focus.reverse : false,
                  });
        if (targetPoint) {
            if (!ctx.focusTransitionStart) {
                ctx.focusTransitionStart = ctx.cameraCenter ?? ctx.overviewHold?.center ?? targetPoint;
            }
            const transitionStart = ctx.focusTransitionStart;
            const t = smoothstep(0, 1, phaseLocalProgress);
            cameraOverrideCenter = {
                x: transitionStart.x + (targetPoint.x - transitionStart.x) * t,
                y: transitionStart.y + (targetPoint.y - transitionStart.y) * t,
            };
        }
    }

    return {
        visibleNodes,
        visibleEdges,
        nodeVersions,
        animatingElements,
        focus,
        date: currentDate,
        remark: currentRemark,
        activeLineIds: currentActiveLineIds,
        currentActiveLineGroups,
        badgeGroup,
        cameraOverrideCenter,
        overviewCenter:
            safeOverviewCamera?.center ??
            (isOverview ? getVisibleCenter(ctx.graph, visibleNodes, visibleEdges) : undefined),
        overviewZoom:
            safeOverviewCamera?.zoom ??
            (isOverview ? getVisibleOverviewZoom(ctx.graph, visibleNodes, visibleEdges) : undefined),
        safeOverviewCamera,
    };
}

const getPhaseFrameRanges = (
    phases: AnimationPhase[],
    totalFrames: number,
    fps: number
): { phaseFrameRanges: Array<{ start: number; end: number }>; animationEndFrame: number; remainingFrames: number } => {
    const overviewFrames = Math.min(
        Math.max(0, totalFrames - 1),
        Math.max(1, Math.round(fps * VIDEO_OVERVIEW_SECONDS))
    );
    const animationFrames = Math.max(1, totalFrames - overviewFrames);
    const totalDuration = phases.reduce((max, phase) => Math.max(max, phase.endTime), 0);
    const phaseFrameRanges = phases.map(phase => ({
        start: totalDuration > 0 ? Math.round((phase.startTime / totalDuration) * animationFrames) : 0,
        end: totalDuration > 0 ? Math.round((phase.endTime / totalDuration) * animationFrames) : animationFrames,
    }));
    const animationEndFrame = phaseFrameRanges.reduce((max, range) => Math.max(max, range.end), 0);
    return {
        phaseFrameRanges,
        animationEndFrame,
        remainingFrames: Math.max(0, totalFrames - animationEndFrame),
    };
};

// ── WebM export (using WebMWriter) ─────────────────────────────────────────────

async function exportAsWebM(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    phases: AnimationPhase[],
    totalFrames: number,
    fps: number,
    quality: number,
    userScale: number,
    overviewZoom: number,
    isTransparent: boolean,
    isSystemFontsOnly: boolean,
    bgColor: string,
    activeLineGroups: LineGroup[],
    progress?: (p: number) => void,
    signal?: AbortSignal,
    mapLayerMarkup?: string
): Promise<Blob> {
    const writer = new WebMWriter({
        quality: Math.min(0.999, Math.max(0.01, quality / 100)),
        frameRate: fps,
        transparent: isTransparent,
    });

    const { phaseFrameRanges, animationEndFrame, remainingFrames } = getPhaseFrameRanges(phases, totalFrames, fps);

    const edgeLengths = await calculateEdgeLengths(graph, languages, isSystemFontsOnly);
    const ctx: FrameContext = {
        graph,
        languages,
        existsNodeTypes,
        fps,
        totalFrames,
        userScale,
        overviewZoom,
        isTransparent,
        isSystemFontsOnly,
        bgColor,
        activeLineGroups,
        mapLayerMarkup,
        accumulatedVisibleNodes: new Set(),
        accumulatedVisibleEdges: new Set(),
        elementStartFrame: new Map(),
        elementDurationFrame: new Map(),
        cameraCenter: undefined,
        previousBasicStations: new Set(),
        lastFocus: { kind: 'none' },
        edgeLengths,
        phaseDurations: phases.map(p => p.durationWeight),
        overviewHold: undefined,
        focusTransitionStart: null,
    };

    // Accumulate state phase by phase to handle close phases
    for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        if (phase.type === 'open') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.add(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.add(elem.id as LineId);
            }
        } else if (phase.type === 'close') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.delete(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.delete(elem.id as LineId);
            }
        }
    }

    for (let frame = 0; frame < totalFrames; frame++) {
        throwIfAborted(signal);
        // 先执行 processFrame：更新 ctx.overviewPhaseProgress / ctx.overviewZoomOverride，保证 effectiveZoom 不滞后一帧
        const {
            visibleNodes,
            visibleEdges,
            nodeVersions,
            animatingElements,
            focus,
            date,
            remark,
            currentActiveLineGroups,
            badgeGroup,
            cameraOverrideCenter,
            safeOverviewCamera,
        } = processFrame(ctx, frame, phases, phaseFrameRanges);

        const overviewProgress =
            frame < animationEndFrame ? -1 : (frame - animationEndFrame) / Math.max(remainingFrames, 1);
        const cameraEaseProgress = ctx.overviewPhaseProgress ?? (overviewProgress >= 0 ? overviewProgress : -1);
        const effectiveZoom = getFrameEffectiveZoom(ctx, cameraEaseProgress);

        const {
            elem,
            cameraCenter: nextCameraCenter,
            cameraVelocity: nextCameraVelocity,
        } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            animatingElements,
            focus,
            ctx.cameraCenter,
            ctx.cameraVelocity,
            ctx.previousBasicStations,
            effectiveZoom,
            cameraEaseProgress,
            ctx.userScale,
            isSystemFontsOnly,
            languages,
            existsNodeTypes,
            date,
            remark,
            currentActiveLineGroups,
            badgeGroup,
            cameraOverrideCenter,
            false,
            nodeVersions,
            ctx.mapLayerMarkup,
            undefined,
            safeOverviewCamera
        );
        ctx.cameraCenter = nextCameraCenter;
        ctx.cameraVelocity = nextCameraVelocity;

        const canvas = await renderSVGToCanvas(
            elem,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            isTransparent,
            bgColor
        );
        writer.addFrame(canvas);
        elem.remove();
        progress?.((frame + 1) / totalFrames);
    }

    return writer.complete();
}

// ── MP4 export via WebCodecs (offline, frame-timestamp-based) ─────────────────

/**
 * 探测浏览器支持的 H.264 编码配置。Chrome/Edge 支持 avc1，Firefox/Safari 可能不支持，
 * 返回 null 时调用方回退到 MediaRecorder。
 */
const pickH264EncoderConfig = async (
    width: number,
    height: number,
    fps: number,
    bitrate: number
): Promise<VideoEncoderConfig | null> => {
    if (typeof VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') return null;
    const candidates: VideoEncoderConfig[] = [
        { codec: 'avc1.640028', width, height, framerate: fps, bitrate },
        { codec: 'avc1.64001f', width, height, framerate: fps, bitrate },
        { codec: 'avc1.42001f', width, height, framerate: fps, bitrate },
    ];
    for (const candidate of candidates) {
        try {
            const { supported } = await VideoEncoder.isConfigSupported(candidate);
            if (supported) return candidate;
        } catch {
            // try next candidate
        }
    }
    return null;
};

interface Mp4FrameRenderer {
    (frameIndex: number): Promise<HTMLCanvasElement>;
}

/**
 * 用 WebCodecs 离线编码 MP4：每帧时间戳由帧索引计算（frame * 1000000/fps），
 * 与真实渲染时间完全无关。页面切后台时 setTimeout/requestAnimationFrame 会被浏览器
 * 节流，MediaRecorder 按真实时间录制会导致视频时长拉长（严重慢放）；此方案只受
 * 渲染速度影响，最终视频时长恒为 帧数/fps，进度条也按帧推进。
 */
const encodeFramesToMP4 = async (
    totalFrames: number,
    fps: number,
    quality: number,
    width: number,
    height: number,
    renderFrame: Mp4FrameRenderer,
    signal?: AbortSignal
): Promise<Blob> => {
    const bitrate = Math.max(2_000_000, Math.min(24_000_000, Math.round((quality / 100) * 24_000_000)));
    const config = await pickH264EncoderConfig(width, height, fps, bitrate);
    if (!config) {
        throw new Error('MP4 export is not supported in this browser. Please use WebM format instead.');
    }

    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width, height },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset',
    });

    const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: error => console.error('VideoEncoder error:', error),
    });
    encoder.configure(config);

    const microsPerFrame = 1_000_000 / fps;
    const keyFrameInterval = Math.max(1, Math.round(fps * 2));
    try {
        for (let frame = 0; frame < totalFrames; frame++) {
            throwIfAborted(signal);
            const frameCanvas = await renderFrame(frame);
            const videoFrame = new VideoFrame(frameCanvas, {
                timestamp: Math.round(frame * microsPerFrame),
                duration: Math.round(microsPerFrame),
            });
            encoder.encode(videoFrame, { keyFrame: frame % keyFrameInterval === 0 });
            videoFrame.close();
            while (encoder.encodeQueueSize > 8) {
                await new Promise<void>(resolve => setTimeout(resolve, 0));
                throwIfAborted(signal);
            }
        }
    } finally {
        try {
            await encoder.flush();
        } catch {
            // flush 失败（编码异常）时忽略，muxer 仍产出已编码部分
        }
        encoder.close();
    }
    muxer.finalize();
    const { buffer } = muxer.target;
    return new Blob([buffer], { type: 'video/mp4' });
};

// ── MP4 export ─────────────────────────────────────────────────────────────────

async function exportAsMP4(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    phases: AnimationPhase[],
    totalFrames: number,
    fps: number,
    userScale: number,
    overviewZoom: number,
    isTransparent: boolean,
    isSystemFontsOnly: boolean,
    bgColor: string,
    activeLineGroups: LineGroup[],
    progress?: (p: number) => void,
    duration?: number,
    signal?: AbortSignal,
    mapLayerMarkup?: string
): Promise<Blob> {
    const { phaseFrameRanges, animationEndFrame, remainingFrames } = getPhaseFrameRanges(phases, totalFrames, fps);
    const frameMs = 1000 / fps;
    // MP4 质量未通过参数传入（与 MediaRecorder 时代一致），使用 UI 默认值 20
    const mp4Quality = 20;

    const edgeLengths = await calculateEdgeLengths(graph, languages, isSystemFontsOnly);
    const ctx: FrameContext = {
        graph,
        languages,
        existsNodeTypes,
        fps,
        totalFrames,
        userScale,
        overviewZoom,
        isTransparent,
        isSystemFontsOnly,
        bgColor,
        activeLineGroups,
        accumulatedVisibleNodes: new Set(),
        accumulatedVisibleEdges: new Set(),
        elementStartFrame: new Map(),
        elementDurationFrame: new Map(),
        cameraCenter: undefined,
        previousBasicStations: new Set(),
        lastFocus: { kind: 'none' },
        edgeLengths,
        phaseDurations: phases.map(p => p.durationWeight),
        overviewHold: undefined,
        focusTransitionStart: null,
    };

    // Accumulate state
    for (const phase of phases) {
        if (phase.type === 'open') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.add(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.add(elem.id as LineId);
            }
        } else if (phase.type === 'close') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.delete(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.delete(elem.id as LineId);
            }
        }
    }

    // 渲染单帧并返回画布（WebCodecs 离线编码与 MediaRecorder 回退共用）
    const renderFrame = async (frame: number): Promise<HTMLCanvasElement> => {
        throwIfAborted(signal);
        // 先执行 processFrame：更新 ctx.overviewPhaseProgress / ctx.overviewZoomOverride，保证 effectiveZoom 不滞后一帧
        const {
            visibleNodes,
            visibleEdges,
            nodeVersions,
            animatingElements,
            focus,
            date,
            remark,
            currentActiveLineGroups,
            badgeGroup,
            cameraOverrideCenter,
            safeOverviewCamera,
        } = processFrame(ctx, frame, phases, phaseFrameRanges);

        const overviewProgress =
            frame < animationEndFrame ? -1 : (frame - animationEndFrame) / Math.max(remainingFrames, 1);
        const cameraEaseProgress = ctx.overviewPhaseProgress ?? (overviewProgress >= 0 ? overviewProgress : -1);
        const effectiveZoom = getFrameEffectiveZoom(ctx, cameraEaseProgress);

        const {
            elem,
            cameraCenter: nextCameraCenter,
            cameraVelocity: nextCameraVelocity,
        } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            animatingElements,
            focus,
            ctx.cameraCenter,
            ctx.cameraVelocity,
            ctx.previousBasicStations,
            effectiveZoom,
            cameraEaseProgress,
            ctx.userScale,
            isSystemFontsOnly,
            languages,
            existsNodeTypes,
            date,
            remark,
            currentActiveLineGroups,
            badgeGroup,
            cameraOverrideCenter,
            false,
            nodeVersions,
            mapLayerMarkup,
            undefined,
            safeOverviewCamera
        );
        ctx.cameraCenter = nextCameraCenter;
        ctx.cameraVelocity = nextCameraVelocity;

        const frameCanvas = await renderSVGToCanvas(
            elem,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            isTransparent,
            bgColor
        );
        elem.remove();
        progress?.((frame + 1) / totalFrames);
        return frameCanvas;
    };

    // 优先 WebCodecs 离线编码：帧时间戳由帧索引计算，与真实渲染时间无关，
    // 页面切后台时浏览器节流定时器不影响最终视频时长（不会慢放）
    const mp4Bitrate = Math.max(2_000_000, Math.min(24_000_000, Math.round((mp4Quality / 100) * 24_000_000)));
    const wcConfig = await pickH264EncoderConfig(
        VIDEO_EXPORT_OUTPUT_WIDTH,
        VIDEO_EXPORT_OUTPUT_HEIGHT,
        fps,
        mp4Bitrate
    );
    if (wcConfig) {
        return encodeFramesToMP4(
            totalFrames,
            fps,
            mp4Quality,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            renderFrame,
            signal
        );
    }

    // 回退：MediaRecorder 方案（浏览器不支持 WebCodecs H.264 编码时使用）
    const mimeType = getSupportedMp4MimeType();
    if (!mimeType) {
        throw new Error('MP4 export is not supported in this browser. Please use WebM format instead.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_EXPORT_OUTPUT_WIDTH;
    canvas.height = VIDEO_EXPORT_OUTPUT_HEIGHT;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    const blobPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            resolve(new Blob(chunks, { type: 'video/mp4' }));
        };
        recorder.onerror = () => {
            stream.getTracks().forEach(t => t.stop());
            reject(new Error('MP4 recording failed'));
        };
    });

    recorder.start();
    try {
        for (let frame = 0; frame < totalFrames; frame++) {
            const frameCanvas = await renderFrame(frame);
            const ctx2d = canvas.getContext('2d')!;
            ctx2d.clearRect(0, 0, VIDEO_EXPORT_OUTPUT_WIDTH, VIDEO_EXPORT_OUTPUT_HEIGHT);
            if (!isTransparent) {
                ctx2d.fillStyle = bgColor;
                ctx2d.fillRect(0, 0, VIDEO_EXPORT_OUTPUT_WIDTH, VIDEO_EXPORT_OUTPUT_HEIGHT);
            }
            ctx2d.drawImage(frameCanvas, 0, 0);
            if (frame < totalFrames - 1) {
                await new Promise(resolve => setTimeout(resolve, frameMs));
            }
        }
    } finally {
        // 取消/异常时也停止录制，避免 MediaRecorder 与流资源泄漏
        recorder.stop();
    }
    return blobPromise;
}

// ── Fallback export (no action rows) ───────────────────────────────────────────

async function exportFallback(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    fallbackSteps: AnimationStep[],
    totalFrames: number,
    fps: number,
    quality: number,
    scale: number,
    overviewZoom: number,
    isTransparent: boolean,
    isSystemFontsOnly: boolean,
    bgColor: string,
    format: 'webm' | 'mp4',
    progress?: (p: number) => void,
    duration?: number,
    signal?: AbortSignal,
    mapLayerMarkup?: string
): Promise<Blob> {
    const animationFrames = Math.max(1, Math.round(totalFrames * 0.9));

    if (format === 'mp4') {
        return exportFallbackMP4(
            graph,
            languages,
            existsNodeTypes,
            fallbackSteps,
            totalFrames,
            animationFrames,
            fps,
            scale,
            overviewZoom,
            isTransparent,
            isSystemFontsOnly,
            bgColor,
            progress,
            duration,
            signal,
            mapLayerMarkup
        );
    }

    return exportFallbackWebM(
        graph,
        languages,
        existsNodeTypes,
        fallbackSteps,
        totalFrames,
        animationFrames,
        fps,
        quality,
        scale,
        overviewZoom,
        isTransparent,
        isSystemFontsOnly,
        bgColor,
        progress,
        signal,
        mapLayerMarkup
    );
}

const isEdgeExportVisible = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId
): boolean => {
    if (!graph.hasEdge(edgeId)) return false;
    return graph.getEdgeAttribute(edgeId, 'visible') !== false;
};

async function exportFallbackWebM(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    fallbackSteps: AnimationStep[],
    totalFrames: number,
    animationFrames: number,
    fps: number,
    quality: number,
    scale: number,
    overviewZoom: number,
    isTransparent: boolean,
    isSystemFontsOnly: boolean,
    bgColor: string,
    progress?: (p: number) => void,
    signal?: AbortSignal,
    mapLayerMarkup?: string
): Promise<Blob> {
    const writer = new WebMWriter({
        quality: Math.min(0.999, Math.max(0.01, quality / 100)),
        frameRate: fps,
        transparent: isTransparent,
    });

    const allNodes = new Set<NodeId>();
    const allEdges = new Set<LineId>();
    graph.forEachNode(node => allNodes.add(node as NodeId));
    graph.forEachEdge(edge => allEdges.add(edge as LineId));

    let cameraCenter: { x: number; y: number } | undefined;
    let cameraVelocity: { x: number; y: number } | undefined;
    const nodeVersions = new Map<NodeId, number>();
    fallbackSteps.forEach(step => {
        if (step.kind === 'node') nodeVersions.set(step.id as NodeId, step.version ?? 1);
    });
    const nodeStartFrame = new Map<NodeId, number>();
    const visibleElementsAtFrame = new Set<Id>();

    for (let frame = 0; frame < totalFrames; frame++) {
        throwIfAborted(signal);
        const isAnimation = frame < animationFrames;
        const overviewProgress = isAnimation
            ? -1
            : (frame - animationFrames) / Math.max(totalFrames - animationFrames, 1);
        const effectiveZoom = getEffectiveZoom(overviewProgress, scale, overviewZoom);

        const visibleNodes = new Set<NodeId>();
        const visibleEdges = new Set<LineId>();
        const animatingElements = new Map<Id, ElementAnimation>();
        let focus: CameraFocus = { kind: 'none' };

        if (isAnimation) {
            const progressInAnimation = animationFrames > 1 ? frame / (animationFrames - 1) : 0;
            const stepsProgress = progressInAnimation * fallbackSteps.length;

            for (let si = 0; si < fallbackSteps.length; si++) {
                const step = fallbackSteps[si];
                if (step.kind === 'node') {
                    if (!nodeStartFrame.has(step.id as NodeId)) {
                        nodeStartFrame.set(
                            step.id as NodeId,
                            Math.round((si / fallbackSteps.length) * animationFrames)
                        );
                    }
                    visibleNodes.add(step.id as NodeId);
                    if (focus.kind === 'none') focus = { kind: 'node', id: step.id as NodeId };
                } else {
                    if (si <= Math.floor(stepsProgress)) {
                        visibleEdges.add(step.id as LineId);
                        if (si === Math.floor(stepsProgress) && focus.kind === 'none') {
                            const edgeProgress = stepsProgress - Math.floor(stepsProgress);
                            focus = {
                                kind: 'edge',
                                id: step.id as LineId,
                                progress: edgeProgress,
                                reverse: step.reverse,
                            };
                        }
                    }
                }
            }

            // Apply animations
            for (const step of fallbackSteps) {
                if (step.kind === 'node' && visibleNodes.has(step.id as NodeId)) {
                    const sf = nodeStartFrame.get(step.id as NodeId) ?? frame;
                    animatingElements.set(step.id, {
                        kind: 'node',
                        progress: getNodeRevealProgress(frame, sf, fps),
                        textProgress: getNodeTextRevealProgress(frame, sf, fps),
                        reverse: false,
                        state: 'drawing',
                    });
                }
                if (step.kind === 'edge' && visibleEdges.has(step.id as LineId)) {
                    const idx = fallbackSteps.indexOf(step);
                    const edgeStartFrame = Math.round((idx / fallbackSteps.length) * animationFrames);
                    const edgeDuration = Math.max(1, Math.round(fps * 0.6));
                    const p = clamp01((frame - edgeStartFrame) / edgeDuration);
                    animatingElements.set(step.id, {
                        kind: 'edge',
                        progress: p,
                        textProgress: 1,
                        reverse: step.reverse,
                        state: 'drawing',
                    });
                }
            }
        } else {
            allNodes.forEach(n => visibleNodes.add(n));
            allEdges.forEach(e => {
                if (isEdgeExportVisible(graph, e)) visibleEdges.add(e);
            });
        }

        const safeOverviewCamera = getSafeOverviewCamera(graph, visibleNodes, visibleEdges);
        const {
            elem,
            cameraCenter: nc,
            cameraVelocity: nv,
        } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            animatingElements,
            focus,
            cameraCenter,
            cameraVelocity,
            new Set(),
            effectiveZoom,
            overviewProgress,
            scale,
            isSystemFontsOnly,
            languages,
            existsNodeTypes,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            nodeVersions,
            mapLayerMarkup,
            undefined,
            safeOverviewCamera
        );
        cameraCenter = nc;
        cameraVelocity = nv;
        const canvas = await renderSVGToCanvas(
            elem,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            isTransparent,
            bgColor
        );
        writer.addFrame(canvas);
        elem.remove();
        progress?.((frame + 1) / totalFrames);
    }

    return writer.complete();
}

async function exportFallbackMP4(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    existsNodeTypes: Set<NodeType>,
    fallbackSteps: AnimationStep[],
    totalFrames: number,
    animationFrames: number,
    fps: number,
    scale: number,
    overviewZoom: number,
    isTransparent: boolean,
    isSystemFontsOnly: boolean,
    bgColor: string,
    progress?: (p: number) => void,
    duration?: number,
    signal?: AbortSignal,
    mapLayerMarkup?: string
): Promise<Blob> {
    const allNodes = new Set<NodeId>();
    const allEdges = new Set<LineId>();
    graph.forEachNode(node => allNodes.add(node as NodeId));
    graph.forEachEdge(edge => allEdges.add(edge as LineId));

    let cameraCenter: { x: number; y: number } | undefined;
    let cameraVelocity: { x: number; y: number } | undefined;
    const nodeStartFrame = new Map<NodeId, number>();
    const nodeVersions = new Map<NodeId, number>();
    const frameMs = 1000 / fps;

    // 渲染单帧并返回画布（WebCodecs 离线编码与 MediaRecorder 回退共用）
    const renderFrame = async (frame: number): Promise<HTMLCanvasElement> => {
        throwIfAborted(signal);
        const isAnimation = frame < animationFrames;
        const overviewProgress = isAnimation
            ? -1
            : (frame - animationFrames) / Math.max(totalFrames - animationFrames, 1);
        const effectiveZoom = getEffectiveZoom(overviewProgress, scale, overviewZoom);

        const visibleNodes = new Set<NodeId>();
        const visibleEdges = new Set<LineId>();
        const animatingElements = new Map<Id, ElementAnimation>();
        let focus: CameraFocus = { kind: 'none' };

        if (isAnimation) {
            const progressInAnimation = animationFrames > 1 ? frame / (animationFrames - 1) : 0;
            const stepsProgress = progressInAnimation * fallbackSteps.length;
            for (let si = 0; si < fallbackSteps.length; si++) {
                const step = fallbackSteps[si];
                if (step.kind === 'node') {
                    if (!nodeStartFrame.has(step.id as NodeId))
                        nodeStartFrame.set(
                            step.id as NodeId,
                            Math.round((si / fallbackSteps.length) * animationFrames)
                        );
                    visibleNodes.add(step.id as NodeId);
                    if (focus.kind === 'none') focus = { kind: 'node', id: step.id as NodeId };
                } else {
                    if (si <= Math.floor(stepsProgress)) {
                        visibleEdges.add(step.id as LineId);
                        if (si === Math.floor(stepsProgress) && focus.kind === 'none') {
                            focus = {
                                kind: 'edge',
                                id: step.id as LineId,
                                progress: stepsProgress - Math.floor(stepsProgress),
                                reverse: step.reverse,
                            };
                        }
                    }
                }
            }
            for (const step of fallbackSteps) {
                if (step.kind === 'node' && visibleNodes.has(step.id as NodeId)) {
                    const sf = nodeStartFrame.get(step.id as NodeId) ?? frame;
                    animatingElements.set(step.id, {
                        kind: 'node',
                        progress: getNodeRevealProgress(frame, sf, fps),
                        textProgress: getNodeTextRevealProgress(frame, sf, fps),
                        reverse: false,
                        state: 'drawing',
                    });
                }
                if (step.kind === 'edge' && visibleEdges.has(step.id as LineId)) {
                    const idx = fallbackSteps.indexOf(step);
                    const edgeStartFrame = Math.round((idx / fallbackSteps.length) * animationFrames);
                    const edgeDuration = Math.max(1, Math.round(fps * 0.6));
                    animatingElements.set(step.id, {
                        kind: 'edge',
                        progress: clamp01((frame - edgeStartFrame) / edgeDuration),
                        textProgress: 1,
                        reverse: step.reverse,
                        state: 'drawing',
                    });
                }
            }
        } else {
            allNodes.forEach(n => visibleNodes.add(n));
            allEdges.forEach(e => visibleEdges.add(e));
        }

        const safeOverviewCamera = getSafeOverviewCamera(graph, visibleNodes, visibleEdges);
        const {
            elem,
            cameraCenter: nc,
            cameraVelocity: nv,
        } = await createFrameSVG(
            graph,
            visibleNodes,
            visibleEdges,
            animatingElements,
            focus,
            cameraCenter,
            cameraVelocity,
            new Set(),
            effectiveZoom,
            overviewProgress,
            scale,
            isSystemFontsOnly,
            languages,
            existsNodeTypes,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            nodeVersions,
            mapLayerMarkup,
            undefined,
            safeOverviewCamera
        );
        cameraCenter = nc;
        cameraVelocity = nv;
        const frameCanvas = await renderSVGToCanvas(
            elem,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            isTransparent,
            bgColor
        );
        elem.remove();
        progress?.((frame + 1) / totalFrames);
        return frameCanvas;
    };

    // 优先 WebCodecs 离线编码（帧时间戳与真实时间无关，切后台不慢放）
    const wcConfig = await pickH264EncoderConfig(VIDEO_EXPORT_OUTPUT_WIDTH, VIDEO_EXPORT_OUTPUT_HEIGHT, fps, 4_800_000);
    if (wcConfig) {
        return encodeFramesToMP4(
            totalFrames,
            fps,
            20,
            VIDEO_EXPORT_OUTPUT_WIDTH,
            VIDEO_EXPORT_OUTPUT_HEIGHT,
            renderFrame,
            signal
        );
    }

    // 回退：MediaRecorder 方案
    const mimeType = getSupportedMp4MimeType();
    if (!mimeType) throw new Error('MP4 export is not supported in this browser. Please use WebM format instead.');

    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_EXPORT_OUTPUT_WIDTH;
    canvas.height = VIDEO_EXPORT_OUTPUT_HEIGHT;
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
    };
    const blobPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            resolve(new Blob(chunks, { type: 'video/mp4' }));
        };
        recorder.onerror = () => {
            stream.getTracks().forEach(t => t.stop());
            reject(new Error('MP4 recording failed'));
        };
    });
    recorder.start();
    try {
        for (let frame = 0; frame < totalFrames; frame++) {
            const frameCanvas = await renderFrame(frame);
            const ctx2d = canvas.getContext('2d')!;
            ctx2d.clearRect(0, 0, VIDEO_EXPORT_OUTPUT_WIDTH, VIDEO_EXPORT_OUTPUT_HEIGHT);
            if (!isTransparent) {
                ctx2d.fillStyle = bgColor;
                ctx2d.fillRect(0, 0, VIDEO_EXPORT_OUTPUT_WIDTH, VIDEO_EXPORT_OUTPUT_HEIGHT);
            }
            ctx2d.drawImage(frameCanvas, 0, 0);
            if (frame < totalFrames - 1) await new Promise(resolve => setTimeout(resolve, frameMs));
        }
    } finally {
        // 取消/异常时也停止录制，避免 MediaRecorder 与流资源泄漏
        recorder.stop();
    }
    return blobPromise;
}

// ── Main export entry ──────────────────────────────────────────────────────────

export const exportVideo = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    options: VideoExportOptions = {},
    _bgColor?: string,
    progress?: (p: number) => void
): Promise<Blob> => {
    const {
        fps = 24,
        quality = 20,
        format = 'mp4',
        duration = 10,
        isTransparent = false,
        scale = 100,
        isSystemFontsOnly = false,
        timelineDiffs,
        existsNodeTypes = new Set<NodeType>(),
        actionRows,
        timelineLines = [],
        lineGroups = [],
        mapLayerMarkup,
        signal,
    } = options;

    const bgColor = _bgColor ?? (isTransparent ? 'transparent' : '#000000');
    // Note: the caller (video-export-modal) passes a duration that already includes VIDEO_OVERVIEW_SECONDS
    const totalFrames = Math.max(1, Math.floor(fps * duration));
    const overviewZoom = getOverviewZoom(graph);

    // Use action rows if available
    if (actionRows && actionRows.length > 0) {
        const phases = buildAnimationPhases(actionRows, timelineLines, graph);

        if (format === 'mp4') {
            return exportAsMP4(
                graph,
                languages,
                existsNodeTypes,
                phases,
                totalFrames,
                fps,
                scale,
                overviewZoom,
                isTransparent,
                isSystemFontsOnly,
                bgColor,
                lineGroups,
                progress,
                duration,
                signal,
                mapLayerMarkup
            );
        }
        return exportAsWebM(
            graph,
            languages,
            existsNodeTypes,
            phases,
            totalFrames,
            fps,
            quality,
            scale,
            overviewZoom,
            isTransparent,
            isSystemFontsOnly,
            bgColor,
            lineGroups,
            progress,
            signal,
            mapLayerMarkup
        );
    }

    // Fallback: use spatial sorting
    const fallbackSteps = buildFallbackSequence(graph);
    if (fallbackSteps.length === 0) {
        throw new Error('No elements to animate');
    }

    return exportFallback(
        graph,
        languages,
        existsNodeTypes,
        fallbackSteps,
        totalFrames,
        fps,
        quality,
        scale,
        overviewZoom,
        isTransparent,
        isSystemFontsOnly,
        bgColor,
        format,
        progress,
        duration,
        signal,
        mapLayerMarkup
    );
};

// ── Frame callback export ──────────────────────────────────────────────────────

export const exportVideoWithFrameCallback = async (
    svgElement: SVGSVGElement,
    duration: number,
    frameCallback: (time: number) => void,
    options: VideoExportOptions = {}
): Promise<Blob> => {
    const { fps = 24, quality = 20, format = 'webm', signal } = options;
    const totalFrames = Math.ceil(duration * fps);
    const frameMs = 1000 / fps;
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width || svgElement.clientWidth || 800;
    const height = bbox.height || svgElement.clientHeight || 600;

    if (format === 'mp4') {
        // 渲染单帧并返回画布（WebCodecs 离线编码与 MediaRecorder 回退共用）
        const renderFrame = async (frame: number): Promise<HTMLCanvasElement> => {
            throwIfAborted(signal);
            frameCallback((frame / totalFrames) * duration);
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = width;
            frameCanvas.height = height;
            const ctx = frameCanvas.getContext('2d')!;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            const svgString = svgElement.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
            const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve();
                };
                img.onerror = reject;
                img.src = src;
            });
            return frameCanvas;
        };

        // 优先 WebCodecs 离线编码（帧时间戳与真实时间无关，切后台不慢放）
        const mp4Bitrate = Math.max(2_000_000, Math.min(24_000_000, Math.round((quality / 100) * 24_000_000)));
        const wcConfig = await pickH264EncoderConfig(width, height, fps, mp4Bitrate);
        if (wcConfig) {
            return encodeFramesToMP4(totalFrames, fps, quality, width, height, renderFrame, signal);
        }

        // 回退：MediaRecorder 方案
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const mimeType = getSupportedMp4MimeType();
        if (!mimeType) throw new Error('MP4 export is not supported in this browser. Please use WebM format instead.');
        const stream = canvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        const blobPromise = new Promise<Blob>((resolve, reject) => {
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                resolve(new Blob(chunks, { type: 'video/mp4' }));
            };
            recorder.onerror = () => {
                stream.getTracks().forEach(t => t.stop());
                reject(new Error('MP4 recording failed'));
            };
        });
        recorder.start();
        for (let frame = 0; frame < totalFrames; frame++) {
            const frameCanvas = await renderFrame(frame);
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(frameCanvas, 0, 0);
            if (frame < totalFrames - 1) await new Promise(resolve => setTimeout(resolve, Math.max(0, frameMs - 16)));
        }
        recorder.stop();
        return blobPromise;
    }

    const writer = new WebMWriter({
        quality: Math.min(0.999, Math.max(0.01, quality / 100)),
        frameRate: fps,
        transparent: false,
    });
    for (let frame = 0; frame < totalFrames; frame++) {
        throwIfAborted(signal);
        frameCallback((frame / totalFrames) * duration);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        const svgString = svgElement.outerHTML.replace(/&nbsp;/g, ' ').replace(/\p{Cc}/gu, '');
        const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
        writer.addFrame(frameCanvas);
    }

    const blob = await writer.complete();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RMP_timelineVideo_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return blob;
};

// ── Video preview ──────────────────────────────────────────────────────────────

export interface VideoPreview {
    /** 总帧数 */
    totalFrames: number;
    /** 总时长（秒） */
    durationSec: number;
    /** 每个动作开始对应的帧 */
    actionStartFrames: number[];
    /** 渲染指定帧（0 <= frameIndex < totalFrames）；跳转时可直接定位镜头 */
    renderFrame: (frameIndex: number, snapCameraToTarget?: boolean) => Promise<SVGSVGElement>;
    /** 释放内部资源（移除缓存的 SVG 元素、清空调度状态） */
    dispose: () => void;
}

/**
 * 创建视频预览渲染器：复用与导出一致的流水线（buildAnimationPhases → getPhaseFrameRanges →
 * processFrame → createFrameSVG），但只渲染单帧 SVG 而非逐帧录制。
 * 用户可自由拖动进度条查看任意时刻的画面，无需导出完整视频。
 *
 * 帧渲染要求与"从头顺序播放到该帧"结果一致：跳回更早的帧时会重置镜头/调度状态后重新
 * 顺序渲染，保证任意跳转（含来回拖动）的画面都与最终导出的视频帧完全一致。
 */
export const createVideoPreview = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    languages: TextLanguage[],
    options: VideoExportOptions = {},
    bgColor?: string
): Promise<VideoPreview> => {
    const {
        fps = 24,
        duration = 10,
        isTransparent = false,
        scale = 100,
        isSystemFontsOnly = false,
        existsNodeTypes = new Set<NodeType>(),
        actionRows,
        timelineLines = [],
        lineGroups = [],
    } = options;

    const bg = bgColor ?? (isTransparent ? 'transparent' : '#000000');
    const totalFrames = Math.max(1, Math.floor(fps * duration));
    const overviewZoom = getOverviewZoom(graph);

    // 与 exportVideo 保持一致：优先用 action rows 构建 phases。
    // 无动作行时预览不可用（调用方应禁用预览按钮）。
    if (!actionRows || actionRows.length === 0) {
        throw new Error('No action rows to preview.');
    }
    const phases = buildAnimationPhases(actionRows, timelineLines, graph);
    const { phaseFrameRanges, animationEndFrame, remainingFrames } = getPhaseFrameRanges(phases, totalFrames, fps);
    const edgeLengths = await calculateEdgeLengths(graph, languages, isSystemFontsOnly);
    let mapLayerTemplate: SVGSVGElement | undefined;
    if (options.mapLayerMarkup) {
        try {
            mapLayerTemplate = getMapLayerTemplate(options.mapLayerMarkup);
        } catch {
            // 地图图层快照无效时静默跳过，不影响预览
        }
    }

    const ctx: FrameContext = {
        graph,
        languages,
        existsNodeTypes,
        fps,
        totalFrames,
        userScale: scale,
        overviewZoom,
        isTransparent,
        isSystemFontsOnly,
        bgColor: bg,
        activeLineGroups: lineGroups,
        mapLayerMarkup: options.mapLayerMarkup,
        accumulatedVisibleNodes: new Set(),
        accumulatedVisibleEdges: new Set(),
        elementStartFrame: new Map(),
        elementDurationFrame: new Map(),
        cameraCenter: undefined,
        previousBasicStations: new Set(),
        lastFocus: { kind: 'none' },
        edgeLengths,
        phaseDurations: phases.map(p => p.durationWeight),
        overviewHold: undefined,
        focusTransitionStart: null,
    };

    // 预先累积跨 phase 的可见状态（与导出一致）
    for (const phase of phases) {
        if (phase.type === 'open') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.add(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.add(elem.id as LineId);
            }
        } else if (phase.type === 'close') {
            for (const elem of phase.elements) {
                if (elem.kind === 'node') ctx.accumulatedVisibleNodes.delete(elem.id as NodeId);
                else ctx.accumulatedVisibleEdges.delete(elem.id as LineId);
            }
        }
    }

    // 已顺序渲染到的最大帧；跳回更早帧时重置后重渲，保证画面与顺序播放一致
    let maxRendered = -1;
    let lastElem: SVGSVGElement | null = null;

    const renderFrame = async (frameIndex: number, snapCameraToTarget = false): Promise<SVGSVGElement> => {
        const target = Math.max(0, Math.min(totalFrames - 1, Math.round(frameIndex)));
        if (target < maxRendered) {
            // 跳回：重置帧相关的累积状态
            ctx.elementStartFrame.clear();
            ctx.elementDurationFrame.clear();
            ctx.cameraCenter = undefined;
            ctx.cameraVelocity = undefined;
            ctx.lastFocus = { kind: 'none' };
            ctx.overviewHold = null;
            ctx.focusTransitionStart = null;
            if (lastElem) {
                lastElem.remove();
                lastElem = null;
            }
            maxRendered = -1;
        }
        for (let f = maxRendered + 1; f <= target; f++) {
            const {
                visibleNodes,
                visibleEdges,
                nodeVersions,
                animatingElements,
                focus,
                date,
                remark,
                currentActiveLineGroups,
                badgeGroup,
                cameraOverrideCenter,
                safeOverviewCamera,
            } = processFrame(ctx, f, phases, phaseFrameRanges);
            maxRendered = f;
            const overviewProgress =
                f < animationEndFrame ? -1 : (f - animationEndFrame) / Math.max(remainingFrames, 1);
            const cameraEaseProgress = ctx.overviewPhaseProgress ?? (overviewProgress >= 0 ? overviewProgress : -1);
            const effectiveZoom = getFrameEffectiveZoom(ctx, cameraEaseProgress);
            const { elem, cameraCenter, cameraVelocity } = await createFrameSVG(
                graph,
                visibleNodes,
                visibleEdges,
                animatingElements,
                focus,
                ctx.cameraCenter,
                ctx.cameraVelocity,
                ctx.previousBasicStations,
                effectiveZoom,
                cameraEaseProgress,
                ctx.userScale,
                isSystemFontsOnly,
                languages,
                existsNodeTypes,
                date,
                remark,
                currentActiveLineGroups,
                badgeGroup,
                cameraOverrideCenter,
                f === target && snapCameraToTarget,
                nodeVersions,
                ctx.mapLayerMarkup,
                mapLayerTemplate,
                safeOverviewCamera
            );
            ctx.cameraCenter = cameraCenter;
            ctx.cameraVelocity = cameraVelocity;
            if (f === target) {
                if (lastElem) lastElem.remove();
                lastElem = elem;
            } else {
                elem.remove();
            }
        }
        return lastElem!;
    };

    return {
        totalFrames,
        durationSec: duration,
        actionStartFrames: phaseFrameRanges.map(range => range.start),
        renderFrame,
        dispose: () => {
            if (lastElem) {
                lastElem.remove();
                lastElem = null;
            }
            maxRendered = -1;
            ctx.elementStartFrame.clear();
            ctx.elementDurationFrame.clear();
            ctx.cameraCenter = undefined;
            ctx.cameraVelocity = undefined;
            ctx.lastFocus = { kind: 'none' };
            ctx.overviewHold = null;
            ctx.focusTransitionStart = null;
        },
    };
};
