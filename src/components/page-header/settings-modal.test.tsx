import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import SettingsModal from './settings-modal';

const renderSettings = (mapEnabled: boolean) => {
    const initialParam = createStore().getState().param;
    const store = createStore({
        param: {
            ...initialParam,
            present: { ...initialParam.present, mapEnabled },
        },
    });
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />, { store });
    return store;
};

describe('SettingsModal map performance preference', () => {
    it('lets map users disable idle raster optimization', () => {
        const store = renderSettings(true);
        const label = screen.getByText('Disable map performance optimization');
        const checkbox = label.parentElement?.querySelector<HTMLInputElement>('input[type="checkbox"]');

        expect(checkbox).not.toBeNull();
        fireEvent.click(checkbox!);
        expect(store.getState().app.preference.disableMapPerformanceOptimization).toBe(true);
    });

    it('does not show a map-only preference in diagram projects', () => {
        renderSettings(false);

        expect(screen.queryByText('Disable map performance optimization')).toBeNull();
    });
});
