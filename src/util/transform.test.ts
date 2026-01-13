import { describe, expect, it } from 'vitest';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { flipSelectedNodes, rotateSelectedNodes } from './transform';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const createGraph = () => new MultiDirectedGraph() as TestGraph;

describe('transform helpers', () => {
    it('rotates selected nodes clockwise around the selection center', () => {
        const graph = createGraph();
        graph.addNode('n1', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        } as any);
        graph.addNode('n2', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 0,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        } as any);

        const changed = rotateSelectedNodes(graph, new Set(['n1', 'n2']), 90);
        expect(changed).toBe(true);
        expect(graph.getNodeAttribute('n1', 'x')).toBeCloseTo(5);
        expect(graph.getNodeAttribute('n1', 'y')).toBeCloseTo(5);
        expect(graph.getNodeAttribute('n2', 'x')).toBeCloseTo(5);
        expect(graph.getNodeAttribute('n2', 'y')).toBeCloseTo(-5);
    });

    it('flips selected nodes over vertical and horizontal middle lines', () => {
        const graph = createGraph();
        graph.addNode('a', {
            visible: true,
            zIndex: 0,
            x: 2,
            y: 4,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });
        graph.addNode('b', {
            visible: true,
            zIndex: 0,
            x: 8,
            y: 6,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });

        expect(flipSelectedNodes(graph, new Set(['a', 'b']), 'vertical')).toBe(true);
        expect(graph.getNodeAttribute('a', 'x')).toBeCloseTo(8);
        expect(graph.getNodeAttribute('a', 'y')).toBeCloseTo(4);

        expect(flipSelectedNodes(graph, new Set(['a', 'b']), 'horizontal')).toBe(true);
        expect(graph.getNodeAttribute('a', 'x')).toBeCloseTo(8);
        expect(graph.getNodeAttribute('a', 'y')).toBeCloseTo(6);
    });

    it('supports diagonal flips through the selection center', () => {
        const graph45 = createGraph();
        graph45.addNode('c', {
            visible: true,
            zIndex: 0,
            x: 6,
            y: 4,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });
        graph45.addNode('d', {
            visible: true,
            zIndex: 0,
            x: 4,
            y: 6,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });

        expect(flipSelectedNodes(graph45, new Set(['c', 'd']), 'diagonal45')).toBe(true);
        expect(graph45.getNodeAttribute('c', 'x')).toBeCloseTo(4);
        expect(graph45.getNodeAttribute('c', 'y')).toBeCloseTo(6);

        const graph135 = createGraph();
        graph135.addNode('e', {
            visible: true,
            zIndex: 0,
            x: 7,
            y: 5,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });
        graph135.addNode('f', {
            visible: true,
            zIndex: 0,
            x: 3,
            y: 5,
            type: StationType.ShmetroBasic,
            [StationType.ShmetroBasic]: {} as any,
        });

        expect(flipSelectedNodes(graph135, new Set(['e', 'f']), 'diagonal135')).toBe(true);
        expect(graph135.getNodeAttribute('e', 'x')).toBeCloseTo(5);
        expect(graph135.getNodeAttribute('e', 'y')).toBeCloseTo(3);
    });
});
