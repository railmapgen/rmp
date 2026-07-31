import { describe, expect, it } from 'vitest';
import { getBezierControlPoint } from '../components/svgs/lines/paths/bezier-geometry';
import { BezierPathAttributes } from '../components/svgs/lines/paths/bezier-model';
import { LinePathType } from '../constants/lines';
import { reverseEdgePathAttrs } from './edge-path-attrs';

describe('reverseEdgePathAttrs', () => {
    it('preserves a Bezier control point when traversing the edge in reverse', () => {
        const source = { x: 20, y: -10 };
        const target = { x: 80, y: 70 };
        const attrs: BezierPathAttributes = { along: 0.3, normal: -0.6 };
        const expectedControl = getBezierControlPoint(source, target, attrs);
        const reversedAttrs = { ...attrs };

        reverseEdgePathAttrs(LinePathType.Bezier, reversedAttrs);

        const reversedControl = getBezierControlPoint(target, source, reversedAttrs);
        expect(reversedAttrs.along).toBeCloseTo(0.7);
        expect(reversedAttrs.normal).toBeCloseTo(0.6);
        expect(reversedControl.x).toBeCloseTo(expectedControl.x);
        expect(reversedControl.y).toBeCloseTo(expectedControl.y);
    });
});
