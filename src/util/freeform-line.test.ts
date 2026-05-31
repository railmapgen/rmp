import { describe, expect, it } from 'vitest';
import {
    addFreeformWidthStop,
    createFreeformPathAttributes,
    generateFreeformAreaPathD,
    getFreeformCenterline,
    getFreeformControlPoints,
    getFreeformWidthStopGeometry,
    getWidthAtT,
    moveFreeformControlPoint,
    moveFreeformWidthStop,
    normalizeFreeformPathAttributes,
    removeFreeformControlPoint,
    removeFreeformWidthStop,
    resizeFreeformWidthStop,
} from './freeform-line';

const makeId = () => {
    let id = 0;
    return () => `id_${id++}`;
};

describe('freeform line geometry', () => {
    it('creates source-relative points from sampled absolute points', () => {
        const attrs = createFreeformPathAttributes(
            [
                { x: 10, y: 10 },
                { x: 30, y: 30 },
                { x: 70, y: 20 },
                { x: 110, y: 10 },
            ],
            { x: 10, y: 10 },
            { x: 110, y: 10 },
            makeId()
        );

        expect(attrs).toBeDefined();
        expect(attrs!.points[0]).toMatchObject({ x: 0, y: 0 });
        expect(attrs!.points.at(-1)).toMatchObject({ x: 100, y: 0 });
        expect(attrs!.points.some(point => point.x > 0 && point.x < 100)).toBe(true);
    });

    it('rejects paths that are too short', () => {
        const attrs = createFreeformPathAttributes(
            [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ],
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            makeId()
        );

        expect(attrs).toBeUndefined();
    });

    it('locks endpoints to the current target-relative vector while preserving middle points', () => {
        const attrs = normalizeFreeformPathAttributes(
            {
                version: 1,
                points: [
                    { id: 'start', x: 9, y: 9 },
                    { id: 'mid', x: 20, y: 15 },
                    { id: 'end', x: 90, y: 9 },
                ],
                widthStops: [{ id: 'w', t: 0.5, width: 5 }],
                smoothing: 0.5,
                startCap: 'round',
                endCap: 'round',
            },
            { x: 120, y: 30 }
        );

        expect(attrs!.points).toEqual([
            { id: 'start', x: 0, y: 0 },
            { id: 'mid', x: 20, y: 15 },
            { id: 'end', x: 120, y: 30 },
        ]);
    });

    it('interpolates width stops along the path', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'end', x: 100, y: 0 },
            ],
            widthStops: [
                { id: 'a', t: 0, width: 4 },
                { id: 'b', t: 1, width: 10 },
            ],
            smoothing: 0,
            startCap: 'flat',
            endCap: 'flat',
        })!;

        expect(getWidthAtT(attrs, 0.5)).toBe(7);
    });

    it('moves and deletes only middle control points', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 20, y: 10 },
                { id: 'end', x: 100, y: 0 },
            ],
            widthStops: [{ id: 'w', t: 0.5, width: 5 }],
            smoothing: 0.5,
            startCap: 'round',
            endCap: 'round',
        })!;

        const movedStart = moveFreeformControlPoint(attrs, { x: 100, y: 0 }, 'start', { x: 5, y: 5 });
        expect(movedStart.points[0]).toMatchObject({ x: 0, y: 0 });

        const movedMid = moveFreeformControlPoint(attrs, { x: 100, y: 0 }, 'mid', { x: 30, y: 20 });
        expect(movedMid.points[1]).toMatchObject({ x: 30, y: 20 });

        const withoutMid = removeFreeformControlPoint(movedMid, { x: 100, y: 0 }, 'mid');
        expect(withoutMid.points.map(point => point.id)).toEqual(['start', 'end']);
    });

    it('moves, resizes, and preserves at least one width stop', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'end', x: 100, y: 0 },
            ],
            widthStops: [{ id: 'w', t: 0.5, width: 5 }],
            smoothing: 0,
            startCap: 'flat',
            endCap: 'flat',
        })!;

        const moved = moveFreeformWidthStop(attrs, { x: 100, y: 0 }, 'w', 2);
        expect(moved.widthStops[0].t).toBe(1);

        const resized = resizeFreeformWidthStop(moved, { x: 100, y: 0 }, 'w', 0.1);
        expect(resized.widthStops[0].width).toBe(0.5);

        const added = addFreeformWidthStop(resized, { x: 100, y: 0 }, () => 'w2', 0.25);
        expect(added.widthStops).toHaveLength(2);
        expect(removeFreeformWidthStop(attrs, { x: 100, y: 0 }, 'w').widthStops).toHaveLength(1);
    });

    it('generates a smooth centerline, width stop geometry, and closed area path', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 50, y: 30 },
                { id: 'end', x: 100, y: 0 },
            ],
            widthStops: [
                { id: 'a', t: 0, width: 4 },
                { id: 'b', t: 1, width: 10 },
            ],
            smoothing: 1,
            startCap: 'round',
            endCap: 'round',
        })!;

        expect(getFreeformControlPoints(attrs, { x: 100, y: 0 })).toHaveLength(3);
        expect(getFreeformCenterline(attrs, { x: 100, y: 0 }).length).toBeGreaterThan(3);
        expect(getFreeformWidthStopGeometry(attrs, { x: 100, y: 0 }, 'a')).toBeDefined();
        expect(generateFreeformAreaPathD(attrs, { x: 100, y: 0 })).toMatch(/^M .* Z$/);
    });
});
