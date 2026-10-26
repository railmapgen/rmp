import { ChakraProvider } from '@chakra-ui/react';
import { act, fireEvent, render } from '@testing-library/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CityCode } from '../../../constants/constants';
import { render as renderWithStore } from '../../../test-utils';
import { TaipeiGondolaSymbol } from '../common/taipei-gondola-symbol';
import taipeiLightRailLineBadge from './taipei-light-rail-line-badge';
import taipeiMaokongGondolaBadge from './taipei-maokong-gondola-badge';
import taipeiMetroLineBadge from './taipei-metro-line-badge';

const events = {
    id: 'misc_node_taipei' as const,
    x: 0,
    y: 0,
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
};

describe('Taipei line badges', () => {
    it('uses the measured metro size while retaining missing-size compatibility', () => {
        const Component = taipeiMetroLineBadge.component;
        const attrs = { ...taipeiMetroLineBadge.defaultAttrs };
        const { container, rerender } = render(
            <svg>
                <Component {...events} attrs={attrs} />
            </svg>
        );
        expect(container.querySelector('svg > g')!.getAttribute('transform')).toBe('scale(0.825)');

        delete (attrs as Partial<typeof attrs>).size;
        rerender(
            <svg>
                <Component {...events} attrs={attrs} />
            </svg>
        );
        expect(container.querySelector('svg > g')!.getAttribute('transform')).toBe('scale(1)');

        expect(container.querySelector('rect')!.getAttribute('height')).toBe('16');
    });

    it('supports single- and two-letter light rail codes at the measured size', () => {
        const Component = taipeiLightRailLineBadge.component;
        const { container, rerender } = render(
            <svg>
                <Component {...events} attrs={taipeiLightRailLineBadge.defaultAttrs} />
            </svg>
        );
        expect(container.querySelector('rect')!.getAttribute('width')).toBe('8.3');
        expect(container.querySelector('rect')!.getAttribute('height')).toBe('8.3');
        rerender(
            <svg>
                <Component
                    {...events}
                    attrs={{
                        ...taipeiLightRailLineBadge.defaultAttrs,
                        code: 'LB',
                        color: [CityCode.Taipei, 'lb', '#48B5D2', MonoColour.black],
                    }}
                />
            </svg>
        );
        expect(container.querySelector('text')!.textContent).toBe('LB');
        expect(container.querySelector('rect')!.getAttribute('fill')).toBe('#48B5D2');
        expect(container.querySelector('rect')!.getAttribute('width')).toBe('8.3');
    });

    it('shares the transparent cabin symbol between the station and the larger gondola badge', () => {
        const Component = taipeiMaokongGondolaBadge.component;
        const { container } = render(
            <svg>
                <TaipeiGondolaSymbol />
                <Component {...events} attrs={taipeiMaokongGondolaBadge.defaultAttrs} />
            </svg>
        );
        const paths = container.querySelectorAll('path');
        expect(paths[0].getAttribute('d')).toBe(paths[1].getAttribute('d'));
        expect(paths[0].getAttribute('fill-rule')).toBe('evenodd');
        const stationTransform = paths[0].parentElement!.getAttribute('transform')!;
        const [, , scaleX, scaleY] = stationTransform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        expect(stationTransform).toContain('translate(-5, -5.55)');
        expect(scaleX).toBeCloseTo(0.1);
        expect(scaleY).toBeCloseTo(0.1);
        expect(paths[1].parentElement!.getAttribute('transform')).toBe(
            `translate(-7.1, -7.75) scale(${14.2 / 100}, ${15.5 / 111})`
        );
        expect(container.querySelector('[fill="white"]')).toBeNull();
        expect(container.querySelector('[data-taipei-gondola-window]')).toBeNull();
    });

    it('forwards pointer gestures through the gondola symbol to its draggable node', () => {
        const Component = taipeiMaokongGondolaBadge.component;
        const handlePointerDown = vi.fn();
        const { container } = render(
            <svg>
                <Component
                    {...events}
                    handlePointerDown={handlePointerDown}
                    attrs={taipeiMaokongGondolaBadge.defaultAttrs}
                />
            </svg>
        );
        fireEvent.pointerDown(container.querySelector('path')!);
        expect(handlePointerDown).toHaveBeenCalledWith(events.id, expect.anything());
    });

    it('ignores invalid badge sizes after blur and debounce while accepting a valid size', () => {
        vi.useFakeTimers();
        const AttrsComponent = taipeiMetroLineBadge.attrsComponent;
        const handleAttrsUpdate = vi.fn();
        const { getByRole, unmount } = renderWithStore(
            <ChakraProvider>
                <AttrsComponent
                    id={events.id}
                    attrs={taipeiMetroLineBadge.defaultAttrs}
                    handleAttrsUpdate={handleAttrsUpdate}
                />
            </ChakraProvider>
        );
        try {
            const input = getByRole('spinbutton');
            for (const size of ['', '0', '-4', '1e309']) {
                fireEvent.change(input, { target: { value: size } });
                fireEvent.blur(input);
                act(() => vi.advanceTimersByTime(600));
                expect(handleAttrsUpdate).not.toHaveBeenCalled();
            }

            fireEvent.change(input, { target: { value: '0' } });
            act(() => vi.advanceTimersByTime(600));
            expect(handleAttrsUpdate).not.toHaveBeenCalled();

            fireEvent.change(input, { target: { value: '17.2' } });
            act(() => vi.advanceTimersByTime(600));
            expect(handleAttrsUpdate).toHaveBeenCalledOnce();
            expect(handleAttrsUpdate).toHaveBeenCalledWith(events.id, expect.objectContaining({ size: 17.2 }));
        } finally {
            unmount();
            vi.useRealTimers();
        }
    });
});
