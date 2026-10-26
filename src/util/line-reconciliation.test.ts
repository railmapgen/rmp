import { describe, expect, it } from 'vitest';
import { CityCode, type Theme } from '../constants/constants';
import { LineStyleType } from '../constants/lines';
import { createTestLineGraph } from '../test-utils';
import {
    emptyLineDefinition,
    getLineRoutes,
    getLineTopology,
    getUnassignedLineSections,
    reconcileLineDefinitions,
    splitLineDefinition,
    unassignLineDefinition,
} from './line-definitions';

const insertStation = (graph: ReturnType<typeof createTestLineGraph>, edgeId: string, name = 'X') => {
    const [source, target] = graph.extremities(edgeId);
    graph.addNode(`stn_${name}`, structuredClone(graph.getNodeAttributes(source)));
    const replacementIds = [`line_${name}_first`, `line_${name}_second`];
    graph.addDirectedEdgeWithKey(
        replacementIds[0],
        source,
        `stn_${name}`,
        structuredClone(graph.getEdgeAttributes(edgeId))
    );
    graph.addDirectedEdgeWithKey(
        replacementIds[1],
        `stn_${name}`,
        target,
        structuredClone(graph.getEdgeAttributes(edgeId))
    );
    graph.dropEdge(edgeId);
    return replacementIds;
};

const reconnectThroughStations = (graph: ReturnType<typeof createTestLineGraph>, edgeId: string, names: string[]) => {
    const [source, target] = graph.extremities(edgeId);
    const edgeAttributes = structuredClone(graph.getEdgeAttributes(edgeId));
    graph.dropEdge(edgeId);
    for (const name of names) graph.addNode(`stn_${name}`, structuredClone(graph.getNodeAttributes(source)));
    const path = [source, ...names.map(name => `stn_${name}`), target];
    const replacements: string[] = [];
    for (let index = 0; index < path.length - 1; index++) {
        const id = `line_reconnected_${index}`;
        graph.addDirectedEdgeWithKey(id, path[index], path[index + 1], structuredClone(edgeAttributes));
        replacements.push(id);
    }
    return replacements;
};

const setMetadata = (graph: ReturnType<typeof createTestLineGraph>) => {
    const line = graph.getAttribute('lineDefinitions')![0];
    Object.assign(line, {
        name: ['原线', 'Original line'],
        lineNumber: '1',
        openingDate: '2026-10-03',
        operator: 'Metro',
        status: 'construction',
        notes: 'Keep this information',
        videoLabel: { name: ['标签', 'Label'], lineNumber: 'L1', openingDate: '2026-10-03', color: '#123456' },
    });
    return structuredClone(line);
};

describe('line reconciliation after drawing edits', () => {
    it.each([
        { name: 'single interval', connections: [['A', 'B']], edgeId: 'line_0' },
        {
            name: 'middle interval',
            connections: [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
            ],
            edgeId: 'line_1',
        },
        {
            name: 'terminal interval',
            connections: [
                ['A', 'B'],
                ['B', 'C'],
            ],
            edgeId: 'line_0',
        },
        {
            name: 'loop',
            connections: [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'A'],
            ],
            edgeId: 'line_1',
        },
    ] as { name: string; connections: [string, string][]; edgeId: string }[])(
        'restores the original line and metadata after insertion into a $name',
        ({ connections, edgeId }) => {
            const graph = createTestLineGraph(connections);
            const original = setMetadata(graph);
            const authoredAttributes = structuredClone(graph.getAttributes());
            const history = Object.freeze([graph.export()]);
            const [source, target] = graph.extremities(edgeId);
            const replacements = insertStation(graph, edgeId);
            expect(graph.getAttributes()).toEqual(authoredAttributes);
            const calculated = reconcileLineDefinitions(graph.export(), history);
            const lines = calculated.attributes.lineDefinitions!;
            expect(lines).toEqual([
                {
                    ...original,
                    edgeIds: [...original.edgeIds.filter(id => id !== edgeId), ...replacements].sort(),
                },
            ]);
            expect(getLineTopology(calculated, lines[0]).stationIds).toContain('stn_X');
            expect(
                getLineRoutes(calculated, lines[0], source, target).some(route => route.stationIds.includes('stn_X'))
            ).toBe(true);
        }
    );

    it.each(['repeated insertion', 'manual deletion and reconnection'])(
        'restores A-B-X1-X2-X3-X4-C-D after %s before the next calculation',
        mode => {
            const graph = createTestLineGraph([
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
            ]);
            const original = setMetadata(graph);
            const authoredAttributes = structuredClone(graph.getAttributes());
            let replacements: string[];
            if (mode === 'repeated insertion') {
                replacements = [];
                let nextInterval = 'line_1';
                for (const name of ['X1', 'X2', 'X3', 'X4']) {
                    const ids = insertStation(graph, nextInterval, name);
                    replacements.push(ids[0]);
                    nextInterval = ids[1];
                }
                replacements.push(nextInterval);
            } else {
                replacements = reconnectThroughStations(graph, 'line_1', ['X1', 'X2', 'X3', 'X4']);
            }
            expect(graph.getAttributes()).toEqual(authoredAttributes);
            const source = graph.export();
            const sourceSnapshot = structuredClone(source);
            const calculated = reconcileLineDefinitions(source);
            const recalculated = reconcileLineDefinitions(calculated);
            const reloaded = JSON.parse(JSON.stringify(recalculated)) as typeof recalculated;
            expect(source).toEqual(sourceSnapshot);
            for (const result of [calculated, recalculated, reloaded, reconcileLineDefinitions(reloaded)]) {
                const lines = result.attributes.lineDefinitions!;
                expect(lines).toEqual([{ ...original, edgeIds: ['line_0', 'line_2', ...replacements].sort() }]);
                expect(getLineRoutes(result, lines[0], 'stn_A', 'stn_D')[0].stationIds).toEqual([
                    'stn_A',
                    'stn_B',
                    'stn_X1',
                    'stn_X2',
                    'stn_X3',
                    'stn_X4',
                    'stn_C',
                    'stn_D',
                ]);
            }
        }
    );

    it('keeps existing interval assignments separate when restoring inserted sections', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'E'],
        ]);
        const original = setMetadata(graph);
        const before = graph.export();
        const separated = splitLineDefinition(
            before,
            original.id,
            getLineRoutes(before, original, 'stn_A', 'stn_E')[0],
            1,
            3
        );
        graph.replaceAttributes(separated.attributes);
        const history = Object.freeze([graph.export()]);
        const replacements = insertStation(graph, 'line_1');
        const calculated = reconcileLineDefinitions(graph.export(), history);
        expect(calculated.attributes.lineDefinitions).toEqual(
            separated.attributes.lineDefinitions!.map(line =>
                line.id === original.id ? { ...line, edgeIds: ['line_2', ...replacements].sort() } : line
            )
        );
    });

    it.each([
        { name: 'single interval', connections: [['A', 'B']], edgeId: 'line_0' },
        {
            name: 'middle interval',
            connections: [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
            ],
            edgeId: 'line_1',
        },
    ] as { name: string; connections: [string, string][]; edgeId: string }[])(
        'keeps explicitly unassigned $name replacements unassigned',
        ({ connections, edgeId }) => {
            const graph = createTestLineGraph(connections);
            const original = graph.getAttribute('lineDefinitions')![0];
            graph.replaceAttributes(unassignLineDefinition(graph.export(), original.id).attributes);
            const authoredAttributes = structuredClone(graph.getAttributes());
            const history = Object.freeze([graph.export()]);
            const replacements = insertStation(graph, edgeId);
            expect(graph.getAttributes()).toEqual(authoredAttributes);
            const calculated = reconcileLineDefinitions(graph.export(), history);
            expect(calculated.attributes.lineDefinitions).toEqual([]);
            expect(calculated.attributes.unassignedLineEdgeIds).toEqual(
                [...original.edgeIds.filter(id => id !== edgeId), ...replacements].sort()
            );
        }
    );

    it('does not merge distinct defined lines when a new same-theme bridge connects them', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
        ]);
        setMetadata(graph);
        const original = structuredClone(graph.getAttribute('lineDefinitions')!);
        const authoredAttributes = structuredClone(graph.getAttributes());
        graph.addDirectedEdgeWithKey(
            'line_bridge',
            'stn_B',
            'stn_C',
            structuredClone(graph.getEdgeAttributes('line_0'))
        );
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export());
        expect(calculated.attributes.lineDefinitions).toHaveLength(3);
        expect(calculated.attributes.lineDefinitions!.slice(0, 2)).toEqual(original);
        expect(calculated.attributes.lineDefinitions![2].edgeIds).toEqual(['line_bridge']);
    });

    it('restores a whole adjacent same-theme line without absorbing its neighbour', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        const original = setMetadata(graph);
        const before = graph.export();
        const separated = splitLineDefinition(
            before,
            original.id,
            getLineRoutes(before, original, 'stn_A', 'stn_C')[0],
            0,
            1
        );
        graph.replaceAttributes(separated.attributes);
        const originalLines = structuredClone(graph.getAttribute('lineDefinitions')!);
        const authoredAttributes = structuredClone(graph.getAttributes());
        const history = Object.freeze([graph.export()]);
        const replacements = insertStation(graph, 'line_0');
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export(), history);
        expect(calculated.attributes.lineDefinitions).toEqual([
            { ...originalLines[0], edgeIds: replacements.sort() },
            originalLines[1],
        ]);
        expect(
            getLineRoutes(calculated, calculated.attributes.lineDefinitions![0], 'stn_A', 'stn_B')[0].stationIds
        ).toEqual(['stn_A', 'stn_X', 'stn_B']);
    });

    it('keeps a redrawn pending interval pending after its virtual connectors are removed', () => {
        const graph = createTestLineGraph(
            [
                ['A', 'B'],
                ['B', 'V'],
                ['V', 'W'],
                ['W', 'C'],
                ['C', 'D'],
            ],
            ['V', 'W']
        );
        const original = setMetadata(graph);
        const before = graph.export();
        const separated = splitLineDefinition(
            before,
            original.id,
            getLineRoutes(before, original, 'stn_A', 'stn_D')[0],
            1,
            2
        );
        graph.replaceAttributes(unassignLineDefinition(separated, original.id).attributes);
        const authoredAttributes = structuredClone(graph.getAttributes());
        const history = Object.freeze([graph.export()]);
        const edgeAttributes = structuredClone(graph.getEdgeAttributes('line_1'));
        for (const id of ['line_1', 'line_2', 'line_3']) graph.dropEdge(id);
        for (const id of ['misc_node_V', 'misc_node_W']) graph.dropNode(id);
        graph.addNode('stn_X', structuredClone(graph.getNodeAttributes('stn_B')));
        graph.addDirectedEdgeWithKey('line_pending_BX', 'stn_B', 'stn_X', structuredClone(edgeAttributes));
        graph.addDirectedEdgeWithKey('line_pending_XC', 'stn_X', 'stn_C', structuredClone(edgeAttributes));
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export(), history);
        expect(calculated.attributes.lineDefinitions).toEqual(authoredAttributes.lineDefinitions);
        expect(calculated.attributes.unassignedLineEdgeIds).toEqual(['line_pending_BX', 'line_pending_XC']);
        const pending = getUnassignedLineSections(calculated);
        expect(pending).toHaveLength(1);
        expect(getLineRoutes(calculated, pending[0], 'stn_B', 'stn_C')[0].stationIds).toEqual([
            'stn_B',
            'stn_X',
            'stn_C',
        ]);
    });

    it('restores a single-interval legacy line from saved drawing history', () => {
        const graph = createTestLineGraph([['A', 'B']]);
        const original = setMetadata(graph);
        const savedGraph = JSON.parse(JSON.stringify(graph.export())) as ReturnType<typeof graph.export>;
        const history = Object.freeze([savedGraph]);
        const authoredAttributes = structuredClone(graph.getAttributes());
        const replacements = insertStation(graph, 'line_0');
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export(), history);
        expect(calculated.attributes.lineDefinitions).toEqual([{ ...original, edgeIds: replacements.sort() }]);
        expect(
            getLineRoutes(calculated, calculated.attributes.lineDefinitions![0], 'stn_A', 'stn_B')[0].stationIds
        ).toEqual(['stn_A', 'stn_X', 'stn_B']);
    });

    it.each(['defined', 'pending'])(
        'uses the latest blue history instead of older red history when restoring a %s interval',
        state => {
            const graph = createTestLineGraph([['A', 'B']]);
            const original = setMetadata(graph);
            if (state === 'pending') {
                graph.replaceAttributes(unassignLineDefinition(graph.export(), original.id).attributes);
            }
            const redHistory = graph.export();
            const blueTheme: Theme = [
                CityCode.Other,
                'other',
                '#0000FF',
                graph.getEdgeAttributes('line_0')['single-color']!.color[3],
            ];
            graph.setEdgeAttribute('line_0', LineStyleType.SingleColor, { color: blueTheme });
            const blueHistory = graph.export();
            expect(blueHistory.attributes).toEqual(redHistory.attributes);
            const replacements = insertStation(graph, 'line_0');
            const current = graph.export();
            const calculated = reconcileLineDefinitions(current, [redHistory, blueHistory]);
            const recalculated = reconcileLineDefinitions(calculated);
            for (const result of [calculated, recalculated]) {
                if (state === 'pending') {
                    expect(result.attributes.lineDefinitions).toEqual([]);
                    expect(result.attributes.unassignedLineEdgeIds).toEqual(replacements.sort());
                    expect(getLineTopology(result, getUnassignedLineSections(result)[0]).theme).toEqual(blueTheme);
                } else {
                    expect(result.attributes.lineDefinitions).toEqual([{ ...original, edgeIds: replacements.sort() }]);
                    expect(getLineTopology(result, result.attributes.lineDefinitions![0]).theme).toEqual(blueTheme);
                }
            }
        }
    );

    it('restores a manual middle reconnection through surviving ownership without history', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
        ]);
        const original = setMetadata(graph);
        const authoredAttributes = structuredClone(graph.getAttributes());
        const replacements = reconnectThroughStations(graph, 'line_1', ['X1', 'X2', 'X3', 'X4']);
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export());
        expect(calculated.attributes.lineDefinitions).toEqual([
            { ...original, edgeIds: ['line_0', 'line_2', ...replacements].sort() },
        ]);
        expect(
            getLineRoutes(calculated, calculated.attributes.lineDefinitions![0], 'stn_A', 'stn_D')[0].stationIds
        ).toEqual(['stn_A', 'stn_B', 'stn_X1', 'stn_X2', 'stn_X3', 'stn_X4', 'stn_C', 'stn_D']);
    });

    it('creates a new line when two distinct old parallel identities nominate the same replacement', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['A', 'B'],
        ]);
        const first = setMetadata(graph);
        const second = { ...emptyLineDefinition(['line_1']), name: ['另一线路', 'Second line'] as [string, string] };
        graph.replaceAttributes({
            ...graph.getAttributes(),
            lineDefinitions: [{ ...first, edgeIds: ['line_0'] }, second],
        });
        graph.replaceAttributes(reconcileLineDefinitions(graph.export()).attributes);
        const authoredAttributes = structuredClone(graph.getAttributes());
        const history = Object.freeze([graph.export()]);
        const previousIds = authoredAttributes.lineDefinitions!.map(line => line.id);
        const replacements = insertStation(graph, 'line_0');
        graph.dropEdge('line_1');
        expect(graph.getAttributes()).toEqual(authoredAttributes);
        const calculated = reconcileLineDefinitions(graph.export(), history);
        const lines = calculated.attributes.lineDefinitions!;
        expect(lines).toHaveLength(1);
        expect(previousIds).not.toContain(lines[0].id);
        expect(lines[0].edgeIds).toEqual(replacements.sort());
        expect(lines[0].name).toEqual(['', '']);
        expect(getLineRoutes(calculated, lines[0], 'stn_A', 'stn_B')[0].stationIds).toEqual([
            'stn_A',
            'stn_X',
            'stn_B',
        ]);
        expect(reconcileLineDefinitions(calculated).attributes.lineDefinitions).toEqual(lines);
    });
});
