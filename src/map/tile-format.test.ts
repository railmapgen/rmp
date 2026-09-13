import { describe, expect, it } from 'vitest';
import { hasAvailableTile, parseAvailability, parseBundle } from './tile-format';

describe('tile format', () => {
    it('parses availability and tests bitmap coordinates', () => {
        const buffer = new ArrayBuffer(29);
        const bytes = new Uint8Array(buffer);
        bytes.set([...'RMPT'].map(char => char.charCodeAt(0)));
        bytes[4] = 1;
        bytes[5] = 7;
        const view = new DataView(buffer);
        view.setUint32(8, 10, true);
        view.setUint32(12, 20, true);
        view.setUint32(16, 2, true);
        view.setUint32(20, 2, true);
        view.setUint32(24, 2, true);
        bytes[28] = 0b1001;

        const index = parseAvailability(buffer);
        expect(hasAvailableTile(index, 10, 20)).toBe(true);
        expect(hasAvailableTile(index, 11, 20)).toBe(false);
        expect(hasAvailableTile(index, 11, 21)).toBe(true);
        expect(hasAvailableTile(index, 12, 21)).toBe(false);
    });

    it('parses an RMPB1 bundle entry', () => {
        const payload = new TextEncoder().encode('<svg/>');
        const buffer = new ArrayBuffer(32 + payload.length);
        const bytes = new Uint8Array(buffer);
        bytes.set([...'RMPB'].map(char => char.charCodeAt(0)));
        bytes[4] = 1;
        bytes[5] = 13;
        bytes[6] = 8;
        bytes[7] = 1;
        const view = new DataView(buffer);
        view.setUint32(8, 100, true);
        view.setUint32(12, 50, true);
        view.setUint32(16, 32, true);
        bytes[20] = 2;
        bytes[21] = 3;
        view.setUint32(24, 0, true);
        view.setUint32(28, payload.length, true);
        bytes.set(payload, 32);

        const bundle = parseBundle(buffer);
        expect(bundle.address).toEqual({ zoom: 13, side: 8, x: 100, y: 50 });
        expect(bundle.entries.get('13/802/403')).toEqual({ start: 32, length: payload.length });
    });

    it('rejects malformed headers', () => {
        expect(() => parseAvailability(new ArrayBuffer(28))).toThrow('Invalid availability magic');
        expect(() => parseBundle(new ArrayBuffer(20))).toThrow('Invalid RMPB magic');
    });

    it('rejects availability metadata that disagrees with the bitmap', () => {
        const buffer = new ArrayBuffer(29);
        const bytes = new Uint8Array(buffer);
        bytes.set([...'RMPT'].map(char => char.charCodeAt(0)));
        bytes[4] = 1;
        bytes[5] = 7;
        const view = new DataView(buffer);
        view.setUint32(8, 10, true);
        view.setUint32(12, 20, true);
        view.setUint32(16, 2, true);
        view.setUint32(20, 2, true);
        view.setUint32(24, 1, true);
        bytes[28] = 0b1001;

        expect(() => parseAvailability(buffer)).toThrow('Invalid availability tile count');
    });
});
