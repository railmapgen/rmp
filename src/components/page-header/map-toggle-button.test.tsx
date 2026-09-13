import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import { MapToggleButton } from './map-toggle-button';

describe('MapToggleButton', () => {
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

    it('toggles the same persisted map setting exposed in preferences', () => {
        const store = createStore();
        render(
            <RmgThemeProvider>
                <MapToggleButton />
            </RmgThemeProvider>,
            { store }
        );

        const showButton = screen.getByRole('button', { name: 'Show geographic map' });
        expect(showButton).toHaveAttribute('aria-pressed', 'false');
        expect(showButton).not.toHaveAttribute('data-active');

        fireEvent.click(showButton);

        expect(store.getState().param.present.mapEnabled).toBe(true);
        const hideButton = screen.getByRole('button', { name: 'Hide geographic map' });
        expect(hideButton).toHaveAttribute('aria-pressed', 'true');
        expect(hideButton).toHaveAttribute('data-active');

        fireEvent.click(hideButton);
        expect(store.getState().param.present.mapEnabled).toBe(false);
    });
});
