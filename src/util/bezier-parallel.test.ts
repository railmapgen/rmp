import { describe, expect, it } from 'vitest';
import { makeLinearPath, makePoint, makeRoundedTurnPath, makeSharpTurnPath } from '../constants/path';
import { concatOpenPaths } from './path';
import { makeOpenPathOutline, makeOpenPathParallel } from './bezier-parallel';

describe('makeOpenPathParallel', () => {
    it('offsets a linear path on both sides', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(10, 0));
        const [pathA, pathB] = makeOpenPathParallel(path, 1);

        expect(pathA.d).toBe('M 0 -1 L 10 -1');
        expect(pathB.d).toBe('M 0 1 L 10 1');
    });

    it('offsets a sharp turn with line-line intersections', () => {
        const path = makeSharpTurnPath(makePoint(0, 0), makePoint(10, 0), makePoint(10, 10));
        const [pathA, pathB] = makeOpenPathParallel(path, 1);

        expect(pathA.d).toBe('M 0 -1 L 11 -1 L 11 10');
        expect(pathB.d).toBe('M 0 1 L 9 1 L 9 10');
    });

    it('preserves rounded turns without falling back to complex-open', () => {
        const path = makeRoundedTurnPath(
            makePoint(0, 0),
            makePoint(10, 0),
            makePoint(12, 0),
            makePoint(14, 6),
            makePoint(16, 8),
            makePoint(20, 8)
        );
        const [pathA, pathB] = makeOpenPathParallel(path, 1);

        expect(pathA.kind).toBe('mlcl');
        expect(pathB.kind).toBe('mlcl');
        if (pathA.kind !== 'mlcl' || pathB.kind !== 'mlcl') {
            throw new Error('Expected rounded turn offsets to remain rounded-turn paths.');
        }

        expect(pathA.commands[1].to.x - pathA.commands[0].to.x).toBeCloseTo(10);
        expect(pathA.commands[1].to.y - pathA.commands[0].to.y).toBeCloseTo(0);
        expect(pathA.commands[3].to.x - pathA.commands[2].to.x).toBeCloseTo(4);
        expect(pathA.commands[3].to.y - pathA.commands[2].to.y).toBeCloseTo(0);
        expect(pathB.commands[1].to.x - pathB.commands[0].to.x).toBeCloseTo(10);
        expect(pathB.commands[1].to.y - pathB.commands[0].to.y).toBeCloseTo(0);
        expect(pathB.commands[3].to.x - pathB.commands[2].to.x).toBeCloseTo(4);
        expect(pathB.commands[3].to.y - pathB.commands[2].to.y).toBeCloseTo(0);
    });

    it('offsets complex open paths with mixed line and cubic commands', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(10, 0)),
            makeRoundedTurnPath(
                makePoint(10, 0),
                makePoint(15, 0),
                makePoint(20, 0),
                makePoint(20, 5),
                makePoint(20, 10),
                makePoint(25, 10)
            ),
        ]);
        const [pathA, pathB] = makeOpenPathParallel(path, 1);

        expect(path.kind).toBe('complex-open');
        expect(pathA.kind).toBe('complex-open');
        expect(pathB.kind).toBe('complex-open');
        expect(pathA.d).not.toBe(path.d);
        expect(pathB.d).not.toBe(path.d);
        expect(pathA.d).not.toContain('NaN');
        expect(pathB.d).not.toContain('NaN');
    });
});

describe('makeOpenPathOutline', () => {
    it('creates a rectangular outline for a linear path', () => {
        const path = makeLinearPath(makePoint(0, 0), makePoint(10, 0));
        const outline = makeOpenPathOutline(path, 1);

        expect(outline.outline.d).toBe('M 0 -1 L 10 -1 L 10 1 L 0 1 Z');
    });

    it('creates a closed outline for complex open paths', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(10, 0)),
            makeRoundedTurnPath(
                makePoint(10, 0),
                makePoint(15, 0),
                makePoint(20, 0),
                makePoint(20, 5),
                makePoint(20, 10),
                makePoint(25, 10)
            ),
        ]);
        const outline = makeOpenPathOutline(path, 1);

        expect(outline.outline.kind).toBe('closed-area');
        expect(outline.outline.d).toContain('Z');
        expect(outline.outline.d).not.toContain('NaN');
    });
});
