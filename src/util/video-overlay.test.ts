import { describe, expect, it } from 'vitest';
import { createTestLineGraph } from '../test-utils';
import { createVideoLineOverlay, getVideoLineAnnotation, getVideoLineLabel } from './video-overlay';

const annotation = {
    year: '1999',
    monthDay: '10-01',
    name: ['地铁一号线', 'Metro Line 1'] as [string, string],
    color: '#e82f37',
};
const viewBox = { x: -200, y: -100, width: 640, height: 360 };

describe('video year and line annotation', () => {
    it('keeps year and month-day positions unchanged when labels enlarge the panel', () => {
        const settings = { showYear: true, showLineName: true };
        const original = createVideoLineOverlay(annotation, settings, viewBox)!;
        const expanded = createVideoLineOverlay(annotation, settings, viewBox, [
            { id: 'label', text: 'A much wider caption in the enlarged panel\nSecond row' },
        ])!;
        expect(Number(expanded.querySelector('rect')!.getAttribute('width'))).toBeGreaterThan(
            Number(original.querySelector('rect')!.getAttribute('width'))
        );
        for (const index of [0, 1]) {
            const before = original.querySelectorAll('text')[index];
            const after = expanded.querySelectorAll('text')[index];
            expect(after.getAttribute('x')).toBe(before.getAttribute('x'));
            expect(after.getAttribute('y')).toBe(before.getAttribute('y'));
            expect(after.getAttribute('text-anchor')).toBe(before.getAttribute('text-anchor'));
        }
    });
    it.each([true, false])('shows standalone labels with both metadata switches disabled (annotation=%s)', present => {
        const overlay = createVideoLineOverlay(
            present ? annotation : undefined,
            { showYear: false, showLineName: false },
            viewBox,
            [{ id: 'caption', text: '通车纪念\nA < B & C' }]
        )!;
        expect([...overlay.querySelectorAll('[data-video-label]')].map(text => text.textContent)).toEqual([
            '通车纪念',
            'A < B & C',
        ]);
        expect(overlay.querySelectorAll('text')).toHaveLength(2);
        expect(overlay.querySelector('script')).toBeNull();
        expect(overlay.querySelector('line')).toBeNull();
    });

    it('places multiple labels below bilingual line metadata and wraps long text within the panel', () => {
        const overlay = createVideoLineOverlay(annotation, { showYear: true, showLineName: true }, viewBox, [
            { id: 'first', text: '第一段文字' },
            { id: 'second', text: 'Long label '.repeat(120) },
        ])!;
        const labels = overlay.querySelectorAll('[data-video-label]');
        const names = [...overlay.querySelectorAll('text')].filter(text => !text.hasAttribute('data-video-label'));
        expect(Number(labels[0].getAttribute('y'))).toBeGreaterThan(Number(names.at(-1)!.getAttribute('y')));
        expect(labels[0].textContent).toBe('第一段文字');
        expect(labels.length).toBeGreaterThan(2);
        expect(labels[labels.length - 1].textContent).toMatch(/…$/);
        const rect = overlay.querySelector('rect')!;
        expect(Number(rect.getAttribute('width'))).toBeLessThanOrEqual(690);
        expect(Number(rect.getAttribute('height'))).toBeLessThanOrEqual(666);
        expect(Number(labels[labels.length - 1].getAttribute('y'))).toBeLessThan(
            27 + Number(rect.getAttribute('height'))
        );
    });
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

    it.each([
        [true, true, '199910-01地铁一号线Metro Line 1'],
        [true, false, '199910-01'],
        [false, true, '地铁一号线Metro Line 1'],
        [false, false, undefined],
    ])('respects year=%s and line=%s independently', (showYear, showLineName, text) => {
        const overlay = createVideoLineOverlay(annotation, { showYear, showLineName }, viewBox);
        expect(overlay?.textContent).toBe(text);
    });

    it('anchors the card to screen coordinates through changes in camera scale', () => {
        const settings = { showYear: true, showLineName: true };
        const overlay = createVideoLineOverlay(annotation, settings, viewBox)!;
        const wide = createVideoLineOverlay(annotation, settings, { x: 100, y: 30, width: 1280, height: 720 })!;
        expect(overlay.getAttribute('transform')).toBe('translate(-200, -100) scale(0.5)');
        expect(wide.getAttribute('transform')).toBe('translate(100, 30) scale(1)');
        expect(overlay.querySelector('rect[width="7"]')?.getAttribute('fill')).toBe(annotation.color);
    });

    it('uses an English-only name without adding an empty second label', () => {
        const overlay = createVideoLineOverlay(
            { ...annotation, name: ['', 'Metro'] },
            { showYear: false, showLineName: true },
            viewBox
        )!;
        expect(overlay.querySelectorAll('text')).toHaveLength(1);
        expect(overlay.textContent).toBe('Metro');
    });

    it('omits empty metadata and safely renders punctuation in line names', () => {
        expect(createVideoLineOverlay(undefined, { showYear: true, showLineName: true }, viewBox)).toBeUndefined();
        expect(
            createVideoLineOverlay({ ...annotation, year: '' }, { showYear: true, showLineName: false }, viewBox)
        ).toBeUndefined();
        const overlay = createVideoLineOverlay(
            { ...annotation, name: ['<线路 & 名称>', 'A > B'] },
            { showYear: false, showLineName: true },
            viewBox
        )!;
        expect(overlay.textContent).toBe('<线路 & 名称>A > B');
        expect(overlay.querySelectorAll('text')).toHaveLength(2);
    });
});
