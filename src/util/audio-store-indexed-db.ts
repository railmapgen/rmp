/** Persistent storage for imported audio. Blobs are not embedded in project JSON. */
export class AudioStoreIndexedDB {
    private dbPromise: Promise<IDBDatabase> | null = null;
    private readonly dbName = 'AudioDB';
    private readonly storeName = 'audio';

    private getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                this.dbPromise = null;
                reject(request.error);
            };
        });
        return this.dbPromise;
    }
    async save(id: string, blob: Blob) {
        const tx = (await this.getDB()).transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(blob, id);
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async get(id: string): Promise<Blob | undefined> {
        const request = (await this.getDB()).transaction(this.storeName).objectStore(this.storeName).get(id);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async delete(id: string) {
        const tx = (await this.getDB()).transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(id);
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async deleteExcept(ids: string[]) {
        const keep = new Set(ids);
        const tx = (await this.getDB()).transaction(this.storeName, 'readwrite');
        const request = tx.objectStore(this.storeName).openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            if (!keep.has(String(cursor.key))) cursor.delete();
            cursor.continue();
        };
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}
export const audioStoreIndexedDB = new AudioStoreIndexedDB();
