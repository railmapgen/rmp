import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { setActiveSubscriptions } from '../../redux/account/account-slice';
import { render } from '../../test-utils';
import { MapStyleSection } from './map-style-section';

describe('MapStyleSection', () => {
    beforeEach(() => {
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
    });

    afterEach(() => vi.unstubAllGlobals());

    const renderSection = (isSubscriber = true) => {
        const store = createStore();
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: isSubscriber, RMP_EXPORT: false }));
        render(
            <RmgThemeProvider>
                <MapStyleSection />
            </RmgThemeProvider>,
            { store }
        );
        return store;
    };

    it('keeps slider changes local until the interaction ends', () => {
        const store = renderSection();

        const slider = screen.getAllByRole('slider')[0];
        const sliderRoot = slider.parentElement;
        expect(sliderRoot).not.toBeNull();

        fireEvent.pointerDown(sliderRoot!);

        expect(screen.getByText('0.25×')).toBeInTheDocument();
        expect(store.getState().param.present.mapStyle.roads.path.widthScale).toBe(1);

        fireEvent.pointerUp(window);

        expect(store.getState().param.present.mapStyle.roads.path.widthScale).toBe(0.25);
    });

    it('places each visibility switch on the same row as its controls', () => {
        renderSection();

        const pathRowElement = screen.getByTestId('map-style-road-path');
        const pathRow = within(pathRowElement);
        expect(pathRow.getByRole('checkbox', { name: 'Path Show' })).toBeInTheDocument();
        expect(pathRow.getByRole('button', { name: 'Color' })).toBeInTheDocument();
        expect(pathRow.getByRole('slider')).toBeInTheDocument();
        expect(pathRow.getByRole('checkbox').closest('td')).toBe(pathRowElement.lastElementChild);

        const metroRowElement = screen.getByTestId('map-style-rail-metro');
        const metroRow = within(metroRowElement);
        expect(metroRow.getByRole('checkbox', { name: 'Metro Show' })).toBeInTheDocument();
        expect(metroRow.getByRole('button', { name: 'Color' })).toBeInTheDocument();
        expect(metroRow.getByRole('slider')).toBeInTheDocument();
        expect(metroRow.getByRole('checkbox').closest('td')).toBe(metroRowElement.lastElementChild);
        expect(metroRowElement.closest('table')).toBeInTheDocument();

        const labelsRow = within(screen.getByTestId('map-style-labels'));
        expect(labelsRow.getByRole('checkbox', { name: 'Show labels' })).toBeInTheDocument();
        expect(labelsRow.getByRole('slider')).toBeInTheDocument();
    });

    it('hides a map category and disables its controls', () => {
        const store = renderSection();
        const pathRow = within(screen.getByTestId('map-style-road-path'));

        fireEvent.click(pathRow.getByRole('checkbox', { name: 'Path Show' }));

        expect(store.getState().param.present.mapStyle.roads.path.enabled).toBe(false);
        expect(pathRow.getByRole('button', { name: 'Color' })).toBeDisabled();
        expect(pathRow.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
    });

    it('disables all map style controls for free users', () => {
        renderSection(false);

        expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
        screen.getAllByRole('button', { name: 'Color' }).forEach(button => expect(button).toBeDisabled());
        screen.getAllByRole('slider').forEach(slider => expect(slider).toHaveAttribute('aria-disabled', 'true'));
        screen.getAllByRole('checkbox').forEach(checkbox => expect(checkbox).toBeDisabled());
    });
});
