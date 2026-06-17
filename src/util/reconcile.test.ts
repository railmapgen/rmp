import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { getBaseReconciledLineID, isInReconcileChain } from './reconcile';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const makeGraph = () => new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

const addNode = (graph: TestGraph, id: `misc_node_${string}`, x: number, y: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
};

const makeLineAttrs = (reconcileId: string): EdgeAttributes => ({
    visible: true,
    zIndex: 0,
    type: LinePathType.Simple,
    [LinePathType.Simple]: { offset: 0 },
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: {
        color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    },
    reconcileId,
    parallelIndex: -1,
});

const makeRiverLineAttrs = (reconcileId: string): EdgeAttributes => ({
    ...makeLineAttrs(reconcileId),
    style: LineStyleType.River,
    [LineStyleType.River]: {
        color: [CityCode.Shanghai, 'river', '#B9E3F9', MonoColour.white],
        width: 20,
    },
});

describe('getBaseReconciledLineID', () => {
    it('returns the first line in a valid reconcile chain', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        addNode(graph, 'misc_node_c', 200, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));
        graph.addDirectedEdgeWithKey('line_b', 'misc_node_b', 'misc_node_c', makeLineAttrs('reconcile-a'));

        expect(getBaseReconciledLineID(graph, 'line_a')).toBe('line_a');
        expect(getBaseReconciledLineID(graph, 'line_b')).toBe('line_a');
        expect(isInReconcileChain(graph, 'line_a')).toBe(true);
        expect(isInReconcileChain(graph, 'line_b')).toBe(true);
    });

    it('does not require every line in the chain to have the same style type', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        addNode(graph, 'misc_node_c', 200, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));
        graph.addDirectedEdgeWithKey('line_b', 'misc_node_b', 'misc_node_c', makeRiverLineAttrs('reconcile-a'));

        expect(getBaseReconciledLineID(graph, 'line_b')).toBe('line_a');
        expect(isInReconcileChain(graph, 'line_a')).toBe(true);
        expect(isInReconcileChain(graph, 'line_b')).toBe(true);
    });

    it('returns the provided line when it is not in a valid reconcile chain', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs(''));
        graph.addDirectedEdgeWithKey('line_b', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-b'));

        expect(getBaseReconciledLineID(graph, 'line_a')).toBe('line_a');
        expect(getBaseReconciledLineID(graph, 'line_b')).toBe('line_b');
        expect(isInReconcileChain(graph, 'line_a')).toBe(false);
        expect(isInReconcileChain(graph, 'line_b')).toBe(false);
    });
});
