import { describe, expect, it } from 'vitest';
import { normalizeFreeformPathAttributes } from './freeform-model';

describe('freeform path model', () => {
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

    it('clamps and sorts width stops while preserving at least one usable stop', () => {
        const attrs = normalizeFreeformPathAttributes({
            version: 1,
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'end', x: 100, y: 0 },
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
                { id: 'end', x: 100, y: 0 },
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
