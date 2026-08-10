import { RmgThemeProvider } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { createStore } from '../../redux';
import { setMapEnabled, setMapStyle, setSvgViewport } from '../../redux/param/param-slice';
import { render } from '../../test-utils';
import { stringifyParam } from '../../util/save';
import RmpGalleryAppClip from './rmp-gallery-app-clip';

vi.mock('@railmapgen/rmg-components', async importOriginal => {
    const actual = await importOriginal<typeof import('@railmapgen/rmg-components')>();
    return {
        ...actual,
        RmgAppClip: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

vi.mock('./confirm-overwrite-dialog', () => ({
    default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
        isOpen ? <button onClick={onConfirm}>Confirm gallery replacement</button> : null,
}));

describe('RmpGalleryAppClip', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        window.history.replaceState({}, '', '/?gallery-project');
        vi.spyOn(rmgRuntime, 'isAllowAnalytics').mockReturnValue(false);
        vi.spyOn(rmgRuntime, 'sendNotification').mockImplementation(vi.fn());
        vi.spyOn(rmgRuntime, 'updateAppMetadata').mockImplementation(vi.fn());
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
        window.history.replaceState({}, '', '/');
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('restores map settings and viewport from a gallery project', async () => {
        const sourceStore = createStore();
        const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
        mapStyle.roads.arterial.color = '#abcdef';
        sourceStore.dispatch(setMapEnabled(true));
        sourceStore.dispatch(setMapStyle(mapStyle));
        sourceStore.dispatch(setSvgViewport({ zoom: 45, min: { x: 67, y: 89 } }));
        const save = JSON.parse(stringifyParam(sourceStore.getState().param));
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                json: async () => save,
            } as Response)
        );
        const store = createStore();

        render(
            <RmgThemeProvider>
                <RmpGalleryAppClip isOpen={true} onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm gallery replacement' }));

        await waitFor(() => expect(store.getState().param.present.mapEnabled).toBe(true));
        expect(store.getState().param.present.mapStyle).toEqual(mapStyle);
        expect(store.getState().param.present.svgViewBoxZoom).toBe(45);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 67, y: 89 });
    });
});
