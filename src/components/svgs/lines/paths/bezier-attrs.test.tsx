import { fireEvent } from '@testing-library/react';
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
        Array.from(container.querySelectorAll('input'))
            .slice(0, 2)
            .forEach(input => expect(input).not.toHaveAttribute('readonly'));
    });

    it('shows each endpoint offset as a linked, read-only XY row', () => {
        const handleAttrsUpdate = vi.fn();
        const attrs: BezierPathAttributes = {
            along: 0.25,
            normal: -0.5,
            sourceOffset: { x: 1, y: 2 },
            targetOffset: { x: 3, y: 4 },
        };

        const { getByTestId } = render(
            <AttrsComponent
                id="line_bezier"
                attrs={attrs}
                handleAttrsUpdate={handleAttrsUpdate}
                parallelIndex={-1}
                recalculateParallelIndex={vi.fn()}
            />
        );

        for (const [endpoint, values] of [
            ['source', ['1', '2']],
            ['target', ['3', '4']],
        ] as const) {
            const row = getByTestId(`bezier-${endpoint}-offset`);
            const inputs = Array.from(row.querySelectorAll('input'));
            expect(inputs.map(input => input.value)).toEqual(values);
            inputs.forEach(input => expect(input).toHaveAttribute('readonly'));
            expect(row.querySelector('button')).toBeDisabled();
            expect(row.querySelector('button')).toHaveAccessibleName('Linked endpoint offset');
        }

        fireEvent.change(getByTestId('bezier-source-offset').querySelector('input')!, {
            target: { value: '40' },
        });
        expect(handleAttrsUpdate).not.toHaveBeenCalled();
    });

    it('refreshes the read-only values when overlay-updated attrs are supplied', () => {
        const commonProps = {
            id: 'line_bezier',
            handleAttrsUpdate: vi.fn(),
            parallelIndex: -1,
            recalculateParallelIndex: vi.fn(),
        };
        const { getByTestId, rerender } = render(
            <AttrsComponent
                {...commonProps}
                attrs={{
                    along: 0.25,
                    normal: -0.5,
                    sourceOffset: { x: 1, y: 2 },
                    targetOffset: { x: 3, y: 4 },
                }}
            />
        );

        rerender(
            <AttrsComponent
                {...commonProps}
                attrs={{
                    along: 0.25,
                    normal: -0.5,
                    sourceOffset: { x: 40, y: 50 },
                    targetOffset: { x: 60, y: 70 },
                }}
            />
        );

        expect(
            Array.from(getByTestId('bezier-source-offset').querySelectorAll('input')).map(input => input.value)
        ).toEqual(['40', '50']);
        expect(
            Array.from(getByTestId('bezier-target-offset').querySelectorAll('input')).map(input => input.value)
        ).toEqual(['60', '70']);
    });
});
