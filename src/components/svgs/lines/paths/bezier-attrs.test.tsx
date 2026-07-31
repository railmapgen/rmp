import { describe, expect, it, vi } from 'vitest';
import { LinePathType } from '../../../../constants/lines';
import { render } from '../../../../test-utils';
import { linePaths } from '../lines';
import { BezierPathAttributes } from './bezier-model';

const AttrsComponent = linePaths[LinePathType.Bezier].attrsComponent;

describe('Bezier path attributes', () => {
    it('exposes along, normal, and both endpoint XY offsets', () => {
        const attrs: BezierPathAttributes = {
            along: 0.25,
            normal: -0.5,
            sourceOffset: { x: 1, y: 2 },
            targetOffset: { x: 3, y: 4 },
        };

        const { container } = render(
            <AttrsComponent
                id="line_bezier"
                attrs={attrs}
                handleAttrsUpdate={vi.fn()}
                parallelIndex={-1}
                recalculateParallelIndex={vi.fn()}
            />
        );

        expect(Array.from(container.querySelectorAll('input')).map(input => input.value)).toEqual([
            '0.25',
            '-0.5',
            '1',
            '2',
            '3',
            '4',
        ]);
    });
});
