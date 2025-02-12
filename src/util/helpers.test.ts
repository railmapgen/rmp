import { describe, expect, it } from 'vitest';
import { roundToMultiple } from './helpers';

describe('unit tests for round to multiple function', () => {
    // Test rounding to the nearest integer when base=1
    it('should round to the nearest integer when base=1', () => {
        expect(roundToMultiple(12.3, 1)).toBe(12);
        expect(roundToMultiple(12.6, 1)).toBe(13);
        expect(roundToMultiple(15.5, 1)).toBe(16);
        expect(roundToMultiple(14.999, 1)).toBe(15);
    });

    // Test rounding to the nearest 0.5 multiple
    it('should round to the nearest 0.5 multiple', () => {
        expect(roundToMultiple(12.3, 0.5)).toBe(12.5);
        expect(roundToMultiple(12.6, 0.5)).toBe(12.5);
        expect(roundToMultiple(12.75, 0.5)).toBe(13);
        expect(roundToMultiple(12.25, 0.5)).toBe(12.5);
    });

    // Test rounding to the nearest 0.01 multiple (2 decimal places)
    it('should round to the nearest 0.01 multiple with 2 decimal places', () => {
        expect(roundToMultiple(12.344, 0.01)).toBe(12.34);
        expect(roundToMultiple(12.345, 0.01)).toBe(12.35);
        expect(roundToMultiple(12.349, 0.01)).toBe(12.35);
        expect(roundToMultiple(12.341, 0.01)).toBe(12.34);
    });

    // Test edge cases
    it('should handle edge cases correctly', () => {
        // Handle floating-point precision issues
        expect(roundToMultiple(0.1 + 0.2, 0.01)).toBe(0.3);
        expect(roundToMultiple(1.0000001, 0.001)).toBe(1);

        // Handle negative numbers
        expect(roundToMultiple(-12.3, 1)).toBe(-12);
        expect(roundToMultiple(-12.6, 1)).toBe(-13);
        expect(roundToMultiple(-12.75, 0.5)).toBe(-12.5);

        // Handle zero
        expect(roundToMultiple(0, 1)).toBe(0);
        expect(roundToMultiple(0, 0.5)).toBe(0);
        expect(roundToMultiple(0, 0.01)).toBe(0);
    });

    // Test auto-calculation of decimal places based on base
    it('should auto-calculate decimal places based on base', () => {
        // base=0.1 → 1 decimal place
        expect(roundToMultiple(12.34, 0.1)).toBe(12.3);
        expect(roundToMultiple(12.36, 0.1)).toBe(12.4);

        // base=0.25 → 2 decimal places
        expect(roundToMultiple(12.24, 0.25)).toBe(12.25);
        expect(roundToMultiple(12.26, 0.25)).toBe(12.25);

        // base=0.001 → 3 decimal places
        expect(roundToMultiple(12.3456, 0.001)).toBe(12.346);
        expect(roundToMultiple(12.3454, 0.001)).toBe(12.345);
    });
});
