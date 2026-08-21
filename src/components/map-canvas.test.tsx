import { act } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalAlertId } from '../constants/global-alerts';
import { MAP_ZOOMED_SWITCH_THRESHOLD } from '../map/map-config';
import type { MapTileControllerOptions } from '../map/map-tile-controller';
import { createStore } from '../redux';
import { setMapEnabled } from '../redux/param/param-slice';
import { closeGlobalAlert } from '../redux/runtime/runtime-slice';
import { render } from '../test-utils';
import MapCanvas, { MapCanvasHandle } from './map-canvas';

interface MockController {
    options: MapTileControllerOptions;
    initialize: ReturnType<typeof vi.fn>;
    updateViewport: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
}

const mockControllers = vi.hoisted(() => [] as MockController[]);

vi.mock('../map/map-tile-controller', () => ({
    MapTileController: class {
        initialize = vi.fn().mockResolvedValue(undefined);
        updateViewport = vi.fn();
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
    const onOverviewChange = vi.fn();
    const result = render(
        <svg data-testid="root-svg">
            <MapCanvas ref={ref} onOverviewChange={onOverviewChange} />
        </svg>,
        { store }
    );

    return { ...result, onOverviewChange, ref, store };
};

describe('MapCanvas', () => {
    afterEach(() => {
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

    it('forwards transient viewport changes and reports overview transitions', () => {
        const { onOverviewChange, ref } = renderMapCanvas();
        const controller = mockControllers[0];
        controller.updateViewport.mockClear();

        const overviewZoom = MAP_ZOOMED_SWITCH_THRESHOLD + 1;
        act(() => ref.current?.updateViewport({ x: 10, y: 20, zoom: overviewZoom }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({ x: 10, y: 20, zoom: overviewZoom });
        expect(onOverviewChange).toHaveBeenLastCalledWith(true);

        act(() => ref.current?.updateViewport({ x: 30, y: 40, zoom: MAP_ZOOMED_SWITCH_THRESHOLD }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({
            x: 30,
            y: 40,
            zoom: MAP_ZOOMED_SWITCH_THRESHOLD,
        });
        expect(onOverviewChange).toHaveBeenLastCalledWith(false);
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

    it('disposes the map layer and restores the editor when the map is hidden', () => {
        const { container, onOverviewChange, ref, store } = renderMapCanvas();
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
        expect(onOverviewChange).toHaveBeenLastCalledWith(false);
        expect(store.getState().runtime.globalAlerts[GlobalAlertId.MapLoading]).toBeUndefined();
        expect(store.getState().param.present.graph).toBe(graphBeforeToggle);
    });
});
