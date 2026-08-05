import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type MoveNodesAndRedrawLines = typeof import('./imperative-dom').moveNodesAndRedrawLines;
type GetLines = typeof import('./process-elements').getLines;

const createGraph = () => new MultiDirectedGraph() as TestGraph;

const addVirtualNode = (graph: TestGraph, id: NodeId, x: number, y: number) => {
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

    it('updates ordinary styles with the open Freeform path during node dragging', () => {
        const graph = createGraph();
        addVirtualNode(graph, 'misc_node_a', 10, 0);
        addVirtualNode(graph, 'misc_node_b', 100, 0);
        graph.addDirectedEdgeWithKey('line_freeform', 'misc_node_a', 'misc_node_b', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Freeform,
            [LinePathType.Freeform]: {
                points: [
                    { id: 'start', x: 0, y: 0 },
                    { id: 'mid', x: 0.4, y: 0.2 },
                    { id: 'end', x: 1, y: 0 },
                ],
                widthStops: [{ id: 'w', t: 0.5, width: 5 }],
                smoothing: 0.5,
                startCap: 'round',
                endCap: 'round',
                arrow: { length: 12, width: 10 },
            },
            style: LineStyleType.River,
            [LineStyleType.River]: {
                color: [CityCode.Shanghai, 'river', '#B9E3F9', MonoColour.white],
                width: 20,
            },
            reconcileId: '',
            parallelIndex: -1,
        });

        document.body.innerHTML = `
            <svg>
                <g id="misc_node_a" transform="translate(0,0)"></g>
                <g id="line_freeform"><path d="old-path"></path></g>
            </svg>
        `;

        moveNodesAndRedrawLines(graph, ['misc_node_a'], 10, 0);

        const generatedPath = getLines(graph).find(line => line.id === 'line_freeform')?.line?.path;
        expect(document.querySelector('#line_freeform path')?.getAttribute('d')).toBe(generatedPath?.d);
        expect(document.querySelector('#line_freeform path')?.getAttribute('d')).not.toMatch(/ Z$/);
    });

    it('updates the rendered reconcile base edge when dragging a non-base member endpoint', () => {
        const graph = createGraph();
        addVirtualNode(graph, 'misc_node_a', 0, 0);
        addVirtualNode(graph, 'misc_node_b', 100, 0);
        addVirtualNode(graph, 'misc_node_c', 200, 0);
        graph.addDirectedEdgeWithKey('line_z', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_b', 'misc_node_c', makeLineAttrs('reconcile-a'));
        graph.mergeNodeAttributes('misc_node_a', { x: -50, y: 0 });

        document.body.innerHTML = `
            <svg>
                <g id="line_a"><path d="M 0 0 L 0 0"></path></g>
                <g id="line_z"><path d="M 0 0 L 0 0"></path></g>
            </svg>
        `;

        moveNodesAndRedrawLines(graph, ['misc_node_a'], -50, 0);

        const expectedPath = getLines(graph).find(element => element.id === 'line_a')?.line?.path.d;
        expect(document.querySelector('#line_a path')?.getAttribute('d')).toBe(expectedPath);
        expect(document.querySelector('#line_z path')?.getAttribute('d')).toBe('M 0 0 L 0 0');
    });
});
