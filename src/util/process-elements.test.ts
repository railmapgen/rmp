import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { getLines } from './process-elements';

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

describe('getLines', () => {
    it('returns dangling reconcile lines with the unknown style', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));

        const elements = getLines(graph);

        expect(elements).toHaveLength(1);
        expect(elements[0].id).toBe('line_a');
        expect(elements[0].type).toBe('line');
        expect(elements[0].line?.attr.style).toBe(LineStyleType.Unknown);
        expect(graph.getEdgeAttribute('line_a', 'style')).toBe(LineStyleType.SingleColor);
    });

    it('returns valid reconcile chains as a single line element', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        addNode(graph, 'misc_node_c', 200, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));
        graph.addDirectedEdgeWithKey('line_b', 'misc_node_b', 'misc_node_c', makeLineAttrs('reconcile-a'));

        const elements = getLines(graph);

        expect(elements).toHaveLength(1);
        expect(elements[0].id).toBe('line_a');
        expect(elements[0].type).toBe('line');
        expect(elements[0].line?.attr.style).toBe(LineStyleType.SingleColor);
    });
});
