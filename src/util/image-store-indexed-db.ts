import { logger } from '@railmapgen/rmg-runtime';
import { MiscNodeId } from '../constants/constants';

export class ImageStoreIndexedDB {
    private dbName = 'ImageDB';
    private storeName = 'images';
    private dbPromise: Promise<IDBDatabase> | null = null;

    constructor() {
        this.getDB().catch(() => {
            logger.error('IndexDB initialization failed.');
        });
    }

    private getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = event => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onclose = () => {
                    this.dbPromise = null;
                    logger.info('IndexDB connection closed.');
                };
                db.onversionchange = () => {
                    db.close();
                    this.dbPromise = null;
                    logger.warn('IndexDB connection closed due to version change.');
                };
                resolve(db);
            };

            request.onerror = () => {
                this.dbPromise = null;
                reject(request.error);
            };
        });

        return this.dbPromise;
    }

    async has(id: string): Promise<boolean> {
        const value = await this.get(id);
        return value !== undefined;
    }

    async save(id: string, base64: string): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(base64, id);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async get(id: string): Promise<string | undefined> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(id);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(): Promise<Map<string, string>> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.openCursor();
        const result = new Map<string, string>();
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

    async delete(id: string): Promise<void> {
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

    async deleteExcept(keepIds: string[]): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.openCursor();
        const keepSet = new Set(keepIds);

        return new Promise((resolve, reject) => {
            request.onsuccess = event => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (!keepSet.has(cursor.key as string)) {
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
