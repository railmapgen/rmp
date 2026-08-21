import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { makePoint } from '../../../../constants/path';
import {
    BezierTangentCandidate,
    getBezierDragSnap,
    getBezierStraightSnap,
    getBezierTangentCandidates,
    getBezierTangentSnap,
} from './bezier-snap';

const candidate = (
    endpoint: BezierTangentCandidate['endpoint'],
    node: [number, number],
    control: [number, number]
): BezierTangentCandidate => ({
    endpoint,
    node: makePoint(...node),
    control: makePoint(...control),
});

describe('Bezier tangent snapping', () => {
    it.each([
        ['horizontal', makePoint(5, 1), makePoint(5, 0)],
        ['vertical', makePoint(1, 5), makePoint(0, 5)],
    ])('can select the nearest of multiple tangents at one node: %s', (_name, pointer, expected) => {
        const candidates = [candidate('source', [0, 0], [10, 0]), candidate('source', [0, 0], [0, 10])];

        expect(getBezierTangentSnap(pointer, candidates, 6)?.point).toEqual(expected);
    });

    it('snaps to an intersection to align tangents at both endpoints', () => {
        const candidates = [candidate('source', [0, 0], [10, 0]), candidate('target', [10, 10], [10, 0])];

        expect(getBezierTangentSnap(makePoint(9.5, 0.5), candidates, 1)?.point).toEqual(makePoint(10, 0));
    });

    it('reports the aligned endpoint when snapping to one tangent', () => {
        const candidates = [candidate('source', [0, 0], [10, 0])];

        expect(getBezierTangentSnap(makePoint(5, 1), candidates, 6)).toEqual({
            point: makePoint(5, 0),
            endpoints: ['source'],
        });
    });

    it('reports both aligned endpoints when snapping to a tangent intersection', () => {
        const candidates = [candidate('source', [0, 0], [10, 0]), candidate('target', [10, 10], [10, 0])];

        expect(getBezierTangentSnap(makePoint(9.5, 0.5), candidates, 1)).toEqual({
            point: makePoint(10, 0),
            endpoints: ['source', 'target'],
        });
    });

    it('does not intersect different tangents contributed by the same endpoint', () => {
        const candidates = [candidate('source', [0, 0], [10, 0]), candidate('source', [0, 0], [0, 10])];

        expect(getBezierTangentSnap(makePoint(0.5, 0.75), candidates, 1)?.point).toEqual(makePoint(0, 0.75));
    });

    it('ignores tangent directions shorter than the numerical epsilon', () => {
        const candidates = [candidate('source', [0, 0], [0.0000005, 0])];

        expect(getBezierTangentSnap(makePoint(5, 0.1), candidates, 1)).toBeUndefined();
    });

    it('does not snap beyond the requested distance', () => {
        const candidates = [candidate('source', [0, 0], [10, 0])];

        expect(getBezierTangentSnap(makePoint(5, 7), candidates, 6)).toBeUndefined();
    });

    it('snaps a nearby control point onto the finite endpoint chord', () => {
        expect(getBezierStraightSnap(makePoint(5, 1), makePoint(0, 0), makePoint(10, 0), 2)).toEqual({
            kind: 'straight',
            point: makePoint(5, 0),
            endpoints: ['source', 'target'],
        });
    });

    it('does not treat the endpoint chord extension as a straight segment', () => {
        expect(getBezierStraightSnap(makePoint(-1, 0.1), makePoint(0, 0), makePoint(10, 0), 2)).toBeUndefined();
    });

    it('chooses the closest single snap candidate', () => {
        const candidates = [candidate('source', [0, 0], [0, 10])];

        expect(getBezierDragSnap(makePoint(5, 1), makePoint(0, 0), makePoint(10, 0), candidates, 6)?.kind).toBe(
            'straight'
        );
    });

    it('keeps a two-ended tangent intersection ahead of a closer straight snap', () => {
        const candidates = [candidate('source', [5, -10], [5, 10]), candidate('target', [0, 0], [10, 0])];

        expect(getBezierDragSnap(makePoint(4.9, 0.1), makePoint(0, 0), makePoint(10, 0), candidates, 1)).toEqual({
            kind: 'tangent',
            point: makePoint(5, 0),
            endpoints: ['source', 'target'],
        });
    });

    it('collects only other Bezier edges connected to the edited edge endpoints', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const addNode = (id: `misc_node_${string}`, x: number, y: number) =>
            graph.addNode(id, { visible: true, zIndex: 0, x, y, type: MiscNodeType.Virtual });
        const addEdge = (
            id: `line_${string}`,
            source: `misc_node_${string}`,
            target: `misc_node_${string}`,
            type: LinePathType
        ) =>
            graph.addDirectedEdgeWithKey(id, source, target, {
                visible: true,
                zIndex: 0,
                type,
                style: LineStyleType.SingleColor,
                reconcileId: '',
                parallelIndex: -1,
                [LinePathType.Bezier]: { along: 0.25, normal: -0.5 },
            });

        addNode('misc_node_a', 0, 0);
        addNode('misc_node_b', 100, 0);
        addNode('misc_node_c', 0, 100);
        addNode('misc_node_d', 100, 100);
        addEdge('line_edited', 'misc_node_a', 'misc_node_b', LinePathType.Bezier);
        addEdge('line_neighbor', 'misc_node_a', 'misc_node_c', LinePathType.Bezier);
        addEdge('line_non_bezier', 'misc_node_b', 'misc_node_d', LinePathType.Simple);

        expect(getBezierTangentCandidates(graph, 'line_edited')).toEqual([candidate('source', [0, 0], [50, 25])]);
    });
});
