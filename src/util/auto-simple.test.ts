import { describe, expect, it } from 'vitest';
import { LinePathType } from '../constants/lines';
import { checkSimplePathAvailability } from './auto-simple';

describe.each([LinePathType.Diagonal, LinePathType.RotatePerpendicular])('checkSimplePathAvailability for %s', type => {
    const attrs = { startFrom: 'from' as const, offsetFrom: 0, offsetTo: 0, roundCornerFactor: 10 };

    it('recognizes a decimal 45-degree line despite rounding', () => {
        expect(checkSimplePathAvailability(type, 217.27, 387.73, 247.88, 357.12, attrs)).toEqual({
            x1: 217.27,
            y1: 387.73,
            x2: 247.88,
            y2: 357.12,
            offset: 0,
        });
    });

    it('preserves a real bend close to 45 degrees', () => {
        expect(checkSimplePathAvailability(type, 217.27, 387.73, 247.88, 357.12000001, attrs)).toBeUndefined();
    });
});

describe('checkSimplePathAvailability for Bezier', () => {
    it('uses a simple path for an exactly straight control between the endpoints', () => {
        expect(
            checkSimplePathAvailability(LinePathType.Bezier, 0, 0, 100, 0, {
                along: 0.5,
                normal: 0,
            })
        ).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0, offset: 0 });
    });

    it('uses the effective offset endpoints for an exactly straight Bezier', () => {
        expect(
            checkSimplePathAvailability(LinePathType.Bezier, 0, 0, 100, 0, {
                along: 0.5,
                normal: 0,
                sourceOffset: { x: 5, y: 10 },
                targetOffset: { x: -15, y: 20 },
            })
        ).toEqual({ x1: 5, y1: 10, x2: 85, y2: 20, offset: 0 });
    });

    it('keeps even a very shallow unsnapped curve as Bezier geometry', () => {
        expect(
            checkSimplePathAvailability(LinePathType.Bezier, 0, 0, 100, 0, {
                along: 0.5,
                normal: Number.EPSILON,
            })
        ).toBeUndefined();
    });

    it.each([-0.1, 1.1])('keeps a collinear control at along=%s because it overshoots the segment', along => {
        expect(
            checkSimplePathAvailability(LinePathType.Bezier, 0, 0, 100, 0, {
                along,
                normal: 0,
            })
        ).toBeUndefined();
    });
});
