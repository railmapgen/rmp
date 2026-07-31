import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    NodeAttributes,
    NodeId,
    Theme,
} from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { StationType } from '../../../../constants/stations';
import { supportsParallelLinePath } from '../../../../util/parallel';
import { initializeNewEdgeAttributes, linePaths, lineStyles } from '../lines';
import { generateBezierPath } from './bezier';
import { getBezierControlPoint, getBezierLocalCoordinates } from './bezier-geometry';
import { defaultBezierPathAttributes } from './bezier-model';

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const RED: Theme = [CityCode.Other, 'red', '#ff0000', MonoColour.white];
const BLUE: Theme = [CityCode.Other, 'blue', '#0000ff', MonoColour.white];

const addNode = (graph: Graph, id: NodeId, x: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y: 0,
        type: StationType.ShmetroBasic,
    });
};

const makeBezierEdgeAttrs = (
    color: Theme,
    sourceOffset = { x: 0, y: 0 },
    targetOffset = { x: 0, y: 0 },
    visible = true
): EdgeAttributes => ({
    visible,
    zIndex: 0,
    type: LinePathType.Bezier,
    [LinePathType.Bezier]: {
        ...structuredClone(defaultBezierPathAttributes),
        sourceOffset,
        targetOffset,
    },
    style: LineStyleType.SingleColor,
    [LineStyleType.SingleColor]: { color },
    reconcileId: '',
    parallelIndex: -1,
});

describe('bezier line path', () => {
    it('registers its overlay and is supported by every line style', () => {
        expect(linePaths[LinePathType.Bezier]).toBeDefined();
        expect(linePaths[LinePathType.Bezier].overlayComponent).toBeDefined();
        expect(linePaths[LinePathType.Bezier].initializeNewEdgeAttrs).toBeDefined();
        expect(linePaths[LinePathType.Bezier].drawingBehavior).toBeUndefined();

        Object.values(lineStyles).forEach(lineStyle =>
            expect(lineStyle.metadata.supportLinePathType).toContain(LinePathType.Bezier)
        );
    });

    it('builds one cubic segment through the tangent intersection model', () => {
        const path = generateBezierPath(0, 100, 0, 0, defaultBezierPathAttributes);

        expect(path.kind).toBe('mc');
        if (path.kind !== 'mc') throw new Error('Expected one cubic path.');
        expect(path.commands).toHaveLength(2);
        expect(path.commands[0]).toEqual({ cmd: 'M', to: { x: 0, y: 0 } });
        const curve = path.commands[1];
        expect(curve.c1.x).toBeCloseTo(100 / 3);
        expect(curve.c1.y).toBeCloseTo(-70 / 3);
        expect(curve.c2.x).toBeCloseTo(200 / 3);
        expect(curve.c2.y).toBeCloseTo(-70 / 3);
        expect(curve.to).toEqual({ x: 100, y: 0 });
    });

    it('applies source and target XY offsets before constructing the Bezier chord', () => {
        const path = generateBezierPath(0, 100, 0, 0, {
            ...defaultBezierPathAttributes,
            sourceOffset: { x: 10, y: 5 },
            targetOffset: { x: -20, y: 15 },
        });

        expect(path.kind).toBe('mc');
        if (path.kind !== 'mc') throw new Error('Expected one cubic path.');
        expect(path.commands[0]).toEqual({ cmd: 'M', to: { x: 10, y: 5 } });
        expect(path.commands[1].to).toEqual({ x: 80, y: 15 });
    });

    it('treats missing endpoint offsets from older saves as zero', () => {
        const path = generateBezierPath(0, 100, 0, 0, { along: 0.5, normal: 0 });

        expect(path.kind).toBe('mc');
        if (path.kind !== 'mc') throw new Error('Expected one cubic path.');
        expect(path.commands[0]).toEqual({ cmd: 'M', to: { x: 0, y: 0 } });
        expect(path.commands[1].to).toEqual({ x: 100, y: 0 });
    });

    it('round-trips a dragged control point in chord-local coordinates', () => {
        const source = { x: 20, y: -10 };
        const target = { x: 80, y: 70 };
        const attrs = { along: 0.3, normal: -0.6 };
        const control = getBezierControlPoint(source, target, attrs);

        expect(getBezierLocalCoordinates(source, target, control).along).toBeCloseTo(attrs.along);
        expect(getBezierLocalCoordinates(source, target, control).normal).toBeCloseTo(attrs.normal);
    });

    it('does not enter the parallel-line pipeline', () => {
        expect(supportsParallelLinePath(LinePathType.Bezier)).toBe(false);
    });

    it('initializes a new endpoint from hidden directly linked paths with the same style', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'misc_node_red', -100);
        addNode(graph, 'misc_node_blue', -50);
        addNode(graph, 'misc_node_target', 100);

        graph.addDirectedEdgeWithKey(
            'line_blue',
            'misc_node_blue',
            'stn_center',
            makeBezierEdgeAttrs(BLUE, { x: 0, y: 0 }, { x: 90, y: 90 })
        );
        graph.addDirectedEdgeWithKey(
            'line_red_hidden',
            'misc_node_red',
            'stn_center',
            makeBezierEdgeAttrs(RED, { x: 0, y: 0 }, { x: 12, y: 13 }, false)
        );

        const edgeAttrs = initializeNewEdgeAttributes(
            graph,
            'stn_center',
            'misc_node_target',
            makeBezierEdgeAttrs(RED, { x: 1, y: 2 }, { x: 3, y: 4 })
        );
        const attrs = edgeAttrs[LinePathType.Bezier];

        expect(attrs?.sourceOffset).toEqual({ x: 12, y: 13 });
        expect(attrs?.targetOffset).toEqual({ x: 0, y: 0 });
    });

    it('initializes split edges sequentially with preserved outer endpoints and a zero inserted endpoint', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_source', 0);
        addNode(graph, 'stn_inserted', 50);
        addNode(graph, 'stn_target', 100);

        const originalAttrs = makeBezierEdgeAttrs(RED, { x: 5, y: 6 }, { x: 7, y: 8 });
        graph.addDirectedEdgeWithKey('line_original', 'stn_source', 'stn_target', originalAttrs);

        const firstEdgeAttrs = initializeNewEdgeAttributes(
            graph,
            'stn_source',
            'stn_inserted',
            structuredClone(originalAttrs)
        );
        graph.addDirectedEdgeWithKey('line_first', 'stn_source', 'stn_inserted', firstEdgeAttrs);

        const secondEdgeAttrs = initializeNewEdgeAttributes(
            graph,
            'stn_inserted',
            'stn_target',
            structuredClone(originalAttrs)
        );
        graph.addDirectedEdgeWithKey('line_second', 'stn_inserted', 'stn_target', secondEdgeAttrs);

        expect(graph.getEdgeAttribute('line_first', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 5, y: 6 },
            targetOffset: { x: 0, y: 0 },
        });
        expect(graph.getEdgeAttribute('line_second', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 0, y: 0 },
            targetOffset: { x: 7, y: 8 },
        });
    });
});
