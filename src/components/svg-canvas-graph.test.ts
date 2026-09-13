import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { LINE_SNAP_CELL_SIZE, LINE_SNAP_RADIUS } from '../constants/canvas';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { StationType } from '../constants/stations';
import {
    collectLineSnapCandidatesForCell,
    findConnectableTarget,
    findNearestConnectableWithinRadius,
    getLineSnapCellKey,
} from './svg-canvas-graph';

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const makeGraph = () => new MultiDirectedGraph() as TestGraph;

const addStation = (graph: TestGraph, id: NodeId, x: number, y: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: StationType.ShmetroBasic,
    } as NodeAttributes);
};

describe('findConnectableTarget', () => {
    it('resolves a connectable target from an ancestor element', () => {
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        core.setAttribute('id', 'stn_core_misc_node_target');

        const child = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        core.appendChild(child);

        expect(findConnectableTarget([child])).toEqual({
            id: 'stn_core_misc_node_target',
            matchedPrefix: 'stn_core_',
        });
    });

    it('continues scanning later elements when the first element is not connectable', () => {
        const nonConnectable = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const connectable = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        connectable.setAttribute('id', 'virtual_circle_misc_node_target');

        expect(findConnectableTarget([nonConnectable, connectable])).toEqual({
            id: 'virtual_circle_misc_node_target',
            matchedPrefix: 'virtual_circle_',
        });
    });
});

describe('getLineSnapCellKey', () => {
    it('bins coordinates by LINE_SNAP_CELL_SIZE', () => {
        expect(getLineSnapCellKey(0, 0)).toBe('0,0');
        expect(getLineSnapCellKey(LINE_SNAP_CELL_SIZE - 0.01, 0)).toBe('0,0');
        expect(getLineSnapCellKey(LINE_SNAP_CELL_SIZE, 0)).toBe('1,0');
        expect(getLineSnapCellKey(-0.01, -LINE_SNAP_CELL_SIZE)).toBe('-1,-1');
    });
});

describe('collectLineSnapCandidatesForCell', () => {
    it('includes nodes in the cell AABB expanded by LINE_SNAP_RADIUS and excludes the source', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_source', 0, 0);
        addStation(graph, 'stn_near', 15, 0);
        addStation(graph, 'stn_far', 200, 0);

        const cellKey = getLineSnapCellKey(5, 5);
        const candidates = collectLineSnapCandidatesForCell(graph, cellKey, 'stn_source');

        expect(candidates).toContain('stn_near');
        expect(candidates).not.toContain('stn_source');
        expect(candidates).not.toContain('stn_far');
    });

    it('keeps nodes that are only reachable from a cell corner after radius expansion', () => {
        const graph = makeGraph();
        // Cell (0,0) covers [0, S). A node just outside the cell but within R of the far corner must be included.
        addStation(graph, 'stn_corner', LINE_SNAP_CELL_SIZE + LINE_SNAP_RADIUS - 1, LINE_SNAP_CELL_SIZE + LINE_SNAP_RADIUS - 1);

        const candidates = collectLineSnapCandidatesForCell(graph, '0,0', undefined);
        expect(candidates).toContain('stn_corner');
    });
});

describe('findNearestConnectableWithinRadius', () => {
    it('returns the nearest candidate within radius', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 10, 0);
        addStation(graph, 'stn_b', 5, 0);

        expect(
            findNearestConnectableWithinRadius(graph, { x: 0, y: 0 }, undefined, ['stn_a', 'stn_b'])
        ).toBe('stn_b');
    });

    it('returns undefined when every candidate is outside the radius', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', LINE_SNAP_RADIUS + 1, 0);

        expect(
            findNearestConnectableWithinRadius(graph, { x: 0, y: 0 }, undefined, ['stn_a'])
        ).toBeUndefined();
    });
});
