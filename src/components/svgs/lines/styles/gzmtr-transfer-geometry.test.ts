import { Bezier } from 'bezier-js';
import { describe, expect, it } from 'vitest';
import { makeCubicPath, makeLinearPath, makePoint, PathPoint } from '../../../../constants/path';
import { SMOOTHNESS, transferJunction, transferRibbon } from './gzmtr-transfer-geometry';

// Probe the exported quadratic contours independently of the distance field.
function fillsPoint(d: string, point: PathPoint) {
    let start = makePoint(0, 0);
    let crossings = 0;
    for (const [, command, coords] of d.matchAll(/([MQ])([^MQZ]+)/g)) {
        const [x, y, endX, endY] = coords.trim().split(/\s+/).map(Number);
        if (command === 'M') {
            start = makePoint(x, y);
        } else {
            const end = makePoint(endX, endY);
            const curve = new Bezier(start, makePoint(x, y), end);
            crossings += curve.lineIntersects({ p1: point, p2: makePoint(100, point.y) }).length;
            start = end;
        }
    }
    return crossings % 2 === 1;
}

const origin = makePoint(0, 0);
const badge = { ...origin, foshan: false };

describe('Guangzhou different-name transfer', () => {
    it('rounds both outer shoulders, opens the original grey rim, and leaves the badge face intact', () => {
        const path = makeLinearPath(origin, makePoint(0, -40));
        const { outer, inner } = transferJunction(path, [badge], origin);
        for (const side of [-1, 1]) {
            // Outside both the normal ribbon (half width 2.55) and the capsule (half height 7.73).
            expect(fillsPoint(outer, makePoint(side * 2.71, -7.91))).toBe(true);
            expect(fillsPoint(outer, makePoint(side * 4, -9.27))).toBe(false);
        }
        expect(fillsPoint(inner, makePoint(0.13, -7.14))).toBe(true);
        expect(fillsPoint(inner, makePoint(2.15, -7.14))).toBe(false);
        expect(fillsPoint(inner, makePoint(0.13, -4.14))).toBe(false);
        // Where the local patch ends over the middle of the band, white overlaps grey.
        const overlap = makePoint(0.13, -11.85);
        expect(fillsPoint(outer, overlap)).toBe(false);
        expect(fillsPoint(inner, overlap)).toBe(true);
    });

    it.each([45, 65, 90, 135])('keeps the grey rim equally wide at a %d° smoothed mouth', angle => {
        const radians = (angle * Math.PI) / 180;
        const tangent = makePoint(Math.cos(radians), -Math.sin(radians));
        const normal = makePoint(-tangent.y, tangent.x);
        // On the flat capsule side both distance fields equal 5k/32 at the middle of the blend.
        const blend = (5 * SMOOTHNESS) / 32;
        const shoulder = makePoint(0, -7.728 - blend);
        const centre = makePoint(shoulder.x - normal.x * (2.548 + blend), shoulder.y - normal.y * (2.548 + blend));
        const along = (d: number) => makePoint(centre.x + d * tangent.x, centre.y + d * tangent.y);
        const { outer, inner } = transferJunction(makeLinearPath(along(-10), along(40)), [badge], origin);
        const length = Math.hypot(normal.x, normal.y - 1);
        const inset = (d: number) =>
            makePoint(shoulder.x - (d * normal.x) / length, shoulder.y - (d * (normal.y - 1)) / length);
        expect(fillsPoint(outer, inset(-0.05))).toBe(false);
        expect(fillsPoint(outer, inset(0.05))).toBe(true);
        const rim = (5.096 - 1.8928) / 2;
        expect(fillsPoint(inner, inset(rim - 0.05))).toBe(false);
        expect(fillsPoint(inner, inset(rim + 0.05))).toBe(true);
    });

    it('uses actual badge offsets and the edited curve at each end', () => {
        const target = makePoint(0, -45);
        const path = makeCubicPath(origin, makePoint(4, -18), makePoint(4, -30), target);
        const end = transferJunction(path, [badge, { ...badge, y: -11.088 }], target);
        expect(end.outer).toContain('Q');
        expect(end.inner).not.toMatch(/NaN|Infinity/);
        expect(fillsPoint(end.inner, makePoint(1.41, 6.84))).toBe(true);
        const shifted = transferJunction(path, [{ ...badge, x: 12 }], target);
        expect(shifted.inner).not.toEqual(end.inner);
        const straight = transferJunction(makeLinearPath(origin, target), [badge], target);
        expect(straight.inner).not.toEqual(end.inner);
    });

    it('does not add a mouth to an empty icon or a collapsed path', () => {
        const path = makeLinearPath(origin, makePoint(20, 0));
        expect(transferJunction(path, [], origin)).toMatchObject({ outer: '', inner: '' });
        expect(transferRibbon(makeLinearPath(origin, origin))).toBeUndefined();
    });
});
