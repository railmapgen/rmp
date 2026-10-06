import { describe, expect, it } from 'vitest';
import { makeCubicPath, makeLinearPath, makePoint } from '../constants/path';
import { createGeographicLengthProfile } from './geographic-length';
import { MAP_COMMON_ZOOM, MAP_TILE_SIZE, worldPixelToGraph } from './map-config';

const pointAt = (longitude: number, latitude: number) => {
    const size = MAP_TILE_SIZE * 2 ** MAP_COMMON_ZOOM;
    const radians = (latitude * Math.PI) / 180;
    return worldPixelToGraph({
        x: ((longitude + 180) / 360) * size,
        y: ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * size,
    });
};

describe('geographic route lengths', () => {
    it('converts projected routes to kilometres and accounts for latitude', () => {
        const equator = createGeographicLengthProfile(makeLinearPath(pointAt(0, 0), pointAt(1, 0)));
        const north = createGeographicLengthProfile(makeLinearPath(pointAt(0, 60), pointAt(1, 60)));
        expect(equator.totalKm).toBeCloseTo(111.195, 2);
        expect(north.totalKm).toBeCloseTo(equator.totalKm / 2, 2);
        expect(equator.lengthAt(0.5)).toBeCloseTo(equator.totalKm / 2, 3);
    });

    it('measures the revealed portion from the correct end as latitude changes', () => {
        const profile = createGeographicLengthProfile(makeLinearPath(pointAt(0, 0), pointAt(0, 60)));
        expect(profile.totalKm).toBeCloseTo((6371.0088 * Math.PI) / 3, 3);
        expect(profile.lengthAt(0.5)).toBeGreaterThan(profile.lengthAt(0.5, true));
        expect(profile.lengthAt(0.5) + profile.lengthAt(0.5, true)).toBeCloseTo(profile.totalKm, 6);
        expect(profile.lengthAt(0)).toBe(0);
        expect(profile.lengthAt(0, true)).toBe(0);
        expect(profile.lengthAt(1, true)).toBeCloseTo(profile.totalKm);
    });

    it('follows curves and bends rather than measuring only station endpoints', () => {
        const start = pointAt(0, 0);
        const end = pointAt(0.01, 0);
        const path = makeCubicPath(start, makePoint(start.x, start.y - 100), makePoint(end.x, end.y - 100), end);
        const curved = createGeographicLengthProfile(path);
        const straight = createGeographicLengthProfile(makeLinearPath(start, end));
        expect(curved.totalKm).toBeGreaterThan(straight.totalKm * 2);
        expect(curved.lengthAt(0.5)).toBeCloseTo(curved.totalKm / 2, 3);
        expect(createGeographicLengthProfile(makeLinearPath(start, start)).lengthAt(1)).toBe(0);
    });
});
