import { describe, expect, it } from 'vitest';
import {
    createFreeformPathAttributes,
    getNearestFreeformControlSegmentIndex,
    makeFreeformClosedAreaPath,
    makeFreeformOpenPath,
} from './freeform-geometry';
import { resolveFreeformPathAttributes } from './freeform-model';

const makeId = () => {
    let id = 0;
    return () => `id_${id++}`;
};

const makeAttrs = () =>
    resolveFreeformPathAttributes(
        {
            points: [
                { id: 'start', x: 0, y: 0 },
                { id: 'mid', x: 0.5, y: 0.3 },
                { id: 'end', x: 1, y: 0 },
            ],
            widthStops: [
                { id: 'a', t: 0, width: 4 },
                { id: 'b', t: 1, width: 10 },
            ],
            smoothing: 1,
            startCap: 'round',
            endCap: 'round',
        },
        { x: 100, y: 0 }
    )!;

describe('freeform path geometry', () => {
    it('creates complete chord-relative attributes from sampled points', () => {
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

        expect(attrs?.points[0]).toMatchObject({ x: 0, y: 0 });
        expect(attrs?.points.at(-1)).toMatchObject({ x: 1, y: 0 });
        expect(attrs?.widthStops).toHaveLength(1);
        expect(attrs).toMatchObject({ startCap: 'round', endCap: 'round' });
    });

    it('rejects sampled paths that are too short', () => {
        expect(
            createFreeformPathAttributes(
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                makeId()
            )
        ).toBeUndefined();
    });

    it('selects the nearest authored segment for point insertion', () => {
        expect(getNearestFreeformControlSegmentIndex(makeAttrs(), { x: 75, y: 10 })).toBe(2);
    });

    it('builds an OpenPath for active rendering', () => {
        const path = makeFreeformOpenPath(makeAttrs());

        expect(path.kind).toBe('complex-open');
        expect(path.d).toMatch(/^M /);
        expect(path.d).not.toMatch(/ Z$/);
    });

    it('retains the dormant ClosedAreaPath generator with interpolated widths and round caps', () => {
        const area = makeFreeformClosedAreaPath(makeAttrs());

        expect(area.kind).toBe('closed-area');
        expect(area.d).toMatch(/^M .* Z$/);
        expect(area.commands.some(command => command.cmd === 'A')).toBe(true);
        expect(area.commands.some(command => 'to' in command && Math.abs(command.to.y) >= 5)).toBe(true);
    });

    it('retains arrow generation in the dormant ClosedAreaPath helper', () => {
        const attrs = { ...makeAttrs(), startCap: 'flat' as const, endCap: 'arrow' as const };
        const area = makeFreeformClosedAreaPath(attrs);

        expect(area.kind).toBe('closed-area');
        expect(area.commands.some(command => 'to' in command && command.to.x === 100 && command.to.y === 0)).toBe(true);
    });
});
