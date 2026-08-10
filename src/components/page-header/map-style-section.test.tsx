import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { setActiveSubscriptions } from '../../redux/account/account-slice';
import { render } from '../../test-utils';
import { MapStyleSection } from './map-style-section';

vi.mock('@railmapgen/rmg-components', async importOriginal => {
    const actual = await importOriginal<typeof import('@railmapgen/rmg-components')>();
    return {
        ...actual,
        RmgThrottledSlider: (props: {
            'aria-label': string;
            defaultValue: number;
            min: number;
            max: number;
            step: number;
            isDisabled?: boolean;
            onChange: (value: number) => void;
            onChangeEnd: (value: number) => void;
        }) => (
            <input
                aria-label={props['aria-label']}
                aria-disabled={props.isDisabled}
                type="range"
                defaultValue={props.defaultValue}
                min={props.min}
                max={props.max}
                step={props.step}
                disabled={props.isDisabled}
                onChange={event => props.onChange(Number(event.currentTarget.value))}
                onPointerUp={event => props.onChangeEnd(Number(event.currentTarget.value))}
            />
        ),
    };
});

vi.mock('../panels/theme-button', () => ({
    default: (props: { isDisabled?: boolean; onClick?: () => void }) => (
        <button type="button" aria-label="Color" disabled={props.isDisabled} onClick={props.onClick} />
    ),
}));

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
        fireEvent.change(slider, { target: { value: '0.25' } });

        expect(screen.getByText('0.25×')).toBeInTheDocument();
        expect(store.getState().param.present.mapStyle.roads.path.widthScale).toBe(1);

        fireEvent.pointerUp(slider);

        expect(store.getState().param.present.mapStyle.roads.path.widthScale).toBe(0.25);
    }, 15_000);

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
        expect(labelsRow.getByRole('checkbox', { name: 'Show all labels' })).toBeInTheDocument();

        const majorPlaceRow = within(screen.getByTestId('map-style-label-place-major'));
        expect(majorPlaceRow.getByRole('checkbox', { name: 'Major places Show' })).toBeInTheDocument();
        expect(majorPlaceRow.getAllByRole('button', { name: 'Color' })).toHaveLength(2);
        expect(majorPlaceRow.getByRole('slider')).toBeInTheDocument();

        expect(screen.queryByRole('tab')).not.toBeInTheDocument();
        expect(screen.getByTestId('map-style-label-road-arterial')).toBeInTheDocument();
        expect(screen.getByTestId('map-style-label-building')).toBeInTheDocument();
        expect(screen.getByTestId('map-style-label-area-water')).toBeInTheDocument();
        expect(screen.getByTestId('map-style-label-transport-entrance')).toBeInTheDocument();
    });

    it('hides a map category and disables its controls', () => {
        const store = renderSection();
        const pathRow = within(screen.getByTestId('map-style-road-path'));

        fireEvent.click(pathRow.getByRole('checkbox', { name: 'Path Show' }));

        expect(store.getState().param.present.mapStyle.roads.path.enabled).toBe(false);
        expect(pathRow.getByRole('button', { name: 'Color' })).toBeDisabled();
        expect(pathRow.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
    });

    it('lets free users toggle labels and railway layers while keeping appearance controls subscribed', () => {
        const store = renderSection(false);

        expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();

        const roadRow = within(screen.getByTestId('map-style-road-path'));
        expect(roadRow.getByRole('checkbox', { name: 'Path Show' })).toBeDisabled();
        expect(roadRow.getByRole('button', { name: 'Color' })).toBeDisabled();
        expect(roadRow.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');

        const metroRow = within(screen.getByTestId('map-style-rail-metro'));
        const metroSwitch = metroRow.getByRole('checkbox', { name: 'Metro Show' });
        expect(metroSwitch).toBeEnabled();
        expect(metroRow.getByRole('button', { name: 'Color' })).toBeDisabled();
        expect(metroRow.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(metroSwitch);
        expect(store.getState().param.present.mapStyle.rails.metro.enabled).toBe(false);

        const labelsSwitch = within(screen.getByTestId('map-style-labels')).getByRole('checkbox', {
            name: 'Show all labels',
        });
        expect(labelsSwitch).toBeEnabled();

        const majorPlaceRow = within(screen.getByTestId('map-style-label-place-major'));
        const majorPlaceSwitch = majorPlaceRow.getByRole('checkbox', { name: 'Major places Show' });
        expect(majorPlaceSwitch).toBeEnabled();
        majorPlaceRow.getAllByRole('button', { name: 'Color' }).forEach(button => expect(button).toBeDisabled());
        expect(majorPlaceRow.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(majorPlaceSwitch);
        expect(store.getState().param.present.mapStyle.labels.categories['place-major'].enabled).toBe(false);
    });
});
