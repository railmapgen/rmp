import { describe, expect, it } from 'vitest';
import {
    normalizeFreeformPathAttributes,
    persistFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';

const persisted = {
    points: [
        { id: 'start', x: 9, y: 9 },
        { id: 'mid', x: 0.4, y: 0.2 },
        { id: 'end', x: 90, y: 9 },
    ],
    widthStops: [
        { id: 'late', t: 2, width: 0.1 },
        { id: 'early', t: -1, width: 8 },
    ],
    smoothing: 2,
    startCap: 'flat' as const,
    endCap: 'arrow' as const,
    arrow: { length: 12, width: 9 },
    version: 1,
};

describe('freeform path model', () => {
    it('normalizes the complete single Freeform attribute model without version', () => {
        const attrs = normalizeFreeformPathAttributes(persisted);

        expect(attrs).toEqual({
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 0.4, y: 0.2 },
                { id: 'end', x: 1, y: 0 },
            ],
            widthStops: [
                { id: 'early', t: 0, width: 8 },
                { id: 'late', t: 1, width: 0.5 },
            ],
            smoothing: 1,
            startCap: 'flat',
            endCap: 'arrow',
            arrow: { length: 12, width: 9 },
        });
        expect(attrs).not.toHaveProperty('version');
    });

    it('resolves and persists points while preserving dormant outline attributes', () => {
        const resolved = resolveFreeformPathAttributes(persisted, { x: 0, y: 200 })!;
        const repersisted = persistFreeformPathAttributes(resolved, { x: 0, y: 200 })!;

        expect(resolved.points[1]).toMatchObject({ x: -40, y: 80 });
        expect(repersisted.points[1]).toMatchObject({ x: 0.4, y: 0.2 });
        expect(repersisted).toMatchObject({
            widthStops: [
                { id: 'early', t: 0, width: 8 },
                { id: 'late', t: 1, width: 0.5 },
            ],
            startCap: 'flat',
            endCap: 'arrow',
            arrow: { length: 12, width: 9 },
        });
        expect(resolveFreeformPathAttributes(persisted, { x: 0, y: 0 })).toBeUndefined();
        expect(persistFreeformPathAttributes(resolved, { x: 0, y: 0 })).toBeUndefined();
    });

    it('provides a usable width stop and outline defaults when they are absent', () => {
        const attrs = normalizeFreeformPathAttributes({
            points: [persisted.points[0], persisted.points[2]],
            smoothing: 0.5,
        });

        expect(attrs?.widthStops).toHaveLength(1);
        expect(attrs).toMatchObject({
            startCap: 'round',
            endCap: 'round',
        });
    });
});
