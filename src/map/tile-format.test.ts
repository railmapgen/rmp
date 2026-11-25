import { describe, expect, it } from 'vitest';
import { hasAvailableTile, parseAvailability, parseBundle } from './tile-format';

const fullBundleV2 = (side: number) => {
    const payload = new TextEncoder().encode('<svg/>');
    const tileCount = side * side;
    const payloadOffset = 24 + tileCount * 12;
    const buffer = new ArrayBuffer(payloadOffset + tileCount * payload.length);
    const bytes = new Uint8Array(buffer);
    bytes.set([82, 77, 80, 66, 2, 13, side, 0]);
    const view = new DataView(buffer);
    view.setUint32(8, tileCount, true);
    view.setUint32(12, 10, true);
    view.setUint32(16, 20, true);
    view.setUint32(20, payloadOffset, true);
    for (let index = 0; index < tileCount; index += 1) {
        const offset = 24 + index * 12;
        bytes[offset] = index % side;
        bytes[offset + 1] = Math.floor(index / side);
        view.setUint32(offset + 4, index * payload.length, true);
        view.setUint32(offset + 8, payload.length, true);
        bytes.set(payload, payloadOffset + index * payload.length);
    }
    return buffer;
};

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
        expect(bundle.format).toBe('RMPB1');
        expect(bundle.address).toEqual({ zoom: 13, side: 8, x: 100, y: 50 });
        expect(bundle.entries.get('13/802/403')).toEqual({ start: 32, length: payload.length });

        bytes[6] = 16;
        expect(() => parseBundle(buffer)).toThrow('Invalid RMPB side 16');
    });

    it.each([1, 2, 4, 8, 16, 32, 64])('parses all entries of a side-%i RMPB2 bundle without copying payloads', side => {
        const buffer = fullBundleV2(side);
        const bundle = parseBundle(buffer);
        const count = side * side;
        const payloadOffset = 24 + count * 12;
        expect(bundle.format).toBe('RMPB2');
        expect(bundle.address).toEqual({ zoom: 13, side, x: 10, y: 20 });
        expect(bundle.bytes.buffer).toBe(buffer);
        expect(bundle.entries.size).toBe(count);
        for (let index = 0; index < count; index += 1) {
            const x = 10 * side + (index % side);
            const y = 20 * side + Math.floor(index / side);
            const entry = bundle.entries.get(`13/${x}/${y}`);
            expect(entry).toEqual({ start: payloadOffset + index * 6, length: 6 });
        }
    });

    it.each([20, 21, 22, 23])('rejects a truncated RMPB2 header of %i bytes', length => {
        expect(() => parseBundle(fullBundleV2(1).slice(0, length))).toThrow('Invalid RMPB header length');
    });

    it.each([
        { offset: 4, value: 3, error: 'Unsupported RMPB version 3' },
        { offset: 6, value: 128, error: 'Invalid RMPB side 128' },
        { offset: 7, value: 1, error: 'Invalid RMPB reserved bytes' },
        { offset: 8, value: 0, error: 'Invalid RMPB tile count 0' },
        { offset: 8, value: 2, error: 'Invalid RMPB tile count 2' },
        { offset: 20, value: 32, error: 'Invalid RMPB payload offset' },
        { offset: 24, value: 1, error: 'Invalid RMPB local coordinate' },
        { offset: 26, value: 1, error: 'Invalid RMPB reserved bytes' },
        { offset: 28, value: 1, error: 'Invalid RMPB payload span' },
        { offset: 32, value: 7, error: 'RMPB payload span is out of range' },
    ])('rejects malformed RMPB2 fields: $error at byte $offset', ({ offset, value, error }) => {
        const buffer = fullBundleV2(1);
        new Uint8Array(buffer)[offset] = value;
        expect(() => parseBundle(buffer)).toThrow(error);
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
