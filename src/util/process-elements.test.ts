import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { getEndPoint, getStartPoint } from './path';
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

const makeRiverLineAttrs = (reconcileId: string): EdgeAttributes => ({
    ...makeLineAttrs(reconcileId),
    style: LineStyleType.River,
    [LineStyleType.River]: {
        color: [CityCode.Shanghai, 'river', '#B9E3F9', MonoColour.white],
        width: 20,
    },
});

const makeBezierLineAttrs = (normal: number): EdgeAttributes => ({
    ...makeLineAttrs(''),
    type: LinePathType.Bezier,
    [LinePathType.Bezier]: { along: 0.5, normal },
});

const FUTURE_LINE_PATH = 'future-line-path' as LinePathType;

const makeFutureLineAttrs = (): EdgeAttributes =>
    ({
        ...makeLineAttrs('future-reconcile'),
        type: FUTURE_LINE_PATH,
        [FUTURE_LINE_PATH]: { futureGeometry: true },
        parallelIndex: 0,
    }) as EdgeAttributes;

describe('getLines', () => {
    it('keeps decimal 45-degree parallel lines finite without changing their authored data', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 217.27, 387.73);
        addNode(graph, 'misc_node_b', 247.88, 357.12);
        for (const [id, parallelIndex] of [
            ['line_base', -1],
            ['line_parallel', 1],
        ] as const) {
            graph.addDirectedEdgeWithKey(id, 'misc_node_a', 'misc_node_b', {
                ...makeLineAttrs(''),
                type: LinePathType.Diagonal,
                [LinePathType.Diagonal]: {
                    startFrom: 'from',
                    offsetFrom: 0,
                    offsetTo: 0,
                    roundCornerFactor: 10,
                },
                parallelIndex,
            });
        }
        const original = structuredClone(graph.export());

        const lines = getLines(graph);

        expect(lines).toHaveLength(2);
        for (const line of lines) expect(line.line!.path.d).not.toMatch(/NaN|Infinity/);
        const base = lines.find(line => line.id === 'line_base')!.line!.path;
        const parallel = lines.find(line => line.id === 'line_parallel')!.line!.path;
        const start = getStartPoint(base);
        const end = getEndPoint(base);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        for (const point of [getStartPoint(parallel), getEndPoint(parallel)]) {
            const distance = Math.abs(dx * (point.y - start.y) - dy * (point.x - start.x)) / Math.hypot(dx, dy);
            expect(distance).toBeCloseTo(5);
        }
        expect(graph.export()).toEqual(original);
    });

    it('renders an unknown future path as a straight line without rewriting its authored data', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 50);
        graph.addDirectedEdgeWithKey('line_future', 'misc_node_a', 'misc_node_b', makeFutureLineAttrs());

        const [element] = getLines(graph);

        expect(element.line?.path.kind).toBe('ml');
        expect(element.line?.attr.type).toBe(FUTURE_LINE_PATH);
        expect(graph.getEdgeAttributes('line_future')).toMatchObject({
            type: FUTURE_LINE_PATH,
            [FUTURE_LINE_PATH]: { futureGeometry: true },
            reconcileId: 'future-reconcile',
            parallelIndex: 0,
        });
    });

    it('renders a straight Bezier as a linear path without changing its authored type', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeBezierLineAttrs(0));

        const [element] = getLines(graph);

        expect(element.line?.path.kind).toBe('ml');
        expect(element.line?.attr.type).toBe(LinePathType.Bezier);
        expect(graph.getEdgeAttribute('line_a', LinePathType.Bezier)).toEqual({ along: 0.5, normal: 0 });
    });

    it('keeps a shallow unsnapped Bezier as a cubic path', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeBezierLineAttrs(Number.EPSILON));

        expect(getLines(graph)[0].line?.path.kind).toBe('mc');
    });

    it.each(['future-path', 'toString'])('renders unknown path %s as a read-only linear fallback', type => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 25);
        const attrs = {
            ...makeLineAttrs(''),
            type: type as LinePathType,
        };
        delete attrs[LinePathType.Simple];
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', attrs);

        const [element] = getLines(graph);

        expect(element.line?.path.kind).toBe('ml');
        expect(element.line?.path.d).toBe('M 0 0 L 100 25');
        expect(element.line?.attr.type).toBe(type);
        expect(graph.getEdgeAttribute('line_a', 'type')).toBe(type);
    });

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

    it('renders mixed-style reconcile chains using the first line style', () => {
        const graph = makeGraph();
        addNode(graph, 'misc_node_a', 0, 0);
        addNode(graph, 'misc_node_b', 100, 0);
        addNode(graph, 'misc_node_c', 200, 0);
        graph.addDirectedEdgeWithKey('line_a', 'misc_node_a', 'misc_node_b', makeLineAttrs('reconcile-a'));
        graph.addDirectedEdgeWithKey('line_b', 'misc_node_b', 'misc_node_c', makeRiverLineAttrs('reconcile-a'));

        const elements = getLines(graph);

        expect(elements).toHaveLength(1);
        expect(elements[0].id).toBe('line_a');
        expect(elements[0].type).toBe('line');
        expect(elements[0].line?.attr.style).toBe(LineStyleType.SingleColor);
        expect(graph.getEdgeAttribute('line_b', 'style')).toBe(LineStyleType.River);
    });
});
