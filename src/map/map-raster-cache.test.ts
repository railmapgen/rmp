import { afterEach, describe, expect, it } from 'vitest';
import { MAP_SOURCE_TTL_MS } from './map-config';
import { getMapStyleCacheKey, MapRasterCache } from './map-raster-cache';

describe('MapRasterCache', () => {
    const caches: MapRasterCache[] = [];

    afterEach(() => {
        for (const cache of caches) cache.close();
        caches.length = 0;
    });

    const makeCache = () => {
        const cache = new MapRasterCache(`MapRasterCacheTest-${crypto.randomUUID()}`);
        caches.push(cache);
        return cache;
    };

    it('binds raster validity to the persistent source epoch', async () => {
        const cache = makeCache();
        const first = await cache.getSourceSession('https://tiles.example/', 1_000);
        expect(first.refreshSource).toBe(true);
        await cache.confirmSourceSession(first);
        const same = await cache.getSourceSession('https://tiles.example/', 2_000);

        expect(same.refreshSource).toBe(false);
        expect(same.epoch).toBe(first.epoch);
        expect(same.expiresAt).toBe(1_000 + MAP_SOURCE_TTL_MS);

        const next = await cache.getSourceSession('https://tiles.example/', first.expiresAt);
        expect(next.refreshSource).toBe(true);
        expect(next.epoch).not.toBe(first.epoch);

        const retry = await cache.getSourceSession('https://tiles.example/', first.expiresAt + 1);
        expect(retry.refreshSource).toBe(true);
        expect(retry.epoch).not.toBe(next.epoch);
    });

    it('rolls regional source epochs independently when each source is loaded', async () => {
        const cache = makeCache();
        const china = await cache.getSourceSession('https://cn.tiles.example/manifest.json', 1_000);
        const japan = await cache.getSourceSession('https://jp.tiles.example/manifest.json', 2_000);
        await cache.confirmSourceSession(china);
        await cache.confirmSourceSession(japan);

        const chinaNext = await cache.getSourceSession(china.sourceKey, china.expiresAt);
        const japanCurrent = await cache.getSourceSession(japan.sourceKey, china.expiresAt);

        expect(chinaNext.refreshSource).toBe(true);
        expect(chinaNext.epoch).not.toBe(china.epoch);
        expect(japanCurrent.refreshSource).toBe(false);
        expect(japanCurrent.epoch).toBe(japan.epoch);
    });

    it('only returns rasters for the exact source epoch and style', async () => {
        const cache = makeCache();
        const session = await cache.getSourceSession('https://tiles.example/', 1_000);
        await cache.confirmSourceSession(session);
        const styleCss = '.road { stroke: #123456; }';
        const styleKey = getMapStyleCacheKey(styleCss);
        const raster = new Blob(['raster'], { type: 'image/webp' });

        await cache.putRaster(session, styleKey, styleCss, '13/1/2', raster, 2_000);
        const hit = await cache.getRaster(session, styleKey, styleCss, '13/1/2', 3_000);
        expect(hit).toBeDefined();
        await cache.putRaster(session, styleKey, styleCss, '13/1/3', raster, 3_000);
        expect(await cache.getRaster(session, styleKey, styleCss, '13/1/3', session.expiresAt)).toBeUndefined();

        expect(await cache.getRaster(session, styleKey, '.road {}', '13/1/2', 3_000)).toBeUndefined();

        const nextSession = await cache.getSourceSession('https://tiles.example/', session.expiresAt);
        expect(
            await cache.getRaster(nextSession, styleKey, styleCss, '13/1/2', nextSession.expiresAt - 1)
        ).toBeUndefined();
    });

    it('isolates the same logical tile through the existing source key', async () => {
        const cache = makeCache();
        const china = await cache.getSourceSession('https://cn.tiles.example/manifest.json', 1_000);
        const japan = await cache.getSourceSession('https://jp.tiles.example/manifest.json', 1_000);
        await cache.confirmSourceSession(china);
        await cache.confirmSourceSession(japan);
        const styleCss = '.road { stroke: #123456; }';
        const styleKey = getMapStyleCacheKey(styleCss);
        const raster = new Blob(['china'], { type: 'image/webp' });

        await cache.putRaster(china, styleKey, styleCss, '13/1/2', raster, 2_000);

        expect(await cache.getRaster(china, styleKey, styleCss, '13/1/2', 3_000)).toBeDefined();
        expect(await cache.getRaster(japan, styleKey, styleCss, '13/1/2', 3_000)).toBeUndefined();
    });

    it('persists a null blob as a failed raster result', async () => {
        const cache = makeCache();
        const session = await cache.getSourceSession('https://tiles.example/', 1_000);
        await cache.confirmSourceSession(session);
        const styleCss = '.road { stroke: #123456; }';
        const styleKey = getMapStyleCacheKey(styleCss);

        await cache.putRaster(session, styleKey, styleCss, '13/1/2', null, 2_000);

        expect(await cache.getRaster(session, styleKey, styleCss, '13/1/2', 3_000)).toBeNull();
    });

    it('includes the raster resolution in the style cache key', () => {
        expect(getMapStyleCacheKey('.road {}')).toMatch(/^v2-4096-/);
    });
});
