import { MiscNodeId } from '../constants/constants';

export class ImageStoreIndexedDB {
    private dbName = 'ImageDB';
    private storeName = 'images';

    constructor() {
        this.initDB();
    }

    private initDB() {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = event => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName);
            }
        };
        request.onerror = () => {
            console.error('IndexDB initialization failed.');
        };
    }

    private getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async has(id: MiscNodeId): Promise<boolean> {
        const value = await this.get(id);
        return value !== undefined;
    }

    async save(id: MiscNodeId, base64: string): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(base64, id);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async get(id: MiscNodeId): Promise<string | undefined> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(id);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(): Promise<Map<MiscNodeId, string>> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.openCursor();
        const result = new Map<MiscNodeId, string>();
        return new Promise((resolve, reject) => {
            request.onsuccess = event => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    result.set(cursor.key as MiscNodeId, cursor.value as string);
                    cursor.continue();
                } else {
                    resolve(result);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async delete(id: MiscNodeId): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.delete(id);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async clear(): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.clear();
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async deleteExcept(keepIds: MiscNodeId[]): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.openCursor();
        const keepSet = new Set(keepIds);

        return new Promise((resolve, reject) => {
            request.onsuccess = event => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (!keepSet.has(cursor.key as MiscNodeId)) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

export const imageStoreIndexedDB = new ImageStoreIndexedDB();
