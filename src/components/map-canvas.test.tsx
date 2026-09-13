import { act } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalAlertId } from '../constants/global-alerts';
import { MAP_ZOOMED_SWITCH_THRESHOLD } from '../map/map-config';
import type { MapTileControllerOptions } from '../map/map-tile-controller';
import { createStore } from '../redux';
import { setDisableMapPerformanceOptimization } from '../redux/app/app-slice';
import { setMapEnabled } from '../redux/param/param-slice';
import { closeGlobalAlert } from '../redux/runtime/runtime-slice';
import { render } from '../test-utils';
import MapCanvas, { MapCanvasHandle } from './map-canvas';

interface MockController {
    options: MapTileControllerOptions;
    initialize: ReturnType<typeof vi.fn>;
    updateViewport: ReturnType<typeof vi.fn>;
    updateStyle: ReturnType<typeof vi.fn>;
    setInteractionActive: ReturnType<typeof vi.fn>;
    setRasterEnabled: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
}

const mockControllers = vi.hoisted(() => [] as MockController[]);

vi.mock('../map/map-tile-controller', () => ({
    MapTileController: class {
        initialize = vi.fn().mockResolvedValue(undefined);
        updateViewport = vi.fn();
        updateStyle = vi.fn();
        setInteractionActive = vi.fn();
        setRasterEnabled = vi.fn();
        dispose = vi.fn();

        constructor(public readonly options: MapTileControllerOptions) {
            mockControllers.push(this);
        }
    },
}));

const renderMapCanvas = () => {
    const initialParam = createStore().getState().param;
    const store = createStore({
        param: { ...initialParam, present: { ...initialParam.present, mapEnabled: true } },
    });
    const ref = React.createRef<MapCanvasHandle>();
    const result = render(
        <svg data-testid="root-svg">
            <MapCanvas ref={ref} />
        </svg>,
        { store }
    );

    return { ...result, ref, store };
};

describe('MapCanvas', () => {
    afterEach(() => {
        vi.useRealTimers();
        mockControllers.length = 0;
    });

    it('owns the map layer, style, and tile controller', () => {
        const { container, getByTestId, unmount } = renderMapCanvas();

        expect(container.querySelector('[data-map-style]')?.textContent).not.toBe('');
        const mapLayer = container.querySelector('[data-map-layer]');
        expect(mapLayer).not.toBeNull();
        expect(mockControllers).toHaveLength(1);

        const controller = mockControllers[0];
        expect(controller.options.root).toBe(mapLayer);
        expect(controller.options.styleCss).toBe(container.querySelector('[data-map-style]')?.textContent);
        expect(controller.options.rasterEnabled).toBe(true);
        expect(controller.initialize).toHaveBeenCalledOnce();

        const svg = getByTestId('root-svg');
        Object.defineProperties(svg, {
            clientWidth: { configurable: true, value: 640 },
            clientHeight: { configurable: true, value: 480 },
        });
        expect(controller.options.getViewportSize()).toEqual({ width: 640, height: 480 });

        unmount();
        expect(controller.dispose).toHaveBeenCalledOnce();
    });

    it('publishes overview transitions and keeps a dismissed edit hint closed until re-entry', () => {
        const { ref, store, unmount } = renderMapCanvas();
        const controller = mockControllers[0];
        controller.updateViewport.mockClear();

        const overviewZoom = MAP_ZOOMED_SWITCH_THRESHOLD + 1;
        act(() => ref.current?.updateViewport({ x: 10, y: 20, zoom: overviewZoom }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({ x: 10, y: 20, zoom: overviewZoom });
        expect(store.getState().runtime.isMapOverview).toBe(true);
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toMatchObject({
            status: 'info',
            message: 'Zoom in to edit the map.',
        });

        act(() => store.dispatch(closeGlobalAlert(GlobalAlertId.MapOverviewEdit)));
        act(() => ref.current?.updateViewport({ x: 20, y: 30, zoom: overviewZoom + 50 }));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toBeUndefined();

        act(() => ref.current?.updateViewport({ x: 30, y: 40, zoom: MAP_ZOOMED_SWITCH_THRESHOLD }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({
            x: 30,
            y: 40,
            zoom: MAP_ZOOMED_SWITCH_THRESHOLD,
        });
        expect(store.getState().runtime.isMapOverview).toBe(false);
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toBeUndefined();

        act(() => ref.current?.updateViewport({ x: 40, y: 50, zoom: overviewZoom }));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toBeDefined();

        unmount();
        expect(store.getState().runtime.isMapOverview).toBe(false);
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toBeUndefined();
    });

    it('reports visible tile progress through one replaceable global alert', () => {
        const { store } = renderMapCanvas();
        const onLoadingChange = mockControllers[0].options.onLoadingChange!;

        act(() => onLoadingChange(true));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toMatchObject({
            status: 'loading',
            message: 'Loading map',
        });

        act(() => onLoadingChange(true, { completed: 2, total: 5 }));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toMatchObject({
            status: 'loading',
            message: 'Loading map (2 / 5)',
        });

        act(() => store.dispatch(closeGlobalAlert(GlobalAlertId.MapLoading)));
        act(() => onLoadingChange(true, { completed: 3, total: 5 }));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toBeUndefined();

        act(() => onLoadingChange(false));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toBeUndefined();

        act(() => onLoadingChange(true, { completed: 0, total: 2 }));
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toMatchObject({
            message: 'Loading map (0 / 2)',
        });
    });

    it('stops raster optimization when the preference is disabled', () => {
        const { store } = renderMapCanvas();
        const controller = mockControllers[0];

        act(() => store.dispatch(setDisableMapPerformanceOptimization(true)));
        expect(controller.setRasterEnabled).toHaveBeenLastCalledWith(false);
    });

    it('disposes the map layer and restores the editor when the map is hidden', () => {
        const { container, ref, store } = renderMapCanvas();
        const controller = mockControllers[0];

        act(() =>
            ref.current?.updateViewport({
                x: 0,
                y: 0,
                zoom: MAP_ZOOMED_SWITCH_THRESHOLD + 1,
            })
        );
        act(() => controller.options.onLoadingChange?.(true, { completed: 0, total: 1 }));
        const graphBeforeToggle = store.getState().param.present.graph;
        act(() => store.dispatch(setMapEnabled(false)));

        expect(container.querySelector('[data-map-layer]')).toBeNull();
        expect(container.querySelector('[data-map-style]')).toBeNull();
        expect(controller.dispose).toHaveBeenCalledOnce();
        expect(store.getState().runtime.isMapOverview).toBe(false);
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapOverviewEdit]).toBeUndefined();
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toBeUndefined();
        expect(store.getState().param.present.graph).toBe(graphBeforeToggle);
    });

    it('defers raster work until wheel interaction becomes idle', () => {
        vi.useFakeTimers();
        const { ref } = renderMapCanvas();
        const controller = mockControllers[0];
        controller.setInteractionActive.mockClear();

        act(() => ref.current?.markViewportInteraction());
        expect(controller.setInteractionActive).toHaveBeenLastCalledWith(true);

        act(() => vi.advanceTimersByTime(200));
        expect(controller.setInteractionActive).toHaveBeenLastCalledWith(false);
    });
});
