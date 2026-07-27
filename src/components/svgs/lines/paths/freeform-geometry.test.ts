import { describe, expect, it } from 'vitest';
import {
    createFreeformPathAttributes,
    getFreeformCenterline,
    getFreeformWidthStopGeometry,
    getNearestFreeformControlSegmentIndex,
    getWidthAtT,
    makeFreeformAreaPath,
} from './freeform-geometry';
import { normalizeFreeformPathAttributes } from './freeform-model';

const makeId = () => {
    let id = 0;
    return () => `id_${id++}`;
};

const makeAttrs = () =>
    normalizeFreeformPathAttributes({
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

describe('freeform path geometry', () => {
    it('creates source-relative attributes from sampled absolute points', () => {
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

    it('rejects sampled paths that are too short', () => {
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

    it('interpolates width stops along the centerline', () => {
        expect(getWidthAtT(makeAttrs(), 0.5)).toBe(7);
    });

    it('generates editor geometry from the same sampled centerline', () => {
        const attrs = makeAttrs();

        expect(getFreeformCenterline(attrs).length).toBeGreaterThan(3);
        expect(getFreeformWidthStopGeometry(attrs, 'a')).toBeDefined();
        expect(getNearestFreeformControlSegmentIndex(attrs, { x: 75, y: 10 })).toBe(2);
    });

    it('generates a structured closed area with arc commands for round caps', () => {
        const area = makeFreeformAreaPath(makeAttrs());

        expect(area.kind).toBe('closed-area');
        expect(area.d).toMatch(/^M .* Z$/);
        expect(area.commands.some(command => command.cmd === 'A')).toBe(true);
    });
});
