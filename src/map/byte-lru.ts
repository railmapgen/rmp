interface ByteLruEntry<T> {
    value: T;
    bytes: number;
}

/**
 * Bounds map caches by estimated payload size and, optionally, entry count.
 *
 * A byte budget controls downloaded bundle and SVG source data, while an entry
 * budget separately limits per-object DOM/runtime overhead that byte estimates
 * do not capture. `Map` insertion order provides the LRU order without another
 * index, as long as successful reads promote their entries.
 */
export class ByteLru<T> {
    private readonly entries = new Map<string, ByteLruEntry<T>>();
    private retainedBytes = 0;

    constructor(
        private readonly maxBytes: number,
        private readonly maxEntries = Number.POSITIVE_INFINITY
    ) {
        // Invalid budgets can make eviction non-terminating or silently defeat the memory bound.
        if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
            throw new Error('LRU byte budget must be a positive safe integer');
        }
        if (maxEntries !== Number.POSITIVE_INFINITY && (!Number.isSafeInteger(maxEntries) || maxEntries < 1)) {
            throw new Error('LRU entry budget must be a positive safe integer');
        }
    }

    /** Number of retained objects, used where object overhead matters independently of payload size. */
    get size() {
        return this.entries.size;
    }

    /** Exposes the caller-supplied byte estimates retained after eviction. */
    get bytes() {
        return this.retainedBytes;
    }

    /** Promotes a hit because later eviction removes the first Map entry. */
    get(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }

    /**
     * Replaces and promotes an entry, then evicts oldest entries until both
     * budgets are satisfied.
     */
    set(key: string, value: T, bytes: number): T {
        if (!Number.isSafeInteger(bytes) || bytes < 0) {
            throw new Error('LRU entry bytes must be a non-negative safe integer');
        }
        this.delete(key);
        this.entries.set(key, { value, bytes });
        this.retainedBytes += bytes;

        // An item larger than the entire budget is allowed to evict itself rather than violate the configured bound.
        while (this.retainedBytes > this.maxBytes || this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined) break;
            this.delete(oldest);
        }
        return value;
    }

    /** Removes an entry and its estimate together so byte accounting cannot drift. */
    delete(key: string): boolean {
        const entry = this.entries.get(key);
        if (!entry) return false;
        this.entries.delete(key);
        this.retainedBytes -= entry.bytes;
        return true;
    }

    /** Resets entries and accounting atomically for controller disposal. */
    clear() {
        this.entries.clear();
        this.retainedBytes = 0;
    }
}
