import { describe, expect, it } from 'vitest';
import { BezierPathAttributes } from '../components/svgs/lines/paths/bezier-model';
import { LinePathType } from '../constants/lines';
import { reverseEdgePathAttrs } from './edge-path-attrs';

describe('reverseEdgePathAttrs', () => {
    it('keeps Bezier endpoint offsets attached to their graph endpoints when traversal reverses', () => {
        const attrs: BezierPathAttributes = {
            along: 0.25,
            normal: -0.5,
            sourceOffset: { x: 1, y: 2 },
            targetOffset: { x: 3, y: 4 },
        };

        reverseEdgePathAttrs(LinePathType.Bezier, attrs);

        expect(attrs.sourceOffset).toEqual({ x: 3, y: 4 });
        expect(attrs.targetOffset).toEqual({ x: 1, y: 2 });
    });
});
