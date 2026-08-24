import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { ActionRow, TimelineLine } from '../constants/timeline';
import { buildFallbackSequence, buildAnimationPhases, getActionLineMinimumDuration } from './video-export';

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
    it('uses half a second per line edge as the minimum open and close duration', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        addEdge(graph, 'line_ab', 'stn_a', 'stn_b');
        const line: TimelineLine = {
            id: 'line1',
            groupId: 'group1',
            elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
        };

        expect(getActionLineMinimumDuration(line)).toBe(0.5);
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
                        actionDuration: 0.5,
                    },
                ],
                [line],
                graph
            )[0].durationWeight
        ).toBe(0.5);
    });

    it('does not count line nodes in the minimum duration', () => {
        const graph = makeGraph();
        addNode(graph, 'stn_a', 0, 0);
        addNode(graph, 'stn_b', 100, 0);
        const line: TimelineLine = {
            id: 'line1',
            groupId: 'group1',
            elements: [{ id: 'stn_a' }, { id: 'stn_b' }],
        };

        expect(getActionLineMinimumDuration(line)).toBe(0.5);
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
            { id: 'stn_a', kind: 'node', reverse: false },
            { id: 'stn_b', kind: 'node', reverse: false },
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
                elements: [{ id: 'stn_a' }, { id: 'stn_b' }, { id: 'line_ab' }],
            },
            {
                id: 'line2',
                groupId: 'group2',
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
