import { describe, expect, it } from 'vitest';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { freeze } from '@reduxjs/toolkit';
import { CityCode, Theme } from '../constants/constants';
import { LineStyleType } from '../constants/lines';
import { createTestLineGraph } from '../test-utils';
import {
    assignLineSection,
    getLineAssignmentTargets,
    getLineEndpointsLabel,
    getLineRoutes,
    getLineTopology,
    getStationLabel,
    getUnassignedLineSections,
    isOpeningDateValid,
    reconcileLineDefinitions,
    splitLineDefinition,
    unassignLineDefinition,
} from './line-definitions';
import { getLineExports } from './line-export';
import { CURRENT_VERSION, upgrade } from './save';

const straight = () =>
    createTestLineGraph([
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'],
    ]);

describe('persistent line definitions', () => {
    it('discovers disconnected lines and keeps identities through rename, movement and whole-line recolouring', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
        ]);
        const definitions = graph.getAttribute('lineDefinitions')!;
        definitions[0].name = ['一号线', 'Line One'];
        graph.setNodeAttribute('stn_A', 'x', 999);
        graph.getNodeAttributes('stn_A')['shmetro-basic']!.names = ['Renamed'];
        graph.setEdgeAttribute('line_0', LineStyleType.SingleColor, {
            color: [CityCode.Other, 'other', '#123456', MonoColour.white],
        });
        const result = reconcileLineDefinitions(graph.export()).attributes.lineDefinitions!;
        expect(result.map(line => line.id)).toEqual(definitions.map(line => line.id));
        expect(result[0].name).toEqual(['一号线', 'Line One']);
        expect(result[0].exportStartStationId).toBe('stn_A');
    });

    it('upgrades v79 and preserves metadata on subsequent load and JSON round trips', async () => {
        const graph = straight().export();
        delete graph.attributes.lineDefinitions;
        const result = JSON.parse(await upgrade(JSON.stringify({ version: 79, graph })));
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.graph.attributes.lineDefinitions).toHaveLength(1);
        expect(result.graph.attributes.lineDefinitions[0].status).toBe('operating');
        result.graph.attributes.lineDefinitions[0].openingDate = '2026-10-03';
        result.graph.attributes.lineDefinitions[0].operator = 'Metro';
        result.graph.attributes.lineDefinitions[0].status = 'planned';
        const reloaded = JSON.parse(await upgrade(JSON.stringify(result)));
        expect(reloaded.graph.attributes.lineDefinitions).toEqual(result.graph.attributes.lineDefinitions);
    });

    it('splits a middle interval with blank remainder metadata, preserves geometry and allows repeated separation', () => {
        const graph = straight().export();
        const line = graph.attributes.lineDefinitions![0];
        line.name = ['原线', 'Original'];
        line.openingDate = '2026-10-03';
        line.notes = 'Keep';
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_E')[0];
        const result = splitLineDefinition(graph, line.id, route, 1, 3);
        expect(result.nodes).toEqual(graph.nodes);
        expect(result.edges).toEqual(graph.edges);
        const definitions = result.attributes.lineDefinitions!;
        expect(definitions.map(item => item.edgeIds)).toEqual([['line_1', 'line_2'], ['line_0'], ['line_3']]);
        expect(definitions[0]).toMatchObject({
            id: line.id,
            name: line.name,
            notes: 'Keep',
            openingDate: '2026-10-03',
        });
        definitions.slice(1).forEach(item =>
            expect(item).toMatchObject({
                name: ['', ''],
                lineNumber: '',
                openingDate: '',
                operator: '',
                status: 'operating',
                notes: '',
            })
        );
        expect(reconcileLineDefinitions(JSON.parse(JSON.stringify(result))).attributes.lineDefinitions).toEqual(
            definitions
        );
        const nextRoute = getLineRoutes(result, definitions[0], 'stn_B', 'stn_D')[0];
        const again = splitLineDefinition(result, line.id, nextRoute, 0, 1);
        expect(again.attributes.lineDefinitions).toHaveLength(4);
        expect(again.attributes.lineDefinitions![0].id).toBe(line.id);
    });

    it('moves virtual connectors and parallel bundles together', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'V'],
                ['V', 'B'],
                ['B', 'C'],
                ['C', 'D'],
                ['A', 'V'],
            ],
            ['V']
        ).export();
        const line = graph.attributes.lineDefinitions![0];
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_D')[0];
        expect(route.stationIds).toEqual(['stn_A', 'stn_B', 'stn_C', 'stn_D']);
        const result = splitLineDefinition(graph, line.id, route, 0, 1);
        expect(result.attributes.lineDefinitions![0].edgeIds).toEqual(['line_0', 'line_1', 'line_4']);
        expect(result.attributes.lineDefinitions![1].edgeIds).toEqual(['line_2', 'line_3']);
    });

    it('separates the shared trunk of a branch and reports every endpoint', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['C', 'E'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        expect(getLineEndpointsLabel(graph, line)).toBe('A — D / E');
        const route = getLineRoutes(graph, line, 'stn_A', 'stn_D')[0];
        const result = splitLineDefinition(graph, line.id, route, 1, 3);
        expect(result.attributes.lineDefinitions!.map(item => item.edgeIds)).toEqual([
            ['line_1', 'line_2'],
            ['line_0'],
            ['line_3'],
        ]);
        expect(getLineTopology(graph, line).type).toBe('BRANCH');
    });

    it('supports both loop arcs and rejects a full line or single-station selection', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        const routes = getLineRoutes(graph, line, 'stn_A', 'stn_A');
        expect(routes).toHaveLength(2);
        expect(getLineTopology(graph, line).type).toBe('LOOP');
        expect(() => splitLineDefinition(graph, line.id, routes[0], 0, 4)).toThrow();
        expect(() => splitLineDefinition(graph, line.id, routes[0], 1, 1)).toThrow();
        for (const route of routes) {
            const result = splitLineDefinition(graph, line.id, route, 0, 2);
            expect(result.attributes.lineDefinitions).toHaveLength(2);
            expect(result.attributes.lineDefinitions!.flatMap(item => item.edgeIds).sort()).toEqual(line.edgeIds);
            expect(result.attributes.lineDefinitions!.map(item => getLineTopology(result, item).type)).toEqual([
                'LINE',
                'LINE',
            ]);
        }
    });

    it('enumerates alternate station paths without treating virtual nodes as stations', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
                ['B', 'V'],
                ['V', 'D'],
                ['D', 'E'],
            ],
            ['V']
        ).export();
        const line = graph.attributes.lineDefinitions![0];
        expect(getLineRoutes(graph, line, 'stn_A', 'stn_E').map(route => route.stationIds)).toEqual([
            ['stn_A', 'stn_B', 'stn_C', 'stn_D', 'stn_E'],
            ['stn_A', 'stn_B', 'stn_D', 'stn_E'],
        ]);
    });

    it('finds all boundary stations of a virtual junction component', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'V'],
                ['V', 'W'],
                ['W', 'B'],
                ['V', 'X'],
                ['X', 'C'],
                ['X', 'D'],
                ['W', 'T'],
            ],
            ['V', 'W', 'X', 'T']
        ).export();
        const topology = getLineTopology(graph, graph.attributes.lineDefinitions![0]);
        expect(topology.type).toBe('BRANCH');
        expect(topology.stationIds).toEqual(['stn_A', 'stn_B', 'stn_C', 'stn_D']);
        expect(topology.terminalIds).toEqual(topology.stationIds);
        expect(topology.branchStations).toEqual(new Set(topology.stationIds));
    });

    it('keeps virtual cycles bounded by real stations and enumerates their arcs in the original order', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'V'],
                ['V', 'W'],
                ['W', 'X'],
                ['X', 'V'],
                ['W', 'B'],
            ],
            ['V', 'W', 'X']
        ).export();
        const line = graph.attributes.lineDefinitions![0];
        const topology = getLineTopology(graph, line);
        expect(topology.type).toBe('BRANCH');
        expect(topology.terminalIds).toEqual(['stn_A', 'stn_B']);
        expect(topology.branchStations).toEqual(new Set(topology.terminalIds));
        expect(getLineRoutes(graph, line, 'stn_A', 'stn_B').map(route => route.segments)).toEqual([
            [['line_0', 'line_1', 'line_4']],
            [['line_0', 'line_3', 'line_2', 'line_4']],
        ]);
        expect(getLineRoutes(graph, line, 'stn_A', 'stn_A')).toEqual([]);
    });

    it('reflects in-place changes to mutable exports after earlier topology and label reads', () => {
        const graph = straight().export();
        const line = graph.attributes.lineDefinitions![0];
        expect(getLineEndpointsLabel(graph, line)).toBe('A — E');
        graph.edges.pop();
        graph.nodes.find(node => node.key === 'stn_A')!.attributes!['shmetro-basic']!.names = ['Changed'];
        expect(getLineTopology(graph, line).terminalIds).toEqual(['stn_A', 'stn_D']);
        expect(getStationLabel(graph, 'stn_A')).toBe('Changed');
        expect(getLineEndpointsLabel(graph, line)).toBe('Changed — D');
        graph.attributes.unassignedLineEdgeIds = ['line_0'];
        expect(getUnassignedLineSections(graph)[0].edgeIds).toEqual(['line_0']);
        graph.attributes.unassignedLineEdgeIds.push('line_1');
        expect(getUnassignedLineSections(graph)[0].edgeIds).toEqual(['line_0', 'line_1']);
    });

    it('reads immutable snapshots consistently and accepts a previously calculated topology for labels', () => {
        const graph = freeze(straight().export(), true);
        const line = graph.attributes.lineDefinitions![0];
        const expected = getLineTopology(structuredClone(graph), line);
        expect(getLineTopology(graph, line)).toEqual(expected);
        expect(getLineTopology(graph, { ...line, edgeIds: [...line.edgeIds].reverse() })).toEqual(expected);
        expect(getLineEndpointsLabel(graph, line, expected)).toBe('A — E');
        expect(getStationLabel(graph, 'stn_E')).toBe('E');
    });

    it('does not cache mutable memberships within a shallowly frozen graph', () => {
        const graph = straight().export();
        graph.nodes.forEach(Object.freeze);
        graph.edges.forEach(Object.freeze);
        Object.freeze(graph.nodes);
        Object.freeze(graph.edges);
        Object.freeze(graph);
        graph.attributes.unassignedLineEdgeIds = ['line_0'];
        expect(getUnassignedLineSections(graph)[0].edgeIds).toEqual(['line_0']);
        graph.attributes.unassignedLineEdgeIds.push('line_1');
        expect(getUnassignedLineSections(graph)[0].edgeIds).toEqual(['line_0', 'line_1']);
        graph.nodes.find(node => node.key === 'stn_A')!.attributes!['shmetro-basic']!.names = ['Changed'];
        expect(getStationLabel(graph, 'stn_A')).toBe('Changed');
    });

    it('enumerates long station paths without overflowing the call stack', () => {
        const length = 12000;
        const graph = createTestLineGraph(
            Array.from({ length }, (_, index) => [`S${index}`, `S${index + 1}`])
        ).export();
        const routes = getLineRoutes(graph, graph.attributes.lineDefinitions![0], 'stn_S0', `stn_S${length}`);
        expect(routes).toHaveLength(1);
        expect(routes[0].stationIds).toHaveLength(length + 1);
        expect(routes[0].nodeIds).toEqual(routes[0].stationIds);
        expect(routes[0].segments).toHaveLength(length);
        expect(routes[0].segments[0]).toEqual(['line_0']);
        expect(routes[0].segments[length - 1]).toEqual([`line_${length - 1}`]);
    });

    it('keeps split lines separate when a new edge connects two definitions', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
        ]);
        graph.addDirectedEdgeWithKey(
            'line_bridge',
            'stn_B',
            'stn_C',
            structuredClone(graph.getEdgeAttributes('line_0'))
        );
        const result = reconcileLineDefinitions(graph.export());
        expect(result.attributes.lineDefinitions).toHaveLength(3);
        expect(result.attributes.lineDefinitions![2].edgeIds).toEqual(['line_bridge']);
    });

    it('validates actual calendar dates', () => {
        expect(isOpeningDateValid('')).toBe(true);
        expect(isOpeningDateValid('2024-02-29')).toBe(true);
        expect(isOpeningDateValid('2025-02-29')).toBe(false);
        expect(isOpeningDateValid('2026-13-01')).toBe(false);
    });
});

describe('line colour identity', () => {
    const palette: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
    const paletteVariant: Theme = [CityCode.Shanghai, 'sh1', '#123456', MonoColour.black];
    const custom: Theme = [CityCode.Other, 'other', '#E4002B', MonoColour.white];
    const customVariant: Theme = [CityCode.Other, 'custom', '#E4002B', MonoColour.white];
    const cases: [string, Theme, Theme, number][] = [
        ['palette identity despite different background and foreground', palette, paletteVariant, 1],
        [
            'different palette line IDs with identical displayed colours',
            palette,
            [CityCode.Shanghai, 'sh2', palette[2], palette[3]],
            2,
        ],
        [
            'different palette city IDs with identical displayed colours',
            palette,
            [CityCode.Beijing, 'sh1', palette[2], palette[3]],
            2,
        ],
        ['custom colours despite different line markers', custom, customVariant, 1],
        ['different custom backgrounds', custom, [CityCode.Other, 'other', '#123456', custom[3]], 2],
        ['different custom foregrounds', custom, [CityCode.Other, 'other', custom[2], MonoColour.black], 2],
        ['custom hex strings differing only in case', custom, [CityCode.Other, 'other', '#e4002b', custom[3]], 2],
        ['palette and custom themes with identical displayed colours', palette, custom, 2],
    ];

    it.each(cases)('groups connected edges by %s', (_, first, second, count) => {
        const graph = createTestLineGraph([
            ['A', 'B', first],
            ['B', 'C', second],
        ]).export();
        const definitions = graph.attributes.lineDefinitions!;
        expect(definitions).toHaveLength(count);
        expect(definitions.map(line => line.edgeIds)).toEqual(
            count === 1 ? [['line_0', 'line_1']] : [['line_0'], ['line_1']]
        );
        expect(reconcileLineDefinitions(graph).attributes.lineDefinitions).toEqual(definitions);
    });

    it.each([
        ['palette', palette, paletteVariant],
        ['custom', custom, customVariant],
    ] as [string, Theme, Theme][])('extends an existing %s line without losing metadata', (_, first, second) => {
        const graph = createTestLineGraph([
            ['A', 'B', first],
            ['B', 'C', first],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        line.name = ['测试线路', 'Test Line'];
        line.edgeIds = ['line_0'];
        graph.edges[1].attributes![LineStyleType.SingleColor]!.color = second;
        const result = reconcileLineDefinitions(graph);
        expect(result.attributes.lineDefinitions).toEqual([{ ...line, edgeIds: ['line_0', 'line_1'] }]);
        expect(result.edges).toEqual(graph.edges);
        const exported = getLineExports(result)[0];
        expect(exported.error).toBeUndefined();
        expect(Object.keys(exported.param!.stn_list)).toEqual(expect.arrayContaining(['stn_A', 'stn_B', 'stn_C']));
    });

    it.each([
        ['palette', palette, paletteVariant],
        ['custom', custom, customVariant],
    ] as [string, Theme, Theme][])(
        'offers matching %s sections for assignment without merging saved identities',
        (_, first, second) => {
            const graph = createTestLineGraph([
                ['A', 'B', first],
                ['B', 'C', second],
            ]).export();
            const line = graph.attributes.lineDefinitions![0];
            const separated = splitLineDefinition(
                graph,
                line.id,
                getLineRoutes(graph, line, 'stn_A', 'stn_C')[0],
                0,
                1
            );
            expect(reconcileLineDefinitions(separated).attributes.lineDefinitions).toHaveLength(2);
            const [retained, remainder] = separated.attributes.lineDefinitions!;
            const removed = unassignLineDefinition(separated, remainder.id);
            const pending = getUnassignedLineSections(removed)[0];
            expect(getLineAssignmentTargets(removed, pending.id).map(item => item.id)).toEqual([retained.id]);
            const assigned = assignLineSection(removed, pending.id, retained.id);
            expect(assigned.attributes.lineDefinitions).toEqual([{ ...retained, edgeIds: ['line_0', 'line_1'] }]);
            expect(assigned.edges).toEqual(graph.edges);
        }
    );
});

describe('whole-line removal and assignment', () => {
    it('keeps cached immutable pending sections private from edits to temporary display records', () => {
        const graph = straight().export();
        const line = graph.attributes.lineDefinitions![0];
        const frozen = freeze(unassignLineDefinition(graph, line.id), true);
        const first = getUnassignedLineSections(frozen)[0];
        first.edgeIds.pop();
        first.name[0] = 'Temporary';
        const next = getUnassignedLineSections(frozen)[0];
        expect(next.edgeIds).toEqual(line.edgeIds);
        expect(next.name).toEqual(['', '']);
        expect(getLineAssignmentTargets(frozen, next.id)).toEqual([]);
    });

    it('keeps removed lines unassigned across normalization and JSON loading without changing the canvas', async () => {
        const graph = straight().export();
        const line = graph.attributes.lineDefinitions![0];
        line.name = ['线路', 'Line'];
        const removed = unassignLineDefinition(graph, line.id);
        expect(removed.attributes.unassignedLineEdgeIds).toEqual(line.edgeIds);
        expect(removed.attributes.lineDefinitions).toEqual([]);
        expect(getUnassignedLineSections(removed).map(item => getLineEndpointsLabel(removed, item))).toEqual(['A — E']);
        expect(reconcileLineDefinitions(removed)).toEqual(removed);
        const reloaded = JSON.parse(await upgrade(JSON.stringify({ version: CURRENT_VERSION, graph: removed })));
        expect(reconcileLineDefinitions(reloaded.graph)).toEqual(removed);
        expect(getUnassignedLineSections(reloaded.graph)[0].id).toBe(getUnassignedLineSections(removed)[0].id);
        expect(getLineExports(removed)).toEqual([]);
        expect(removed.nodes).toEqual(graph.nodes);
        expect(removed.edges).toEqual(graph.edges);
        expect(graph.attributes.lineDefinitions![0]).toEqual(line);
    });

    it('recombines separated lines while preserving target identity and metadata', () => {
        const graph = straight().export();
        const original = graph.attributes.lineDefinitions![0];
        const separated = splitLineDefinition(
            graph,
            original.id,
            getLineRoutes(graph, original, 'stn_A', 'stn_E')[0],
            1,
            3
        );
        const [middle, left, right] = separated.attributes.lineDefinitions!;
        left.name = ['左线', 'Left'];
        left.notes = 'Retain target metadata';
        left.openingDate = '2026-10-03';
        const removed = unassignLineDefinition(separated, middle.id);
        const pending = getUnassignedLineSections(removed)[0];
        expect(getLineAssignmentTargets(removed, pending.id).map(item => item.id)).toEqual([left.id, right.id]);
        const assigned = assignLineSection(removed, pending.id, left.id);
        expect(assigned.attributes.lineDefinitions!.find(item => item.id === left.id)).toMatchObject({
            id: left.id,
            name: left.name,
            notes: left.notes,
            openingDate: left.openingDate,
            edgeIds: ['line_0', 'line_1', 'line_2'],
        });
        expect(assigned.attributes.unassignedLineEdgeIds).toEqual([]);
        const removedRight = unassignLineDefinition(assigned, right.id);
        const merged = assignLineSection(removedRight, getUnassignedLineSections(removedRight)[0].id, left.id);
        expect(merged.attributes.lineDefinitions).toHaveLength(1);
        expect(merged.attributes.lineDefinitions![0]).toMatchObject({
            id: left.id,
            name: left.name,
            edgeIds: original.edgeIds,
        });
        expect(merged.nodes).toEqual(graph.nodes);
        expect(merged.edges).toEqual(graph.edges);
    });

    it('groups adjacent removed sections for assignment to a blank new line without absorbing other lines', () => {
        const graph = straight().export();
        const original = graph.attributes.lineDefinitions![0];
        const separated = splitLineDefinition(
            graph,
            original.id,
            getLineRoutes(graph, original, 'stn_A', 'stn_E')[0],
            1,
            3
        );
        const [middle, left, right] = separated.attributes.lineDefinitions!;
        const removed = unassignLineDefinition(unassignLineDefinition(separated, middle.id), left.id);
        const pending = getUnassignedLineSections(removed);
        expect(pending).toHaveLength(1);
        expect(pending[0].edgeIds).toEqual(['line_0', 'line_1', 'line_2']);
        const assigned = assignLineSection(removed, pending[0].id);
        expect(assigned.attributes.lineDefinitions).toHaveLength(2);
        expect(assigned.attributes.lineDefinitions![0]).toEqual(right);
        expect(assigned.attributes.lineDefinitions![1]).toMatchObject({
            edgeIds: pending[0].edgeIds,
            name: ['', ''],
            notes: '',
            openingDate: '',
        });
        expect(assigned.attributes.unassignedLineEdgeIds).toEqual([]);
        expect(assigned.nodes).toEqual(graph.nodes);
        expect(assigned.edges).toEqual(graph.edges);
    });

    it('rejects disconnected, differently themed and stale targets without changing memberships', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D', [CityCode.Other, 'other', '#123456', MonoColour.white]],
            ['X', 'Y'],
        ]).export();
        const removed = unassignLineDefinition(graph, graph.attributes.lineDefinitions![0].id);
        const before = structuredClone(removed);
        const pending = getUnassignedLineSections(removed)[0];
        expect(getLineAssignmentTargets(removed, pending.id)).toEqual([]);
        for (const target of removed.attributes.lineDefinitions!) {
            expect(() => assignLineSection(removed, pending.id, target.id)).toThrow();
        }
        expect(() => assignLineSection(removed, pending.id, 'missing')).toThrow();
        expect(() => assignLineSection(removed, 'missing')).toThrow();
        expect(() => unassignLineDefinition(removed, 'missing')).toThrow();
        expect(removed).toEqual(before);
    });

    it('moves all branches, virtual connectors and parallel bundles together and prunes deleted pending edges', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'B'],
                ['B', 'V'],
                ['V', 'C'],
                ['C', 'D'],
                ['C', 'E'],
                ['B', 'V'],
            ],
            ['V']
        ).export();
        const line = graph.attributes.lineDefinitions![0];
        const removed = unassignLineDefinition(graph, line.id);
        expect(removed.attributes.unassignedLineEdgeIds).toEqual(line.edgeIds);
        expect(removed.attributes.lineDefinitions).toEqual([]);
        const pending = getUnassignedLineSections(removed)[0];
        const assigned = assignLineSection(removed, pending.id);
        expect(assigned.attributes.lineDefinitions![0].edgeIds).toEqual(line.edgeIds);
        expect(getLineTopology(assigned, assigned.attributes.lineDefinitions![0]).type).toBe('BRANCH');
        expect(assigned.nodes).toEqual(graph.nodes);
        expect(assigned.edges).toEqual(graph.edges);
        const pruned = reconcileLineDefinitions({
            ...removed,
            edges: removed.edges.filter(edge => edge.key !== 'line_5'),
        });
        expect(pruned.attributes.unassignedLineEdgeIds).toEqual(line.edgeIds.filter(id => id !== 'line_5'));
    });

    it('assigns virtual-only sections without requiring a station path', () => {
        const graph = createTestLineGraph([['V', 'W']], ['V', 'W']).export();
        const line = graph.attributes.lineDefinitions![0];
        const removed = unassignLineDefinition(graph, line.id);
        const assigned = assignLineSection(removed, getUnassignedLineSections(removed)[0].id);
        expect(assigned.attributes.lineDefinitions![0].edgeIds).toEqual(line.edgeIds);
        expect(assigned.attributes.unassignedLineEdgeIds).toEqual([]);
        expect(assigned.nodes).toEqual(graph.nodes);
        expect(assigned.edges).toEqual(graph.edges);
    });

    it('recombines either separated loop arc to restore the entire loop', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        for (const route of getLineRoutes(graph, line, 'stn_A', 'stn_A')) {
            const separated = splitLineDefinition(graph, line.id, route, 0, 2);
            const [selected, target] = separated.attributes.lineDefinitions!;
            const removed = unassignLineDefinition(separated, selected.id);
            const assigned = assignLineSection(removed, getUnassignedLineSections(removed)[0].id, target.id);
            expect(assigned.attributes.lineDefinitions![0].edgeIds).toEqual(line.edgeIds);
            expect(getLineTopology(assigned, assigned.attributes.lineDefinitions![0]).type).toBe('LOOP');
            expect(getLineExports(assigned)[0].param!.loop).toBe(true);
        }
    });
});

describe('logical line RMG export', () => {
    it('exports the saved origin, independent same-colour intervals and correct transfer names', () => {
        const graph = straight().export();
        const line = graph.attributes.lineDefinitions![0];
        const result = splitLineDefinition(graph, line.id, getLineRoutes(graph, line, 'stn_A', 'stn_E')[0], 1, 3);
        const definitions = result.attributes.lineDefinitions!;
        definitions.forEach((item, index) => {
            item.name = [`线${index}`, `Line ${index}`];
            item.lineNumber = String(index);
        });
        definitions[0].exportStartStationId = 'stn_D';
        const exports = getLineExports(result);
        expect(exports).toHaveLength(3);
        expect(exports[0].param!.current_stn_idx).toBe('stn_D');
        expect(exports[0].param!.line_name).toEqual(['线0', 'Line 0']);
        expect(exports[0].param!.line_num).toBe('0');
        expect(Object.keys(exports[0].param!.stn_list).sort()).toEqual([
            'lineend',
            'linestart',
            'stn_B',
            'stn_C',
            'stn_D',
        ]);
        expect(exports[0].param!.stn_list.stn_B.transfer.groups[0].lines![0].name).toEqual(['线1', 'Line 1']);
        expect(exports[0].param!.stn_list.stn_D.transfer.groups[0].lines![0].name).toEqual(['线2', 'Line 2']);
        expect(exports[0].param).not.toHaveProperty('openingDate');
    });

    it('retains unsupported multi-terminal lines and makes their paths available for separation', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['B', 'D'],
            ['B', 'E'],
        ]).export();
        const exports = getLineExports(graph);
        expect(exports).toHaveLength(1);
        expect(exports[0].error).toBe('unsupportedTopology');
        const route = getLineRoutes(graph, exports[0].line, 'stn_A', 'stn_E')[0];
        const separated = splitLineDefinition(graph, exports[0].line.id, route, 0, 2);
        expect(getLineExports(separated).every(item => item.param)).toBe(true);
    });
});
