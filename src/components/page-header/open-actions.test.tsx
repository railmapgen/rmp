import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { createStore } from '../../redux';
import { setActiveSubscriptions } from '../../redux/account/account-slice';
import { setMapEnabled, setMapStyle, setSvgViewport } from '../../redux/param/param-slice';
import { render } from '../../test-utils';
import { stringifyParam } from '../../util/save';
import OpenActions from './open-actions';

vi.mock('./confirm-overwrite-dialog', () => ({
    default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
        isOpen ? <button onClick={onConfirm}>Confirm project replacement</button> : null,
}));
vi.mock('./import-from-aarc', () => ({ default: () => null }));
vi.mock('./rmg-param-app-clip', () => ({ default: () => null }));
vi.mock('./rmp-gallery-app-clip', () => ({ default: () => null }));

describe('OpenActions', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        HTMLElement.prototype.scrollTo = vi.fn();
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
        vi.unstubAllGlobals();
    });

    it('offers RMG import to free users while the map is enabled', async () => {
        const store = createStore();
        store.dispatch(setMapEnabled(true));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false }));
        const { container } = render(
            <RmgThemeProvider>
                <OpenActions />
            </RmgThemeProvider>,
            { store }
        );

        fireEvent.click(container.querySelector('button')!);

        expect(await screen.findByText('Import from RMG project')).toBeInTheDocument();
    });

    it('starts a new project with the map hidden while preserving its style in project history', async () => {
        const store = createStore();
        const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
        mapStyle.roads.arterial.color = '#123456';
        store.dispatch(setMapEnabled(true));
        store.dispatch(setMapStyle(mapStyle));
        const { container } = render(
            <RmgThemeProvider>
                <OpenActions />
            </RmgThemeProvider>,
            { store }
        );

        fireEvent.click(container.querySelector('button')!);
        fireEvent.click(await screen.findByText('New project'));

        await waitFor(() => expect(store.getState().param.present.mapEnabled).toBe(false));
        expect(store.getState().param.present.mapStyle).toEqual(mapStyle);
        expect(store.getState().param.past.at(-1)).toMatchObject({
            scope: 'project',
            mapEnabled: true,
            mapStyle,
        });
    });

    it('restores map settings and viewport from an uploaded project', async () => {
        const sourceStore = createStore();
        const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
        mapStyle.roads.arterial.color = '#654321';
        sourceStore.dispatch(setMapEnabled(true));
        sourceStore.dispatch(setMapStyle(mapStyle));
        sourceStore.dispatch(setSvgViewport({ zoom: 55, min: { x: 12, y: 34 } }));
        const save = stringifyParam(sourceStore.getState().param);
        const store = createStore();
        render(
            <RmgThemeProvider>
                <OpenActions />
            </RmgThemeProvider>,
            { store }
        );

        const file = new File([save], 'project.json', { type: 'application/json' });
        fireEvent.change(screen.getByTestId('file-upload'), { target: { files: [file] } });
        fireEvent.click(await screen.findByRole('button', { name: 'Confirm project replacement' }));

        await waitFor(() => expect(store.getState().param.present.mapEnabled).toBe(true));
        expect(store.getState().param.present.mapStyle).toEqual(mapStyle);
        expect(store.getState().param.present.svgViewBoxZoom).toBe(55);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 12, y: 34 });
    });
});
