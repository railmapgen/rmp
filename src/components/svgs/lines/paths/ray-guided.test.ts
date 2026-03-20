import { describe, expect, it } from 'vitest';
import {
    generateRayGuidedPath,
    makeDisabledRayGuidedSliderValues,
    makeRayGuidedPathAttributes,
    normalizeRayGuidedAngle,
} from './ray-guided';

describe('ray-guided path', () => {
    it('should generate a corner from the two guide lines', () => {
        const path = generateRayGuidedPath(0, 100, 0, 100, {
            startAngle: 90,
            endAngle: 0,
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 0,
        });

        expect(path).toBe('M 0 0 L 100 0 L 100 100');
    });

    it('should fall back to a direct line when the guide lines are parallel', () => {
        const path = generateRayGuidedPath(0, 100, 0, 100, {
            startAngle: 0,
            endAngle: 0,
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 10,
        });

        expect(path).toBe('M 0 0 L 100 100');
    });

    it('should apply offsets along each guide ray clockwise normal', () => {
        const path = generateRayGuidedPath(0, 100, 0, 100, {
            startAngle: 0,
            endAngle: 90,
            offsetFrom: 10,
            offsetTo: 20,
            roundCornerFactor: 0,
        });

        expect(path).toBe('M 10 0 L 10 120 L 100 120');
    });

    it('should use fixed orthogonal default attributes', () => {
        const attrs = makeRayGuidedPathAttributes();

        expect(attrs).toMatchObject({
            startAngle: 0,
            endAngle: 90,
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 10,
        });
    });

    it('should normalize angles into the new 0..179 range', () => {
        expect(normalizeRayGuidedAngle(180)).toBe(0);
        expect(normalizeRayGuidedAngle(-90)).toBe(90);
        expect(normalizeRayGuidedAngle(179.8)).toBe(179);
    });

    it('should disable +/- 5 degrees on both halves of the undirected angle model', () => {
        const disabledValues = makeDisabledRayGuidedSliderValues(0);

        expect(disabledValues).toEqual(expect.arrayContaining([0, 1, 5, 175, 179, 180, 181, 185, 355, 359]));
        expect(disabledValues).not.toEqual(expect.arrayContaining([6, 174, 186, 354]));
    });
});
