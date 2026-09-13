import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { TARGET_SNAP_CELL_SIZE, TARGET_SNAP_RADIUS } from '../constants/canvas';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { StationType } from '../constants/stations';
import {
    buildTargetSnapCellMap,
    findConnectableTarget,
    findNearestConnectableWithinRadius,
    getTargetSnapCellKey,
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

describe('getTargetSnapCellKey', () => {
    it('bins coordinates by TARGET_SNAP_CELL_SIZE', () => {
        expect(getTargetSnapCellKey(0, 0)).toBe('0,0');
        expect(getTargetSnapCellKey(TARGET_SNAP_CELL_SIZE - 0.01, 0)).toBe('0,0');
        expect(getTargetSnapCellKey(TARGET_SNAP_CELL_SIZE, 0)).toBe('1,0');
        expect(getTargetSnapCellKey(-0.01, -TARGET_SNAP_CELL_SIZE)).toBe('-1,-1');
    });
});

describe('buildTargetSnapCellMap', () => {
    it('fans a node into every cell within ±TARGET_SNAP_RADIUS so a single cell lookup finds it', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_near', 15, 0);
        addStation(graph, 'stn_far', 2000, 0);

        const map = buildTargetSnapCellMap(graph, ['stn_near', 'stn_far']);
        const nearKey = getTargetSnapCellKey(5, 5);

        expect(map.get(nearKey)).toContain('stn_near');
        expect(map.get(nearKey)).not.toContain('stn_far');
    });

    it('places a node into a neighboring cell when the cursor cell is within radius of the node', () => {
        const graph = makeGraph();
        // Just outside cell (0,0) but within R of the far corner of that cell.
        const x = TARGET_SNAP_CELL_SIZE + TARGET_SNAP_RADIUS - 1;
        const y = TARGET_SNAP_CELL_SIZE + TARGET_SNAP_RADIUS - 1;
        addStation(graph, 'stn_corner', x, y);

        const map = buildTargetSnapCellMap(graph, ['stn_corner']);
        expect(map.get('0,0')).toContain('stn_corner');
        expect(map.get(getTargetSnapCellKey(x, y))).toContain('stn_corner');
    });
});

describe('findNearestConnectableWithinRadius', () => {
    it('returns the nearest candidate within radius', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 10, 0);
        addStation(graph, 'stn_b', 5, 0);

        expect(findNearestConnectableWithinRadius(graph, { x: 0, y: 0 }, undefined, ['stn_a', 'stn_b'])).toBe('stn_b');
    });

    it('returns undefined when every candidate is outside the radius', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', TARGET_SNAP_RADIUS + 1, 0);

        expect(findNearestConnectableWithinRadius(graph, { x: 0, y: 0 }, undefined, ['stn_a'])).toBeUndefined();
    });

    it('returns undefined for an empty candidate list (DOM-only fallback window)', () => {
        const graph = makeGraph();
        addStation(graph, 'stn_a', 5, 0);

        expect(findNearestConnectableWithinRadius(graph, { x: 0, y: 0 }, undefined, [])).toBeUndefined();
    });
});
