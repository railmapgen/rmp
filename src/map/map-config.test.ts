import { describe, expect, it } from 'vitest';
import {
    graphToWorldPixel,
    isMapZoomed,
    MAP_RASTER_IDLE_DELAY_MS,
    MAP_ZOOMED_SWITCH_THRESHOLD,
    worldPixelToGraph,
} from './map-config';

describe('map config', () => {
    it('round trips graph and world coordinates', () => {
        const point = { x: 1234.5, y: -678.25 };
        const roundTrip = worldPixelToGraph(graphToWorldPixel(point));
        expect(roundTrip.x).toBeCloseTo(point.x);
        expect(roundTrip.y).toBeCloseTo(point.y);
    });

    it('switches to zoomed at the configured inclusive threshold', () => {
        expect(isMapZoomed(MAP_ZOOMED_SWITCH_THRESHOLD + 1)).toBe(false);
        expect(isMapZoomed(MAP_ZOOMED_SWITCH_THRESHOLD)).toBe(true);
    });

    it('waits five idle seconds before starting background rasterization', () => {
        expect(MAP_RASTER_IDLE_DELAY_MS).toBe(5_000);
    });
});
