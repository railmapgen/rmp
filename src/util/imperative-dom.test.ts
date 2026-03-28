import { MultiDirectedGraph } from 'graphology';
import { afterEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { moveNodesAndRedrawLines } from './imperative-dom';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const createGraph = () => new MultiDirectedGraph() as TestGraph;

describe('imperative DOM helpers', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('updates main, pre, and post node layers during dragging', () => {
        const graph = createGraph();
        graph.addNode('stn_test', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 20,
            type: StationType.MRTBasic,
            [StationType.MRTBasic]: {} as any,
        } as any);

        document.body.innerHTML = `
            <svg>
                <g id="stn_test.pre" transform="translate(10,20)"></g>
                <g id="stn_test" transform="translate(10,20)"></g>
                <g id="stn_test.post" transform="translate(10,20)"></g>
            </svg>
        `;

        moveNodesAndRedrawLines(graph, ['stn_test'], 5, -3);

        expect(document.getElementById('stn_test.pre')?.getAttribute('transform')).toBe('translate(15,17)');
        expect(document.getElementById('stn_test')?.getAttribute('transform')).toBe('translate(15,17)');
        expect(document.getElementById('stn_test.post')?.getAttribute('transform')).toBe('translate(15,17)');
    });
});
