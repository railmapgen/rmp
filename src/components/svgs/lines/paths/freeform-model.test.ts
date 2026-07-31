import { describe, expect, it } from 'vitest';
import {
    normalizeFreeformPathAttributes,
    persistFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';

describe('freeform path model', () => {
    it('locks persisted endpoints to the normalized chord while preserving middle percentages', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 9, y: 9 },
                { id: 'mid', x: 0.2, y: 0.15 },
                { id: 'end', x: 90, y: 9 },
            ],
            widthStops: [{ id: 'w', t: 0.5, width: 5 }],
            smoothing: 0.5,
            startCap: 'round',
            endCap: 'round',
        });

        expect(attrs!.points).toEqual([
            { id: 'start', x: 0, y: 0 },
            { id: 'mid', x: 0.2, y: 0.15 },
            { id: 'end', x: 1, y: 0 },
        ]);
    });

    it('resolves percentages against the endpoint chord and persists them again', () => {
        const persisted = {
            version: 1 as const,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 0.4, y: 0.2 },
                { id: 'end', x: 1, y: 0 },
            ],
            widthStops: [{ id: 'w', t: 0.5, width: 5 }],
            smoothing: 0.5,
            startCap: 'round' as const,
            endCap: 'round' as const,
        };

        const horizontal = resolveFreeformPathAttributes(persisted, { x: 100, y: 0 })!;
        const vertical = resolveFreeformPathAttributes(persisted, { x: 0, y: 200 })!;

        expect(horizontal.points[1]).toMatchObject({ x: 40, y: 20 });
        expect(vertical.points[1]).toMatchObject({ x: -40, y: 80 });
        expect(persistFreeformPathAttributes(vertical, { x: 0, y: 200 })!.points[1]).toMatchObject({
            x: 0.4,
            y: 0.2,
        });
    });

    it('clamps and sorts width stops while preserving at least one usable stop', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'end', x: 1, y: 0 },
            ],
            widthStops: [
                { id: 'late', t: 2, width: 0.1 },
                { id: 'early', t: -1, width: 8 },
            ],
            smoothing: 0.5,
            startCap: 'round',
            endCap: 'round',
        });
        const fallback = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'end', x: 1, y: 0 },
            ],
            widthStops: [],
            smoothing: 0.5,
            startCap: 'round',
            endCap: 'round',
        });

        expect(attrs!.widthStops).toEqual([
            { id: 'early', t: 0, width: 8 },
            { id: 'late', t: 1, width: 0.5 },
        ]);
        expect(fallback!.widthStops).toHaveLength(1);
    });
});
