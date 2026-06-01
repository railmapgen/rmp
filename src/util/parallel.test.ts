import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makeParallelIndex } from './parallel';

describe('makeParallelIndex', () => {
    it('should disable parallel index for ray-guided lines', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        graph.addNode('misc_node_a', {
            x: 0,
            y: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
            visible: true,
            zIndex: 0,
        });
        graph.addNode('misc_node_b', {
            x: 100,
            y: 100,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
            visible: true,
            zIndex: 0,
        });

        const parallelIndex = makeParallelIndex(graph, LinePathType.RayGuided, 'misc_node_a', 'misc_node_b', 'from');

        expect(parallelIndex).toBe(-1);
    });
});
