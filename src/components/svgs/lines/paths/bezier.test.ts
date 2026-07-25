import { describe, expect, it } from 'vitest';
import { LinePathType } from '../../../../constants/lines';
import { supportsParallelLinePath } from '../../../../util/parallel';
import { linePaths, lineStyles } from '../lines';
import { generateBezierPath } from './bezier';
import { getBezierControlPoint, getBezierLocalCoordinates } from './bezier-geometry';
import { defaultBezierPathAttributes, normalizeBezierPathAttributes } from './bezier-model';

describe('bezier line path', () => {
    it('registers its overlay and is supported by every line style', () => {
        expect(linePaths[LinePathType.Bezier]).toBeDefined();
        expect(linePaths[LinePathType.Bezier].overlayComponent).toBeDefined();
        expect(linePaths[LinePathType.Bezier].drawingBehavior).toBeUndefined();

        Object.values(lineStyles).forEach(lineStyle =>
            expect(lineStyle.metadata.supportLinePathType).toContain(LinePathType.Bezier)
        );
    });

    it('builds one cubic segment through the tangent intersection model', () => {
        const path = generateBezierPath(0, 100, 0, 0, defaultBezierPathAttributes);

        expect(path.kind).toBe('mc');
        expect(path.commands).toHaveLength(2);
        expect(path.commands[0]).toEqual({ cmd: 'M', to: { x: 0, y: 0 } });
        const curve = path.commands[1];
        expect(curve.cmd).toBe('C');
        if (curve.cmd !== 'C') throw new Error('Expected one cubic draw command.');
        expect(curve.c1.x).toBeCloseTo(100 / 3);
        expect(curve.c1.y).toBeCloseTo(-70 / 3);
        expect(curve.c2.x).toBeCloseTo(200 / 3);
        expect(curve.c2.y).toBeCloseTo(-70 / 3);
        expect(curve.to).toEqual({ x: 100, y: 0 });
    });

    it('round-trips a dragged control point in chord-local coordinates', () => {
        const source = { x: 20, y: -10 };
        const target = { x: 80, y: 70 };
        const attrs = { along: 0.3, normal: -0.6 };
        const control = getBezierControlPoint(source, target, attrs);

        expect(getBezierLocalCoordinates(source, target, control).along).toBeCloseTo(attrs.along);
        expect(getBezierLocalCoordinates(source, target, control).normal).toBeCloseTo(attrs.normal);
    });

    it('repairs missing or non-finite attributes before path generation uses them', () => {
        expect(normalizeBezierPathAttributes({ along: Infinity, normal: 0.2 })).toEqual({
            along: defaultBezierPathAttributes.along,
            normal: 0.2,
        });
        expect(normalizeBezierPathAttributes(undefined)).toEqual(defaultBezierPathAttributes);
    });

    it('does not enter the parallel-line pipeline', () => {
        expect(supportsParallelLinePath(LinePathType.Bezier)).toBe(false);
    });
});
