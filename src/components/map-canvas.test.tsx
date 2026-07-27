import { act } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MapTileControllerOptions } from '../map/map-tile-controller';
import { createStore } from '../redux';
import { replaceGraph } from '../redux/param/param-slice';
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
    const store = createStore({ param: { ...initialParam, type: 'map' } });
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

        act(() => ref.current?.updateViewport({ x: 10, y: 20, zoom: 300 }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({ x: 10, y: 20, zoom: 300 });
        expect(onOverviewChange).toHaveBeenLastCalledWith(true);

        act(() => ref.current?.updateViewport({ x: 30, y: 40, zoom: 100 }));

        expect(controller.updateViewport).toHaveBeenLastCalledWith({ x: 30, y: 40, zoom: 100 });
        expect(onOverviewChange).toHaveBeenLastCalledWith(false);
    });

    it('removes the map layer and restores the editor when switching to a diagram', () => {
        const { container, onOverviewChange, ref, store } = renderMapCanvas();
        const controller = mockControllers[0];

        act(() => ref.current?.updateViewport({ x: 0, y: 0, zoom: 300 }));
        act(() => {
            store.dispatch(replaceGraph({ type: 'diagram', graph: store.getState().param.present }));
        });

        expect(container.querySelector('[data-map-layer]')).toBeNull();
        expect(container.querySelector('[data-map-style]')).toBeNull();
        expect(controller.dispose).toHaveBeenCalledOnce();
        expect(onOverviewChange).toHaveBeenLastCalledWith(false);
    });
});
