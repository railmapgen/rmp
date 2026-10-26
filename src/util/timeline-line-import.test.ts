import { describe, expect, it } from 'vitest';
import { createEmptyTimelineDocument, TimelineDocument } from '../constants/timeline';
import { createTestLineGraph } from '../test-utils';
import { emptyLineDefinition } from './line-definitions';
import { getTimelineImportLines, populateTimelineFromLineInformation } from './timeline-line-import';

const refs = (document: TimelineDocument) => document.track.map(entry => entry.refId);

describe('Timeline import from line information', () => {
    it('orders opening dates, follows saved origins and enters shared stations only once', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['B', 'E'],
            ['X', 'Y'],
        ]);
        const late = {
            ...emptyLineDefinition(['line_0', 'line_1', 'line_2']),
            openingDate: '2025-12-31',
            exportStartStationId: 'stn_D',
        };
        const early = {
            ...emptyLineDefinition(['line_3']),
            openingDate: '2020-01-01',
            exportStartStationId: 'stn_E',
        };
        const undated = { ...emptyLineDefinition(['line_4']), exportStartStationId: 'stn_X' };
        graph.setAttribute('lineDefinitions', [undated, late, early]);

        const document = populateTimelineFromLineInformation(graph.export());

        expect(refs(document)).toEqual([
            'stn_E',
            'line_3',
            'stn_B',
            'stn_D',
            'line_2',
            'stn_C',
            'line_1',
            'line_0',
            'stn_A',
            'stn_X',
            'line_4',
            'stn_Y',
        ]);
        expect(
            document.track.every(entry => (entry.kind === 'node' || entry.kind === 'edge') && entry.phase === 'enter')
        ).toBe(true);
        expect(new Set(document.track.map(entry => entry.id)).size).toBe(document.track.length);
        expect(graph.getAttribute('lineDefinitions')).toEqual([undated, late, early]);
    });

    it('preserves equal-date order and places missing or invalid dates last', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
            ['E', 'F'],
            ['G', 'H'],
        ]).export();
        const definitions = graph.attributes.lineDefinitions!;
        definitions[0].openingDate = '2025-02-29';
        definitions[1].openingDate = '2024-02-29';
        definitions[2].openingDate = '';
        definitions[3].openingDate = '2024-02-29';
        expect(getTimelineImportLines(graph).map(line => line.id)).toEqual([
            definitions[1].id,
            definitions[3].id,
            definitions[0].id,
            definitions[2].id,
        ]);
    });

    it('fills every branch, virtual junction and parallel bundle in route order without duplicates', () => {
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
        const document = populateTimelineFromLineInformation(graph);
        expect(refs(document)).toEqual([
            'stn_A',
            'line_0',
            'stn_B',
            'line_1',
            'line_5',
            'misc_node_V',
            'line_2',
            'stn_C',
            'line_3',
            'stn_D',
            'line_4',
            'stn_E',
        ]);
        expect(new Set(refs(document)).size).toBe(graph.nodes.length + graph.edges.length);
    });

    it('keeps shared branch trunks and their parallel bundles in the original route order', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['C', 'E'],
            ['B', 'F'],
            ['B', 'C'],
        ]).export();

        expect(refs(populateTimelineFromLineInformation(graph))).toEqual([
            'stn_A',
            'line_0',
            'stn_B',
            'line_1',
            'line_5',
            'stn_C',
            'line_2',
            'stn_D',
            'line_3',
            'stn_E',
            'line_4',
            'stn_F',
        ]);
    });

    it('reads a mutable source graph a fixed number of times when importing many small lines', () => {
        const importLines = (count: number) => {
            const graph = createTestLineGraph(
                Array.from({ length: count }, (_, index): [string, string] => [`A_${index}`, `B_${index}`])
            ).export();
            graph.attributes.lineDefinitions!.forEach((line, index) => {
                line.exportStartStationId = `stn_${index % 2 ? 'B' : 'A'}_${index}`;
            });
            const nodes = graph.nodes;
            const edges = graph.edges;
            const reads = { nodes: 0, edges: 0 };
            Object.defineProperty(graph, 'nodes', {
                get: () => {
                    reads.nodes++;
                    return nodes;
                },
            });
            Object.defineProperty(graph, 'edges', {
                get: () => {
                    reads.edges++;
                    return edges;
                },
            });

            expect(Object.isFrozen(graph)).toBe(false);
            expect(refs(populateTimelineFromLineInformation(graph))).toEqual(
                Array.from({ length: count }, (_, index) => [
                    `stn_${index % 2 ? 'B' : 'A'}_${index}`,
                    `line_${index}`,
                    `stn_${index % 2 ? 'A' : 'B'}_${index}`,
                ]).flat()
            );
            return reads;
        };

        const oneLineReads = importLines(1);
        expect(importLines(80)).toEqual(oneLineReads);
    });

    it('retains loop drawing order when saved membership order differs from graph edge order', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]).export();
        graph.attributes.lineDefinitions![0].edgeIds.reverse();
        graph.attributes.lineDefinitions![0].exportStartStationId = 'stn_A';

        expect(refs(populateTimelineFromLineInformation(graph))).toEqual([
            'stn_A',
            'line_0',
            'stn_B',
            'line_1',
            'stn_C',
            'line_2',
            'stn_D',
            'line_3',
        ]);
    });

    it('imports a long virtual-only line without exhausting the JavaScript call stack', () => {
        const graph = createTestLineGraph([['V', 'W']], ['V', 'W']).export();
        const nodeAttributes = graph.nodes[0].attributes;
        const edgeAttributes = graph.edges[0].attributes;
        const length = 12_000;
        graph.nodes = Array.from({ length }, (_, index) => ({
            key: `misc_node_${index}`,
            attributes: nodeAttributes,
        }));
        graph.edges = Array.from({ length: length - 1 }, (_, index) => ({
            key: `line_${index}`,
            source: `misc_node_${index}`,
            target: `misc_node_${index + 1}`,
            attributes: edgeAttributes,
        }));
        graph.attributes.lineDefinitions![0].edgeIds = graph.edges.map(edge => edge.key!);
        graph.attributes.lineDefinitions![0].exportStartStationId = '';

        const document = populateTimelineFromLineInformation(graph);

        expect(document.track).toHaveLength(length * 2 - 1);
        expect(refs(document).slice(0, 5)).toEqual(['misc_node_0', 'line_0', 'misc_node_1', 'line_1', 'misc_node_2']);
        expect(refs(document).at(-1)).toBe(`misc_node_${length - 1}`);
    });

    it('draws a loop from its saved origin and covers cyclic branches and virtual-only lines', () => {
        const loop = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]).export();
        loop.attributes.lineDefinitions![0].exportStartStationId = 'stn_C';
        const loopDocument = populateTimelineFromLineInformation(loop);
        expect(refs(loopDocument)[0]).toBe('stn_C');
        expect(new Set(refs(loopDocument)).size).toBe(loop.nodes.length + loop.edges.length);

        const branched = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'B'],
            ['C', 'E'],
        ]).export();
        const branchedDocument = populateTimelineFromLineInformation(branched);
        expect(new Set(refs(branchedDocument)).size).toBe(branched.nodes.length + branched.edges.length);

        const virtual = createTestLineGraph([['V', 'W']], ['V', 'W']).export();
        const virtualDocument = populateTimelineFromLineInformation(virtual);
        expect(new Set(refs(virtualDocument)).size).toBe(virtual.nodes.length + virtual.edges.length);
    });

    it('retains audio and settings, covers unassigned elements and tolerates absent or stale line information', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
        ]).export();
        graph.attributes.lineDefinitions = [emptyLineDefinition(['line_0', 'line_missing'])];
        const original: TimelineDocument = {
            ...createEmptyTimelineDocument(),
            track: [{ id: 'pause', kind: 'pause', position: 'before', duration: 2 }],
            audioTrack: [{ id: 'audio', kind: 'audio', blobId: 'music', name: 'Music', startSlot: 0, endSlot: 1 }],
        };
        const document = populateTimelineFromLineInformation(graph, original);
        expect(new Set(refs(document)).size).toBe(graph.nodes.length + graph.edges.length);
        expect(document.audioTrack).toBe(original.audioTrack);
        expect(original.track).toHaveLength(1);
        expect(refs(document)).not.toContain('line_missing');
        delete graph.attributes.lineDefinitions;
        expect(populateTimelineFromLineInformation(graph).track).toHaveLength(graph.nodes.length + graph.edges.length);
    });
});
