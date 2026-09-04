import { MAP_RASTER_CACHE_MAX_BYTES, MAP_RASTER_TILE_SIZE, MAP_SOURCE_TTL_MS } from './map-config';

export interface MapSourceSession {
    sourceKey: string;
    epoch: string;
    expiresAt: number;
    refreshSource: boolean;
}

interface SourceRecord {
    sourceKey: string;
    epoch: string;
    expiresAt: number;
}

interface RasterRecord {
    key: string;
    sourceKey: string;
    sourceEpoch: string;
    styleKey: string;
    styleCss: string;
    tileKey: string;
    /** `null` negatively caches a raster that the browser failed to decode. */
    blob: Blob | null;
    byteLength: number;
    expiresAt: number;
    lastAccessedAt: number;
}

const SOURCE_STORE = 'sources';
const RASTER_STORE = 'rasters';

const requestResult = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const transactionDone = (transaction: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });

const rasterKey = (session: MapSourceSession, styleKey: string, tileKey: string) =>
    JSON.stringify([session.sourceKey, session.epoch, styleKey, tileKey]);

export const getMapStyleCacheKey = (styleCss: string) => {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < styleCss.length; index += 1) {
        const code = styleCss.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `v2-${MAP_RASTER_TILE_SIZE}-${styleCss.length}-${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
};

export class MapRasterCache {
    private dbPromise: Promise<IDBDatabase> | undefined;
    private writesSincePrune = 0;
    private prunePromise: Promise<void> | undefined;

    constructor(private readonly dbName = 'RmpMapRasterCache') {}

    async getSourceSession(sourceKey: string, now = Date.now()): Promise<MapSourceSession> {
        const db = await this.getDb();
        const readTransaction = db.transaction(SOURCE_STORE, 'readonly');
        const existing = (await requestResult(readTransaction.objectStore(SOURCE_STORE).get(sourceKey))) as
            | SourceRecord
            | undefined;
        await transactionDone(readTransaction);

        if (existing && existing.expiresAt > now) {
            return { ...existing, refreshSource: false };
        }

        const next: SourceRecord = {
            sourceKey,
            epoch: String(now),
            expiresAt: now + MAP_SOURCE_TTL_MS,
        };
        return { ...next, refreshSource: true };
    }

    async confirmSourceSession(session: MapSourceSession): Promise<MapSourceSession> {
        if (!session.refreshSource) return session;
        const next: SourceRecord = {
            sourceKey: session.sourceKey,
            epoch: session.epoch,
            expiresAt: session.expiresAt,
        };
        const db = await this.getDb();
        const writeTransaction = db.transaction(SOURCE_STORE, 'readwrite');
        writeTransaction.objectStore(SOURCE_STORE).put(next);
        await transactionDone(writeTransaction);
        void this.prune(session.expiresAt - MAP_SOURCE_TTL_MS).catch(() => undefined);
        return { ...next, refreshSource: false };
    }

    async getRaster(session: MapSourceSession, styleKey: string, styleCss: string, tileKey: string, now = Date.now()) {
        const db = await this.getDb();
        const key = rasterKey(session, styleKey, tileKey);
        const transaction = db.transaction(RASTER_STORE, 'readwrite');
        const store = transaction.objectStore(RASTER_STORE);
        const record = (await requestResult(store.get(key))) as RasterRecord | undefined;
        if (!record || record.expiresAt <= now || record.styleCss !== styleCss) {
            if (record) store.delete(key);
            await transactionDone(transaction);
            return undefined;
        }
        record.lastAccessedAt = now;
        store.put(record);
        await transactionDone(transaction);
        return record.blob;
    }

    async putRaster(
        session: MapSourceSession,
        styleKey: string,
        styleCss: string,
        tileKey: string,
        blob: Blob | null,
        now = Date.now()
    ) {
        if (session.expiresAt <= now) return;
        const record: RasterRecord = {
            key: rasterKey(session, styleKey, tileKey),
            sourceKey: session.sourceKey,
            sourceEpoch: session.epoch,
            styleKey,
            styleCss,
            tileKey,
            blob,
            byteLength: blob?.size ?? 0,
            expiresAt: session.expiresAt,
            lastAccessedAt: now,
        };
        const db = await this.getDb();
        const transaction = db.transaction(RASTER_STORE, 'readwrite');
        transaction.objectStore(RASTER_STORE).put(record);
        await transactionDone(transaction);
        this.writesSincePrune += 1;
        if (this.writesSincePrune >= 32) void this.prune(now).catch(() => undefined);
    }

    close() {
        void this.dbPromise?.then(
            db => db.close(),
            () => undefined
        );
        this.dbPromise = undefined;
    }

    private getDb() {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(SOURCE_STORE)) {
                    db.createObjectStore(SOURCE_STORE, { keyPath: 'sourceKey' });
                }
                if (!db.objectStoreNames.contains(RASTER_STORE)) {
                    db.createObjectStore(RASTER_STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    this.dbPromise = undefined;
                };
                resolve(db);
            };
            request.onerror = () => {
                this.dbPromise = undefined;
                reject(request.error);
            };
        });
        return this.dbPromise;
    }

    private prune(now: number) {
        if (this.prunePromise) return this.prunePromise;
        this.prunePromise = this.runPrune(now).finally(() => {
            this.writesSincePrune = 0;
            this.prunePromise = undefined;
        });
        return this.prunePromise;
    }

    private async runPrune(now: number) {
        const db = await this.getDb();
        const readTransaction = db.transaction(RASTER_STORE, 'readonly');
        const records = (await requestResult(readTransaction.objectStore(RASTER_STORE).getAll())) as RasterRecord[];
        await transactionDone(readTransaction);

        const expired = records.filter(record => record.expiresAt <= now);
        const live = records.filter(record => record.expiresAt > now);
        let totalBytes = live.reduce((sum, record) => sum + record.byteLength, 0);
        live.sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);
        const deleted = [...expired];
        for (const record of live) {
            if (totalBytes <= MAP_RASTER_CACHE_MAX_BYTES) break;
            deleted.push(record);
            totalBytes -= record.byteLength;
        }
        if (deleted.length === 0) return;
        const writeTransaction = db.transaction(RASTER_STORE, 'readwrite');
        const store = writeTransaction.objectStore(RASTER_STORE);
        for (const record of deleted) store.delete(record.key);
        await transactionDone(writeTransaction);
    }
}

export type MapRasterCacheApi = Pick<
    MapRasterCache,
    'getSourceSession' | 'confirmSourceSession' | 'getRaster' | 'putRaster'
>;

export const mapRasterCache = new MapRasterCache();
