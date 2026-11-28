import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localMapStore, LocalMapRecord, notifyMapLibraryChanged } from '../../map/local-map';
import { importMapIntoLibrary, requestMapFromRmw } from '../../map/map-transfer';
import { MAP_WORLD_ORIGIN } from '../../map/map-config';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { createStore } from '../../redux';
import {
    applyUndoAction,
    replaceProjectState,
    saveGraph,
    setMapEnabled,
    setMapStyle,
    setSvgViewport,
} from '../../redux/param/param-slice';
import { createTestLineGraph, render } from '../../test-utils';
import { MapLibraryModal } from './map-library';
import { MapStyleSection } from './map-style-section';

vi.mock('../../map/map-transfer', () => ({
    importMapIntoLibrary: vi.fn(),
    registerRmpMapReceiver: vi.fn(() => () => undefined),
    requestMapFromRmw: vi.fn(),
}));
const record: LocalMapRecord = {
    mapId: '11111111-1111-4111-8111-111111111111',
    revision: 1,
    sha256: 'a'.repeat(64),
    name: 'World A',
    bounds: [-1, -1, 1, 1],
    defaultView: { center: [0, 0], zoom: 13 },
    importedAt: 10,
    attribution: 'RMW',
    tileCount: 1,
    byteLength: 1,
};
let library: LocalMapRecord[];
const show = (store = createStore()) => {
    store.dispatch(setSvgViewport({ zoom: 42, min: { x: 123, y: 456 } }));
    const onClose = vi.fn();
    const result = render(
        <RmgThemeProvider>
            <MapLibraryModal isOpen onClose={onClose} />
        </RmgThemeProvider>,
        { store }
    );
    return { ...result, store, onClose };
};
beforeEach(() => {
    library = [];
    vi.spyOn(localMapStore, 'list').mockImplementation(async () => [...library]);
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

describe('map library', () => {
    it('resets appearance in the settings panel while preserving the selected local map', () => {
        const mapSource = { mapId: record.mapId, revision: record.revision, sha256: record.sha256 };
        const store = createStore();
        const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
        mapStyle.roads.path.color = '#123456';
        mapStyle.labels.enabled = false;
        store.dispatch(setMapStyle({ ...mapStyle, mapSource }));
        const graph = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <MapStyleSection />
            </RmgThemeProvider>,
            { store }
        );

        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

        expect(store.getState().param.present.mapStyle).toEqual({ ...DEFAULT_MAP_STYLE, mapSource });
        expect(store.getState().param.present.graph).toBe(graph);
        act(() => store.dispatch(setMapStyle({ ...DEFAULT_MAP_STYLE, mapSource: undefined })));
        expect(store.getState().param.present.mapStyle.mapSource).toBeUndefined();
    });
    it('keeps a selected local map through graph history and the visibility switch', () => {
        const mapSource = { mapId: record.mapId, revision: record.revision, sha256: record.sha256 };
        const store = createStore();
        store.dispatch(setMapStyle({ ...store.getState().param.present.mapStyle, mapSource }));
        store.dispatch(saveGraph(createTestLineGraph([['A', 'B']]).export()));
        store.dispatch(setMapEnabled(false));
        store.dispatch(applyUndoAction('graph'));
        expect(store.getState().param.present.mapStyle.mapSource).toEqual(mapSource);
        expect(store.getState().param.present.mapEnabled).toBe(false);
        store.dispatch(
            replaceProjectState({
                ...store.getState().param.present,
                mapStyle: { ...store.getState().param.present.mapStyle, mapSource: undefined },
            })
        );
        expect(store.getState().param.present.mapStyle.mapSource).toBeUndefined();
        store.dispatch(applyUndoAction('project'));
        expect(store.getState().param.present.mapStyle.mapSource).toEqual(mapSource);
    });
    it('offers the three map modes and shows imported maps only in the RMW tab', async () => {
        library = [record];
        const { store } = show();
        expect(screen.getByRole('tab', { name: 'No map' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Real geographic map' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tab', { name: 'RMW maps' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.queryByRole('button', { name: 'Import map package' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Real geographic map' }));
        expect(store.getState().param.present.mapEnabled).toBe(true);
        expect(store.getState().param.present.mapStyle.mapSource).toBeUndefined();
        expect(screen.queryByRole('button', { name: 'Import map package' })).not.toBeInTheDocument();

        const before = store.getState().param.present;
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Use' })).toBeVisible());
        expect(screen.getByRole('button', { name: 'Import map package' })).toBeVisible();
        expect(screen.getByText('World A')).toBeVisible();
        expect(store.getState().param.present).toBe(before);

        fireEvent.click(screen.getByRole('tab', { name: 'No map' }));
        expect(screen.getByText('World A')).not.toBeVisible();
        expect(screen.queryByRole('button', { name: 'Import map package' })).not.toBeInTheDocument();
    });
    it('turns off a selected RMW map and restores it from the RMW tab without changing the viewport', async () => {
        library = [record];
        const store = createStore();
        store.dispatch(
            setMapStyle({
                ...store.getState().param.present.mapStyle,
                mapSource: { mapId: record.mapId, revision: record.revision, sha256: record.sha256 },
            })
        );
        store.dispatch(setMapEnabled(true));
        show(store);
        const before = store.getState().param.present;
        expect(screen.getByRole('tab', { name: 'RMW maps' })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByRole('button', { name: 'Use' })).toBeDisabled();
        await waitFor(() => expect(screen.getByText('Current')).toBeVisible());

        fireEvent.click(screen.getByRole('tab', { name: 'No map' }));
        expect(store.getState().param.present.mapEnabled).toBe(false);
        expect(store.getState().param.present.mapStyle.mapSource).toEqual(before.mapStyle.mapSource);

        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const next = store.getState().param.present;
        expect(next.mapEnabled).toBe(true);
        expect(next.mapStyle.mapSource).toEqual(before.mapStyle.mapSource);
        expect(next.graph).toBe(before.graph);
        expect(next.svgViewBoxMin).toEqual(before.svgViewBoxMin);
        expect(next.svgViewBoxZoom).toBe(before.svgViewBoxZoom);
    });
    it('starts on the no-map tab when the saved RMW source is disabled', async () => {
        const store = createStore();
        store.dispatch(
            setMapStyle({
                ...store.getState().param.present.mapStyle,
                mapSource: { mapId: record.mapId, revision: record.revision, sha256: record.sha256 },
            })
        );
        await act(async () => {
            show(store);
        });
        expect(screen.getByRole('tab', { name: 'No map' })).toHaveAttribute('aria-selected', 'true');
        expect(store.getState().param.present.mapEnabled).toBe(false);
    });
    it('adds a file to the library without changing the active project', async () => {
        const { store } = show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const snapshot = store.getState().param.present;
        vi.mocked(importMapIntoLibrary).mockImplementation(async () => {
            library = [record];
            return record;
        });
        const file = new File(['map archive'], 'world.rmpmap');
        const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
        fireEvent.change(input, { target: { files: [file] } });
        await screen.findByText('World A');
        expect(importMapIntoLibrary).toHaveBeenCalledWith(file);
        expect(store.getState().param.present).toEqual(snapshot);
        expect(store.getState().param.present).toBe(snapshot);
    });
    it('switches basemaps while preserving the graph and viewport', async () => {
        library = [record];
        const { store } = show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const before = store.getState().param.present;
        fireEvent.click(await screen.findByRole('button', { name: 'Use' }));
        expect(store.getState().param.present.mapStyle.mapSource).toEqual({
            mapId: record.mapId,
            revision: 1,
            sha256: record.sha256,
        });
        expect(store.getState().param.present.mapEnabled).toBe(true);
        expect(store.getState().param.present.graph).toBe(before.graph);
        expect(store.getState().param.present.svgViewBoxMin).toEqual(before.svgViewBoxMin);
        expect(store.getState().param.present.svgViewBoxZoom).toBe(before.svgViewBoxZoom);
        fireEvent.click(screen.getByRole('tab', { name: 'Real geographic map' }));
        expect(store.getState().param.present.mapStyle.mapSource).toBeUndefined();
        expect(store.getState().param.present.mapEnabled).toBe(true);
        expect(store.getState().param.present.graph).toBe(before.graph);
        expect(store.getState().param.present.svgViewBoxMin).toEqual(before.svgViewBoxMin);
    });
    it('locates the default geographic view without editing graph coordinates', async () => {
        library = [record];
        const { store } = show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const before = store.getState().param.present.graph;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'canvas';
        Object.defineProperties(svg, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
        document.body.append(svg);
        try {
            fireEvent.click(await screen.findByRole('button', { name: 'Use and locate' }));
            const next = store.getState().param.present;
            expect(next.mapStyle.mapSource?.sha256).toBe(record.sha256);
            expect(next.svgViewBoxZoom).toBe(100);
            expect(next.svgViewBoxMin.x).toBeCloseTo(2 ** 20 - MAP_WORLD_ORIGIN.x - 400);
            expect(next.svgViewBoxMin.y).toBeCloseTo(2 ** 20 - MAP_WORLD_ORIGIN.y - 300);
            expect(next.graph).toBe(before);
        } finally {
            svg.remove();
        }
    });
    it('refreshes an open library after a transfer without selecting the received map', async () => {
        const { store } = show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const before = store.getState().param.present;
        await screen.findByText('No local maps yet.');
        library = [record];
        act(() => notifyMapLibraryChanged());
        await screen.findByText('World A');
        expect(store.getState().param.present).toBe(before);
    });
    it('pulls the current RMW project directly and only refreshes the library', async () => {
        const start = vi.fn(async () => {
            library = [record];
        });
        vi.mocked(requestMapFromRmw).mockReturnValue({ start, cancel: vi.fn(), getBlob: () => undefined });
        const { store } = show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        const before = store.getState().param.present;
        fireEvent.click(screen.getByRole('button', { name: 'Import from RMW' }));
        await waitFor(() => expect(start).toHaveBeenCalledOnce());
        await screen.findByText('World A');
        expect(store.getState().param.present).toBe(before);
        expect(document.querySelector('iframe')).toBeNull();
    });
    it('keeps an in-progress RMW bridge mounted when switching map tabs', async () => {
        let finish!: () => void;
        const pending = new Promise<void>(resolve => {
            finish = resolve;
        });
        vi.mocked(requestMapFromRmw).mockImplementation(onNoPeer => ({
            start: vi.fn(() => {
                onNoPeer?.('active-bridge');
                return pending;
            }),
            cancel: finish,
            getBlob: () => undefined,
        }));
        show();
        fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import from RMW' }));
        const bridge = await screen.findByTitle('Rail Map World');
        try {
            await waitFor(() => expect(bridge).toBeVisible());
            expect(bridge).toHaveAttribute('src', '/rmw/?bridge=active-bridge');

            fireEvent.click(screen.getByRole('tab', { name: 'Real geographic map' }));
            expect(screen.getByTitle('Rail Map World')).toBe(bridge);
            expect(bridge).not.toBeVisible();

            fireEvent.click(screen.getByRole('tab', { name: 'RMW maps' }));
            expect(screen.getByTitle('Rail Map World')).toBe(bridge);
            expect(bridge).toBeVisible();
        } finally {
            await act(async () => {
                finish();
                await pending;
            });
        }
    });
});
