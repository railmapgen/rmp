import { MultiDirectedGraph } from 'graphology';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinePathType } from '../../../../constants/lines';
import { linePaths } from '../lines';
import { defaultFreeformPathAttributes } from './freeform-model';

describe('Freeform details attributes', () => {
    it('keeps smoothing enabled and disables every outline control', () => {
        window.graph = new MultiDirectedGraph();
        const Attrs = linePaths[LinePathType.Freeform].attrsComponent;
        const { container } = render(
            <Attrs
                id="line_test"
                attrs={structuredClone(defaultFreeformPathAttributes)}
                parallelIndex={-1}
                recalculateParallelIndex={vi.fn()}
                handleAttrsUpdate={vi.fn()}
            />
        );

        const widthInputs = [...container.querySelectorAll<HTMLInputElement>('table input[type="number"]')];
        const numberInputs = [...container.querySelectorAll<HTMLInputElement>('input[type="number"]')];
        const selects = [...container.querySelectorAll<HTMLSelectElement>('select')];
        expect(container.querySelectorAll('[role="alert"]')).toHaveLength(2);
        expect(widthInputs.length).toBeGreaterThanOrEqual(defaultFreeformPathAttributes.widthStops.length);
        expect(widthInputs.every(input => input.disabled)).toBe(true);
        expect(numberInputs.some(input => input.disabled)).toBe(true);
        expect(selects).toHaveLength(2);
        expect(selects.every(select => select.disabled)).toBe(true);
        const slider = container.querySelector('[role="slider"]');
        expect(slider).not.toBeNull();
        expect(slider?.getAttribute('aria-disabled')).not.toBe('true');
    });
});
