import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localMapStore } from '../../map/local-map';
import { registerRmpMapReceiver } from '../../map/map-transfer';
import { createStore } from '../../redux';
import { setMapEnabled } from '../../redux/param/param-slice';
import { render } from '../../test-utils';
import { MapToggleButton } from './map-toggle-button';

vi.mock('../../map/map-transfer', () => ({
    importMapIntoLibrary: vi.fn(),
    registerRmpMapReceiver: vi.fn(() => () => undefined),
    requestMapFromRmw: vi.fn(),
}));

describe('MapToggleButton', () => {
    beforeEach(() => {
        vi.spyOn(localMapStore, 'list').mockResolvedValue([]);
        vi.stubGlobal(
            'BroadcastChannel',
            vi.fn(() => ({ close: vi.fn() }))
        );
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

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('opens the map panel without immediately changing the selected basemap', async () => {
        const store = createStore();
        render(
            <RmgThemeProvider>
                <MapToggleButton />
            </RmgThemeProvider>,
            { store }
        );

        const button = screen.getByRole('button', { name: 'Maps' });
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button).not.toHaveAttribute('data-active');

        fireEvent.click(button);

        await waitFor(() => expect(screen.getByRole('dialog', { name: 'Maps' })).toBeVisible());
        expect(screen.getByRole('tab', { name: 'No map' })).toHaveAttribute('aria-selected', 'true');
        expect(store.getState().param.present.mapEnabled).toBe(false);

        fireEvent.click(screen.getByRole('tab', { name: 'Real geographic map' }));
        expect(store.getState().param.present.mapEnabled).toBe(true);
    });

    it('keeps the button active when a map is enabled and opens its selected tab', async () => {
        const store = createStore();
        store.dispatch(setMapEnabled(true));
        render(
            <RmgThemeProvider>
                <MapToggleButton />
            </RmgThemeProvider>,
            { store }
        );

        const button = screen.getByRole('button', { name: 'Maps' });
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button).toHaveAttribute('data-active');
        fireEvent.click(button);

        await waitFor(() => expect(screen.getByRole('dialog', { name: 'Maps' })).toBeVisible());
        expect(screen.getByRole('tab', { name: 'Real geographic map' })).toHaveAttribute('aria-selected', 'true');
        expect(store.getState().param.present.mapEnabled).toBe(true);
    });

    it('continues receiving maps while the panel is closed and unregisters on unmount', () => {
        const unregister = vi.fn();
        vi.mocked(registerRmpMapReceiver).mockReturnValueOnce(unregister);
        const { unmount } = render(
            <RmgThemeProvider>
                <MapToggleButton />
            </RmgThemeProvider>
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(registerRmpMapReceiver).toHaveBeenCalledOnce();
        const onImported = vi.mocked(registerRmpMapReceiver).mock.calls[0][0];
        act(() => onImported?.('World A'));
        expect(screen.getByText('Map added to library')).toBeInTheDocument();
        expect(screen.getByText('World A')).toBeInTheDocument();

        unmount();
        expect(unregister).toHaveBeenCalledOnce();
    });
});
