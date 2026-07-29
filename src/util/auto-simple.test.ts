import { describe, expect, it } from 'vitest';
import { LinePathType } from '../constants/lines';
import { checkSimplePathAvailability } from './auto-simple';

describe('checkSimplePathAvailability for Bezier', () => {
    it('uses a simple path for an exactly straight control between the endpoints', () => {
        expect(
            checkSimplePathAvailability(LinePathType.Bezier, 0, 0, 100, 0, {
                along: 0.5,
                normal: 0,
            })
        ).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0, offset: 0 });
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
