import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MAP_MAX_VIEWBOX_ZOOM } from '../../map/map-config';
import store, { createStore } from '../../redux';
import { render } from '../../test-utils';
import { ZoomPopover } from './zoom-popover';

beforeAll(() => {
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

afterAll(() => vi.unstubAllGlobals());

const renderZoomPopover = (mapEnabled: boolean) => {
    const testStore = createStore({
        param: {
            ...store.getState().param,
            present: {
                ...store.getState().param.present,
                mapEnabled,
                svgViewBoxZoom: 100,
            },
        },
    });
    render(
        <RmgThemeProvider>
            <ZoomPopover />
        </RmgThemeProvider>,
        { store: testStore }
    );
    fireEvent.click(screen.getByRole('button', { name: 'zoom' }));
};

describe('ZoomPopover', () => {
    it('keeps the established map-hidden zoom range', () => {
        renderZoomPopover(false);

        expect(screen.getByRole('slider', { hidden: true })).toHaveAttribute('aria-valuemax', '390');
    });

    it('allows the map overview range while the map is shown', () => {
        renderZoomPopover(true);

        expect(screen.getByRole('slider', { hidden: true })).toHaveAttribute(
            'aria-valuemax',
            String(MAP_MAX_VIEWBOX_ZOOM - 10)
        );
    });
});
