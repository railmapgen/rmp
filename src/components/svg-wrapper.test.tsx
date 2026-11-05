import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { act, cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeMode } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { createStore } from '../redux';
import { initializeProject } from '../redux/param/param-slice';
import { setMode, setSelected } from '../redux/runtime/runtime-slice';
import { createTestLineGraph, render } from '../test-utils';
import type { CanvasLineDrawingHandle } from './svg-canvas-graph';
import SvgWrapper from './svg-wrapper';

const lineDrawing = vi.hoisted(() => ({
    begin: vi.fn().mockReturnValue(true),
    update: vi.fn(),
    finish: vi.fn().mockReturnValue(true),
    cancel: vi.fn(),
}));

vi.mock('./svg-canvas-graph', async () => {
    const React = await import('react');
    const MockSvgCanvas = React.forwardRef<CanvasLineDrawingHandle>((_props, ref) => {
        React.useImperativeHandle(ref, () => lineDrawing, []);
        return <g data-testid="graph-canvas" />;
    });
    MockSvgCanvas.displayName = 'MockSvgCanvas';
    return { default: MockSvgCanvas };
});
vi.mock('./map-canvas', () => ({ default: () => null }));
vi.mock('./predict-next-node', () => ({ default: () => null }));
vi.mock('./context-menu', () => ({ default: () => null }));
vi.mock('./touch/virtual-joystick', () => ({ default: () => <g data-testid="virtual-joystick" /> }));
vi.mock('../util/hooks', async importOriginal => ({
    ...(await importOriginal<typeof import('../util/hooks')>()),
    useFonts: () => {},
    useWindowSize: () => ({ width: 1000, height: 800 }),
}));
vi.mock('../util/random-station-names', () => ({ useMakeStationName: () => vi.fn() }));

const captureDescriptors = Object.fromEntries(
    ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture'].map(key => [
        key,
        Object.getOwnPropertyDescriptor(Element.prototype, key),
    ])
);
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
const LINE_MODE: RuntimeMode = `line-${LinePathType.Simple}/${LineStyleType.SingleColor}`;

const pointerEvent = (type: string, x: number, y: number, pointerType = 'touch') =>
    new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType,
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
    });

const pointer = (svg: SVGSVGElement, type: string, x = 200, y = 200, pointerType = 'touch') => {
    act(() => svg.dispatchEvent(pointerEvent(type, x, y, pointerType)));
};

const flushFrame = () => {
    act(() => {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach(callback => callback(16));
    });
};

const setup = (selected = false, mode: RuntimeMode = 'free') => {
    const store = createStore();
    store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
    store.dispatch(setMode(mode));
    if (selected) store.dispatch(setSelected(new Set(['stn_A'])));
    const result = render(
        <RmgThemeProvider>
            <SvgWrapper />
        </RmgThemeProvider>,
        { store }
    );
    const svg = result.container.querySelector<SVGSVGElement>('#canvas')!;
    const viewport = svg.querySelector('g')!;
    return { store, svg, viewport };
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    frames.clear();
    frameId = 0;
    window.graph = createTestLineGraph([['A', 'B']]);
    vi.stubGlobal(
        'PointerEvent',
        class extends MouseEvent {
            readonly pointerId: number;
            readonly pointerType: string;
            readonly isPrimary: boolean;

            constructor(type: string, init: PointerEventInit = {}) {
                super(type, init);
                this.pointerId = init.pointerId ?? 1;
                this.pointerType = init.pointerType ?? 'touch';
                this.isPrimary = init.isPrimary ?? true;
            }
        }
    );
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.set(++frameId, callback);
        return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 40, 960, 760));
    Object.defineProperties(Element.prototype, {
        setPointerCapture: { configurable: true, value: vi.fn() },
        hasPointerCapture: { configurable: true, value: vi.fn().mockReturnValue(true) },
        releasePointerCapture: { configurable: true, value: vi.fn() },
    });
});

afterEach(() => {
    cleanup();
    frames.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const [key, descriptor] of Object.entries(captureDescriptors)) {
        if (descriptor) Object.defineProperty(Element.prototype, key, descriptor);
        else Reflect.deleteProperty(Element.prototype, key);
    }
});

describe('SvgWrapper background pan startup', () => {
    it('moves on the first frame for a one-pixel touch move without waiting or updating Redux on press', () => {
        const { store, svg, viewport } = setup();
        const before = store.getState();
        const now = Date.now();
        pointer(svg, 'pointerdown');
        expect(store.getState().runtime).toBe(before.runtime);
        expect(store.getState().runtime.selected).toBe(before.runtime.selected);
        pointer(svg, 'pointermove', 201, 200);
        expect(store.getState().param.present.svgViewBoxMin).toBe(before.param.present.svgViewBoxMin);
        flushFrame();
        expect(Date.now()).toBe(now);
        expect(viewport).toHaveAttribute('transform', 'translate(1, 0) scale(1)');
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 0, y: 0 });
        pointer(svg, 'pointerup', 201, 200);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -1, y: 0 });
    });

    it('keeps an existing selection until the touch pan is released', () => {
        const { store, svg, viewport } = setup(true);
        const selection = store.getState().runtime.selected;
        pointer(svg, 'pointerdown');
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.active).toBeUndefined();
        pointer(svg, 'pointermove', 225, 210);
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        expect(store.getState().runtime.selected).toBe(selection);
        pointer(svg, 'pointerup', 225, 210);
        expect(store.getState().runtime.selected.size).toBe(0);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -25, y: -10 });
    });

    it.each(['touch', 'mouse'])(
        'commits a complete %s pan dispatched in one event turn before React can commit updated handlers',
        pointerType => {
            const { store, svg, viewport } = setup();
            const translation = pointerType === 'touch' ? { x: 10, y: 5 } : { x: 20, y: 10 };
            act(() => {
                svg.dispatchEvent(pointerEvent('pointerdown', 200, 200, pointerType));
                svg.dispatchEvent(pointerEvent('pointermove', 210, 205, pointerType));
                svg.dispatchEvent(pointerEvent('pointerup', 220, 210, pointerType));
                expect(store.getState().param.present.svgViewBoxMin).toEqual({
                    x: -translation.x,
                    y: -translation.y,
                });
                expect(viewport).toHaveAttribute('transform', `translate(${translation.x}, ${translation.y}) scale(1)`);
            });
            expect(store.getState().runtime.active).toBeUndefined();
            flushFrame();
            expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -translation.x, y: -translation.y });
            expect(viewport).toHaveAttribute('transform', `translate(${translation.x}, ${translation.y}) scale(1)`);
        }
    );

    it('retains immediate selection clearing and active state for a mouse pan', () => {
        const { store, svg, viewport } = setup(true);
        pointer(svg, 'pointerdown', 200, 200, 'mouse');
        expect(store.getState().runtime.selected.size).toBe(0);
        expect(store.getState().runtime.active).toBe('background');
        pointer(svg, 'pointermove', 201, 200, 'mouse');
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(1, 0) scale(1)');
        pointer(svg, 'pointerup', 205, 202, 'mouse');
        expect(store.getState().runtime.active).toBeUndefined();
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -5, y: -2 });
    });
});

describe('SvgWrapper touch pan release', () => {
    it.each([false, true])('keeps the last moved position on release with an existing selection: %s', selected => {
        const { store, svg, viewport } = setup(selected);
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointermove', 225, 210);
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        pointer(svg, 'pointerup', 227, 209);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -25, y: -10 });
        expect(store.getState().runtime.selected.size).toBe(0);
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');

        pointer(svg, 'pointerdown', 300, 300);
        pointer(svg, 'pointermove', 301, 301);
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(26, 11) scale(1)');
        pointer(svg, 'pointerup', 301, 301);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -26, y: -11 });
    });

    it('does not pan a stationary touch because its release coordinate drifted', () => {
        const { store, svg, viewport } = setup();
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointerup', 202, 201);
        flushFrame();
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 0, y: 0 });
        expect(viewport).toHaveAttribute('transform', 'translate(0, 0) scale(1)');
    });

    it('flushes a return to the original viewport before React commits the unchanged saved position', () => {
        const { store, svg, viewport } = setup();
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointermove', 225, 210);
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        act(() => {
            svg.dispatchEvent(pointerEvent('pointermove', 200, 200));
            svg.dispatchEvent(pointerEvent('pointerup', 202, 201));
            expect(viewport).toHaveAttribute('transform', 'translate(0, 0) scale(1)');
        });
        flushFrame();
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 0, y: 0 });
        expect(viewport).toHaveAttribute('transform', 'translate(0, 0) scale(1)');
    });
});

describe('SvgWrapper touch line-tool pan integration', () => {
    it('pans one pixel on the first frame without exiting the line tool or clearing its selection', () => {
        const { store, svg, viewport } = setup(true, LINE_MODE);
        const selection = store.getState().runtime.selected;
        const now = Date.now();
        expect(svg.querySelector('[data-testid="virtual-joystick"]')).toBeNull();
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointermove', 201, 200);
        flushFrame();
        expect(Date.now()).toBe(now);
        expect(viewport).toHaveAttribute('transform', 'translate(1, 0) scale(1)');
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: 0, y: 0 });
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.mode).toBe(LINE_MODE);
        pointer(svg, 'pointerup', 201, 200);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -1, y: 0 });
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.mode).toBe(LINE_MODE);
        expect(lineDrawing.begin).not.toHaveBeenCalled();
        expect(lineDrawing.finish).not.toHaveBeenCalled();
    });

    it('preserves the selected element after a pan exceeds the hold threshold', () => {
        const { store, svg, viewport } = setup(true, LINE_MODE);
        const selection = store.getState().runtime.selected;
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointermove', 225, 210);
        act(() => vi.advanceTimersByTime(450));
        flushFrame();
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        pointer(svg, 'pointerup', 230, 215);
        expect(store.getState().param.present.svgViewBoxMin).toEqual({ x: -25, y: -10 });
        expect(viewport).toHaveAttribute('transform', 'translate(25, 10) scale(1)');
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.mode).toBe(LINE_MODE);
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lineDrawing.begin).not.toHaveBeenCalled();
        expect(lineDrawing.finish).not.toHaveBeenCalled();
    });

    it('consumes a pending line-tool hold without immediately beginning or committing a line', () => {
        const { store, svg } = setup(true, LINE_MODE);
        const graph = store.getState().param.present.graph;
        const selection = store.getState().runtime.selected;
        const down = pointerEvent('pointerdown', 200, 200);
        act(() => {
            svg.dispatchEvent(down);
            vi.advanceTimersByTime(449);
        });
        expect(down.defaultPrevented).toBe(true);
        expect(store.getState().runtime.mode).toBe(LINE_MODE);
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lineDrawing.begin).not.toHaveBeenCalled();
        expect(lineDrawing.finish).not.toHaveBeenCalled();
        const up = pointerEvent('pointerup', 200, 200);
        act(() => svg.dispatchEvent(up));
        expect(up.defaultPrevented).toBe(true);
        expect(store.getState().param.present.graph).toBe(graph);
        expect(store.getState().runtime.selected).toBe(selection);
        expect(store.getState().runtime.mode).toBe(LINE_MODE);
        expect(lineDrawing.finish).not.toHaveBeenCalled();
    });
});
