import { describe, expect, it } from 'vitest';
import { createMapAttribution, normalizeMapAttribution, setMapAttributionText } from './map-attribution';

describe('map attribution', () => {
    it('normalizes legacy OpenStreetMap credits without discarding unknown providers', () => {
        expect(normalizeMapAttribution('OpenStreetMap contributors / ODbL')).toBe('© OpenStreetMap contributors');
        expect(normalizeMapAttribution('OpenStreetMap contributors, ODbL 1.0')).toBe('© OpenStreetMap contributors');
        expect(normalizeMapAttribution('Example Maps')).toBe('© Example Maps');
    });

    it('keeps the background wide enough when attribution text changes without SVG layout metrics', () => {
        const attribution = createMapAttribution();
        const background = attribution.querySelector('[data-map-attribution-background]')!;
        const initialWidth = Number(background.getAttribute('width'));

        setMapAttributionText(attribution, 'A much longer attribution provider name');

        expect(Number(background.getAttribute('width'))).toBeGreaterThan(initialWidth);
    });
});
