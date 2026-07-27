import { describe, expect, it } from 'vitest';
import {
    arcTo,
    closePath,
    cubicTo,
    lineTo,
    makeCompoundClosedAreaPath,
    makeClosedAreaPath,
    makeEmptyOpenPath,
    makeCubicPath,
    makeLinearPath,
    makePoint,
    makeRoundedTurnPath,
    moveTo,
} from '../constants/path';
import { concatOpenPaths, getEndPoint, isAreaPath, isOpenPath, parseRoundedTurnPath } from './path';

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

    it('should classify mixed linear and rounded segments as a complex open path', () => {
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

        expect(path.kind).toBe('complex-open');
        expect(path.d).toBe('M 0 0 L 10 0 L 15 0 C 20 0 20 5 20 10 L 25 10');
    });

    it('should reject an empty path list', () => {
        expect(() => concatOpenPaths([])).toThrow('concatOpenPaths() requires at least one path.');
    });
});

describe('parseRoundedTurnPath', () => {
    it('should parse rounded-turn svg path data back into structured form', () => {
        const path = parseRoundedTurnPath('M 0 0 L 10 0 C 12 0 14 6 16 8 L 20 8');

        expect(path.kind).toBe('mlcl');
        expect(path.d).toBe('M 0 0 L 10 0 C 12 0 14 6 16 8 L 20 8');
    });

    it('should reject malformed rounded-turn svg path data', () => {
        expect(() => parseRoundedTurnPath('M 0 0 L 10 0 C 12 0 14 6 16 8')).toThrow(
            'Expected 12 numeric values in path string, got 10.'
        );
    });
});

describe('getEndPoint', () => {
    it('should return the last drawable point of a closed area path', () => {
        const area = makeClosedAreaPath([
            moveTo(makePoint(0, 0)),
            lineTo(makePoint(10, 0)),
            cubicTo(makePoint(12, 0), makePoint(12, 8), makePoint(10, 10)),
            lineTo(makePoint(0, 10)),
            lineTo(makePoint(0, 0)),
            closePath(),
        ]);

        expect(getEndPoint(area)).toEqual(makePoint(0, 0));
    });

    it('should return the last drawable point of a compound closed area path', () => {
        const area = makeCompoundClosedAreaPath([
            [moveTo(makePoint(0, 0)), lineTo(makePoint(10, 0)), lineTo(makePoint(0, 0)), closePath()],
            [moveTo(makePoint(20, 0)), lineTo(makePoint(30, 0)), lineTo(makePoint(20, 0)), closePath()],
        ]);

        expect(area.kind).toBe('compound-closed-area');
        expect(area.d).toBe('M 0 0 L 10 0 L 0 0 Z M 20 0 L 30 0 L 20 0 Z');
        expect(getEndPoint(area)).toEqual(makePoint(20, 0));
    });

    it('should reject an empty open path', () => {
        expect(() => getEndPoint(makeEmptyOpenPath())).toThrow('Empty path does not have an endpoint.');
    });
});

describe('path kind guards', () => {
    it('distinguishes open centerlines from filled areas', () => {
        const open = makeLinearPath(makePoint(0, 0), makePoint(10, 0));
        const cubic = makeCubicPath(makePoint(0, 0), makePoint(3, 5), makePoint(7, 5), makePoint(10, 0));
        const area = makeClosedAreaPath([
            moveTo(makePoint(0, 0)),
            lineTo(makePoint(10, 0)),
            arcTo(5, 5, 0, false, false, makePoint(0, 0)),
            closePath(),
        ]);

        expect(isOpenPath(open)).toBe(true);
        expect(isOpenPath(cubic)).toBe(true);
        expect(isAreaPath(open)).toBe(false);
        expect(isOpenPath(area)).toBe(false);
        expect(isAreaPath(area)).toBe(true);
        expect(area.d).toBe('M 0 0 L 10 0 A 5 5 0 0 0 0 0 Z');
    });
});
