import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAP_COMMON_ZOOM, MAP_TILE_SIZE, MAP_ZOOMED_SWITCH_THRESHOLD, worldPixelToGraph } from './map-config';
import type { MapSourceSession } from './map-raster-cache';
import { decodeMapRouting } from './map-routing';
import {
    getMapOptimizationProgress,
    MapTileController,
    type MapLoadingProgress,
    renderMapLayerForExport,
} from './map-tile-controller';

const availability = (zoom: number, x: number, y: number, width = 1, bits = 1) => {
    const buffer = new ArrayBuffer(28 + Math.ceil(width / 8));
    const bytes = new Uint8Array(buffer);
    bytes.set([...'RMPT'].map(char => char.charCodeAt(0)));
    bytes[4] = 1;
    bytes[5] = zoom;
    const view = new DataView(buffer);
    view.setUint32(8, x, true);
    view.setUint32(12, y, true);
    view.setUint32(16, width, true);
    view.setUint32(20, 1, true);
    view.setUint32(24, bits.toString(2).replaceAll('0', '').length, true);
    bytes[28] = bits;
    return buffer;
};

const bundle = (zoom: number, x: number, y: number) => {
    const payload = new TextEncoder().encode(
        `<svg xmlns="http://www.w3.org/2000/svg" data-z="${zoom}" data-x="${x}" data-y="${y}" viewBox="0 0 256 256"><rect class="road" width="256" height="256"/></svg>`
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

const BASE_URL = 'https://tiles.example/';
const JAPAN_BASE_URL = 'https://jp.tiles.example/';
const OVERVIEW_TILE = { zoom: 8, x: 214, y: 104 } as const;
const ZOOMED_TILE = { zoom: 13, x: 6860, y: 3347 } as const;
const makeOverviewViewport = (width: number, height: number) => {
    const zoom = MAP_ZOOMED_SWITCH_THRESHOLD + 1;
    return {
        x: (-width * zoom) / 200,
        y: (-height * zoom) / 200,
        zoom,
    };
};

const stubAnimationFrame = () => {
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        queueMicrotask(() => callback(0));
        return ++frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
};

const createSvgRoot = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.append(root);
    document.body.append(svg);
    return { svg, root };
};

const createMapSourceFixture = (options?: {
    exportOnlyOverviewX?: number;
    beforeResponse?: (url: string) => void | Promise<void>;
}) => {
    const overviewXs = [
        OVERVIEW_TILE.x,
        ...(options?.exportOnlyOverviewX === undefined ? [] : [options.exportOnlyOverviewX]),
    ];
    const overviewMaxX = Math.max(...overviewXs);
    const overviewWidth = overviewMaxX - OVERVIEW_TILE.x + 1;
    const overviewBits = overviewXs.reduce((bits, x) => bits | (1 << (x - OVERVIEW_TILE.x)), 0);
    const routing = decodeMapRouting({
        formatVersion: 1,
        ownerZoom: 8,
        regions: [{ id: 'fixture', ownerId: 1, origin: new URL(BASE_URL).origin }],
        runs: [
            {
                start: OVERVIEW_TILE.y * 256 + OVERVIEW_TILE.x,
                length: overviewWidth,
                ownerId: 1,
            },
        ],
    });
    const manifest = {
        formatVersion: 3,
        projection: { name: 'WebMercatorQuad', tileSize: 256 },
        attribution: 'OpenStreetMap contributors / ODbL',
        levels: [
            {
                name: 'overview',
                zoom: OVERVIEW_TILE.zoom,
                bundleFormat: 'RMPB1',
                bundleIndex: 'bundle-index/z8.json',
                bundleTemplate: 'bundles/overview/8/{side}/{x}/{y}.rmpb',
                availability: 'availability/z8.bin',
                tileBounds: {
                    minX: OVERVIEW_TILE.x,
                    minY: OVERVIEW_TILE.y,
                    maxX: overviewMaxX,
                    maxY: OVERVIEW_TILE.y,
                },
            },
            {
                name: 'zoomed',
                zoom: ZOOMED_TILE.zoom,
                bundleFormat: 'RMPB1',
                bundleIndex: 'bundle-index/z13.json',
                bundleTemplate: 'bundles/zoomed/13/{side}/{x}/{y}.rmpb',
                availability: 'availability/z13.bin',
                tileBounds: {
                    minX: ZOOMED_TILE.x,
                    minY: ZOOMED_TILE.y,
                    maxX: ZOOMED_TILE.x,
                    maxY: ZOOMED_TILE.y,
                },
            },
        ],
    };
    const responses = new Map<string, BodyInit>([
        [`${BASE_URL}manifest.json`, JSON.stringify(manifest)],
        [
            `${BASE_URL}availability/z8.bin`,
            availability(OVERVIEW_TILE.zoom, OVERVIEW_TILE.x, OVERVIEW_TILE.y, overviewWidth, overviewBits),
        ],
        [`${BASE_URL}availability/z13.bin`, availability(ZOOMED_TILE.zoom, ZOOMED_TILE.x, ZOOMED_TILE.y)],
        [
            `${BASE_URL}bundle-index/z8.json`,
            JSON.stringify({
                formatVersion: 1,
                level: 'overview',
                zoom: OVERVIEW_TILE.zoom,
                bundles: overviewXs.map(x => ({ side: 1, x, y: OVERVIEW_TILE.y })),
            }),
        ],
        [
            `${BASE_URL}bundle-index/z13.json`,
            JSON.stringify({
                formatVersion: 1,
                level: 'zoomed',
                zoom: ZOOMED_TILE.zoom,
                bundles: [{ side: 1, x: ZOOMED_TILE.x, y: ZOOMED_TILE.y }],
            }),
        ],
        ...overviewXs.map(
            x =>
                [
                    `${BASE_URL}bundles/overview/8/1/${x}/${OVERVIEW_TILE.y}.rmpb`,
                    bundle(OVERVIEW_TILE.zoom, x, OVERVIEW_TILE.y),
                ] as [string, BodyInit]
        ),
        [
            `${BASE_URL}bundles/zoomed/13/1/${ZOOMED_TILE.x}/${ZOOMED_TILE.y}.rmpb`,
            bundle(ZOOMED_TILE.zoom, ZOOMED_TILE.x, ZOOMED_TILE.y),
        ],
    ]);
    const fetcherMock = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
        const requestUrl = new URL(input instanceof URL ? input.href : String(input));
        requestUrl.searchParams.delete('rmp-source-epoch');
        const url = requestUrl.href;
        const body = responses.get(url);
        if (body === undefined) return new Response(null, { status: 404 });
        await options?.beforeResponse?.(url);
        return new Response(body, { status: 200 });
    });
    return {
        fetcher: fetcherMock as typeof fetch,
        fetcherMock,
        routing,
    };
};

const createRegionalMapSourceFixture = (options?: {
    failJapanManifest?: boolean;
    failJapanOverviewBundle?: boolean;
}) => {
    const chinaOverview = OVERVIEW_TILE;
    const japanOverview = { ...OVERVIEW_TILE, x: OVERVIEW_TILE.x + 1 };
    const chinaZoomed = ZOOMED_TILE;
    const japanZoomed = { ...ZOOMED_TILE, x: (OVERVIEW_TILE.x + 1) * 32 };
    const routing = decodeMapRouting({
        formatVersion: 1,
        ownerZoom: 8,
        regions: [
            { id: 'china', ownerId: 1, origin: new URL(BASE_URL).origin },
            { id: 'japan', ownerId: 2, origin: new URL(JAPAN_BASE_URL).origin },
        ],
        runs: [
            { start: chinaOverview.y * 256 + chinaOverview.x, length: 1, ownerId: 1 },
            { start: japanOverview.y * 256 + japanOverview.x, length: 1, ownerId: 2 },
        ],
    });
    const responses = new Map<string, BodyInit>();

    const addSource = (
        baseUrl: string,
        overview: { zoom: number; x: number; y: number },
        zoomed: { zoom: number; x: number; y: number }
    ) => {
        const manifest = {
            formatVersion: 3,
            projection: { name: 'WebMercatorQuad', tileSize: 256 },
            attribution: 'OpenStreetMap contributors / ODbL',
            levels: [
                {
                    name: 'overview',
                    zoom: overview.zoom,
                    bundleFormat: 'RMPB1',
                    bundleIndex: 'bundle-index/z8.json',
                    bundleTemplate: 'bundles/overview/8/{side}/{x}/{y}.rmpb',
                    availability: 'availability/z8.bin',
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
        responses.set(`${baseUrl}manifest.json`, JSON.stringify(manifest));
        responses.set(`${baseUrl}availability/z8.bin`, availability(overview.zoom, overview.x, overview.y));
        responses.set(`${baseUrl}availability/z13.bin`, availability(zoomed.zoom, zoomed.x, zoomed.y));
        responses.set(
            `${baseUrl}bundle-index/z8.json`,
            JSON.stringify({
                formatVersion: 1,
                level: 'overview',
                zoom: overview.zoom,
                bundles: [{ side: 1, x: overview.x, y: overview.y }],
            })
        );
        responses.set(
            `${baseUrl}bundle-index/z13.json`,
            JSON.stringify({
                formatVersion: 1,
                level: 'zoomed',
                zoom: zoomed.zoom,
                bundles: [{ side: 1, x: zoomed.x, y: zoomed.y }],
            })
        );
        responses.set(
            `${baseUrl}bundles/overview/8/1/${overview.x}/${overview.y}.rmpb`,
            bundle(overview.zoom, overview.x, overview.y)
        );
        responses.set(
            `${baseUrl}bundles/zoomed/13/1/${zoomed.x}/${zoomed.y}.rmpb`,
            bundle(zoomed.zoom, zoomed.x, zoomed.y)
        );
    };

    addSource(BASE_URL, chinaOverview, chinaZoomed);
    addSource(JAPAN_BASE_URL, japanOverview, japanZoomed);
    const fetcherMock = vi.fn(async (input: URL | RequestInfo) => {
        const requestUrl = new URL(input instanceof URL ? input.href : String(input));
        requestUrl.searchParams.delete('rmp-source-epoch');
        if (options?.failJapanManifest && requestUrl.href === `${JAPAN_BASE_URL}manifest.json`) {
            return new Response(null, { status: 503 });
        }
        if (
            options?.failJapanOverviewBundle &&
            requestUrl.href === `${JAPAN_BASE_URL}bundles/overview/8/1/${japanOverview.x}/${japanOverview.y}.rmpb`
        ) {
            return new Response(null, { status: 503 });
        }
        const body = responses.get(requestUrl.href);
        return body === undefined ? new Response(null, { status: 404 }) : new Response(body, { status: 200 });
    });
    return {
        chinaOverview,
        chinaZoomed,
        fetcher: fetcherMock as typeof fetch,
        fetcherMock,
        japanOverview,
        japanZoomed,
        routing,
    };
};

describe('MapTileController', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('mounts tiles from two routed regional origins in one viewport', async () => {
        stubAnimationFrame();
        const { chinaOverview, chinaZoomed, fetcher, fetcherMock, japanOverview, japanZoomed, routing } =
            createRegionalMapSourceFixture();
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 3_000, height: 1_000 }),
            fetch: fetcher,
            rasterCache: null,
        });
        controller.updateViewport({ x: -4_000, y: -5_500, zoom: 800 });
        await controller.initialize();

        await vi.waitFor(() => {
            expect(root.querySelector(`[data-tile-key="8/${chinaOverview.x}/${chinaOverview.y}"]`)).not.toBeNull();
            expect(root.querySelector(`[data-tile-key="8/${japanOverview.x}/${japanOverview.y}"]`)).not.toBeNull();
        });
        const requestedOrigins = new Set(
            fetcherMock.mock.calls.map(([input]) => new URL(input instanceof URL ? input.href : String(input)).origin)
        );
        expect(requestedOrigins).toEqual(new Set([new URL(BASE_URL).origin, new URL(JAPAN_BASE_URL).origin]));

        const commonOverviewTileSize = MAP_TILE_SIZE * 2 ** (MAP_COMMON_ZOOM - chinaOverview.zoom);
        const exportMin = worldPixelToGraph({
            x: chinaOverview.x * commonOverviewTileSize,
            y: chinaOverview.y * commonOverviewTileSize,
        });
        const exportMax = worldPixelToGraph({
            x: (japanOverview.x + 1) * commonOverviewTileSize - 1,
            y: (japanOverview.y + 1) * commonOverviewTileSize - 1,
        });
        const exportRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        await renderMapLayerForExport(root, exportRoot, {
            xMin: exportMin.x,
            yMin: exportMin.y,
            xMax: exportMax.x,
            yMax: exportMax.y,
        });
        expect(exportRoot.querySelector(`[data-tile-key="8/${chinaOverview.x}/${chinaOverview.y}"]`)).not.toBeNull();
        expect(exportRoot.querySelector(`[data-tile-key="8/${japanOverview.x}/${japanOverview.y}"]`)).not.toBeNull();

        controller.updateViewport({ x: -100, y: -100, zoom: MAP_ZOOMED_SWITCH_THRESHOLD });
        await vi.waitFor(() => {
            expect(root.querySelector(`[data-tile-key="13/${chinaZoomed.x}/${chinaZoomed.y}"]`)).not.toBeNull();
            expect(root.querySelector(`[data-tile-key="13/${japanZoomed.x}/${japanZoomed.y}"]`)).not.toBeNull();
        });
        expect(root.querySelector('[data-tile-key^="8/"]')).toBeNull();

        controller.dispose();
        svg.remove();
    });

    it('keeps loaded regional sessions available for raster optimization until restart', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        stubAnimationFrame();
        const NativeUrl = URL;
        class TestUrl extends NativeUrl {}
        let objectUrlId = 0;
        TestUrl.createObjectURL = vi.fn(() => `blob:map-raster-${++objectUrlId}`);
        TestUrl.revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', TestUrl);

        let now = 1_000;
        const { chinaOverview, fetcher, japanOverview, routing } = createRegionalMapSourceFixture();
        const sessions = new Map<string, MapSourceSession>([
            [
                `${BASE_URL}manifest.json`,
                {
                    sourceKey: `${BASE_URL}manifest.json`,
                    epoch: 'china-epoch',
                    expiresAt: 11_000,
                    refreshSource: false,
                },
            ],
            [
                `${JAPAN_BASE_URL}manifest.json`,
                {
                    sourceKey: `${JAPAN_BASE_URL}manifest.json`,
                    epoch: 'japan-epoch',
                    expiresAt: 21_000,
                    refreshSource: false,
                },
            ],
        ]);
        const rasterCache = {
            getSourceSession: vi.fn(async (sourceKey: string) => sessions.get(sourceKey)!),
            confirmSourceSession: vi.fn(async (session: MapSourceSession) => session),
            getRaster: vi.fn(async () => undefined),
            putRaster: vi.fn(async () => undefined),
        };
        const rasterizer = {
            render: vi.fn(async () => new Blob(['raster'], { type: 'image/webp' })),
            dispose: vi.fn(),
        };
        vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 3_000, height: 1_000 }),
            fetch: fetcher,
            rasterCache,
            rasterizer,
            rasterIdleDelayMs: 0,
            now: () => now,
        });
        const viewport = { x: -4_000, y: -5_500, zoom: 800 };
        controller.updateViewport(viewport);
        await controller.initialize();

        await vi.waitFor(() => expect(root.querySelectorAll('[data-map-raster]')).toHaveLength(2));
        for (const raster of root.querySelectorAll<SVGImageElement>('[data-map-raster]')) {
            raster.dispatchEvent(new Event('load'));
        }

        now = 11_000;
        await vi.advanceTimersByTimeAsync(10_000);

        expect(root.querySelectorAll('[data-map-raster]')).toHaveLength(2);
        expect(
            root.querySelector(`[data-map-raster][data-tile-key="8/${chinaOverview.x}/${chinaOverview.y}"]`)
        ).not.toBeNull();
        expect(
            root.querySelector(`[data-map-raster][data-tile-key="8/${japanOverview.x}/${japanOverview.y}"]`)
        ).not.toBeNull();

        controller.updateViewport({ ...viewport, x: 1_000_000, y: 1_000_000 });
        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).toBeNull());
        controller.updateViewport(viewport);

        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledTimes(4));
        await vi.waitFor(() => expect(root.querySelectorAll('[data-map-raster]')).toHaveLength(2));
        expect(rasterCache.getSourceSession).toHaveBeenCalledTimes(2);

        controller.dispose();
        svg.remove();
    });

    it('keeps a healthy regional source visible when another source fails', async () => {
        stubAnimationFrame();
        const { chinaOverview, fetcher, fetcherMock, routing } = createRegionalMapSourceFixture({
            failJapanManifest: true,
        });
        const onSourceError = vi.fn();
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 3_000, height: 1_000 }),
            fetch: fetcher,
            onSourceError,
            rasterCache: null,
        });
        controller.updateViewport({ x: -4_000, y: -5_500, zoom: 800 });
        await controller.initialize();

        await vi.waitFor(() =>
            expect(root.querySelector(`[data-tile-key="8/${chinaOverview.x}/${chinaOverview.y}"]`)).not.toBeNull()
        );
        expect(onSourceError).toHaveBeenCalledOnce();
        expect(onSourceError.mock.calls[0][0]).toMatchObject({ id: 'japan', ownerId: 2 });
        expect(String(onSourceError.mock.calls[0][1])).toContain('HTTP 503');
        expect(
            fetcherMock.mock.calls.filter(
                ([input]) =>
                    new URL(input instanceof URL ? input.href : String(input)).origin === new URL(BASE_URL).origin
            ).length
        ).toBeGreaterThan(0);

        controller.dispose();
        svg.remove();
    });

    it('does not fall back to another origin after the routed bundle fails', async () => {
        stubAnimationFrame();
        const { chinaOverview, fetcher, fetcherMock, japanOverview, routing } = createRegionalMapSourceFixture({
            failJapanOverviewBundle: true,
        });
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 3_000, height: 1_000 }),
            fetch: fetcher,
            rasterCache: null,
        });
        controller.updateViewport({ x: -4_000, y: -5_500, zoom: 800 });
        await controller.initialize();

        await vi.waitFor(() =>
            expect(root.querySelector(`[data-tile-key="8/${chinaOverview.x}/${chinaOverview.y}"]`)).not.toBeNull()
        );
        await vi.waitFor(() =>
            expect(consoleError).toHaveBeenCalledWith(
                `Map tile failed: 8/${japanOverview.x}/${japanOverview.y}`,
                expect.any(Error)
            )
        );
        const requestedUrls = fetcherMock.mock.calls.map(([input]) => {
            const url = new URL(input instanceof URL ? input.href : String(input));
            url.searchParams.delete('rmp-source-epoch');
            return url.href;
        });
        expect(requestedUrls).toContain(
            `${JAPAN_BASE_URL}bundles/overview/8/1/${japanOverview.x}/${japanOverview.y}.rmpb`
        );
        expect(requestedUrls).not.toContain(
            `${BASE_URL}bundles/overview/8/1/${japanOverview.x}/${japanOverview.y}.rmpb`
        );
        expect(root.querySelector(`[data-tile-key="8/${japanOverview.x}/${japanOverview.y}"]`)).toBeNull();

        controller.dispose();
        svg.remove();
    });

    it('does not request any regional source for an unowned viewport', async () => {
        stubAnimationFrame();
        const { fetcher, fetcherMock, routing } = createRegionalMapSourceFixture();
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 100, height: 100 }),
            fetch: fetcher,
            rasterCache: null,
        });
        controller.updateViewport({ x: 1_000_000, y: 1_000_000, zoom: 800 });
        await controller.initialize();
        await Promise.resolve();

        expect(fetcherMock).not.toHaveBeenCalled();
        controller.dispose();
        svg.remove();
    });

    it('imperatively replaces overview with zoomed tiles and reports switching', async () => {
        stubAnimationFrame();
        const overview = OVERVIEW_TILE;
        const zoomed = ZOOMED_TILE;
        const exportOnlyOverviewX = overview.x + 3;
        let releaseOverviewBundle: () => void = () => undefined;
        const overviewBundleGate = new Promise<void>(resolve => {
            releaseOverviewBundle = resolve;
        });
        const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
        const { fetcher, fetcherMock, routing } = createMapSourceFixture({
            exportOnlyOverviewX,
            beforeResponse: async url => {
                if (url.includes('/bundles/overview/')) await overviewBundleGate;
            },
        });
        const loading: Array<[boolean, MapLoadingProgress | undefined]> = [];
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 100, height: 100 }),
            onLoadingChange: (value, progress) => loading.push([value, progress]),
            fetch: fetcher,
        });
        const initialViewport = { x: -390, y: -390, zoom: 780 };
        controller.updateViewport(initialViewport);
        await controller.initialize();
        await vi.waitFor(() => {
            const bundleCall = fetcherMock.mock.calls.find(([input]) =>
                String(input).includes(`/bundles/overview/8/1/${overview.x}/${overview.y}.rmpb`)
            );
            expect(bundleCall?.[0]).toEqual(expect.any(URL));
            expect((bundleCall?.[0] as URL).searchParams.get('rmp-source-epoch')).toBeTruthy();
            expect(bundleCall?.[1]).toEqual(expect.objectContaining({ signal: expect.anything(), cache: 'default' }));
        });
        expect(fetcherMock.mock.calls[0][1]).toEqual(
            expect.objectContaining({ signal: expect.anything(), cache: 'reload' })
        );

        controller.updateViewport({ ...initialViewport, x: 1_000_000, y: 1_000_000 });
        releaseOverviewBundle();
        await vi.waitFor(() => expect(parseSpy).toHaveBeenCalled());
        controller.updateViewport(initialViewport);
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="8/214/104"]')).not.toBeNull());
        const overviewTile = root.querySelector<SVGSVGElement>('[data-tile-key="8/214/104"]')!;
        expect(overviewTile.classList.contains('rmp-map-tile')).toBe(true);
        expect(overviewTile.dataset.level).toBe('overview');
        const attribution = root.querySelector<SVGGElement>('[data-map-attribution]')!;
        expect(attribution.querySelector('[data-map-attribution-text]')?.textContent).toBe(
            '© OpenStreetMap contributors'
        );
        expect(attribution.querySelector('a')?.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
        expect(attribution.querySelector('[data-map-attribution-background]')?.getAttribute('fill-opacity')).toBe(
            '0.85'
        );
        expect(attribution.querySelector('[data-map-attribution-text]')?.getAttribute('font-size')).toBe('12');

        const commonOverviewTileSize = MAP_TILE_SIZE * 2 ** (MAP_COMMON_ZOOM - overview.zoom);
        const exportMin = worldPixelToGraph({
            x: exportOnlyOverviewX * commonOverviewTileSize,
            y: overview.y * commonOverviewTileSize,
        });
        const exportRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        await renderMapLayerForExport(root, exportRoot, {
            xMin: exportMin.x,
            yMin: exportMin.y,
            xMax: exportMin.x + commonOverviewTileSize - 1,
            yMax: exportMin.y + commonOverviewTileSize - 1,
        });

        // Export fills graph bounds that were never mounted into the current viewport.
        expect(exportRoot.querySelector(`[data-tile-key="8/${exportOnlyOverviewX}/104"]`)).not.toBeNull();
        expect(root.querySelector(`[data-tile-key="8/${exportOnlyOverviewX}/104"]`)).toBeNull();
        expect(exportRoot.querySelector('[data-map-attribution]')?.textContent).toContain('OpenStreetMap');
        expect(
            fetcherMock.mock.calls.filter(([input]) => {
                const url = new URL(input instanceof URL ? input.href : String(input));
                return url.origin === 'https://tiles.example' && url.pathname === '/manifest.json';
            })
        ).toHaveLength(1);

        controller.updateViewport({ ...initialViewport, zoom: MAP_ZOOMED_SWITCH_THRESHOLD });
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="8/214/104"]')).toBeNull());
        await vi.waitFor(() => expect(root.querySelector('[data-tile-key="13/6860/3347"]')).not.toBeNull());
        expect(root.querySelector<SVGSVGElement>('[data-tile-key="13/6860/3347"]')!.dataset.level).toBe('zoomed');
        expect(loading[0]).toEqual([true, undefined]);
        expect(loading).toContainEqual([true, { completed: 0, total: 1 }]);
        expect(loading.at(-1)).toEqual([false, undefined]);
        controller.dispose();
        expect((fetcherMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
        svg.remove();
    });

    it('mounts SVG before cached raster work and keeps it visible until decode', async () => {
        stubAnimationFrame();
        const NativeUrl = URL;
        class TestUrl extends NativeUrl {}
        TestUrl.createObjectURL = vi.fn(() => 'blob:map-raster');
        TestUrl.revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', TestUrl);

        const { fetcher, routing } = createMapSourceFixture();
        const sourceSession = {
            sourceKey: `${BASE_URL}manifest.json`,
            epoch: '1000',
            expiresAt: 10_000,
            refreshSource: false,
        };
        const cachedRasters = new Map<string, Blob>();
        const rasterCache = {
            getSourceSession: vi.fn(async () => sourceSession),
            confirmSourceSession: vi.fn(async () => ({ ...sourceSession, refreshSource: false })),
            getRaster: vi.fn(
                async (
                    _session: typeof sourceSession,
                    styleKey: string,
                    _styleCss: string,
                    tileKey: string
                ): Promise<Blob | undefined> => cachedRasters.get(`${styleKey}:${tileKey}`)
            ),
            putRaster: vi.fn(
                async (
                    _session: typeof sourceSession,
                    styleKey: string,
                    _styleCss: string,
                    tileKey: string,
                    blob: Blob
                ) => {
                    cachedRasters.set(`${styleKey}:${tileKey}`, blob);
                }
            ),
        };
        const rasterizer = {
            render: vi.fn(async (_svg: string, _size: number) => new Blob(['raster'], { type: 'image/webp' })),
            dispose: vi.fn(),
        };
        const { svg, root } = createSvgRoot();
        const styleCss = '[data-map-layer] .rmp-map-tile .road { stroke: #123456; }';
        const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 100, height: 100 }),
            fetch: fetcher,
            styleCss,
            rasterCache,
            rasterizer,
            rasterIdleDelayMs: 0,
            now: () => 1_000,
        });
        const initialViewport = makeOverviewViewport(100, 100);
        controller.updateViewport(initialViewport);
        await controller.initialize();

        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).not.toBeNull());
        let svgTile = root.querySelector<SVGSVGElement>('.rmp-map-tile')!;
        expect(svgTile.style.display).toBe('');
        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledOnce());
        const rasterSource = rasterizer.render.mock.calls[0][0];
        const rasterDocument = new DOMParser().parseFromString(rasterSource, 'image/svg+xml');
        const rasterRoot = rasterDocument.documentElement;
        const serializedTile = rasterRoot.querySelector<SVGSVGElement>('.rmp-map-tile');
        expect(rasterRoot.hasAttribute('data-map-layer')).toBe(true);
        expect(rasterRoot.getAttribute('width')).toBe('4096');
        expect(rasterRoot.getAttribute('height')).toBe('4096');
        expect(serializedTile?.parentElement).toBe(rasterRoot);
        expect(serializedTile?.getAttribute('width')).toBe('4096');
        expect(serializedTile?.getAttribute('height')).toBe('4096');
        expect(rasterRoot.querySelector('style')?.textContent).toBe(styleCss);
        expect(rasterDocument.querySelector('[data-map-layer] .rmp-map-tile .road')).not.toBeNull();
        expect(rasterizer.render.mock.calls[0][1]).toBe(4096);

        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());
        expect(getMapOptimizationProgress(root)).toEqual({ optimized: 0, total: 1 });
        expect(consoleInfo.mock.calls).toEqual([
            ['Background map rasterization: 0 / 1'],
            ['Background map rasterization: 1 / 1'],
        ]);
        const raster = root.querySelector<SVGImageElement>('[data-map-raster]')!;
        expect(svgTile.style.display).toBe('');
        for (const attribute of ['x', 'y', 'width', 'height']) {
            expect(raster.getAttribute(attribute)).toBe(svgTile.getAttribute(attribute));
        }
        expect(raster.dataset.level).toBe(svgTile.dataset.level);
        expect(raster.dataset.tileKey).toBe(svgTile.dataset.tileKey);
        expect(raster.getAttribute('preserveAspectRatio')).toBe('none');
        raster.dispatchEvent(new Event('load'));
        expect(svgTile.style.display).toBe('none');
        expect(getMapOptimizationProgress(root)).toEqual({ optimized: 1, total: 1 });

        const cacheReadsBeforeReturn = rasterCache.getRaster.mock.calls.length;
        controller.setInteractionActive(true);
        controller.updateViewport({ ...initialViewport, x: 1_000_000, y: 1_000_000 });
        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).toBeNull());
        let resolveReturnedRaster: (blob: Blob | undefined) => void = () => undefined;
        rasterCache.getRaster.mockImplementationOnce(
            () =>
                new Promise<Blob | undefined>(resolve => {
                    resolveReturnedRaster = resolve;
                })
        );
        controller.updateViewport(initialViewport);
        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).not.toBeNull());
        svgTile = root.querySelector<SVGSVGElement>('.rmp-map-tile')!;
        expect(svgTile.style.display).toBe('');
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(rasterCache.getRaster).toHaveBeenCalledTimes(cacheReadsBeforeReturn);

        controller.setInteractionActive(false);
        await vi.waitFor(() => expect(rasterCache.getRaster).toHaveBeenCalledTimes(cacheReadsBeforeReturn + 1));
        resolveReturnedRaster(new Blob(['cached'], { type: 'image/webp' }));
        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());
        const returnedRaster = root.querySelector<SVGImageElement>('[data-map-raster]')!;
        expect(rasterizer.render).toHaveBeenCalledOnce();
        expect(svgTile.style.display).toBe('');
        expect(returnedRaster.style.visibility).toBe('hidden');
        returnedRaster.dispatchEvent(new Event('load'));
        expect(returnedRaster.style.visibility).toBe('');
        expect(svgTile.style.display).toBe('none');

        controller.updateStyle('[data-map-layer] .rmp-map-tile .road { stroke: #abcdef; }');
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(svgTile.style.display).toBe('');
        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());
        expect(TestUrl.revokeObjectURL).toHaveBeenCalledWith('blob:map-raster');

        controller.setInteractionActive(true);
        rasterCache.getRaster.mockResolvedValueOnce(new Blob(['cached'], { type: 'image/webp' }));
        controller.updateStyle('[data-map-layer] .rmp-map-tile .road { stroke: #fedcba; }');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(rasterizer.render).toHaveBeenCalledTimes(2);

        controller.setInteractionActive(false);
        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());
        expect(rasterizer.render).toHaveBeenCalledTimes(2);

        controller.setRasterEnabled(false);
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(svgTile.style.display).toBe('');
        expect(getMapOptimizationProgress(root)).toEqual({ optimized: 0, total: 1 });
        controller.updateStyle('[data-map-layer] .rmp-map-tile .road { stroke: #111111; }');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(rasterizer.render).toHaveBeenCalledTimes(2);

        let resolveInterruptedRaster: (blob: Blob) => void = () => undefined;
        rasterizer.render.mockImplementationOnce(
            () =>
                new Promise<Blob>(resolve => {
                    resolveInterruptedRaster = resolve;
                })
        );
        consoleInfo.mockClear();
        controller.setRasterEnabled(true);
        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledTimes(3));
        expect(consoleInfo.mock.calls).toEqual([['Background map rasterization: 0 / 1']]);

        controller.setRasterEnabled(false);
        resolveInterruptedRaster(new Blob(['stale-raster'], { type: 'image/webp' }));
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(consoleInfo).not.toHaveBeenCalledWith('Background map rasterization: 1 / 1');

        consoleInfo.mockClear();
        controller.setRasterEnabled(true);
        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledTimes(4));
        await vi.waitFor(() => expect(consoleInfo).toHaveBeenCalledWith('Background map rasterization: 1 / 1'));
        expect(consoleInfo.mock.calls).toEqual([
            ['Background map rasterization: 0 / 1'],
            ['Background map rasterization: 1 / 1'],
        ]);

        controller.dispose();
        expect(rasterizer.dispose).toHaveBeenCalledOnce();
        svg.remove();
    });

    it('negative-caches raster image decode failures and keeps SVG on remount', async () => {
        stubAnimationFrame();
        const NativeUrl = URL;
        class TestUrl extends NativeUrl {}
        TestUrl.createObjectURL = vi.fn(() => 'blob:map-raster');
        TestUrl.revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', TestUrl);

        const { fetcher, routing } = createMapSourceFixture();
        const sourceSession = {
            sourceKey: `${BASE_URL}manifest.json`,
            epoch: '1000',
            expiresAt: 10_000,
            refreshSource: false,
        };
        const cachedRasters = new Map<string, Blob | null>();
        const rasterCache = {
            getSourceSession: vi.fn(async () => sourceSession),
            confirmSourceSession: vi.fn(async () => ({ ...sourceSession, refreshSource: false })),
            getRaster: vi.fn(
                async (
                    _session: typeof sourceSession,
                    styleKey: string,
                    _styleCss: string,
                    tileKey: string
                ): Promise<Blob | null | undefined> => cachedRasters.get(`${styleKey}:${tileKey}`)
            ),
            putRaster: vi.fn(
                async (
                    _session: typeof sourceSession,
                    styleKey: string,
                    _styleCss: string,
                    tileKey: string,
                    blob: Blob | null
                ) => {
                    cachedRasters.set(`${styleKey}:${tileKey}`, blob);
                }
            ),
        };
        const rasterizer = {
            render: vi.fn(async () => new Blob(['raster'], { type: 'image/webp' })),
            dispose: vi.fn(),
        };
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const { svg, root } = createSvgRoot();
        const controller = new MapTileController({
            root,
            routing,
            getViewportSize: () => ({ width: 100, height: 100 }),
            fetch: fetcher,
            rasterCache,
            rasterizer,
            rasterIdleDelayMs: 0,
            now: () => 1_000,
        });
        const initialViewport = makeOverviewViewport(100, 100);
        controller.updateViewport(initialViewport);
        await controller.initialize();

        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());
        const failedRaster = root.querySelector<SVGImageElement>('[data-map-raster]')!;
        const svgTile = root.querySelector<SVGSVGElement>('.rmp-map-tile')!;
        failedRaster.dispatchEvent(new Event('error'));

        await vi.waitFor(() =>
            expect(rasterCache.putRaster).toHaveBeenLastCalledWith(
                sourceSession,
                expect.any(String),
                '',
                `${OVERVIEW_TILE.zoom}/${OVERVIEW_TILE.x}/${OVERVIEW_TILE.y}`,
                null,
                1_000
            )
        );
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(svgTile.style.display).toBe('');
        expect(rasterizer.render).toHaveBeenCalledOnce();
        expect(consoleWarn).toHaveBeenCalledWith(
            `Failed to decode map raster ${OVERVIEW_TILE.zoom}/${OVERVIEW_TILE.x}/${OVERVIEW_TILE.y}; keeping SVG tile`
        );

        controller.updateViewport({ ...initialViewport, x: 1_000_000, y: 1_000_000 });
        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).toBeNull());
        controller.updateViewport(initialViewport);
        await vi.waitFor(() => expect(root.querySelector('.rmp-map-tile')).not.toBeNull());
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(root.querySelector('[data-map-raster]')).toBeNull();
        expect(root.querySelector<SVGSVGElement>('.rmp-map-tile')!.style.display).toBe('');
        expect(rasterizer.render).toHaveBeenCalledOnce();

        controller.updateStyle('.road { stroke: #abcdef; }');
        await vi.waitFor(() => expect(rasterizer.render).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(root.querySelector('[data-map-raster]')).not.toBeNull());

        controller.dispose();
        svg.remove();
    });
});
