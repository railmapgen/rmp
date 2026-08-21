import { describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { supportsParallelLinePath } from '../../../../util/parallel';
import { linePaths, lineStyles } from '../lines';
import { generateBezierPath } from './bezier';
import { getBezierControlPoint, getBezierLocalCoordinates } from './bezier-geometry';
import { defaultBezierPathAttributes } from './bezier-model';

describe('bezier line path', () => {
    it('registers its overlay and is supported by compatible line styles', () => {
        expect(linePaths[LinePathType.Bezier]).toBeDefined();
        expect(linePaths[LinePathType.Bezier].overlayComponent).toBeDefined();
        expect(linePaths[LinePathType.Bezier].drawingBehavior).toBeUndefined();

        Object.entries(lineStyles).forEach(([type, lineStyle]) => {
            if (type === LineStyleType.MRTTapeOut) {
                expect(lineStyle.metadata.supportLinePathType).not.toContain(LinePathType.Bezier);
            } else {
                expect(lineStyle.metadata.supportLinePathType).toContain(LinePathType.Bezier);
            }
        });
    });

    it('builds one cubic segment through the tangent intersection model', () => {
        const path = generateBezierPath(0, 100, 0, 0, defaultBezierPathAttributes);

        expect(path.kind).toBe('mc');
        if (path.kind !== 'mc') throw new Error('Expected one cubic path.');
        expect(path.commands).toHaveLength(2);
        expect(path.commands[0]).toEqual({ cmd: 'M', to: { x: 0, y: 0 } });
        const curve = path.commands[1];
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

    it('falls back to default control attributes when the endpoint chord has zero length', () => {
        expect(getBezierLocalCoordinates({ x: 20, y: -10 }, { x: 20, y: -10 }, { x: 50, y: 40 })).toEqual(
            defaultBezierPathAttributes
        );
    });

    it('does not enter the parallel-line pipeline', () => {
        expect(supportsParallelLinePath(LinePathType.Bezier)).toBe(false);
    });
});
