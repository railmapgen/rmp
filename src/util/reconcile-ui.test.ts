import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { linePaths } from '../components/svgs/lines/lines';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { reconcileSelectedEdges } from './reconcile-ui';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const addNode = (graph: TestGraph, id: `misc_node_${string}`, x: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
};

const makeLineAttrs = (type: LinePathType): EdgeAttributes => ({
    visible: true,
    zIndex: 0,
    type,
    [type]: structuredClone(linePaths[type].defaultAttrs),
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: {
        color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    },
    reconcileId: '',
    parallelIndex: -1,
});

const makeGraph = (type: LinePathType) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    addNode(graph, 'misc_node_a', 0);
    addNode(graph, 'misc_node_b', 100);
    addNode(graph, 'misc_node_c', 200);
    graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs(type));
    graph.addDirectedEdgeWithKey('line_b', 'misc_node_b', 'misc_node_c', makeLineAttrs(type));
    return graph;
};

describe('reconcileSelectedEdges', () => {
    it('reconciles paths whose path and style both support the operation', () => {
        const graph = makeGraph(LinePathType.Simple);

        expect(reconcileSelectedEdges(graph, new Set(['line_a', 'line_b']))).toBe(true);
        expect(graph.getEdgeAttribute('line_a', 'reconcileId')).not.toBe('');
        expect(graph.getEdgeAttribute('line_b', 'reconcileId')).toBe(graph.getEdgeAttribute('line_a', 'reconcileId'));
    });

    it('does not reconcile Freeform paths even when their style supports reconcile', () => {
        const graph = makeGraph(LinePathType.Freeform);

        expect(reconcileSelectedEdges(graph, new Set(['line_a', 'line_b']))).toBe(false);
        expect(graph.getEdgeAttribute('line_a', 'reconcileId')).toBe('');
        expect(graph.getEdgeAttribute('line_b', 'reconcileId')).toBe('');
    });
});
