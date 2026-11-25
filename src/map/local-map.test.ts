import { Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { TextReader, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localMapStore, readLocalMapPackage, resolveMapSource } from './local-map';
import { MAP_COMMON_ZOOM, MAP_TILE_SIZE, MAP_ZOOMED_SWITCH_THRESHOLD, worldPixelToGraph } from './map-config';
import { MapTileController, renderMapLayerForExport } from './map-tile-controller';
import type { BundleFormat } from './tile-format';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const tile = { x: 6860, y: 3347 };
const zoom = MAP_COMMON_ZOOM;

const makeAvailability = () => {
    const bytes = new Uint8Array(29);
    bytes.set([82, 77, 80, 84, 1, zoom]);
    const view = new DataView(bytes.buffer);
    view.setUint32(8, tile.x, true);
    view.setUint32(12, tile.y, true);
    view.setUint32(16, 1, true);
    view.setUint32(20, 1, true);
    view.setUint32(24, 1, true);
    bytes[28] = 1;
    return bytes;
};

const makeBundle = (format: BundleFormat, address: { side: number; x: number; y: number }) => {
    const { side, x, y } = address;
    const version = format === 'RMPB2' ? 2 : 1;
    const headerSize = version === 2 ? 24 : 20;
    const addressOffset = headerSize - 12;
    const payloadOffset = headerSize + 12;
    const svg = `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 256 256" data-z="${zoom}" data-x="${tile.x}" data-y="${tile.y}"><path class="area-water" d="M0 0 L10 0 L10 10 Z"/></svg>`;
    const payload = new TextEncoder().encode(svg);
    const bytes = new Uint8Array(payloadOffset + payload.length);
    bytes.set([82, 77, 80, 66, version, zoom, side]);
    const view = new DataView(bytes.buffer);
    if (version === 2) view.setUint32(8, 1, true);
    else bytes[7] = 1;
    view.setUint32(addressOffset, x, true);
    view.setUint32(addressOffset + 4, y, true);
    view.setUint32(addressOffset + 8, payloadOffset, true);
    bytes[headerSize] = tile.x % side;
    bytes[headerSize + 1] = tile.y % side;
    view.setUint32(headerSize + 8, payload.length, true);
    bytes.set(payload, payloadOffset);
    return bytes;
};

const makeMapPackage = async (bundleFormat: BundleFormat, side: number, encodedFormat = bundleFormat) => {
    const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, level: 0 });
    const address = { side, x: Math.floor(tile.x / side), y: Math.floor(tile.y / side) };
    const addJson = (path: string, value: unknown) => writer.add(path, new TextReader(JSON.stringify(value)));
    await addJson('map-package.json', {
        format: 'rmp-map-package',
        formatVersion: 1,
        mapId: '90adc417-7439-4fe4-a673-3d39f0b4d976',
        revision: 1,
        name: 'Local publication',
        coordinateProfile: 'rmp-webmercator-z13-v1',
        svgProfile: 'rmp-svg-tile-v1',
        styleProfile: 'rmp-semantic-z13-v1',
        manifest: 'manifest.json',
        bounds: [121.46484375, 31.203404950917392, 121.5087890625, 31.240985378021307],
        defaultView: { center: [121.48681640625, 31.22219703210318], zoom: 14 },
    });
    await addJson('manifest.json', {
        formatVersion: 4,
        projection: { name: 'WebMercatorQuad', tileSize: MAP_TILE_SIZE },
        attribution: 'Local publication',
        levels: [
            {
                name: 'zoomed',
                zoom,
                bundleFormat,
                bundleIndex: 'bundle-index/z13.json',
                bundleTemplate: 'bundles/z13/{side}/{x}/{y}.rmpb',
                availability: 'availability/z13.bin',
                tileBounds: { minX: tile.x, minY: tile.y, maxX: tile.x, maxY: tile.y },
            },
        ],
    });
    await writer.add('availability/z13.bin', new Uint8ArrayReader(makeAvailability()));
    await addJson('bundle-index/z13.json', { formatVersion: 1, level: 'zoomed', zoom, bundles: [address] });
    await writer.add(
        `bundles/z13/${side}/${address.x}/${address.y}.rmpb`,
        new Uint8ArrayReader(makeBundle(encodedFormat, address))
    );
    return new Blob([await writer.close()]);
};

describe('RMW map packages', () => {
    beforeEach(() => {
        vi.stubGlobal('Blob', NodeBlob);
        vi.stubGlobal('crypto', webcrypto);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders and exports an imported v4 z13 RMPB2 publication through the map tile controller', async () => {
        const record = await localMapStore.importPackage(await makeMapPackage('RMPB2', 64));
        const root = document.createElementNS(SVG_NAMESPACE, 'g');
        const mapSource = resolveMapSource(record);
        const controller = new MapTileController({
            ...mapSource,
            root,
            getViewportSize: () => ({ width: 100, height: 100 }),
            rasterEnabled: false,
            rasterCache: null,
        });
        const tileMin = worldPixelToGraph({ x: tile.x * MAP_TILE_SIZE, y: tile.y * MAP_TILE_SIZE });
        const selector = `[data-tile-key="${zoom}/${tile.x}/${tile.y}"] .area-water`;
        try {
            expect(record.tileCount).toBe(1);
            controller.updateViewport({ ...tileMin, zoom: MAP_ZOOMED_SWITCH_THRESHOLD + 1 });
            await controller.initialize();
            await vi.waitFor(() => expect(root.querySelector(selector)).not.toBeNull());

            const exportRoot = document.createElementNS(SVG_NAMESPACE, 'g');
            await renderMapLayerForExport(root, exportRoot, {
                xMin: tileMin.x,
                yMin: tileMin.y,
                xMax: tileMin.x + MAP_TILE_SIZE - 1,
                yMax: tileMin.y + MAP_TILE_SIZE - 1,
            });
            expect(exportRoot.querySelector(selector)).not.toBeNull();
        } finally {
            controller.dispose();
            await localMapStore.delete(record);
        }
    });

    it('reads earlier RMPB1 publications', async () => {
        const { record } = await readLocalMapPackage(await makeMapPackage('RMPB1', 8));
        expect(record.tileCount).toBe(1);
    });

    it.each([
        ['RMPB1', 'RMPB2'],
        ['RMPB2', 'RMPB1'],
    ] as const)('rejects a %s manifest containing a %s bundle', async (bundleFormat, encodedFormat) => {
        const archive = await makeMapPackage(bundleFormat, 8, encodedFormat);
        await expect(readLocalMapPackage(archive)).rejects.toThrow(/bundle format/i);
    });
});
