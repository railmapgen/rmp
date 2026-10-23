import { describe, expect, it } from 'vitest';
import { createTestLineGraph } from '../../test-utils';
import { getVideoLineAnnotation, getVideoLineLabel } from './video-overlay';

describe('video line annotation metadata', () => {
    it('uses Timeline label overrides while retaining the imported metadata and map color', () => {
        const graph = createTestLineGraph([['A', 'B']]);
        const line = graph.getAttribute('lineDefinitions')![0];
        line.name = ['导入线路', 'Imported Line'];
        line.openingDate = '1990-01-01';
        line.lineNumber = '1';
        const originalEdges = structuredClone(graph.export().edges);
        const original = getVideoLineAnnotation(graph, 'line_0')!;
        line.videoLabel = {
            name: ['视频线路', 'Video Line'],
            openingDate: '2024-02-29',
            lineNumber: 'V1',
            color: '#0088cc',
        };

        expect(getVideoLineAnnotation(graph, 'line_0')).toEqual({
            name: ['视频线路', 'Video Line'],
            year: '2024',
            monthDay: '02-29',
            color: '#0088cc',
        });
        expect(line.name).toEqual(['导入线路', 'Imported Line']);
        expect(line.openingDate).toBe('1990-01-01');
        expect(graph.export().edges).toEqual(originalEdges);
        delete line.videoLabel;
        expect(getVideoLineAnnotation(graph, 'line_0')).toEqual(original);
    });

    it('allows blank label metadata and gives callers a detached editable name tuple', () => {
        const graph = createTestLineGraph([['A', 'B']]);
        const line = graph.getAttribute('lineDefinitions')![0];
        line.name = ['导入线路', 'Imported Line'];
        const draft = getVideoLineLabel(graph, line);
        draft.name[0] = 'Draft';
        expect(line.name[0]).toBe('导入线路');
        line.videoLabel = { name: ['', ''], lineNumber: '', openingDate: '', color: '#123456' };
        expect(getVideoLineAnnotation(graph, 'line_0')).toEqual({
            name: ['', ''],
            year: '',
            monthDay: '',
            color: '#123456',
        });
    });
});
