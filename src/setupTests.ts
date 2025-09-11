import { vi } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

(globalThis as any).indexedDB = indexedDB;
(globalThis as any).IDBKeyRange = IDBKeyRange;

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
