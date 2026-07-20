import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import { MapStyleSection } from './map-style-section';

describe('MapStyleSection', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('keeps slider changes local until the interaction ends', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: false,
                media: '',
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })
        );
        const store = createStore();
        render(
            <RmgThemeProvider>
                <MapStyleSection />
            </RmgThemeProvider>,
            { store }
        );

        const slider = screen.getAllByRole('slider')[0];
        const sliderRoot = slider.parentElement;
        expect(sliderRoot).not.toBeNull();

        fireEvent.pointerDown(sliderRoot!);

        expect(screen.getByText('0.25×')).toBeInTheDocument();
        expect(store.getState().param.mapStyle.roads.path.widthScale).toBe(1);

        fireEvent.pointerUp(window);

        expect(store.getState().param.mapStyle.roads.path.widthScale).toBe(0.25);
    });
});
