import { describe, expect, it } from 'vitest';
import { roundPathCorners } from './pathRounding';

const countCommand = (pathD: string, command: string) => pathD.split(/\s+/).filter(token => token === command).length;

describe('roundPathCorners', () => {
    it('should return the original path when radius is zero', () => {
        const pathD = 'M 0 0 L 100 0 L 100 100';

        expect(roundPathCorners(pathD, 0, false)).toBe(pathD);
    });

    it('should round a basic line-line corner', () => {
        const rounded = roundPathCorners('M 0 0 L 100 0 L 100 100', 10, false);

        expect(rounded).toBe('M 0 0 L 90 0 C 95 0 100 5 100 10 L 100 100 ');
    });

    it('should support fractional radius rounding', () => {
        const rounded = roundPathCorners('M 0 0 L 100 0 L 100 100', 0.25, true);

        expect(rounded).toBe('M 0 0 L 75 0 C 87.5 0 100 12.5 100 25 L 100 100 ');
    });

    it('should parse comma-separated coordinates', () => {
        const rounded = roundPathCorners('M 0,0 L 100,0 L 100,100', 10, false);

        expect(rounded).toBe('M 0 0 L 90 0 C 95 0 100 5 100 10 L 100 100 ');
    });

    it('should parse signed decimal operands', () => {
        const rounded = roundPathCorners('M -10.5 .5 L 20.25 -.5 L 30 40.75', 5, false);

        expect(rounded).toContain(' C ');
        expect(rounded).toContain('M -10.5 .5');
        expect(rounded).toContain('L 30 40.75');
    });

    it('should round paths containing scientific notation numbers', () => {
        const rounded = roundPathCorners('M 515.07 0 L 515.07 5.684341886080802e-14 L 592.16 77.09', 10, false);

        expect(rounded).toContain(' C ');
        expect(rounded).not.toContain(' e ');
    });

    it('should parse scientific notation as numeric operands', () => {
        const rounded = roundPathCorners('M 1e2 0 L 1e2 1e2 L 2e2 1e2', 10, false);

        expect(rounded).toBe('M 1e2 0 L 100 90 C 100 95 105 100 110 100 L 2e2 1e2 ');
    });

    it('should handle commands concatenated with numeric operands', () => {
        const rounded = roundPathCorners('M0 0L100 0L100 100', 10, false);

        expect(rounded).toBe('M 0 0 L 90 0 C 95 0 100 5 100 10 L 100 100 ');
    });

    it('should pass through paths without line-line corners', () => {
        expect(roundPathCorners('M 0 0 L 100 0', 10, false)).toBe('M 0 0 L 100 0 ');
        expect(roundPathCorners('M 0 0 L 100 0 C 110 0 120 10 130 10', 10, false)).toBe(
            'M 0 0 L 100 0 C 110 0 120 10 130 10 '
        );
    });

    it('should round virtual closing corners in closed paths', () => {
        const rounded = roundPathCorners('M 0 0 L 100 0 L 100 100 Z', 10, false);

        expect(rounded).toMatch(/^M 10 0 /);
        expect(rounded).toContain(' Z ');
        expect(countCommand(rounded, 'C')).toBe(3);
    });

    it('should round multiple consecutive line-line corners', () => {
        const rounded = roundPathCorners('M 0 0 L 100 0 L 100 100 L 200 100', 10, false);

        expect(rounded).toBe('M 0 0 L 90 0 C 95 0 100 5 100 10 L 100 90 C 100 95 105 100 110 100 L 200 100 ');
    });
});
