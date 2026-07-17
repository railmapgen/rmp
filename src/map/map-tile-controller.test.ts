import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMapInitialViewport, MAP_ZOOMED_SWITCH_THRESHOLD } from './map-config';
import { MapTileController } from './map-tile-controller';

const availability = (zoom: number, x: number, y: number) => {
    const buffer = new ArrayBuffer(29);
    const bytes = new Uint8Array(buffer);
    bytes.set([...'RMPT'].map(char => char.charCodeAt(0)));
    bytes[4] = 1;
    bytes[5] = zoom;
    const view = new DataView(buffer);
    view.setUint32(8, x, true);
    view.setUint32(12, y, true);
    view.setUint32(16, 1, true);
    view.setUint32(20, 1, true);
    view.setUint32(24, 1, true);
    bytes[28] = 1;
    return buffer;
};

const bundle = (zoom: number, x: number, y: number) => {
    const payload = new TextEncoder().encode(
        `<svg xmlns="http://www.w3.org/2000/svg" data-z="${zoom}" data-x="${x}" data-y="${y}" viewBox="0 0 256 256"><rect width="256" height="256"/></svg>`
    );
    const buffer = new ArrayBuffer(32 + payload.length);
    const bytes = new Uint8Array(buffer);
    bytes.set([...'RMPB'].map(char => char.charCodeAt(0)));
    bytes[4] = 1;
    bytes[5] = zoom;
    bytes[6] = 1;
    bytes[7] = 1;
    const view = new DataView(buffer);
    view.setUint32(8, x, true);
    view.setUint32(12, y, true);
    view.setUint32(16, 32, true);
    view.setUint32(28, payload.length, true);
    bytes.set(payload, 32);
    return buffer;
};

describe('MapTileController', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('imperatively replaces overview with zoomed tiles and reports switching', async () => {
        let frameId = 0;
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            queueMicrotask(() => callback(0));
            return ++frameId;
        });
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        const overview = { zoom: 7, x: 107, y: 52 };
        const zoomed = { zoom: 13, x: 6860, y: 3347 };
        const manifest = {
            formatVersion: 2,
            attribution: 'OpenStreetMap contributors / ODbL',
            levels: [
                {
                    name: 'overview',
                    zoom: overview.zoom,
                    bundleFormat: 'RMPB1',
                    bundleIndex: 'bundle-index/z7.json',
                    bundleTemplate: 'bundles/overview/7/{side}/{x}/{y}.rmpb',
                    availability: 'availability/z7.bin',
                    tileBounds: { minX: overview.x, minY: overview.y, maxX: overview.x, maxY: overview.y },
                },
                {
                    name: 'zoomed',
                    zoom: zoomed.zoom,
                    bundleFormat: 'RMPB1',
                    bundleIndex: 'bundle-index/z13.json',
                    bundleTemplate: 'bundles/zoomed/13/{side}/{x}/{y}.rmpb',
                    availability: 'availability/z13.bin',
                    tileBounds: { minX: zoomed.x, minY: zoomed.y, maxX: zoomed.x, maxY: zoomed.y },
                },
            ],
        };
        const responses = new Map<string, BodyInit>([
            ['https://tiles.example/manifest.json', JSON.stringify(manifest)],
            ['https://tiles.example/availability/z7.bin', availability(overview.zoom, overview.x, overview.y)],
            ['https://tiles.example/availability/z13.bin', availability(zoomed.zoom, zoomed.x, zoomed.y)],
            [
                'https://tiles.example/bundle-index/z7.json',
                JSON.stringify({
                    formatVersion: 1,
                    level: 'overview',
                    zoom: overview.zoom,
                    bundles: [{ side: 1, x: overview.x, y: overview.y }],
                }),
            ],
            [
                'https://tiles.example/bundle-index/z13.json',
                JSON.stringify({
                    formatVersion: 1,
                    level: 'zoomed',
                    zoom: zoomed.zoom,
                    bundles: [{ side: 1, x: zoomed.x, y: zoomed.y }],
                }),
            ],
            [
                `https://tiles.example/bundles/overview/7/1/${overview.x}/${overview.y}.rmpb`,
                bundle(overview.zoom, overview.x, overview.y),
            ],
            [
                `https://tiles.example/bundles/zoomed/13/1/${zoomed.x}/${zoomed.y}.rmpb`,
                bundle(zoomed.zoom, zoomed.x, zoomed.y),
            ],
        ]);
        let releaseOverviewBundle: () => void = () => undefined;
        const overviewBundleGate = new Promise<void>(resolve => {
            releaseOverviewBundle = resolve;
        });
        const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
        const fetcherMock = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
            const url = input instanceof URL ? input.href : String(input);
            const body = responses.get(url);
            if (body === undefined) return new Response(null, { status: 404 });
            if (url.includes('/bundles/overview/')) await overviewBundleGate;
            return new Response(body, { status: 200 });
        });
        const fetcher = fetcherMock as typeof fetch;
        const loading: boolean[] = [];
        const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const controller = new MapTileController({
            root,
            baseUrl: 'https://tiles.example/',
            getViewportSize: () => ({ width: 100, height: 100 }),
            onLoadingChange: value => loading.push(value),
            fetch: fetcher,
        });
        const initialViewport = getMapInitialViewport(100, 100);
        controller.updateViewport(initialViewport);
        await controller.initialize();
        await vi.waitFor(() =>
            expect(fetcherMock).toHaveBeenCalledWith(
                new URL(`https://tiles.example/bundles/overview/7/1/${overview.x}/${overview.y}.rmpb`),
                expect.objectContaining({ signal: expect.anything() })
            )
        );

        controller.updateViewport({ ...initialViewport, x: 1_000_000, y: 1_000_000 });
        releaseOverviewBundle();
        await vi.waitFor(() => expect(parseSpy).toHaveBeenCalled());
        controller.updateViewport(initialViewport);
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="7/107/52"]')).not.toBeNull());
        expect(root.querySelector('[data-map-attribution]')?.textContent).toContain('OpenStreetMap');

        controller.updateViewport({ ...initialViewport, zoom: MAP_ZOOMED_SWITCH_THRESHOLD });
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="7/107/52"]')).toBeNull());
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="13/6860/3347"]')).not.toBeNull());
        expect(loading).toEqual([true, true, false, true, false]);
        controller.dispose();
        expect((fetcherMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    });
});
