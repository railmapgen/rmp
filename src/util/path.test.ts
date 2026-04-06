import { describe, expect, it } from 'vitest';
import { concatOpenPaths, makeLinearPath, makePoint } from './path';

describe('concatOpenPaths', () => {
    it('should collapse collinear linear segments back into a linear path', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(5, 0)),
            makeLinearPath(makePoint(5, 0), makePoint(10, 0)),
            makeLinearPath(makePoint(10, 0), makePoint(20, 0)),
        ]);

        expect(path.kind).toBe('ml');
        expect(path.d).toBe('M 0 0 L 20 0');
    });

    it('should keep non-collinear joined segments as a sharp turn', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(10, 0)),
            makeLinearPath(makePoint(10, 0), makePoint(10, 10)),
        ]);

        expect(path.kind).toBe('mll');
        expect(path.d).toBe('M 0 0 L 10 0 L 10 10');
    });
});
