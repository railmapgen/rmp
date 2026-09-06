import { describe, expect, it } from 'vitest';
import { decodeMapRouting, MAP_ROUTING, ownerForTile, sourceForTile } from './map-routing';

const fixture = () => ({
    formatVersion: 1,
    ownerZoom: 8,
    regions: [
        { id: 'china', ownerId: 1, origin: 'https://cn.tiles.example' },
        { id: 'japan', ownerId: 2, origin: 'https://jp.tiles.example' },
    ],
    runs: [
        { start: 20 * 256 + 10, length: 2, ownerId: 1 },
        { start: 21 * 256 + 12, length: 1, ownerId: 2 },
    ],
});

describe('map regional routing', () => {
    it('routes z8 tiles and their zoomed descendants to one regional source', () => {
        const routing = decodeMapRouting(fixture());

        expect(sourceForTile(routing, 8, 10, 20)?.id).toBe('china');
        expect(sourceForTile(routing, 13, 10 * 32 + 31, 20 * 32)?.id).toBe('china');
        expect(sourceForTile(routing, 13, 12 * 32, 21 * 32 + 31)?.id).toBe('japan');
        expect(sourceForTile(routing, 8, 9, 20)).toBeUndefined();
    });

    it('returns owner zero for unsupported or out-of-range coordinates', () => {
        const routing = decodeMapRouting(fixture());

        expect(ownerForTile(routing, 7, 10, 20)).toBe(0);
        expect(ownerForTile(routing, 8, -1, 20)).toBe(0);
        expect(ownerForTile(routing, 8, 256, 20)).toBe(0);
        expect(ownerForTile(routing, 13, 10.5, 20 * 32)).toBe(0);
    });

    it('rejects owner runs that cannot be resolved through the registry', () => {
        const value = fixture();
        value.runs[0].ownerId = 3;

        expect(() => decodeMapRouting(value)).toThrow(/ownerId 3.*registry/i);
    });

    it('ships a valid China and Japan routing snapshot', () => {
        expect(sourceForTile(MAP_ROUTING, 8, 214, 104)?.id).toBe('china');
        expect(sourceForTile(MAP_ROUTING, 8, 227, 100)?.id).toBe('japan');
    });
});
