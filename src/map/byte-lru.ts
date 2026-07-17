interface ByteLruEntry<T> {
    value: T;
    bytes: number;
}

export class ByteLru<T> {
    private readonly entries = new Map<string, ByteLruEntry<T>>();
    private retainedBytes = 0;

    constructor(
        private readonly maxBytes: number,
        private readonly maxEntries = Number.POSITIVE_INFINITY
    ) {
        if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
            throw new Error('LRU byte budget must be a positive safe integer');
        }
        if (maxEntries !== Number.POSITIVE_INFINITY && (!Number.isSafeInteger(maxEntries) || maxEntries < 1)) {
            throw new Error('LRU entry budget must be a positive safe integer');
        }
    }

    get size() {
        return this.entries.size;
    }

    get bytes() {
        return this.retainedBytes;
    }

    get(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }

    set(key: string, value: T, bytes: number): T {
        if (!Number.isSafeInteger(bytes) || bytes < 0) {
            throw new Error('LRU entry bytes must be a non-negative safe integer');
        }
        this.delete(key);
        this.entries.set(key, { value, bytes });
        this.retainedBytes += bytes;
        while (this.retainedBytes > this.maxBytes || this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined) break;
            this.delete(oldest);
        }
        return value;
    }

    delete(key: string): boolean {
        const entry = this.entries.get(key);
        if (!entry) return false;
        this.entries.delete(key);
        this.retainedBytes -= entry.bytes;
        return true;
    }

    clear() {
        this.entries.clear();
        this.retainedBytes = 0;
    }
}
