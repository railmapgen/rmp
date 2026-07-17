import { describe, expect, it } from 'vitest';
import {
    getMapInitialViewport,
    graphToWorldPixel,
    isMapZoomed,
    MAP_INITIAL_VIEWBOX_ZOOM,
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

    it('centres the initial viewport on the configured world origin', () => {
        const viewport = getMapInitialViewport(1000, 600);
        const scale = MAP_INITIAL_VIEWBOX_ZOOM / 100;
        expect(viewport.x + (1000 * scale) / 2).toBe(0);
        expect(viewport.y + (600 * scale) / 2).toBe(0);
    });

    it('switches to zoomed at the configured inclusive threshold', () => {
        expect(isMapZoomed(MAP_ZOOMED_SWITCH_THRESHOLD + 1)).toBe(false);
        expect(isMapZoomed(MAP_ZOOMED_SWITCH_THRESHOLD)).toBe(true);
    });
});
