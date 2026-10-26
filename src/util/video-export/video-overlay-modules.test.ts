import { describe, expect, it } from 'vitest';
import { createTimelineOverlayModule } from '../../constants/timeline-overlays';
import {
    createVideoOverlayModules,
    getEmptyTimelineOverlayLayout,
    layoutTimelineOverlayModules,
    VideoOverlayContext,
} from './video-overlay-modules';

const context: VideoOverlayContext = {
    annotation: { year: '2024', monthDay: '05-01', name: ['一号线', 'Line 1'], color: '#ff0000' },
    currentLine: { id: 'one', name: ['一号线', 'Line 1'], lineNumber: '1', color: '#ff0000' },
    appearedLines: [
        { id: 'one', name: ['一号线', 'Line 1'], lineNumber: '1', color: '#ff0000' },
        { id: 'two', name: ['二号线', 'Line 2'], lineNumber: '2', color: '#0000ff' },
        { id: 'three', name: ['三号线', 'Line 3'], lineNumber: '3', color: '#00ff00' },
    ],
    networkLengthKm: 16.09344,
    currentLineLengthKm: 8.04672,
    mapEnabled: true,
    labels: [{ id: 'caption', text: 'First\nSecond < & >' }],
    minimap: {
        bounds: { x: -100, y: -50, width: 1000, height: 562.5 },
        viewport: { x: 10, y: 20, width: 200, height: 112.5 },
        worldGroupId: 'map_content',
        basemapHref: 'data:image/png;base64,AA==',
    },
};
const viewport = { x: 100, y: 200, width: 640 };

describe('registered timeline overlay rendering', () => {
    it('displays year and month/day on one or two lines without changing year-only content', () => {
        const date = createTimelineOverlayModule('date', 'top-left', 'date');
        const twoLines = createVideoOverlayModules([date], context, viewport);
        const year = twoLines.overlay.querySelector('[data-video-date-year]')!;
        const monthDay = twoLines.overlay.querySelector('[data-video-date-month-day]')!;
        expect(Number(monthDay.getAttribute('y'))).toBeGreaterThan(Number(year.getAttribute('y')));
        date.settings.layout = 'single';
        const singleLine = createVideoOverlayModules([date], context, viewport);
        const inlineYear = singleLine.overlay.querySelector('[data-video-date-year]')!;
        const inlineMonthDay = singleLine.overlay.querySelector('[data-video-date-month-day]')!;
        expect(inlineMonthDay.getAttribute('y')).toBe(inlineYear.getAttribute('y'));
        expect(Number(inlineMonthDay.getAttribute('x'))).toBeGreaterThan(Number(inlineYear.getAttribute('x')));
        expect(singleLine.layout[0].height).toBeLessThan(twoLines.layout[0].height);
        expect(singleLine.layout[0].width).toBeGreaterThan(twoLines.layout[0].width);
        expect([inlineYear.textContent, inlineMonthDay.textContent]).toEqual(['2024', '05-01']);
        date.settings.showMonthDay = false;
        const yearOnly = createVideoOverlayModules([date], context, viewport);
        expect(yearOnly.overlay.textContent).toBe('2024');
        expect(yearOnly.overlay.querySelector('[data-video-date-month-day]')).toBeNull();
    });

    it('independently formats dates, network length, current line length and units', () => {
        const date = createTimelineOverlayModule('date', 'top-left', 'date');
        date.settings.showMonthDay = false;
        const network = createTimelineOverlayModule('line-length', 'top-left', 'network');
        network.settings.unit = 'mi';
        const current = createTimelineOverlayModule('line-length', 'bottom-right', 'current');
        current.settings.scope = 'currentLine';
        const { overlay } = createVideoOverlayModules([date, network, current], context, viewport);
        expect(overlay.querySelector('[data-overlay-module-id="date"]')?.textContent).toBe('2024');
        expect(overlay.querySelector('[data-overlay-module-id="network"]')?.textContent).toBe('10.0mi');
        expect(overlay.querySelector('[data-overlay-module-id="current"]')?.textContent).toBe('8.0km');
        expect(overlay.getAttribute('transform')).toBe('translate(100, 200) scale(0.5)');
        expect(createVideoOverlayModules([network], { ...context, mapEnabled: false }, viewport).layout).toEqual([]);
    });

    it('renders appeared logical lines in two columns beneath the current identity', () => {
        const module = createTimelineOverlayModule('line-identity', 'top-left', 'identity');
        module.settings.showAppearedLines = true;
        const { overlay } = createVideoOverlayModules([module], context, viewport);
        const items = [...overlay.querySelectorAll('[data-video-appeared-line]')];
        expect(items.map(item => item.textContent)).toEqual(['一号线', '二号线', '三号线']);
        expect(items[0].getAttribute('y')).toBe(items[1].getAttribute('y'));
        expect(Number(items[1].getAttribute('x'))).toBeGreaterThan(Number(items[0].getAttribute('x')));
        expect(Number(items[2].getAttribute('y'))).toBeGreaterThan(Number(items[0].getAttribute('y')));
        const currentSegment = overlay.querySelector('[data-video-current-line-segment]')!;
        expect(currentSegment.getAttribute('width')).toBe('7');
        expect(currentSegment.getAttribute('fill')).toBe('#ff0000');
        expect(Number(currentSegment.getAttribute('height'))).toBeGreaterThan(7);
        const historySegments = [...overlay.querySelectorAll('[data-video-appeared-line-segment]')];
        expect(historySegments).toHaveLength(3);
        expect(historySegments.map(segment => segment.getAttribute('fill'))).toEqual(['#ff0000', '#0000ff', '#00ff00']);
        expect(
            historySegments.every(
                segment => segment.getAttribute('width') === '24' && segment.getAttribute('height') === '4'
            )
        ).toBe(true);
        expect(overlay.querySelector('[data-video-current-line-number]')).toBeNull();
        expect([...overlay.querySelectorAll('text')].map(item => item.textContent)).toEqual([
            '一号线',
            'Line 1',
            '一号线',
            '二号线',
            '三号线',
        ]);
        expect(overlay.querySelector('rect[width="31"], rect[width="32"]')).toBeNull();
        // Short names keep both columns close even when the current heading is wider.
        expect(Number(historySegments[1].getAttribute('x')) - Number(historySegments[0].getAttribute('x'))).toBe(80);
        expect(Number(items[2].getAttribute('y')) - Number(items[0].getAttribute('y'))).toBe(18);
        expect(overlay.querySelector('[data-overlay-module-id="identity"]')?.getAttribute('data-overlay-width')).toBe(
            '220'
        );
    });

    it('anchors ordered corner stacks and reserves missing content only during editing', () => {
        const date = createTimelineOverlayModule('date', 'bottom-right', 'date');
        const text = createTimelineOverlayModule('timed-text', 'bottom-right', 'text');
        const emptyContext = { ...context, annotation: undefined, labels: [] };
        expect(layoutTimelineOverlayModules([date, text], emptyContext)).toEqual([]);
        const layout = layoutTimelineOverlayModules([date, text], emptyContext, { editPlaceholders: true });
        expect(layout.map(item => item.id)).toEqual(['date', 'text']);
        expect(layout.every(item => item.empty && item.x + item.width === 1250)).toBe(true);
        expect(layout[1].y).toBe(layout[0].y + layout[0].height + 10);
        expect(layout[1].y + layout[1].height).toBe(693);
        expect(getEmptyTimelineOverlayLayout([date, text])).toEqual(layout);
    });

    it('scales opposite corner stacks together so repeated modules never overlap on one side', () => {
        const modules = Array.from({ length: 20 }, (_, index) =>
            createTimelineOverlayModule('date', index < 10 ? 'top-left' : 'bottom-left', String(index))
        );
        const layout = layoutTimelineOverlayModules(modules, context);
        const top = layout.filter(item => item.region === 'top-left');
        const bottom = layout.filter(item => item.region === 'bottom-left');
        expect(top.at(-1)!.y + top.at(-1)!.height).toBeLessThan(bottom[0].y);
        expect(top[0].height).toBe(bottom[0].height);
        expect(top[0].y).toBe(27);
        expect(bottom.at(-1)!.y + bottom.at(-1)!.height).toBeCloseTo(693);
    });

    it('uses fixed minimap bounds, shared dynamic map content and a separate full-coverage basemap', () => {
        const module = createTimelineOverlayModule('minimap', 'top-right', 'map');
        const { overlay } = createVideoOverlayModules([module], context, viewport);
        const map = overlay.querySelector('[data-video-minimap]')!;
        expect(map.getAttribute('viewBox')).toBe('-100 -50 1000 562.5');
        expect(map.querySelector('use')?.getAttribute('href')).toBe('#map_content');
        expect(map.querySelector('image')?.getAttribute('href')).toBe(context.minimap.basemapHref);
        expect(map.querySelector('[data-video-minimap-viewport]')?.getAttribute('x')).toBe('10');
        const next = createVideoOverlayModules(
            [module],
            {
                ...context,
                minimap: { ...context.minimap, viewport: { x: 50, y: 80, width: 400, height: 225 } },
            },
            viewport
        ).overlay;
        expect(next.querySelector('[data-video-minimap]')?.getAttribute('viewBox')).toBe(map.getAttribute('viewBox'));
        expect(next.querySelector('[data-video-minimap-viewport]')?.getAttribute('width')).toBe('400');
        expect(
            createVideoOverlayModules([module], { ...context, mapEnabled: false }, viewport).overlay.querySelector(
                'image'
            )
        ).toBeNull();
    });

    it('paints an opaque white miniature interior and card even when the geographic map is disabled', () => {
        const module = createTimelineOverlayModule('minimap', 'bottom-right', 'map');
        const { overlay } = createVideoOverlayModules([module], { ...context, mapEnabled: false }, viewport);
        const map = overlay.querySelector('[data-video-minimap]')!;
        const background = map.querySelector('[data-video-minimap-background]')!;
        const card = overlay.querySelector('[data-video-minimap-card]')!;
        for (const element of [background, card]) {
            expect(element.getAttribute('fill')).toBe('#fff');
            expect(element.getAttribute('fill-opacity')).toBe('1');
        }
        expect(map.firstElementChild).toBe(background);
        expect(['x', 'y', 'width', 'height'].map(name => Number(background.getAttribute(name)))).toEqual([
            -100, -50, 1000, 562.5,
        ]);
        expect(map.querySelector('image')).toBeNull();
        expect(map.querySelector('use')?.getAttribute('href')).toBe('#map_content');
        expect(map.querySelector('[data-video-minimap-viewport]')).not.toBeNull();
    });

    it.each([false, true])(
        'preserves transparent miniature backgrounds and its route/camera layers (map=%s)',
        mapEnabled => {
            const module = createTimelineOverlayModule('minimap', 'bottom-right', 'map');
            const date = createTimelineOverlayModule('date', 'top-left', 'date');
            const { overlay } = createVideoOverlayModules(
                [module, date],
                {
                    ...context,
                    mapEnabled,
                    minimap: { ...context.minimap, background: 'none' },
                },
                viewport
            );
            const map = overlay.querySelector('[data-video-minimap]')!;
            const background = map.querySelector('[data-video-minimap-background]')!;
            const card = overlay.querySelector('[data-video-minimap-card]')!;
            for (const element of [background, card]) {
                expect(element.getAttribute('fill')).toBe('none');
                expect(element.getAttribute('fill-opacity')).toBe('1');
            }
            expect(map.firstElementChild).toBe(background);
            expect(map.querySelector('use')?.getAttribute('href')).toBe('#map_content');
            expect(map.querySelector('[data-video-minimap-viewport]')).not.toBeNull();
            expect(map.querySelector('image') !== null).toBe(mapEnabled);
            const dateCard = overlay.querySelector('[data-overlay-module-id="date"] > rect')!;
            expect(dateCard.getAttribute('fill')).toBe('#fff');
            expect(dateCard.getAttribute('fill-opacity')).toBe('0.93');
        }
    );

    it('clips the minimap camera indicator to the fixed map extent, keeping enclosing cameras visible', () => {
        const module = createTimelineOverlayModule('minimap', 'bottom-right', 'map');
        const indicatorFor = (viewport: VideoOverlayContext['minimap']['viewport']) =>
            createVideoOverlayModules(
                [module],
                {
                    ...context,
                    minimap: { ...context.minimap, viewport },
                },
                { x: 0, y: 0, width: 1280 }
            ).overlay.querySelector('[data-video-minimap-viewport]');
        const enclosing = indicatorFor({ x: -200, y: -200, width: 2000, height: 1200 })!;
        expect(['x', 'y', 'width', 'height'].map(name => Number(enclosing.getAttribute(name)))).toEqual([
            -100, -50, 1000, 562.5,
        ]);
        const partial = indicatorFor({ x: -200, y: 0, width: 200, height: 100 })!;
        expect(['x', 'y', 'width', 'height'].map(name => Number(partial.getAttribute(name)))).toEqual([
            -100, 0, 100, 100,
        ]);
        expect(indicatorFor({ x: 2000, y: 0, width: 100, height: 100 })).toBeNull();
    });

    it('keeps timed text together, applies its own typography and escapes user content', () => {
        const module = createTimelineOverlayModule('timed-text', 'bottom-left', 'text');
        module.settings = { fontSize: 24, alignment: 'right' };
        const { overlay } = createVideoOverlayModules([module], context, viewport);
        const texts = [...overlay.querySelectorAll('[data-video-label]')];
        expect(texts.map(item => item.textContent)).toEqual(['First', 'Second < & >']);
        expect(
            texts.every(item => item.getAttribute('font-size') === '24' && item.getAttribute('text-anchor') === 'end')
        ).toBe(true);
        expect(overlay.querySelector('script')).toBeNull();
    });
});
