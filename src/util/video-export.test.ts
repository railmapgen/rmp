import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { ActionRow, TimelineLine } from '../constants/timeline';
import {
    buildFallbackSequence,
    buildAnimationPhases,
    getActionLineMinimumDuration,
    getActionLineSuggestedDuration,
} from './video-export';

const makeGraph = () => new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

const addNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    x: number,
    y: number
) => {
    graph.addNode(id, { visible: true, zIndex: 0, x, y, type: StationType.LondonTubeBasic });
};

const addEdge = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    id: string,
    source: string,
    target: string
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: 'diagonal' as any,
        style: 'single-color' as any,
        reconcileId: '',
        parallelIndex: -1,
        diagonal: { startFrom: 'from' as const, offsetFrom: 0, offsetTo: 0, roundCornerFactor: 7.5 },
    });
};

describe('buildAnimationPhases', () => {
    it('uses one second for quick-complete actions while retaining the normal minimum duration', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        const line: TimelineLine = {
            id: 'line1',
            groupId: 'group1',
            text: 'Segment 1',
            elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
        };

        expect(getActionLineMinimumDuration(line, 1)).toBe(2.5);
        expect(
            buildAnimationPhases(
                [
                    {
                        id: 'row1',
                        date: '',
                        activeLineIds: [],
                        remark: '',
                        actionType: 'open',
                        actionLineId: 'line1',
                        actionDuration: 3,
                        quickComplete: true,
                    },
                ],
                [line],
                graph
            )[0].durationWeight
        ).toBe(1);
    });

    it('calculates station-only duration when a line has no edges', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        const line: TimelineLine = {
            id: 'line1',
            groupId: 'group1',
            text: 'Segment 1',
            elements: [{ id: 'stn_a' }, { id: 'stn_b' }],
        };

        expect(getActionLineMinimumDuration(line, 1)).toBe(2);
    });

    it('creates open phases with elements from TimelineLine', () => {
        const actionRows: ActionRow[] = [
            {
                id: 'row1',
                date: '2024-01-01',
                activeLineIds: ['group1'],
                remark: 'First phase',
                actionType: 'open',
                actionLineId: 'line1',
            },
        ];

        const timelineLines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab', reverse: true }],
            },
        ];

        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');

        const phases = buildAnimationPhases(actionRows, timelineLines, graph);

        expect(phases).toHaveLength(1);
        expect(phases[0].type).toBe('open');
        expect(phases[0].date).toBe('2024-01-01');
        expect(phases[0].remark).toBe('First phase');
        expect(phases[0].activeLineIds).toEqual(['group1']);
        expect(phases[0].elements).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false, version: 1 },
            { id: 'stn_b', kind: 'node', reverse: false, version: 1 },
            { id: 'line_ab', kind: 'edge', reverse: true },
        ]);
    });

    it('creates close phases with elements from TimelineLine', () => {
        const actionRows: ActionRow[] = [
            {
                id: 'row1',
                date: '',
                activeLineIds: [],
                remark: '',
                actionType: 'close',
                actionLineId: 'line1',
            },
        ];

        const timelineLines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }],
            },
        ];

        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);

        const phases = buildAnimationPhases(actionRows, timelineLines, graph);

        expect(phases[0].type).toBe('close');
        expect(phases[0].elements).toHaveLength(2);
        expect(phases[0].elements[0]).toMatchObject({ id: 'stn_a', kind: 'node' });
    });

    it('creates overview and wait phases without elements', () => {
        const actionRows: ActionRow[] = [
            { id: 'row1', date: '', activeLineIds: [], remark: '', actionType: 'overview', actionLineId: undefined },
            { id: 'row2', date: '', activeLineIds: [], remark: '', actionType: 'wait', actionLineId: undefined },
        ];

        const phases = buildAnimationPhases(actionRows, [], makeGraph());

        expect(phases[0].type).toBe('overview');
        expect(phases[0].elements).toHaveLength(0);
        expect(phases[1].type).toBe('wait');
        expect(phases[1].elements).toHaveLength(0);
    });

    it('derives activeLineIds from action order (open adds, close removes)', () => {
        const actionRows: ActionRow[] = [
            { id: 'row1', date: '', activeLineIds: [], remark: '', actionType: 'open', actionLineId: 'line1' },
            { id: 'row2', date: '', activeLineIds: [], remark: '', actionType: 'open', actionLineId: 'line2' },
            { id: 'row3', date: '', activeLineIds: [], remark: '', actionType: 'close', actionLineId: 'line1' },
            { id: 'row4', date: '', activeLineIds: [], remark: '', actionType: 'overview', actionLineId: undefined },
        ];

        const timelineLines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
            },
            {
                id: 'line2',
                groupId: 'group2',
                text: 'Segment 2',
                elements: [{ id: 'stn_c' }, { id: 'stn_d' }, { id: 'line_cd' }],
            },
        ];

        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addNode(graph, 'stn_c', 200, 0);
        addNode(graph, 'stn_d', 300, 0);
        addEdge(graph, 'line_cd', 'stn_c', 'stn_d');

        const phases = buildAnimationPhases(actionRows, timelineLines, graph);

        expect(phases[0].activeLineIds).toEqual(['group1']);
        expect(phases[1].activeLineIds).toEqual(['group1', 'group2']);
        expect(phases[2].activeLineIds).toEqual(['group2']);
        expect(phases[3].activeLineIds).toEqual(['group2']);
    });

    it('marks quick completion and computes the parallel focus bounds', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 300, 100);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');
        const lines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
            },
            {
                id: 'line2',
                groupId: 'group2',
                text: 'Segment 2',
                elements: [{ id: 'stn_b' }, { id: 'stn_c' }, { id: 'line_bc' }],
            },
        ];
        const phases = buildAnimationPhases(
            [
                { id: 'focus', date: '', activeLineIds: [], remark: '', actionType: 'focus' },
                {
                    id: 'open1',
                    date: '',
                    activeLineIds: [],
                    remark: '',
                    actionType: 'open',
                    actionLineId: 'line1',
                    quickComplete: true,
                    withPrevious: true,
                },
                {
                    id: 'open2',
                    date: '',
                    activeLineIds: [],
                    remark: '',
                    actionType: 'open',
                    actionLineId: 'line2',
                    withPrevious: true,
                },
            ],
            lines,
            graph
        );
        expect(phases[1].quickComplete).toBe(true);
        expect(phases[1].batchIndex).toBe(phases[2].batchIndex);
        expect(phases[0].focusTargets).toHaveLength(5);
        expect(phases[0].focusTargetBounds).toEqual({ xMin: 0, xMax: 300, yMin: 0, yMax: 100 });
        expect(phases[0].focusTargetBatch).toBe(phases[1].batchIndex);
    });

    it('并行批次内后续动作继承首动作的已开通线路与备注，批次结束后统一结算', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addNode(graph, 'stn_c', 200, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');
        const lines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
            },
            {
                id: 'line2',
                groupId: 'group2',
                text: 'Segment 2',
                elements: [{ id: 'stn_b' }, { id: 'stn_c' }, { id: 'line_bc' }],
            },
        ];
        const actionRows: ActionRow[] = [
            {
                id: 'a',
                date: '2024-05-01',
                activeLineIds: [],
                remark: '批次备注',
                actionType: 'open',
                actionLineId: 'line1',
            },
            {
                id: 'b',
                date: '',
                activeLineIds: [],
                remark: '',
                actionType: 'open',
                actionLineId: 'line2',
                withPrevious: true,
            },
            { id: 'c', date: '', activeLineIds: [], remark: '', actionType: 'wait' },
        ];

        const phases = buildAnimationPhases(actionRows, lines, graph);

        // 批次进行中：两个动作显示完全相同的"已开通线路"、日期与备注
        expect(phases[0].activeLineIds).toEqual(['group1']);
        expect(phases[1].activeLineIds).toEqual(['group1']);
        expect(phases[0].date).toBe('2024-05-01');
        expect(phases[1].date).toBe('2024-05-01');
        expect(phases[1].remark).toBe('批次备注');
        // 后续并行动作的目标线路段仍然各自独立（动画元素来自 line2）
        expect(phases[1].elements.map(e => e.id)).toContain('line_bc');
        // 批次结束后：第二个动作的线路才统一结算进来
        expect(phases[2].activeLineIds).toEqual(['group1', 'group2']);
    });

    it('将元素的 simultaneous 标志透传到动画步骤', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        const line: TimelineLine = {
            id: 'line1',
            groupId: 'group1',
            text: 'Segment 1',
            elements: [{ id: 'stn_a' }, { id: 'stn_b', simultaneous: true }, { id: 'line_ab' }],
        };
        const phases = buildAnimationPhases(
            [{ id: 'a', date: '', activeLineIds: [], remark: '', actionType: 'open', actionLineId: 'line1' }],
            [line],
            graph
        );
        expect(phases[0].elements.find(e => e.id === 'stn_b')?.simultaneous).toBe(true);
        expect(phases[0].elements.find(e => e.id === 'line_ab')?.simultaneous).toBeUndefined();
    });

    it('fills targetGroupId for open/close phases only', () => {
        const actionRows: ActionRow[] = [
            { id: 'row1', date: '', activeLineIds: [], remark: '', actionType: 'open', actionLineId: 'line1' },
            { id: 'row2', date: '', activeLineIds: [], remark: '', actionType: 'overview', actionLineId: undefined },
            { id: 'row3', date: '', activeLineIds: [], remark: '', actionType: 'close', actionLineId: 'line1' },
        ];

        const timelineLines: TimelineLine[] = [
            {
                id: 'line1',
                groupId: 'group1',
                text: 'Segment 1',
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
            },
        ];

        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');

        const phases = buildAnimationPhases(actionRows, timelineLines, graph);

        expect(phases[0].targetGroupId).toBe('group1');
        expect(phases[1].targetGroupId).toBeUndefined();
        expect(phases[2].targetGroupId).toBe('group1');
    });
});

describe('buildFallbackSequence', () => {
    it('orders nodes by position (x then y) and edges by max endpoint index', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 100, 100);
        addNode(graph, 'stn_b', 200, 100);
        addNode(graph, 'stn_c', 150, 200);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        addEdge(graph, 'line_bc', 'stn_b', 'stn_c');

        const steps = buildFallbackSequence(graph);

        expect(steps).toEqual([
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
            { id: 'stn_c', kind: 'node', reverse: false },
            { id: 'line_ab', kind: 'edge', reverse: false },
            { id: 'line_bc', kind: 'edge', reverse: false },
        ]);
    });
});

describe('getActionLineMinimumDuration / getActionLineSuggestedDuration（同时链并行算法）', () => {
    const makeLine = (elements: TimelineLine['elements']): TimelineLine => ({
        id: 'line1',
        groupId: 'group1',
        text: 'Segment 1',
        elements,
    });

    it('同一条同时链内的车站与边并行，只计 max 成本', () => {
        // stn_b 与 line_ab 均并入链头 stn_a：2 站 1 边并行 → max(1s, 0.5s) = 1s
        const line = makeLine([
            { id: 'stn_a' },
            { id: 'stn_b', simultaneous: true },
            { id: 'line_ab', simultaneous: true },
        ]);
        expect(getActionLineMinimumDuration(line, 1)).toBe(1);
        expect(getActionLineSuggestedDuration(line, 1)).toBe(1);
    });

    it('多条同时链之间串行求和', () => {
        // 链1：stn_a + stn_b（并行，车站成本 1s）；链2：line_ab（普通元素开新链，0.5s/1s）
        const line = makeLine([{ id: 'stn_a' }, { id: 'stn_b', simultaneous: true }, { id: 'line_ab' }]);
        expect(getActionLineMinimumDuration(line, 1)).toBe(1.5);
        expect(getActionLineSuggestedDuration(line, 1)).toBe(2);
    });

    it('首元素即使带 simultaneous 标志也作为链头（不影响链划分）', () => {
        const line = makeLine([{ id: 'stn_a', simultaneous: true }, { id: 'line_ab' }]);
        expect(getActionLineMinimumDuration(line, 1)).toBe(1.5);
    });

    it('无"同时"元素时与线性公式等价', () => {
        const line = makeLine([{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }]);
        expect(getActionLineMinimumDuration(line, 1)).toBe(2.5);
        expect(getActionLineSuggestedDuration(line, 1)).toBe(3);
    });
});
