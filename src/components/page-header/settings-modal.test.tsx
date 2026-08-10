import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import SettingsModal from './settings-modal';

const { getMapOptimizationProgress } = vi.hoisted(() => ({
    getMapOptimizationProgress: vi.fn(() => ({ optimized: 0, total: 0 })),
}));

vi.mock('../../map/map-tile-controller', () => ({ getMapOptimizationProgress }));

beforeEach(() => {
    getMapOptimizationProgress.mockReset().mockReturnValue({ optimized: 0, total: 0 });
});

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

    it('snapshots the current map optimization progress each time settings opens', () => {
        const initialParam = createStore().getState().param;
        const store = createStore({
            param: {
                ...initialParam,
                present: { ...initialParam.present, mapEnabled: true },
            },
        });
        const onClose = vi.fn();
        const { rerender } = render(<SettingsModal isOpen={false} onClose={onClose} />, { store });

        getMapOptimizationProgress.mockReturnValue({ optimized: 2, total: 5 });
        rerender(<SettingsModal isOpen={true} onClose={onClose} />);
        expect(screen.getByText('Optimized: 2/5')).toBeInTheDocument();

        getMapOptimizationProgress.mockReturnValue({ optimized: 4, total: 5 });
        rerender(<SettingsModal isOpen={true} onClose={onClose} />);
        expect(screen.getByText('Optimized: 2/5')).toBeInTheDocument();

        rerender(<SettingsModal isOpen={false} onClose={onClose} />);
        rerender(<SettingsModal isOpen={true} onClose={onClose} />);
        expect(screen.getByText('Optimized: 4/5')).toBeInTheDocument();
    });
});
