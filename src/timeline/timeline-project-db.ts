import {
    makeTimelineAssetKey,
    TimelineAssetKind,
    TimelineAssetRecord,
    TimelineProjectRecord,
    TimelineProjectSummary,
} from './timeline-project';

const DB_NAME = 'RmpTimelineDB';
const DB_VERSION = 1;
const PROJECTS = 'projects';
const ASSETS = 'assets';
const META = 'meta';
const LAST_PROJECT_ID = 'lastProjectId';

const requestResult = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const transactionDone = (transaction: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });

export class TimelineProjectDB {
    private dbPromise?: Promise<IDBDatabase>;
    private writeQueues = new Map<string, Promise<unknown>>();

    constructor(private readonly dbName = DB_NAME) {}

    private getDB() {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(ASSETS)) {
                    const assets = db.createObjectStore(ASSETS, { keyPath: 'key' });
                    assets.createIndex('projectId', 'projectId');
                }
                if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
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

    private enqueue<T>(projectId: string, write: () => Promise<T>): Promise<T> {
        const previous = this.writeQueues.get(projectId) ?? Promise.resolve();
        const next = previous.catch(() => undefined).then(write);
        this.writeQueues.set(projectId, next);
        return next.finally(() => {
            if (this.writeQueues.get(projectId) === next) this.writeQueues.delete(projectId);
        });
    }

    async listProjects(): Promise<TimelineProjectSummary[]> {
        const db = await this.getDB();
        const transaction = db.transaction(PROJECTS, 'readonly');
        const records = await requestResult(
            transaction.objectStore(PROJECTS).getAll() as IDBRequest<TimelineProjectRecord[]>
        );
        return records
            .map(({ id, name, version, createdAt, updatedAt }) => ({ id, name, version, createdAt, updatedAt }))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    async getProject(id: string): Promise<TimelineProjectRecord | undefined> {
        const db = await this.getDB();
        return requestResult(
            db.transaction(PROJECTS, 'readonly').objectStore(PROJECTS).get(id) as IDBRequest<
                TimelineProjectRecord | undefined
            >
        );
    }

    async getLastProjectId(): Promise<string | undefined> {
        const db = await this.getDB();
        return requestResult(
            db.transaction(META, 'readonly').objectStore(META).get(LAST_PROJECT_ID) as IDBRequest<string | undefined>
        );
    }

    async setLastProjectId(id?: string): Promise<void> {
        const db = await this.getDB();
        const transaction = db.transaction(META, 'readwrite');
        const store = transaction.objectStore(META);
        if (id) store.put(id, LAST_PROJECT_ID);
        else store.delete(LAST_PROJECT_ID);
        await transactionDone(transaction);
    }

    async createProject(
        record: TimelineProjectRecord,
        assets: Omit<TimelineAssetRecord, 'key' | 'projectId'>[]
    ): Promise<void> {
        return this.enqueue(record.id, async () => {
            const db = await this.getDB();
            const transaction = db.transaction([PROJECTS, ASSETS, META], 'readwrite');
            transaction.objectStore(PROJECTS).add(structuredClone(record));
            const assetStore = transaction.objectStore(ASSETS);
            for (const asset of assets) {
                assetStore.put({
                    ...asset,
                    projectId: record.id,
                    key: makeTimelineAssetKey(record.id, asset.kind, asset.id),
                } satisfies TimelineAssetRecord);
            }
            transaction.objectStore(META).put(record.id, LAST_PROJECT_ID);
            await transactionDone(transaction);
        });
    }

    async saveProject(record: TimelineProjectRecord): Promise<void> {
        return this.enqueue(record.id, async () => {
            const db = await this.getDB();
            const transaction = db.transaction(PROJECTS, 'readwrite');
            transaction.objectStore(PROJECTS).put(structuredClone(record));
            await transactionDone(transaction);
        });
    }

    async saveProjectWithAssets(
        record: TimelineProjectRecord,
        assets: Omit<TimelineAssetRecord, 'key' | 'projectId'>[]
    ): Promise<void> {
        return this.enqueue(record.id, async () => {
            const db = await this.getDB();
            const transaction = db.transaction([PROJECTS, ASSETS], 'readwrite');
            transaction.objectStore(PROJECTS).put(structuredClone(record));
            const store = transaction.objectStore(ASSETS);
            for (const asset of assets) {
                store.put({
                    ...asset,
                    projectId: record.id,
                    key: makeTimelineAssetKey(record.id, asset.kind, asset.id),
                } satisfies TimelineAssetRecord);
            }
            await transactionDone(transaction);
        });
    }

    async renameProject(id: string, name: string): Promise<TimelineProjectRecord> {
        return this.enqueue(id, async () => {
            const db = await this.getDB();
            const transaction = db.transaction(PROJECTS, 'readwrite');
            const store = transaction.objectStore(PROJECTS);
            const record = await requestResult(store.get(id) as IDBRequest<TimelineProjectRecord | undefined>);
            if (!record) {
                transaction.abort();
                throw new Error('Timeline project not found');
            }
            const next = { ...record, name, updatedAt: Date.now() };
            store.put(next);
            await transactionDone(transaction);
            return next;
        });
    }

    async deleteProject(id: string): Promise<void> {
        await this.enqueue(id, async () => {
            const db = await this.getDB();
            const transaction = db.transaction([PROJECTS, ASSETS, META], 'readwrite');
            transaction.objectStore(PROJECTS).delete(id);
            const assets = transaction.objectStore(ASSETS).index('projectId');
            const cursorRequest = assets.openKeyCursor(IDBKeyRange.only(id));
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) return;
                transaction.objectStore(ASSETS).delete(cursor.primaryKey);
                cursor.continue();
            };
            const meta = transaction.objectStore(META);
            const last = await requestResult(meta.get(LAST_PROJECT_ID) as IDBRequest<string | undefined>);
            if (last === id) meta.delete(LAST_PROJECT_ID);
            await transactionDone(transaction);
        });
    }

    async putAsset(projectId: string, kind: TimelineAssetKind, id: string, blob: Blob, name?: string) {
        return this.enqueue(projectId, async () => {
            const db = await this.getDB();
            const transaction = db.transaction(ASSETS, 'readwrite');
            transaction.objectStore(ASSETS).put({
                key: makeTimelineAssetKey(projectId, kind, id),
                projectId,
                kind,
                id,
                blob,
                name,
            } satisfies TimelineAssetRecord);
            await transactionDone(transaction);
        });
    }

    async garbageCollectAssets(
        projectId: string,
        retained: { image: ReadonlySet<string>; audio: ReadonlySet<string> }
    ): Promise<void> {
        return this.enqueue(projectId, async () => {
            const db = await this.getDB();
            const transaction = db.transaction(ASSETS, 'readwrite');
            const store = transaction.objectStore(ASSETS);
            const cursorRequest = store.index('projectId').openCursor(IDBKeyRange.only(projectId));
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) return;
                const asset = cursor.value as TimelineAssetRecord;
                if (!retained[asset.kind].has(asset.id)) cursor.delete();
                cursor.continue();
            };
            await transactionDone(transaction);
        });
    }

    async getAsset(projectId: string, kind: TimelineAssetKind, id: string): Promise<TimelineAssetRecord | undefined> {
        const db = await this.getDB();
        return requestResult(
            db
                .transaction(ASSETS, 'readonly')
                .objectStore(ASSETS)
                .get(makeTimelineAssetKey(projectId, kind, id)) as IDBRequest<TimelineAssetRecord | undefined>
        );
    }

    async getAssets(projectId: string): Promise<TimelineAssetRecord[]> {
        const db = await this.getDB();
        return requestResult(
            db.transaction(ASSETS, 'readonly').objectStore(ASSETS).index('projectId').getAll(projectId) as IDBRequest<
                TimelineAssetRecord[]
            >
        );
    }
}

export const timelineProjectDB = new TimelineProjectDB();
