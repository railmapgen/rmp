import { vi } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

(globalThis as any).indexedDB = indexedDB;
(globalThis as any).IDBKeyRange = IDBKeyRange;

const createLocalStorageMock = () => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, String(value));
        },
    };
};

if (typeof window.localStorage?.getItem !== 'function') {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
        value: localStorage,
        configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
        value: localStorage,
        configurable: true,
    });
}

const originalFetch = global.fetch;
global.fetch = vi.fn().mockImplementation((...args: any[]) => {
    if (args[0].toString().includes('/info.json')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => import('../info.json').then(module => module.default),
        }) as any;
    } else {
        console.warn('No mocked response for', args[0]);
        return originalFetch(args[0], args[1]);
    }
});
