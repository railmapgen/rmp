import { describe, expect, it } from 'vitest';
import { createTestLineGraph } from '../test-utils';
import { getLineRoutes } from './line-definitions';
import { getLineIntervalDiagram, INTERVAL_ROUTE_Y, INTERVAL_STATION_GAP } from './line-interval-diagram';

describe('line interval branch diagram', () => {
    it('shows all branches and nested forks while keeping the selected path horizontal and geometry untouched', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['B', 'E'],
            ['E', 'F'],
            ['E', 'G'],
            ['G', 'H'],
            ['C', 'I'],
        ]).export();
        const before = structuredClone(graph);
        const line = graph.attributes.lineDefinitions![0];
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_D')[0];
        const diagram = getLineIntervalDiagram(graph, line, route);
        expect(diagram.stations.map(point => point.stationId).sort()).toEqual(graph.nodes.map(node => node.key).sort());
        expect(diagram.stations.filter(point => point.onRoute).map(point => point.y)).toEqual([90, 90, 90, 90]);
        expect(diagram.stations.filter(point => !point.onRoute).every(point => point.y > INTERVAL_ROUTE_Y)).toBe(true);
        expect(diagram.stations.find(point => point.stationId === 'stn_G')!.y).toBeGreaterThan(
            diagram.stations.find(point => point.stationId === 'stn_F')!.y
        );
        expect(diagram.stations.find(point => point.stationId === 'stn_I')!.y).toBeLessThan(
            diagram.stations.find(point => point.stationId === 'stn_E')!.y
        );
        expect(diagram.junctions.map(point => point.id).sort()).toEqual(['stn_B', 'stn_C', 'stn_E']);
        expect(diagram.branches.flatMap(branch => branch.edgeIds).sort()).toEqual([
            'line_3',
            'line_4',
            'line_5',
            'line_6',
            'line_7',
        ]);
        expect(graph).toEqual(before);
    });

    it('attaches branches at virtual junctions, bundles parallel edges and redraws when the selected path changes', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'V'],
                ['V', 'B'],
                ['B', 'C'],
                ['V', 'E'],
                ['E', 'F'],
                ['V', 'E'],
            ],
            ['V']
        ).export();
        const line = graph.attributes.lineDefinitions![0];
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_C')[0];
        const diagram = getLineIntervalDiagram(graph, line, route);
        const junction = diagram.junctions.find(point => point.id === 'misc_node_V')!;
        expect(junction.x).toBe(40 + INTERVAL_STATION_GAP / 2);
        expect(junction.y).toBe(INTERVAL_ROUTE_Y);
        expect(diagram.stations.some(point => point.stationId === 'misc_node_V')).toBe(false);
        const parallel = diagram.branches.find(branch => branch.edgeIds.includes('line_3'))!;
        expect(parallel.edgeIds.sort()).toEqual(['line_3', 'line_5']);
        expect(parallel.path).toContain(`M ${junction.x} ${junction.y}`);
        const other = getLineIntervalDiagram(graph, line, getLineRoutes(graph, line, 'stn_A', 'stn_F')[0]);
        expect(other.stations.filter(point => point.onRoute).map(point => point.stationId)).toEqual([
            'stn_A',
            'stn_E',
            'stn_F',
        ]);
        expect(
            other.stations
                .filter(point => !point.onRoute)
                .map(point => point.stationId)
                .sort()
        ).toEqual(['stn_B', 'stn_C']);
        expect(other.branches.flatMap(branch => branch.edgeIds).sort()).toEqual(['line_1', 'line_2']);
    });

    it('draws a separate arc for an alternative connection instead of hiding it under the selected path', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'E'],
            ['B', 'D'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_E').find(path => path.stationIds.includes('stn_C'))!;
        const diagram = getLineIntervalDiagram(graph, line, route);
        expect(diagram.branches).toHaveLength(1);
        expect(diagram.branches[0].edgeIds).toEqual(['line_4']);
        expect(diagram.branches[0].path).toContain('V ');
        expect(diagram.height).toBeGreaterThan(210);
    });
});
