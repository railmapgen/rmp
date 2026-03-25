import { act, cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../redux';
import { LiveViewport } from '../redux/viewport/viewport-slice';
import { render } from '../test-utils';
import { useViewportController } from './use-viewport-controller';

type ViewportControllerApi = ReturnType<typeof useViewportController>;

interface HookHarnessProps {
    viewport: LiveViewport;
}

const HookHarness = React.forwardRef<ViewportControllerApi, HookHarnessProps>((props, ref) => {
    const controller = useViewportController({ viewport: props.viewport });

    React.useImperativeHandle(ref, () => controller, [controller]);

    return (
        <svg ref={controller.svgRef} data-testid="svg-root">
            <g ref={controller.viewportRef} data-testid="viewport-group" />
        </svg>
    );
});

HookHarness.displayName = 'HookHarness';

describe('useViewportController', () => {
    let rafId = 0;
    let rafCallbacks: Map<number, FrameRequestCallback>;

    const flushRaf = () => {
        act(() => {
            const callbacks = [...rafCallbacks.values()];
            rafCallbacks.clear();
            callbacks.forEach(callback => callback(16));
        });
    };

    beforeEach(() => {
        rafId = 0;
        rafCallbacks = new Map<number, FrameRequestCallback>();
        vi.useFakeTimers();
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            rafId += 1;
            rafCallbacks.set(rafId, callback);
            return rafId;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => {
            rafCallbacks.delete(id);
        });
    });

    afterEach(() => {
        cleanup();
        rafCallbacks.clear();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('coalesces repeated viewport previews into the latest RAF-applied transform', () => {
        const store = createStore();
        const ref = React.createRef<ViewportControllerApi>();

        render(<HookHarness ref={ref} viewport={{ x: 0, y: 0, zoom: 100 }} />, { store });

        expect(ref.current?.viewportRef.current?.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

        act(() => {
            ref.current?.previewViewport({ x: 10, y: 20, zoom: 80 }, { publishLiveViewport: true });
            ref.current?.previewViewport({ x: 30, y: 40, zoom: 50 }, { publishLiveViewport: true });
        });

        expect(ref.current?.viewportRef.current?.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
        expect(store.getState().viewport.liveViewport).toEqual({ x: 30, y: 40, zoom: 50 });

        flushRaf();

        expect(ref.current?.viewportRef.current?.getAttribute('transform')).toBe('translate(-60, -80) scale(2)');
    });

    it('debounces viewport commit and persists only the latest previewed viewport', () => {
        const store = createStore();
        const ref = React.createRef<ViewportControllerApi>();

        render(<HookHarness ref={ref} viewport={{ x: 0, y: 0, zoom: 100 }} />, { store });

        act(() => {
            ref.current?.previewViewport({ x: 10, y: 20, zoom: 80 }, { publishLiveViewport: true });
            ref.current?.scheduleViewportCommit(150);
        });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        act(() => {
            ref.current?.previewViewport({ x: 40, y: 50, zoom: 60 }, { publishLiveViewport: true });
            ref.current?.scheduleViewportCommit(150);
        });

        act(() => {
            vi.advanceTimersByTime(149);
        });

        expect(store.getState().param.svgViewBoxZoom).toBe(100);
        expect(store.getState().param.svgViewBoxMin).toEqual({ x: 0, y: 0 });
        expect(store.getState().viewport.liveViewport).toEqual({ x: 40, y: 50, zoom: 60 });

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(store.getState().param.svgViewBoxZoom).toBe(60);
        expect(store.getState().param.svgViewBoxMin).toEqual({ x: 40, y: 50 });
        expect(store.getState().viewport.liveViewport).toBeUndefined();
    });

    it('cancels pending delayed commit when committing immediately', () => {
        const store = createStore();
        const ref = React.createRef<ViewportControllerApi>();

        render(<HookHarness ref={ref} viewport={{ x: 0, y: 0, zoom: 100 }} />, { store });

        act(() => {
            ref.current?.previewViewport({ x: 10, y: 20, zoom: 80 }, { publishLiveViewport: true });
            ref.current?.scheduleViewportCommit(150);
            ref.current?.commitViewportNow({ x: 5, y: 15, zoom: 90 });
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(store.getState().param.svgViewBoxZoom).toBe(90);
        expect(store.getState().param.svgViewBoxMin).toEqual({ x: 5, y: 15 });
        expect(store.getState().viewport.liveViewport).toBeUndefined();
    });

    it('publishes live viewport during drag and commits the final viewport on drag end', () => {
        const store = createStore();
        const ref = React.createRef<ViewportControllerApi>();

        render(<HookHarness ref={ref} viewport={{ x: 0, y: 0, zoom: 100 }} />, { store });

        act(() => {
            ref.current?.beginDrag({ x: 0, y: 0 }, { publishLiveViewport: true });
            ref.current?.dragTo({ x: 50, y: 20 });
        });

        flushRaf();

        expect(store.getState().viewport.liveViewport).toEqual({ x: -50, y: -20, zoom: 100 });
        expect(ref.current?.viewportRef.current?.getAttribute('transform')).toBe('translate(50, 20) scale(1)');

        act(() => {
            ref.current?.finishDrag({ x: 100, y: 40 });
        });

        expect(store.getState().param.svgViewBoxZoom).toBe(100);
        expect(store.getState().param.svgViewBoxMin).toEqual({ x: -100, y: -40 });
        expect(store.getState().viewport.liveViewport).toBeUndefined();
    });
});
