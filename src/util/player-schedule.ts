import type { ActionRow, TimelineDiff } from '../constants/timeline';
import { isQuickCompleteAction } from './action-schedule';

export type PhaseType = 'segment' | 'segmentHold' | 'globalMove' | 'globalHold';

export interface AnimPhase {
    type: PhaseType;
    startMs: number;
    endMs: number;
    edgeId?: string;
    edgeAction?: 'add' | 'remove' | 'update' | 'highlight';
    eventIndex?: number;
    direction?: 'forward' | 'backward';
    isDrawing?: boolean;
    /** segmentHold 专用：下一段绘制的边及其方向，用于镜头预瞄 */
    nextEdgeId?: string;
    nextDirection?: 'forward' | 'backward';
    /** 与当前动作同时开始的其它线路段。 */
    parallelEdges?: Array<{
        edgeId: string;
        direction?: 'forward' | 'backward';
        edgeAction: 'add' | 'remove' | 'highlight';
        isDrawing: boolean;
    }>;
    /** 是否快速完成当前动作。 */
    quickComplete?: boolean;
}

interface EdgeState {
    isDrawing: boolean;
    visible: boolean;
}

const DEFAULT_DRAW_SECONDS = 3;
const DEFAULT_FADE_SECONDS = 1.5;
/** 单条边动画的最小/最大时长（毫秒），保证节奏连贯又不至于过慢 */
const MIN_EDGE_MS = 500;
const MAX_HOLD_GAP_MS = 3000;

/**
 * 根据 TimelineDiff 数据构建动画阶段（AnimPhase）序列。
 * 处理边的出现、消失、高亮等动画类型。
 *
 * 调度策略（避免"画完停好久"）：
 * - 同一时间点（同一 diff）内的多条边按生成顺序错开排期，逐条绘制而非同时启动；
 * - 单条边时长由该批可用的时间窗口（到下一 diff 的间隔）均分，并夹在 [MIN_EDGE_MS, drawSeconds] 之间；
 * - 批与批之间的空隙插入 segmentHold（上限 MAX_HOLD_GAP_MS），期间镜头移向下一段起点，
 *   让画面始终保持连续运动，没有死区。
 */
export function buildPhases(
    diffs: TimelineDiff[],
    options?: {
        drawSeconds?: number;
        fadeSeconds?: number;
        holdSeconds?: number;
        /** 线路元素顺序，用于停运时保证从线路起点到终点逐条执行。 */
        edgeOrder?: Map<string, number>;
        /** 动作调度，用于将并行/快速完成标记同步到 diff 动画。 */
        actionRows?: ActionRow[];
        actionSchedule?: Array<{ startTime: number; endTime: number; actionRowIndex: number }>;
        actionLineEdges?: Map<string, string[]>;
    }
): AnimPhase[] {
    const drawSeconds = options?.drawSeconds ?? DEFAULT_DRAW_SECONDS;
    const fadeSeconds = options?.fadeSeconds ?? DEFAULT_FADE_SECONDS;
    const drawMs = drawSeconds * 1000;

    const edgeStates = new Map<string, EdgeState>();
    // 每个 diff 的事件列表（保持生成顺序）
    const batchEvents: Array<
        Array<{
            edgeId: string;
            edgeAction: 'add' | 'remove' | 'highlight';
            direction?: 'forward' | 'backward';
            isDrawing: boolean;
            eventIndex: number;
        }>
    > = [];

    diffs.forEach((diff, index) => {
        const events: Array<{
            edgeId: string;
            edgeAction: 'add' | 'remove' | 'highlight';
            direction?: 'forward' | 'backward';
            isDrawing: boolean;
            eventIndex: number;
        }> = [];

        for (const edgeDiff of diff.edges) {
            const { attrs } = edgeDiff;
            if (!attrs) continue;

            const prev = edgeStates.get(edgeDiff.id) ?? { isDrawing: false, visible: true };
            const next: EdgeState = {
                isDrawing: attrs.isDrawing ?? prev.isDrawing,
                visible: attrs.visible ?? prev.visible,
            };

            // 同一批内同一条边只保留一个动画事件，避免重复触发
            const existing = events.find(e => e.edgeId === edgeDiff.id);
            const push = (
                edgeAction: 'add' | 'remove' | 'highlight',
                direction?: 'forward' | 'backward',
                isDrawing = false
            ) => {
                if (existing) {
                    // 同批内 update（重新绘制）覆盖之前的动画事件
                    existing.edgeAction = edgeAction;
                    existing.direction = direction;
                    existing.isDrawing = isDrawing;
                } else {
                    events.push({ edgeId: edgeDiff.id, edgeAction, direction, isDrawing, eventIndex: index });
                }
            };

            // isDrawing: false → true: 绘制动画触发
            if (!prev.isDrawing && next.isDrawing) {
                const edgeExisted = edgeStates.has(edgeDiff.id);
                const wasVisible = edgeExisted && prev.visible;
                const willBeVisible = next.visible;

                if (!wasVisible && willBeVisible) {
                    // 情况A: 之前不存在/不可见 → 现在可见 → 正向绘制
                    push('add', attrs.appearDirection, true);
                } else if (wasVisible && !willBeVisible) {
                    // 情况B: 之前可见 → 现在不可见 → 反向消失
                    push('remove', attrs.disappearDirection, true);
                } else {
                    // 情况C: 可见性不变 → 黄色轮廓闪烁
                    push('highlight', undefined, false);
                }
            }

            // visible: true → false: 边消失
            if (prev.visible && !next.visible) {
                push('remove', attrs.disappearDirection, false);
            }

            // visible: false → true: 边出现
            if (!prev.visible && next.visible) {
                push('add', attrs.appearDirection, false);
            }

            edgeStates.set(edgeDiff.id, next);
        }

        if (events.length > 0) batchEvents.push(events);
    });

    // 按批重排：组内边错开，组间空隙用 segmentHold 填充
    const segments: AnimPhase[] = [];
    let previousEndMs = 0;
    for (let b = 0; b < batchEvents.length; b++) {
        const events = [...batchEvents[b]].sort((a, z) => {
            if (a.edgeAction === 'remove' && z.edgeAction === 'remove') {
                return (
                    (options?.edgeOrder?.get(a.edgeId) ?? Number.MAX_SAFE_INTEGER) -
                    (options?.edgeOrder?.get(z.edgeId) ?? Number.MAX_SAFE_INTEGER)
                );
            }
            return 0;
        });
        const batchStart = diffs[events[0].eventIndex].time; // 毫秒
        const nextBatchStart = b < batchEvents.length - 1 ? diffs[batchEvents[b + 1][0].eventIndex].time : undefined;
        const windowMs = nextBatchStart !== undefined ? Math.max(0, nextBatchStart - batchStart) : drawMs;
        // 时间窗口不足以容纳所有边时，不能让阶段互相重叠；将停运事件顺延，保证逐条完成。
        const perEdgeMs = Math.max(MIN_EDGE_MS, Math.min(drawMs, windowMs > 0 ? windowMs / events.length : drawMs));

        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            const startMs = Math.max(batchStart + i * perEdgeMs, previousEndMs);
            let durationMs = perEdgeMs;
            if (ev.edgeAction === 'highlight') durationMs = Math.min(perEdgeMs, 1500);
            else if (ev.edgeAction === 'remove')
                durationMs = Math.min(perEdgeMs, Math.max(fadeSeconds * 1000, MIN_EDGE_MS));
            const endMs = startMs + durationMs;
            segments.push({
                type: 'segment',
                startMs,
                endMs,
                edgeId: ev.edgeId,
                edgeAction: ev.edgeAction,
                eventIndex: ev.eventIndex,
                direction: ev.direction,
                isDrawing: ev.isDrawing,
            });
            previousEndMs = endMs;
        }
    }

    // 按 startMs 排序
    segments.sort((a, b) => a.startMs - b.startMs);

    // 在 segment 之间插入 segmentHold：空隙时长由两段实际间隔决定（上限 MAX_HOLD_GAP_MS），
    // 并附带下一段边信息供镜头预瞄。
    const phases: AnimPhase[] = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        phases.push(seg);

        if (i < segments.length - 1) {
            const next = segments[i + 1];
            const gap = Math.max(0, next.startMs - seg.endMs);
            if (gap > 0) {
                const holdEnd = Math.min(seg.endMs + Math.min(gap, MAX_HOLD_GAP_MS), next.startMs);
                if (holdEnd > seg.endMs) {
                    phases.push({
                        type: 'segmentHold',
                        startMs: seg.endMs,
                        endMs: holdEnd,
                        nextEdgeId: next.edgeId,
                        nextDirection: next.direction,
                    });
                }
            }
        }
    }

    const actionRows = options?.actionRows;
    const actionSchedule = options?.actionSchedule;
    if (actionRows && actionSchedule) {
        const edgePhases = phases.filter(phase => phase.type === 'segment' && phase.edgeId);
        edgePhases.forEach(phase => {
            const diffTime = phase.eventIndex === undefined ? undefined : diffs[phase.eventIndex]?.time;
            const actionIndex = actionSchedule.findIndex((entry, index) => {
                const action = actionRows[index];
                return (
                    diffTime !== undefined &&
                    Math.abs(entry.startTime - diffTime) < 0.5 &&
                    (action?.actionType === 'open' || action?.actionType === 'close') &&
                    options.actionLineEdges?.get(action.actionLineId ?? '')?.includes(phase.edgeId ?? '')
                );
            });
            if (actionIndex >= 0) phase.quickComplete = isQuickCompleteAction(actionRows[actionIndex]);
        });
        const starts = new Map<number, AnimPhase[]>();
        edgePhases.forEach(phase => {
            const group = starts.get(phase.startMs) ?? [];
            group.push(phase);
            starts.set(phase.startMs, group);
        });
        starts.forEach(group => {
            if (group.length < 2) return;
            group.forEach(phase => {
                phase.parallelEdges = group
                    .filter(peer => peer !== phase)
                    .map(peer => ({
                        edgeId: peer.edgeId!,
                        direction: peer.direction,
                        edgeAction: peer.edgeAction === 'update' ? 'highlight' : (peer.edgeAction ?? 'highlight'),
                        isDrawing: peer.isDrawing ?? false,
                    }));
            });
        });
    }

    return phases;
}

/**
 * 二分查找当前毫秒所在的 Phase 及其进度（归一化到 [0,1]）。
 */
export function findPhaseAt(phases: AnimPhase[], ms: number): { phase: AnimPhase; progress: number } | null {
    let lo = 0;
    let hi = phases.length - 1;

    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const p = phases[mid];

        if (ms < p.startMs) {
            hi = mid - 1;
        } else if (ms >= p.endMs) {
            lo = mid + 1;
        } else {
            const duration = p.endMs - p.startMs;
            const progress = duration > 0 ? Math.max(0, Math.min(1, (ms - p.startMs) / duration)) : 1;
            return { phase: p, progress };
        }
    }

    return null;
}
