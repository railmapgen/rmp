import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { SnapLine } from '../constants/canvas';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { PathPoint } from '../constants/path';
import { getSnapLines } from '../util/snap-lines';
import { getSnappedNodePosition } from './node-snap-guides';

const setup = (...positions: PathPoint[]) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    const nodes = positions.map((position, index) => {
        const id: NodeId = `misc_node_${index}`;
        graph.addNode(id, { ...position, type: MiscNodeType.Virtual, virtual: {}, zIndex: 0, visible: true });
        return id;
    });
    return { graph, nodes, lines: getSnapLines(graph, nodes) };
};

describe('getSnappedNodePosition', () => {
    it.each([
        { direction: 'horizontal', anchor: { x: 300, y: 182 }, expected: { x: 120, y: 182 } },
        { direction: 'vertical', anchor: { x: 122, y: 400 }, expected: { x: 122, y: 180 } },
        { direction: 'diagonal', anchor: { x: 300, y: 362 }, expected: { x: 120, y: 182 } },
        { direction: 'opposite diagonal', anchor: { x: 300, y: 2 }, expected: { x: 120, y: 182 } },
    ])('snaps to a nearby $direction guide', ({ anchor, expected }) => {
        const { graph, nodes, lines } = setup(anchor);
        const result = getSnappedNodePosition(graph, { x: 120, y: 180 }, lines, nodes, []);
        expect(result).toMatchObject(expected);
        expect(result.activeSnapLines).toHaveLength(1);
        expect(result.activeSnapPoint).toBeUndefined();
    });

    it('keeps a guide beyond its acquisition range, releases it farther away, and reacquires it', () => {
        const { graph, nodes, lines } = setup({ x: 300, y: 182 });
        const acquired = getSnappedNodePosition(graph, { x: 120, y: 180 }, lines, nodes, []);
        const held = getSnappedNodePosition(graph, { x: 140, y: 187 }, lines, nodes, acquired.activeSnapLines);
        expect(held).toMatchObject({ x: 140, y: 182 });
        expect(held.activeSnapLines).toHaveLength(1);

        const released = getSnappedNodePosition(graph, { x: 150, y: 189 }, lines, nodes, held.activeSnapLines);
        expect(released).toMatchObject({ x: 150, y: 189, activeSnapLines: [] });

        const reacquired = getSnappedNodePosition(graph, { x: 160, y: 183 }, lines, nodes, released.activeSnapLines);
        expect(reacquired).toMatchObject({ x: 160, y: 182 });
        expect(reacquired.activeSnapLines).toHaveLength(1);
    });

    it('holds a midpoint until the pointer leaves it while retaining the underlying guide', () => {
        const { graph, nodes, lines } = setup({ x: 100, y: 182 }, { x: 200, y: 182 });
        const guide = getSnappedNodePosition(graph, { x: 140, y: 180 }, lines, nodes, []);
        const midpoint = getSnappedNodePosition(graph, { x: 149, y: 181 }, lines, nodes, guide.activeSnapLines);
        expect(midpoint).toMatchObject({ x: 150, y: 182, activeSnapPoint: { x: 150, y: 182 } });

        const held = getSnappedNodePosition(
            graph,
            { x: 155, y: 182 },
            lines,
            nodes,
            midpoint.activeSnapLines,
            midpoint.activeSnapPoint
        );
        expect(held).toMatchObject({ x: 150, y: 182, activeSnapPoint: { x: 150, y: 182 } });

        const released = getSnappedNodePosition(
            graph,
            { x: 157, y: 182 },
            lines,
            nodes,
            held.activeSnapLines,
            held.activeSnapPoint
        );
        expect(released).toMatchObject({ x: 157, y: 182 });
        expect(released.activeSnapPoint).toBeUndefined();
        expect(released.activeSnapLines).toHaveLength(1);
    });

    it('snaps to the intersection after acquiring a second guide from another node', () => {
        const { graph, nodes, lines } = setup({ x: 300, y: 182 }, { x: 122, y: 400 });
        const first = getSnappedNodePosition(graph, { x: 120, y: 180 }, lines, nodes, []);
        expect(first.activeSnapLines).toHaveLength(1);

        const intersection = getSnappedNodePosition(graph, { x: 121, y: 181 }, lines, nodes, first.activeSnapLines);
        expect(intersection).toMatchObject({ x: 122, y: 182 });
        expect(intersection.activeSnapLines).toHaveLength(2);
    });

    it("acquires a guide without mutating the caller's frozen active guides", () => {
        const { graph, nodes, lines } = setup({ x: 300, y: 182 });
        const active: SnapLine[] = [];
        Object.freeze(active);

        const result = getSnappedNodePosition(graph, { x: 120, y: 180 }, lines, nodes, active);
        expect(result).toMatchObject({ x: 120, y: 182 });
        expect(result.activeSnapLines).toHaveLength(1);
        expect(result.activeSnapLines).not.toBe(active);
        expect(active).toEqual([]);
    });
});
