import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import { defaultIsSameStyle, findConnectedSameStyleEdges } from './same-style';

const RED = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white] as const;
const BLUE = [CityCode.Shanghai, 'sh4', '#5F259F', MonoColour.white] as const;
const GREEN = [CityCode.Shanghai, 'sh2', '#97D700', MonoColour.black] as const;

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const addStation = (graph: TestGraph, id: string, x: number, y: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: StationType.ShmetroBasic,
    } as NodeAttributes);
};

const addLine = (
    graph: TestGraph,
    id: string,
    source: string,
    target: string,
    color: readonly [string, string, string, string]
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Diagonal,
        style: LineStyleType.SingleColor,
        reconcileId: '',
        parallelIndex: -1,
        [LineStyleType.SingleColor]: { color: [...color] },
    } as EdgeAttributes);
};

describe('defaultIsSameStyle', () => {
    it('should return false for empty attrs (no color)', () => {
        expect(defaultIsSameStyle({}, {})).toBe(false);
    });

    it('should return true when single color matches', () => {
        const a = { color: [...RED] };
        const b = { color: [...RED] };
        expect(defaultIsSameStyle(a, b)).toBe(true);
    });

    it('should return false when single color differs', () => {
        const a = { color: [...RED] };
        const b = { color: [...BLUE] };
        expect(defaultIsSameStyle(a, b)).toBe(false);
    });

    it('should ignore non-color properties', () => {
        const a = { color: [...RED], width: 20 };
        const b = { color: [...RED], width: 10 };
        expect(defaultIsSameStyle(a, b)).toBe(true);
    });

    it('should return false when only one side has color', () => {
        expect(defaultIsSameStyle({ color: [...RED] }, {})).toBe(false);
        expect(defaultIsSameStyle({}, { color: [...RED] })).toBe(false);
    });
});

describe('findConnectedSameStyleEdges', () => {
    it('should return only the target edge when it is the only edge', () => {
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result).toEqual(['line_1']);
    });

    it('should select all connected same-color segments', () => {
        // A -red-> B -red-> C -red-> D
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addStation(graph, 'stn_d', 300, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        addLine(graph, 'line_2', 'stn_b', 'stn_c', RED);
        addLine(graph, 'line_3', 'stn_c', 'stn_d', RED);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result.sort()).toEqual(['line_1', 'line_2', 'line_3']);
    });

    it('should not select disconnected same-color segments', () => {
        // A -red-> B    C -red-> D  (no edge between B and C)
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addStation(graph, 'stn_d', 300, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        addLine(graph, 'line_2', 'stn_c', 'stn_d', RED);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result).toEqual(['line_1']);
    });

    it('should stop at color boundary', () => {
        // A -red-> B -blue-> C -red-> D
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addStation(graph, 'stn_d', 300, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        addLine(graph, 'line_2', 'stn_b', 'stn_c', BLUE);
        addLine(graph, 'line_3', 'stn_c', 'stn_d', RED);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result).toEqual(['line_1']);
    });

    it('should not cross different style types', () => {
        // A -SingleColor red-> B -DualColor red-> C
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        graph.addDirectedEdgeWithKey('line_2', 'stn_b', 'stn_c', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Diagonal,
            style: LineStyleType.DualColor,
            reconcileId: '',
            parallelIndex: -1,
            [LineStyleType.DualColor]: { colorA: [...RED], colorB: [...BLUE] },
        } as EdgeAttributes);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result).toEqual(['line_1']);
    });

    it('should skip hidden edges', () => {
        // A -red-> B -red(hidden)-> C
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 0);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        addLine(graph, 'line_2', 'stn_b', 'stn_c', RED);
        graph.setEdgeAttribute('line_2', 'visible', false);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result).toEqual(['line_1']);
    });

    it('should handle branching topology', () => {
        //       C
        //      /
        // A - B
        //      \
        //       D
        const graph = new MultiDirectedGraph() as TestGraph;
        addStation(graph, 'stn_a', 0, 0);
        addStation(graph, 'stn_b', 100, 0);
        addStation(graph, 'stn_c', 200, 50);
        addStation(graph, 'stn_d', 200, -50);
        addLine(graph, 'line_1', 'stn_a', 'stn_b', RED);
        addLine(graph, 'line_2', 'stn_b', 'stn_c', RED);
        addLine(graph, 'line_3', 'stn_b', 'stn_d', RED);

        const result = findConnectedSameStyleEdges(graph, 'line_1' as LineId);
        expect(result.sort()).toEqual(['line_1', 'line_2', 'line_3']);
    });
});
