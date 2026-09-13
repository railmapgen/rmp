import { describe, expect, it } from 'vitest';
import { ByteLru } from './byte-lru';

describe('ByteLru', () => {
    it('evicts the least recently used entries by byte budget', () => {
        const cache = new ByteLru<string>(5);
        cache.set('a', 'A', 2);
        cache.set('b', 'B', 2);
        expect(cache.get('a')).toBe('A');
        cache.set('c', 'C', 2);

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')).toBe('A');
        expect(cache.get('c')).toBe('C');
        expect(cache.bytes).toBe(4);
    });

    it('also enforces an entry limit', () => {
        const cache = new ByteLru<string>(100, 2);
        cache.set('a', 'A', 1);
        cache.set('b', 'B', 1);
        cache.set('c', 'C', 1);

        expect(cache.size).toBe(2);
        expect(cache.get('a')).toBeUndefined();
    });
});
