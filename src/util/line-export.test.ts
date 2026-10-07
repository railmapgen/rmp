import { describe, expect, it, vi } from 'vitest';
import { createTestLineGraph } from '../test-utils';
import { downloadAs } from './download';
import { getLineExport, getLineExports, getLineExportsAsync, yieldLineCalculation } from './line-export';
import { exportToRmg } from './to-rmg';

vi.mock('./download', async importOriginal => ({
    ...(await importOriginal<typeof import('./download')>()),
    downloadAs: vi.fn(),
}));

describe('line configuration downloads', () => {
    it('writes one compatible RMG JSON file with the saved information and station direction', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        line.name = ['测试线路', 'Test Line'];
        line.lineNumber = '7';
        line.exportStartStationId = 'stn_C';
        line.openingDate = '2026-10-03';
        line.notes = 'RMP-only notes';
        const entry = getLineExport(graph, line);
        expect(entry.param).toBeDefined();
        exportToRmg(structuredClone(entry.param!), line.name, line.lineNumber, new Map());
        expect(downloadAs).toHaveBeenCalledOnce();
        const [filename, mime, data] = vi.mocked(downloadAs).mock.calls[0];
        expect(filename).toBe('RMG_测试线路_Test Line.json');
        expect(mime).toBe('application/json');
        expect(JSON.parse(data)).toMatchObject({ line_name: line.name, line_num: '7', current_stn_idx: 'stn_C' });
        expect(JSON.parse(data)).not.toHaveProperty('openingDate');
        expect(JSON.parse(data)).not.toHaveProperty('notes');
    });

    it('exports every station and both terminals of a supported branch', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['C', 'E'],
        ]).export();
        const entry = getLineExport(graph, graph.attributes.lineDefinitions![0]);
        expect(entry.param!.stn_list.lineend.parents.sort()).toEqual(['stn_D', 'stn_E']);
        expect(
            Object.keys(entry.param!.stn_list)
                .filter(id => id.startsWith('stn_'))
                .sort()
        ).toEqual(['stn_A', 'stn_B', 'stn_C', 'stn_D', 'stn_E']);
    });

    it('exports a loop using its saved reference station', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        line.exportStartStationId = 'stn_C';
        const entry = getLineExport(graph, line);
        expect(entry.param!.loop).toBe(true);
        expect(entry.param!.current_stn_idx).toBe('stn_C');
        expect(
            Object.keys(entry.param!.stn_list)
                .filter(id => id.startsWith('stn_'))
                .sort()
        ).toEqual(['stn_A', 'stn_B', 'stn_C', 'stn_D']);
    });
});

describe('historical RMG branch shapes', () => {
    const shapes: [string, [string, string][], string[]][] = [
        [
            'fork',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['B', 'D'],
            ],
            [],
        ],
        [
            'rejoining branch',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
                ['B', 'E'],
                ['E', 'D'],
                ['D', 'F'],
            ],
            [],
        ],
        [
            'rejoining branch with no station on its main path',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['B', 'D'],
                ['D', 'C'],
                ['C', 'E'],
            ],
            [],
        ],
        [
            'lamp',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
                ['D', 'B'],
            ],
            [],
        ],
        [
            'virtual fork',
            [
                ['A', 'J'],
                ['J', 'B'],
                ['J', 'C'],
            ],
            ['J'],
        ],
        [
            'virtual terminal',
            [
                ['V', 'A'],
                ['A', 'B'],
                ['B', 'C'],
                ['B', 'D'],
            ],
            ['V'],
        ],
        [
            'line with empty virtual side branches',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['C', 'D'],
                ['D', 'E'],
                ['B', 'V1'],
                ['C', 'V2'],
                ['D', 'V3'],
            ],
            ['V1', 'V2', 'V3'],
        ],
        [
            'branch with parallel edges',
            [
                ['A', 'B'],
                ['B', 'C'],
                ['B', 'C'],
                ['B', 'D'],
            ],
            [],
        ],
    ];

    it.each(shapes)('preserves every station and branch link of a %s', (_name, connections, virtual) => {
        const graph = createTestLineGraph(connections, virtual).export();
        const line = graph.attributes.lineDefinitions![0];
        const entry = getLineExport(graph, line);
        expect(entry.error).toBeUndefined();
        expect(entry.param).toBeDefined();
        const expectedStations = graph.nodes
            .filter(node => node.key.startsWith('stn_'))
            .map(node => node.key)
            .sort();
        expect(
            Object.keys(entry.param!.stn_list)
                .filter(id => id.startsWith('stn_'))
                .sort()
        ).toEqual(expectedStations);
        expect(entry.param!.current_stn_idx).toBe(line.exportStartStationId);
        if (_name !== 'line with empty virtual side branches')
            expect(
                Object.values(entry.param!.stn_list).some(station => station.branch?.left || station.branch?.right)
            ).toBe(true);
        for (const [id, station] of Object.entries(entry.param!.stn_list)) {
            for (const child of station.children) expect(entry.param!.stn_list[child].parents).toContain(id);
            for (const parent of station.parents) expect(entry.param!.stn_list[parent].children).toContain(id);
        }
        for (const origin of entry.startCandidates) {
            const reverse = getLineExport(graph, { ...line, exportStartStationId: origin });
            expect(reverse.param!.current_stn_idx).toBe(origin);
        }
    });
});

describe('stable RMG branch orientation', () => {
    it('keeps drawing edge order when membership identifiers are reordered', () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['B', 'D'],
        ]).export();
        const line = graph.attributes.lineDefinitions![0];
        const original = getLineExport(graph, line);
        expect(getLineExport(graph, { ...line, edgeIds: [...line.edgeIds].reverse() })).toEqual({
            ...original,
            line: { ...line, edgeIds: [...line.edgeIds].reverse() },
        });
    });
});

describe('asynchronous line calculation', () => {
    it('returns the same line exports after letting the browser paint', async () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
        ]).export();
        expect(await getLineExportsAsync(graph)).toEqual(getLineExports(graph));
    });

    it('cancels a closed panel before reading and computing the graph', async () => {
        const graph = createTestLineGraph([['A', 'B']]).export();
        const edges = graph.edges;
        const readGraph = vi.fn(() => edges);
        Object.defineProperty(graph, 'edges', { get: readGraph });
        const controller = new AbortController();
        const result = getLineExportsAsync(graph, controller.signal);
        controller.abort();
        await expect(result).rejects.toMatchObject({ name: 'AbortError' });
        expect(readGraph).not.toHaveBeenCalled();
    });

    it('preserves a caller-provided cancellation reason', async () => {
        const controller = new AbortController();
        const result = yieldLineCalculation(controller.signal);
        const reason = new Error('Newer graph requested');
        controller.abort(reason);
        await expect(result).rejects.toBe(reason);
    });
});
