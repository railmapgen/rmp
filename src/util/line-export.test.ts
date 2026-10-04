import { describe, expect, it, vi } from 'vitest';
import { createTestLineGraph } from '../test-utils';
import { downloadAs } from './download';
import { getLineExport } from './line-export';
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
