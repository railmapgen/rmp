import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type MoveNodesAndRedrawLines = typeof import('./imperative-dom').moveNodesAndRedrawLines;
type GetLines = typeof import('./process-elements').getLines;

const createGraph = () => new MultiDirectedGraph() as TestGraph;

describe('imperative DOM helpers', () => {
    let moveNodesAndRedrawLines: MoveNodesAndRedrawLines;
    let getLines: GetLines;

    beforeAll(async () => {
        if (!window.localStorage) {
            const store = new Map<string, string>();
            Object.defineProperty(window, 'localStorage', {
                value: {
                    getItem: (key: string) => store.get(key) ?? null,
                    setItem: (key: string, value: string) => store.set(key, value),
                    removeItem: (key: string) => store.delete(key),
                    clear: () => store.clear(),
                },
                configurable: true,
            });
        }

        ({ moveNodesAndRedrawLines } = await import('./imperative-dom'));
        ({ getLines } = await import('./process-elements'));
    });

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

    it('updates freeform lines with their filled area path during node dragging', () => {
        const graph = createGraph();
        graph.addNode('misc_node_a', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {} as any,
        } as any);
        graph.addNode('misc_node_b', {
            visible: true,
            zIndex: 0,
            x: 100,
            y: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {} as any,
        } as any);
        graph.addDirectedEdgeWithKey('line_freeform', 'misc_node_a', 'misc_node_b', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Freeform,
            [LinePathType.Freeform]: {
                version: 1,
                points: [
                    { id: 'start', x: 0, y: 0 },
                    { id: 'mid', x: 40, y: 20 },
                    { id: 'end', x: 100, y: 0 },
                ],
                widthStops: [{ id: 'w', t: 0.5, width: 6 }],
                smoothing: 0.5,
                startCap: 'round',
                endCap: 'round',
            },
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: {} as any,
            reconcileId: '',
            parallelIndex: -1,
        } as any);

        document.body.innerHTML = `
            <svg>
                <g id="misc_node_a" transform="translate(0,0)"></g>
                <g id="line_freeform"><path d="old-path"></path></g>
            </svg>
        `;

        moveNodesAndRedrawLines(graph, ['misc_node_a'], 10, 0);

        const expectedAreaPathD = getLines(graph).find(line => line.id === 'line_freeform')?.line?.areaPathD;
        expect(document.querySelector('#line_freeform path')?.getAttribute('d')).toBe(expectedAreaPathD);
        expect(document.querySelector('#line_freeform path')?.getAttribute('d')).toMatch(/ Z$/);
    });
});
