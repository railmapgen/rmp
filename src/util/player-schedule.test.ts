import { describe, expect, it } from 'vitest';
import type { ActionRow, TimelineDiff } from '../constants/timeline';
import { buildPhases } from './player-schedule';

const openAction: ActionRow = {
    id: 'row1',
    date: '',
    activeLineIds: [],
    remark: '',
    actionType: 'open',
    actionLineId: 'line1',
};

const makeBatchDiff = (edgeIds: string[]): TimelineDiff => ({
    time: 0,
    nodes: [],
    graph: [],
    edges: edgeIds.map(id => ({
        action: 'update' as const,
        id,
        attrs: { visible: true, isDrawing: true, appearDirection: 'forward' as const },
    })),
});

const buildSegments = (edgeIds: string[], simultaneous: ReadonlySet<string> = new Set()) => {
    const edgeOrder = new Map(edgeIds.map((id, index) => [id, index]));
    const actionLineEdges = new Map([['line1', edgeIds]]);
    const phases = buildPhases([makeBatchDiff(edgeIds)], {
        drawSeconds: 3,
        edgeOrder,
        actionRows: [openAction],
        actionSchedule: [{ startTime: 0, endTime: 3000, actionRowIndex: 0 }],
        actionLineEdges,
        simultaneousElements: simultaneous,
    });
    return phases.filter(phase => phase.type === 'segment');
};

describe('buildPhases 元素级"同时"排期', () => {
    it('默认逐条串行错开', () => {
        const segments = buildSegments(['l1', 'l2', 'l3']);
        expect(segments.map(s => s.startMs)).toEqual([0, 1000, 2000]);
        expect(segments.every(s => !s.parallelEdges?.length)).toBe(true);
    });

    it('simultaneous 边与紧邻上一条边同时开始', () => {
        const segments = buildSegments(['l1', 'l2', 'l3'], new Set(['l2']));
        expect(segments.map(s => s.startMs)).toEqual([0, 0, 1000]);
    });

    it('后续主链边等待同时链内最晚结束者（以后者为准）', () => {
        // l2、l3 都与链头 l1 同时开始（等时长 750ms）；
        // l4 必须等整个同时链（含最晚结束的后者）完成后才开始
        const segments = buildSegments(['l1', 'l2', 'l3', 'l4'], new Set(['l2', 'l3']));
        expect(segments.map(s => s.startMs)).toEqual([0, 0, 0, 750]);
    });

    it('普通元素开启新链，与上一同时链之间保持串行', () => {
        // l2 与 l1 构成第一个同时链；l3 为普通元素开启新链（等待前者最晚结束）；l4 与 l3 同链
        const segments = buildSegments(['l1', 'l2', 'l3', 'l4'], new Set(['l2', 'l4']));
        expect(segments.map(s => s.startMs)).toEqual([0, 0, 750, 750]);
    });

    it('同时开始的边互相建立 parallelEdges 供并行渲染与镜头合并', () => {
        const segments = buildSegments(['l1', 'l2', 'l3'], new Set(['l2']));
        const l1 = segments.find(s => s.edgeId === 'l1');
        const l2 = segments.find(s => s.edgeId === 'l2');
        expect(l1?.parallelEdges?.map(p => p.edgeId)).toEqual(['l2']);
        expect(l2?.parallelEdges?.map(p => p.edgeId)).toEqual(['l1']);
        // 主链后续边不与并行组关联
        const l3 = segments.find(s => s.edgeId === 'l3');
        expect(l3?.parallelEdges).toBeUndefined();
    });
});
