import { ChakraProvider } from '@chakra-ui/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../constants/constants';
import { render as renderWithStore } from '../../../test-utils';
import taiwanRailwayArrow from './taiwan-railway-arrow';

const Component = taiwanRailwayArrow.component;
const events = {
    id: 'misc_node_arrow' as const,
    x: 0,
    y: 0,
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
};

describe('Taiwan Railway endpoint arrow', () => {
    it('renders the measured double heads with a connectable, export-removable hit target', () => {
        const { container } = render(
            <svg>
                <Component {...events} attrs={taiwanRailwayArrow.defaultAttrs} />
            </svg>
        );
        const arrows = container.querySelector('[data-taiwan-railway-arrow]')!;
        expect(arrows).toHaveAttribute('data-taiwan-railway-arrow', 'solid');
        expect(arrows).toHaveAttribute('opacity', '0.45');
        expect(arrows.querySelectorAll('path')).toHaveLength(2);
        expect(Array.from(arrows.querySelectorAll('path')).every(path => path.getAttribute('fill') === '#757575')).toBe(
            true
        );
        const hit = container.querySelector('#misc_node_connectable_misc_node_arrow')!;
        expect(Number(hit.getAttribute('width'))).toBeCloseTo(12.45);
        expect(hit).toHaveAttribute('height', '6.8');
        expect(hit).toHaveClass('removeMe');
        expect(hit).not.toHaveAttribute('opacity');
    });

    it('adds the optional black border inside the same bounds and rotates to the opposite endpoint', () => {
        const { container, rerender } = render(
            <svg>
                <Component {...events} attrs={taiwanRailwayArrow.defaultAttrs} />
            </svg>
        );
        const outerGeometry = container.querySelector('path')!.getAttribute('d');
        rerender(
            <svg>
                <Component
                    {...events}
                    attrs={{
                        ...taiwanRailwayArrow.defaultAttrs,
                        outlined: true,
                        rotate: 180,
                        color: [CityCode.Taipei, 'hsr', '#EBA353', MonoColour.white],
                    }}
                />
            </svg>
        );
        expect(container.querySelector('svg > g')).toHaveAttribute('transform', 'rotate(180)');
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '0.25');
        const heads = container.querySelectorAll('[data-taiwan-railway-arrow] > g');
        expect(heads).toHaveLength(2);
        heads.forEach(head => {
            const [outer, inner] = head.querySelectorAll('path');
            expect(outer).toHaveAttribute('fill', 'black');
            expect(outer).toHaveAttribute('d', outerGeometry);
            expect(inner).toHaveAttribute('fill', '#EBA353');
            expect(outer).not.toHaveAttribute('stroke');
        });
    });

    it.each(['opaque', 1] as const)('keeps opaque mode %s when the black border changes', opacity => {
        const attrs = { ...taiwanRailwayArrow.defaultAttrs, opacity };
        const { container, rerender } = render(
            <svg>
                <Component {...events} attrs={attrs} />
            </svg>
        );
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '1');
        rerender(
            <svg>
                <Component {...events} attrs={{ ...attrs, outlined: true }} />
            </svg>
        );
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '1');
    });

    it.each(['preset', undefined, 0.7] as const)('uses border-specific presets for %s', opacity => {
        const attrs = { ...taiwanRailwayArrow.defaultAttrs, opacity };
        const { container, rerender } = render(
            <svg>
                <Component {...events} attrs={attrs} />
            </svg>
        );
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '0.45');
        rerender(
            <svg>
                <Component {...events} attrs={{ ...attrs, outlined: true }} />
            </svg>
        );
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '0.25');
    });

    it('maps legacy zero to the preset and keeps the arrow selectable and connectable', () => {
        const handlePointerDown = vi.fn();
        const { container } = render(
            <svg>
                <Component
                    {...events}
                    handlePointerDown={handlePointerDown}
                    attrs={{ ...taiwanRailwayArrow.defaultAttrs, opacity: 0 }}
                />
            </svg>
        );
        expect(container.querySelector('[data-taiwan-railway-arrow]')).toHaveAttribute('opacity', '0.45');
        const hit = container.querySelector('rect')!;
        expect(hit).toHaveAttribute('pointer-events', 'all');
        fireEvent.pointerDown(hit);
        expect(handlePointerDown).toHaveBeenCalledWith(events.id, expect.anything());
    });

    it('exposes only preset and opaque choices while preserving mode through border changes', () => {
        const AttrsComponent = taiwanRailwayArrow.attrsComponent;
        const handleAttrsUpdate = vi.fn();
        const { getByRole, getAllByRole, queryByRole, unmount } = renderWithStore(
            <ChakraProvider>
                <AttrsComponent
                    id={events.id}
                    attrs={taiwanRailwayArrow.defaultAttrs}
                    handleAttrsUpdate={handleAttrsUpdate}
                />
            </ChakraProvider>
        );
        try {
            fireEvent.click(getByRole('checkbox'));
            expect(handleAttrsUpdate).toHaveBeenLastCalledWith(events.id, expect.objectContaining({ outlined: true }));
            expect(handleAttrsUpdate.mock.calls.at(-1)![1].opacity).toBe('preset');
            const [rotation, opacity] = getAllByRole('combobox');
            fireEvent.change(rotation, { target: { value: '180' } });
            expect(handleAttrsUpdate).toHaveBeenLastCalledWith(events.id, expect.objectContaining({ rotate: 180 }));
            handleAttrsUpdate.mockClear();

            expect(queryByRole('spinbutton')).toBeNull();
            expect(Array.from(opacity.querySelectorAll('option')).map(option => option.value)).toEqual([
                'preset',
                'opaque',
            ]);
            expect(opacity).toHaveValue('preset');
            fireEvent.change(opacity, { target: { value: 'opaque' } });
            expect(handleAttrsUpdate).toHaveBeenLastCalledWith(
                events.id,
                expect.objectContaining({ opacity: 'opaque' })
            );
        } finally {
            unmount();
        }
    });
});
