import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuCategory } from '../../constants/touch';
import { MAP_MAX_VIEWBOX_ZOOM } from '../../map/map-config';
import { createStore } from '../../redux';
import { setSnapLines } from '../../redux/app/app-slice';
import { initializeProject, setMapEnabled } from '../../redux/param/param-slice';
import { setActive, setMode, setPointerPosition, setSelected } from '../../redux/runtime/runtime-slice';
import { createTestLineGraph } from '../../test-utils';
import { findNearbyElements } from '../../util/graph-nearby-elements';
import TouchOverlay from './touch-overlay';

vi.mock('../../util/graph-nearby-elements', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/graph-nearby-elements')>()),
    findNearbyElements: vi.fn(),
}));

const chooseStation = vi.fn();
const getNearbyData = () => ({
    [MenuCategory.STATION]: [{ label: 'Station A', elementId: 'stn_A', action: chooseStation }],
    [MenuCategory.MISC_NODE]: [],
    [MenuCategory.LINE]: [],
    [MenuCategory.OPERATION]: [],
});

const pointer = (target: Element, type: string, x = 160, y = 220, pointerId = 1, pointerType = 'touch') => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(
        event,
        Object.fromEntries(
            Object.entries({
                clientX: x,
                clientY: y,
                pointerId,
                pointerType,
                isPrimary: pointerId === 1,
                button: 0,
            }).map(([key, value]) => [key, { value }])
        )
    );
    fireEvent(target, event);
};
const advanceHold = (time = 450) => act(() => vi.advanceTimersByTime(time));

const setup = ({ selected = false, lineDrawing = false } = {}) => {
    const store = createStore();
    store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
    if (selected) store.dispatch(setSelected(new Set(['stn_A'])));
    let viewport = { x: 0, y: 0, zoom: 100 };
    const onMenuTakeover = vi.fn();
    const onPinchMove = vi.fn((next: typeof viewport) => {
        viewport = next;
    });
    const onPinchEnd = vi.fn((next: typeof viewport) => {
        viewport = next;
    });
    const drawing = {
        begin: vi.fn<(source: string, point: { x: number; y: number }) => boolean>().mockReturnValue(true),
        update: vi.fn<(point: { x: number; y: number }, clientPoint: { x: number; y: number }) => void>(),
        finish: vi
            .fn<(point: { x: number; y: number }, clientPoint: { x: number; y: number }) => boolean>()
            .mockReturnValue(true),
        cancel: vi.fn(),
    };
    const onLinePanStart = vi.fn();
    const onLinePanMove = vi.fn();
    const onLinePanEnd = vi.fn();
    const move = vi.fn();
    const up = vi.fn();
    const cancel = vi.fn();
    const ignoredMove = vi.fn();
    const ignoredUp = vi.fn();
    const Harness = ({
        disabled = false,
        editorDisabled = false,
    }: {
        disabled?: boolean;
        editorDisabled?: boolean;
    }) => {
        const svgRef = React.useRef<SVGSVGElement>(null);
        const sceneRef = React.useRef<SVGGElement>(null);
        const lineDrawingRef = React.useRef(drawing);
        return (
            <Provider store={store}>
                <svg
                    id="canvas"
                    ref={svgRef}
                    width="320"
                    height="600"
                    viewBox="0 0 320 600"
                    onPointerDown={event => {
                        if (event.target !== event.currentTarget) return;
                        store.dispatch(setSelected(new Set()));
                        store.dispatch(setActive('background'));
                    }}
                >
                    <g>
                        <g id="touch-test-scene" ref={sceneRef}>
                            <g
                                id="stn_A"
                                onPointerDown={event => {
                                    event.stopPropagation();
                                    store.dispatch(setSelected(new Set(['stn_A'])));
                                    store.dispatch(setActive('stn_A'));
                                    store.dispatch(setPointerPosition({ x: event.clientX, y: event.clientY }));
                                }}
                                onPointerMove={event => {
                                    move();
                                    window.graph.setNodeAttribute('stn_A', 'x', event.clientX);
                                }}
                                onPointerUp={up}
                            >
                                <rect data-testid="station" width="20" height="20" />
                            </g>
                            <g
                                id="stn_name_stn_A"
                                onPointerDown={event => event.stopPropagation()}
                                onPointerCancel={cancel}
                            >
                                <text data-testid="name">Station A</text>
                            </g>
                            <circle
                                data-testid="control"
                                r="6"
                                onPointerDown={event => event.stopPropagation()}
                                onPointerCancel={cancel}
                            />
                            <circle
                                id="prediction"
                                data-testid="prediction"
                                r="6"
                                onPointerMove={ignoredMove}
                                onPointerUp={ignoredUp}
                            />
                            <a href="https://example.test/">
                                <text data-testid="link">Map attribution</text>
                            </a>
                        </g>
                        <circle data-testid="joystick" r="6" onPointerMove={ignoredMove} onPointerUp={ignoredUp} />
                        <TouchOverlay
                            svgRef={svgRef}
                            sceneRef={sceneRef}
                            getViewport={() => viewport}
                            onMenuTakeover={onMenuTakeover}
                            onPinchMove={onPinchMove}
                            onPinchEnd={onPinchEnd}
                            lineDrawingRef={lineDrawing ? lineDrawingRef : undefined}
                            onLinePanStart={lineDrawing ? onLinePanStart : undefined}
                            onLinePanMove={lineDrawing ? onLinePanMove : undefined}
                            onLinePanEnd={lineDrawing ? onLinePanEnd : undefined}
                            disabled={disabled}
                            editorDisabled={editorDisabled}
                        />
                    </g>
                </svg>
            </Provider>
        );
    };
    const result = render(<Harness />);
    return {
        ...result,
        store,
        svg: result.container.querySelector('svg')!,
        station: result.getByTestId('station'),
        lens: () => result.container.querySelector('[data-touch-magnifier]'),
        move,
        up,
        cancel,
        ignoredMove,
        ignoredUp,
        onMenuTakeover,
        onPinchMove,
        onPinchEnd,
        drawing,
        onLinePanStart,
        onLinePanMove,
        onLinePanEnd,
        getViewport: () => viewport,
        disable: () => result.rerender(<Harness disabled />),
        setEditorDisabled: (editorDisabled: boolean) => result.rerender(<Harness editorDisabled={editorDisabled} />),
        setViewport: (value: typeof viewport) => {
            viewport = value;
        },
    };
};

const lockLineSource = (harness: ReturnType<typeof setup>) => {
    pointer(harness.svg, 'pointerdown');
    advanceHold();
    const item = harness.container.querySelector('[data-touch-menu-item="station:0"]');
    expect(item).not.toBeNull();
    vi.mocked(document.elementsFromPoint).mockReturnValue([item!]);
    pointer(harness.svg, 'pointermove', 190, 180);
    pointer(harness.svg, 'pointerup', 190, 180);
    vi.mocked(document.elementsFromPoint).mockReturnValue([]);
};

const setupLine = (selected = false) => {
    const harness = setup({ selected, lineDrawing: true });
    act(() => harness.store.dispatch(setMode('line-simple/single-color')));
    return harness;
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.graph = createTestLineGraph([['A', 'B']]);
    vi.mocked(findNearbyElements).mockImplementation(getNearbyData);
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 40,
        top: 40,
        right: 360,
        bottom: 640,
        x: 40,
        y: 40,
        width: 320,
        height: 600,
        toJSON: () => ({}),
    });
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })
    );
    Object.defineProperties(Element.prototype, {
        setPointerCapture: { configurable: true, value: vi.fn() },
        hasPointerCapture: { configurable: true, value: vi.fn().mockReturnValue(true) },
        releasePointerCapture: { configurable: true, value: vi.fn() },
    });
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: vi.fn().mockReturnValue([]) });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('TouchOverlay', () => {
    it('leaves short taps and mouse gestures without a radial menu or magnifier', () => {
        const { station, lens, store } = setup();
        pointer(station, 'pointerdown');
        advanceHold(449);
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lens()).toBeNull();
        pointer(station, 'pointerup');
        advanceHold();
        pointer(station, 'pointerdown', 160, 220, 1, 'mouse');
        advanceHold();
        expect(lens()).toBeNull();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
    });

    it.each([1, 8])('delivers a %ipx drag immediately while keeping the hold eligible', displacement => {
        const { station, store, move, lens, onMenuTakeover } = setup();
        const initialX = window.graph.getNodeAttribute('stn_A', 'x');
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 160 + displacement, 220);
        expect(move).toHaveBeenCalledOnce();
        expect(window.graph.getNodeAttribute('stn_A', 'x')).not.toBe(initialX);
        expect(lens()).not.toBeNull();
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(true);
        expect(store.getState().param.present.graph.nodes?.find(node => node.key === 'stn_A')?.attributes?.x).toBe(
            window.graph.getNodeAttribute('stn_A', 'x')
        );
        expect(store.getState().runtime.active).toBeUndefined();
        expect(store.getState().runtime.pointerPosition).toBeUndefined();
        expect(onMenuTakeover).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
        pointer(station, 'pointerup');
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(chooseStation).not.toHaveBeenCalled();
        expect(lens()).toBeNull();
    });

    it('continues editing without opening the menu after crossing the drag threshold', () => {
        const { station, store, lens, move, up } = setup();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 171, 220);
        expect(move).toHaveBeenCalledOnce();
        expect(lens()).not.toBeNull();
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(station, 'pointerup', 171, 220);
        expect(up).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
    });

    it('keeps a hold canceled after the finger exceeds 8px and then returns near its origin', () => {
        const { station, store, lens, move } = setup();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 169, 220);
        pointer(station, 'pointermove', 161, 220);
        expect(move).toHaveBeenCalledTimes(2);
        expect(lens()).not.toBeNull();
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(station, 'pointerup', 161, 220);
        expect(lens()).toBeNull();
    });

    it('selects the actual finger-hit sector once on release despite pointer capture', () => {
        const { station, container, store, move, up, lens } = setup();
        pointer(station, 'pointerdown');
        advanceHold();
        expect(lens()).toBeNull();
        const item = container.querySelector('[data-touch-menu-item="station:0"]')!;
        expect(item).not.toBeNull();
        vi.mocked(document.elementsFromPoint).mockReturnValue([item]);
        pointer(station, 'pointermove', 190, 180);
        expect(move).not.toHaveBeenCalled();
        expect(lens()).toBeNull();
        pointer(station, 'pointerup', 190, 180);
        expect(chooseStation).toHaveBeenCalledOnce();
        expect(up).not.toHaveBeenCalled();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(station, 'pointerup', 190, 180);
        expect(chooseStation).toHaveBeenCalledOnce();
    });

    it('cancels selection when the finger leaves the menu before release', () => {
        const { station, container, store } = setup();
        pointer(station, 'pointerdown');
        advanceHold();
        const item = container.querySelector('[data-touch-menu-item="station:0"]')!;
        vi.mocked(document.elementsFromPoint).mockReturnValue([item]);
        pointer(station, 'pointermove', 190, 180);
        vi.mocked(document.elementsFromPoint).mockReturnValue([]);
        pointer(station, 'pointerup', 250, 400);
        expect(chooseStation).not.toHaveBeenCalled();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
    });

    it('requires deliberate movement after opening rather than counting pre-hold jitter', () => {
        const { station, container } = setup();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 167, 220);
        advanceHold();
        const item = container.querySelector('[data-touch-menu-item="station:0"]')!;
        vi.mocked(document.elementsFromPoint).mockReturnValue([item]);
        pointer(station, 'pointermove', 169, 220);
        pointer(station, 'pointerup', 169, 220);
        expect(chooseStation).not.toHaveBeenCalled();
    });

    it.each(['name', 'control'])('keeps %s editing independent from radial selection', targetId => {
        window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
        const { getByTestId, store, lens } = setup({ selected: true });
        const target = getByTestId(targetId);
        pointer(target, 'pointerdown');
        advanceHold();
        expect(lens()).not.toBeNull();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(target, 'pointermove', 180, 220);
        pointer(target, 'pointerup', 180, 220);
        expect(lens()).toBeNull();
    });

    it.each(['stn_A', 'stn_B'] as const)('keeps the radial menu closed when %s was already selected', selectedId => {
        const { station, store, lens } = setup();
        act(() => store.dispatch(setSelected(new Set([selectedId]))));
        pointer(station, 'pointerdown');
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(findNearbyElements).not.toHaveBeenCalled();
        expect(lens()).not.toBeNull();
        pointer(station, 'pointermove', 161, 220);
        expect(lens()).not.toBeNull();
        pointer(station, 'pointerup', 161, 220);
    });

    it('remembers a preexisting selection even when the background handler clears it on pointerdown', () => {
        const { svg, store, lens } = setup({ selected: true });
        pointer(svg, 'pointerdown');
        expect(store.getState().runtime.selected.size).toBe(0);
        advanceHold();
        expect(findNearbyElements).not.toHaveBeenCalled();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lens()).toBeNull();
        pointer(svg, 'pointerup');
    });

    describe('selected-node long-press move', () => {
        it.each([
            { guide: 'horizontal', anchor: { x: 300, y: 182 }, expected: { x: 120, y: 182 } },
            { guide: 'vertical', anchor: { x: 122, y: 400 }, expected: { x: 122, y: 180 } },
            { guide: 'diagonal', anchor: { x: 300, y: 362 }, expected: { x: 120, y: 182 } },
            { guide: 'opposite diagonal', anchor: { x: 300, y: 2 }, expected: { x: 120, y: 182 } },
        ])('snaps to a $guide guide on the first long-press frame', ({ anchor, expected }) => {
            window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
            window.graph.mergeNodeAttributes('stn_B', anchor);
            const { svg, container, store } = setup({ selected: true });
            pointer(svg, 'pointerdown');
            advanceHold();
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject(expected);
            const guide = container.querySelector('[data-touch-snap-guides] path[stroke="cyan"]');
            expect(guide).not.toBeNull();
            expect(guide?.closest('#touch-test-scene')).not.toBeNull();
            pointer(svg, 'pointerup', 162, 224);
            expect(store.getState().param.present.graph.nodes?.[0].attributes).toMatchObject(expected);
            expect(store.getState().param.past).toHaveLength(1);
            expect(container.querySelector('[data-touch-snap-guides]')).toBeNull();
        });

        it('keeps, releases, and reacquires a guide as the held finger moves', () => {
            window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
            window.graph.mergeNodeAttributes('stn_B', { x: 300, y: 182 });
            const { svg, container } = setup({ selected: true });
            pointer(svg, 'pointerdown');
            advanceHold();
            pointer(svg, 'pointermove', 180, 225);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 140, y: 182 });
            pointer(svg, 'pointermove', 190, 229);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 150, y: 189 });
            expect(container.querySelector('[data-touch-snap-guides] path')).toBeNull();
            pointer(svg, 'pointermove', 200, 223);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 160, y: 182 });
            expect(container.querySelector('[data-touch-snap-guides] path[stroke="cyan"]')).not.toBeNull();
            pointer(svg, 'pointerup', 200, 223);
        });

        it('snaps to the midpoint of two stationary nodes and shows its spacing guides', () => {
            window.graph = createTestLineGraph([
                ['A', 'B'],
                ['B', 'C'],
            ]);
            window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
            window.graph.mergeNodeAttributes('stn_B', { x: 100, y: 182 });
            window.graph.mergeNodeAttributes('stn_C', { x: 200, y: 182 });
            const { svg, container } = setup({ selected: true });
            pointer(svg, 'pointerdown');
            advanceHold();
            pointer(svg, 'pointermove', 190, 223);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 150, y: 182 });
            expect(container.querySelector('[data-touch-snap-guides] line[stroke="#FC8181"]')).not.toBeNull();
            pointer(svg, 'pointerup', 190, 223);
        });

        it('follows the finger freely when snapping is disabled, including between grid positions', () => {
            window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
            window.graph.mergeNodeAttributes('stn_B', { x: 300, y: 182 });
            const { svg, container, store } = setup({ selected: true });
            act(() => store.dispatch(setSnapLines(false)));
            pointer(svg, 'pointerdown');
            advanceHold();
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 120, y: 180 });
            pointer(svg, 'pointermove', 181, 223);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 141, y: 183 });
            expect(container.querySelector('[data-touch-snap-guides]')).toBeNull();
            pointer(svg, 'pointerup', 181, 223);
        });

        it.each([
            { node: 'stn_A', target: 'station' },
            { node: 'stn_A', target: 'canvas' },
            { node: 'misc_node_A', target: 'canvas' },
        ] as const)('snaps $node from a hold on $target and drags without reopening the tray', ({ node, target }) => {
            window.graph = createTestLineGraph([['A', 'B']], node.startsWith('misc') ? ['A'] : []);
            window.graph.mergeNodeAttributes(node, { x: 110, y: 180 });
            const { svg, station, store, lens, move, up } = setup();
            act(() => store.dispatch(setSelected(new Set([node]))));
            const heldTarget = target === 'station' ? station : svg;
            pointer(heldTarget, 'pointerdown');
            advanceHold(449);
            expect(window.graph.getNodeAttribute(node, 'x')).toBe(110);
            advanceHold(1);
            expect(window.graph.getNodeAttributes(node)).toMatchObject({ x: 120, y: 180 });
            expect(store.getState().runtime.selected).toEqual(new Set([node]));
            expect(store.getState().runtime.active).toBe(node);
            expect(store.getState().runtime.pointerPosition).toEqual({ x: 120, y: 180 });
            expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
            expect(findNearbyElements).not.toHaveBeenCalled();
            expect(lens()).not.toBeNull();
            // The old node capture can be lost as the overlay takes ownership.
            if (target === 'station') pointer(heldTarget, 'lostpointercapture');
            pointer(station, 'pointermove', 190, 245);
            expect(move).not.toHaveBeenCalled();
            expect(window.graph.getNodeAttributes(node)).toMatchObject({ x: 150, y: 205 });
            pointer(station, 'pointerup', 192, 244);
            expect(up).not.toHaveBeenCalled();
            expect(
                store.getState().param.present.graph.nodes?.find(item => item.key === node)?.attributes
            ).toMatchObject({
                x: 150,
                y: 205,
            });
            expect(store.getState().param.past).toHaveLength(1);
            expect(store.getState().runtime.active).toBeUndefined();
            expect(store.getState().runtime.pointerPosition).toBeUndefined();
            expect(store.getState().runtime.selected).toEqual(new Set([node]));
            expect(lens()).toBeNull();
        });

        it('uses the current viewport when starting and moving the node', () => {
            window.graph.mergeNodeAttributes('stn_A', { x: 330, y: 560 });
            const { svg, store, setViewport } = setup({ selected: true });
            setViewport({ x: 100, y: 200, zoom: 200 });
            pointer(svg, 'pointerdown');
            pointer(svg, 'pointermove', 164, 223);
            setViewport({ x: 110, y: 210, zoom: 200 });
            advanceHold();
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 358, y: 576 });
            pointer(svg, 'pointermove', 170, 230);
            expect(window.graph.getNodeAttributes('stn_A')).toMatchObject({ x: 370, y: 590 });
            pointer(svg, 'pointerup', 170, 230);
            expect(store.getState().param.past).toHaveLength(1);
        });

        it('keeps direct editing of a different nearby node independent', () => {
            window.graph.mergeNodeAttributes('stn_B', { x: 110, y: 180 });
            const { station, store, move } = setup();
            act(() => store.dispatch(setSelected(new Set(['stn_B']))));
            pointer(station, 'pointerdown');
            pointer(station, 'pointermove', 164, 223);
            advanceHold();
            expect(window.graph.getNodeAttributes('stn_B')).toMatchObject({ x: 110, y: 180 });
            expect(store.getState().runtime.active).toBe('stn_A');
            expect(store.getState().runtime.selected).toEqual(new Set(['stn_A']));
            expect(move).toHaveBeenCalledOnce();
            pointer(station, 'pointerup', 164, 223);
        });

        it.each(['release', 'pointercancel', 'lostpointercapture', 'pinch', 'disable', 'unmount'])(
            'saves the immediate reposition once when %s ends a stationary hold',
            end => {
                window.graph.mergeNodeAttributes('stn_A', { x: 110, y: 180 });
                window.graph.mergeNodeAttributes('stn_B', { x: 300, y: 182 });
                const harness = setup({ selected: true });
                pointer(harness.svg, 'pointerdown');
                advanceHold();
                expect(harness.container.querySelector('[data-touch-snap-guides] path[stroke="cyan"]')).not.toBeNull();
                if (end === 'release') pointer(harness.svg, 'pointerup');
                else if (end === 'pinch') {
                    pointer(harness.svg, 'pointerdown', 260, 300, 2);
                    pointer(harness.svg, 'pointerup', 260, 300, 2);
                    pointer(harness.svg, 'pointerup');
                } else if (end === 'disable' || end === 'unmount') harness[end]();
                else pointer(harness.svg, end);
                expect(harness.store.getState().param.present.graph.nodes?.[0].attributes).toMatchObject({
                    x: 120,
                    y: 182,
                });
                expect(harness.store.getState().param.past).toHaveLength(1);
                expect(harness.store.getState().runtime.active).toBeUndefined();
                expect(harness.lens()).toBeNull();
                expect(harness.container.querySelector('[data-touch-snap-guides]')).toBeNull();
                pointer(harness.svg, 'pointerup');
                expect(harness.store.getState().param.past).toHaveLength(1);
            }
        );

        it.each(['tap', 'pan', 'outside', 'multiple', 'line', 'deleted'])(
            'does not start a node move for %s',
            action => {
                window.graph.mergeNodeAttributes('stn_A', { x: action === 'outside' ? 89 : 110, y: 180 });
                const { svg, store, lens } = setup({ selected: true });
                if (action === 'multiple') act(() => store.dispatch(setSelected(new Set(['stn_A', 'stn_B']))));
                if (action === 'line') act(() => store.dispatch(setSelected(new Set(['line_0']))));
                pointer(svg, 'pointerdown');
                if (action === 'tap') pointer(svg, 'pointerup');
                if (action === 'pan') pointer(svg, 'pointermove', 169, 220);
                if (action === 'deleted') window.graph.dropNode('stn_A');
                advanceHold();
                expect(store.getState().runtime.active).not.toBe('stn_A');
                expect(store.getState().param.past).toHaveLength(0);
                expect(lens()).toBeNull();
                pointer(svg, 'pointerup');
            }
        );
    });

    it.each(['prediction', 'joystick'])('preserves pointer events for the excluded %s control', targetId => {
        const { getByTestId, ignoredMove, ignoredUp, lens, store } = setup();
        const target = getByTestId(targetId);
        pointer(target, 'pointerdown');
        pointer(target, 'pointermove', 180, 240);
        pointer(target, 'pointerup', 180, 240);
        advanceHold();
        expect(ignoredMove).toHaveBeenCalledOnce();
        expect(ignoredUp).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
    });

    it('does not show a magnifier while panning empty canvas', () => {
        const { svg, store, lens } = setup();
        pointer(svg, 'pointerdown');
        pointer(svg, 'pointermove', 180, 260);
        advanceHold();
        expect(lens()).toBeNull();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(svg, 'pointerup', 180, 260);
    });

    it('hides a stationary background magnifier when the hold turns into a pan', () => {
        vi.mocked(findNearbyElements).mockReturnValue({
            [MenuCategory.STATION]: [],
            [MenuCategory.MISC_NODE]: [],
            [MenuCategory.LINE]: [],
            [MenuCategory.OPERATION]: [],
        });
        const { svg, store, lens } = setup();
        pointer(svg, 'pointerdown');
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(svg, 'pointermove', 180, 260);
        expect(lens()).toBeNull();
        pointer(svg, 'pointerup', 180, 260);
    });

    it('locates a held point using its latest finger position and the live viewport', () => {
        const { station, store, lens, setViewport } = setup();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 164, 223);
        setViewport({ x: 100, y: 200, zoom: 200 });
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.position).toEqual({ x: 348, y: 566 });
        expect(lens()).toBeNull();
        pointer(station, 'pointerup', 164, 223);
    });

    it('shows a 168px magnifier with a live scene at 1.3 times the current canvas scale', () => {
        const { getByTestId, lens, setViewport } = setup();
        const control = getByTestId('control');
        setViewport({ x: 100, y: 200, zoom: 200 });
        pointer(control, 'pointerdown');
        pointer(control, 'pointermove', 164, 223);
        expect(lens()?.querySelector('use')?.getAttribute('href')).toBe('#touch-test-scene');
        expect(lens()?.querySelector('use')?.getAttribute('transform')).toContain('translate(-348, -566)');
        expect(lens()?.querySelector('use')?.getAttribute('transform')).toContain('scale(0.65)');
        expect(lens()?.querySelector('circle')?.getAttribute('r')).toBe('84');
        expect(lens()?.getAttribute('pointer-events')).toBe('none');
        pointer(control, 'pointerup', 164, 223);
    });

    it('clears menu and magnifier when a second finger starts a pinch', () => {
        const { svg, station, store, lens } = setup();
        pointer(station, 'pointerdown');
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(true);
        expect(lens()).toBeNull();
        pointer(svg, 'pointerdown', 260, 300, 2);
        expect(lens()).toBeNull();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        pointer(svg, 'pointermove', 280, 320, 2);
        advanceHold();
        expect(lens()).toBeNull();
        pointer(svg, 'pointerup', 280, 320, 2);
        pointer(station, 'pointerup');
        expect(chooseStation).not.toHaveBeenCalled();
    });

    it('cancels a captured precision editor before starting a two-finger gesture', () => {
        const { svg, getByTestId, lens, cancel } = setup();
        const control = getByTestId('control');
        pointer(control, 'pointerdown');
        pointer(control, 'gotpointercapture');
        pointer(control, 'pointermove', 180, 240);
        expect(lens()).not.toBeNull();
        pointer(svg, 'pointerdown', 260, 300, 2);
        expect(cancel).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
        pointer(svg, 'pointerup', 260, 300, 2);
        pointer(control, 'pointerup', 180, 240);
    });

    it('previews small pinch movements continuously while anchoring the original midpoint', () => {
        const { svg, setViewport, getViewport, onPinchMove } = setup();
        setViewport({ x: 100, y: 200, zoom: 100 });
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 342, 240, 2);
        expect(onPinchMove).toHaveBeenCalledOnce();
        const first = getViewport();
        expect(first.zoom).toBeCloseTo(99.00990099);
        expect(first.x + (201 * first.zoom) / 100).toBeCloseTo(300);
        expect(first.y + (200 * first.zoom) / 100).toBeCloseTo(400);
        pointer(svg, 'pointermove', 344, 240, 2);
        expect(getViewport().zoom).toBeCloseTo(98.039215686);
        pointer(svg, 'pointerup', 344, 240, 2);
        pointer(svg, 'pointerup', 140, 240, 1);
    });

    it('pans with both fingers without introducing zoom drift', () => {
        const { svg, setViewport, getViewport } = setup();
        setViewport({ x: 100, y: 200, zoom: 125 });
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 160, 240, 1);
        pointer(svg, 'pointermove', 360, 240, 2);
        expect(getViewport().zoom).toBeCloseTo(125);
        expect(getViewport().x).toBeCloseTo(75);
        expect(getViewport().y).toBeCloseTo(200);
        pointer(svg, 'pointerup', 360, 240, 2);
        pointer(svg, 'pointerup', 160, 240, 1);
    });

    it('commits the final release position when it differs from the last pinch move', () => {
        const { svg, getViewport, onPinchEnd } = setup();
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 360, 240, 2);
        expect(getViewport().zoom).toBeCloseTo(90.9090909);
        pointer(svg, 'pointerup', 380, 240, 2);
        expect(onPinchEnd).toHaveBeenCalledOnce();
        const committed = onPinchEnd.mock.calls[0][0];
        expect(committed.zoom).toBeCloseTo(83.3333333);
        expect(committed.x).toBeCloseTo(16.6666667);
        expect(committed.y).toBeCloseTo(33.3333333);
        expect(getViewport()).toEqual(committed);
        pointer(svg, 'pointerup', 140, 240, 1);
        expect(onPinchEnd).toHaveBeenCalledOnce();
    });

    it.each(['pointerup', 'pointercancel'])(
        'commits a pinch once on the first %s and suppresses the remaining finger',
        eventType => {
            const { svg, station, getViewport, onPinchMove, onPinchEnd, move, up, lens } = setup();
            pointer(station, 'pointerdown', 160, 220, 1);
            pointer(svg, 'pointerdown', 260, 220, 2);
            pointer(svg, 'pointermove', 280, 220, 2);
            const latest = getViewport();
            pointer(station, eventType, 160, 220, 1);
            expect(onPinchEnd).toHaveBeenCalledExactlyOnceWith(latest);
            const previewCount = onPinchMove.mock.calls.length;
            pointer(station, 'pointermove', 300, 240, 2);
            pointer(station, 'pointerup', 300, 240, 2);
            expect(onPinchMove).toHaveBeenCalledTimes(previewCount);
            expect(onPinchEnd).toHaveBeenCalledOnce();
            expect(move).not.toHaveBeenCalled();
            expect(up).not.toHaveBeenCalled();
            expect(lens()).toBeNull();
        }
    );

    it.each([
        { mapEnabled: false, maximum: 390 },
        { mapEnabled: true, maximum: MAP_MAX_VIEWBOX_ZOOM },
    ])('clamps pinch zoom with mapEnabled=$mapEnabled', ({ mapEnabled, maximum }) => {
        const { svg, store, getViewport } = setup();
        act(() => store.dispatch(setMapEnabled(mapEnabled)));
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 4140, 240, 2);
        expect(getViewport().zoom).toBe(10);
        pointer(svg, 'pointermove', 141, 240, 2);
        expect(getViewport().zoom).toBe(maximum);
        pointer(svg, 'pointerup', 141, 240, 2);
        pointer(svg, 'pointerup', 140, 240, 1);
    });

    it('restarts from the current view after a third finger leaves without jumping', () => {
        const { svg, getViewport, onPinchEnd } = setup();
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 440, 240, 2);
        const beforeThirdFinger = getViewport();
        pointer(svg, 'pointerdown', 240, 340, 3);
        expect(onPinchEnd).toHaveBeenCalledExactlyOnceWith(beforeThirdFinger);
        pointer(svg, 'pointermove', 160, 240, 1);
        expect(getViewport()).toEqual(beforeThirdFinger);
        pointer(svg, 'pointerup', 240, 340, 3);
        pointer(svg, 'pointermove', 440, 240, 2);
        expect(getViewport()).toEqual(beforeThirdFinger);
        pointer(svg, 'pointermove', 460, 240, 2);
        expect(getViewport().zoom).toBeCloseTo((beforeThirdFinger.zoom * 280) / 300);
        pointer(svg, 'pointerup', 460, 240, 2);
        expect(onPinchEnd).toHaveBeenCalledTimes(2);
        pointer(svg, 'pointerup', 160, 240, 1);
    });

    it('keeps a pinch active across editor overview changes and lets it reverse direction', () => {
        const { svg, getViewport, setEditorDisabled, onPinchEnd, store, lens } = setup();
        pointer(svg, 'pointerdown', 140, 240, 1);
        pointer(svg, 'pointerdown', 340, 240, 2);
        pointer(svg, 'pointermove', 440, 240, 2);
        setEditorDisabled(true);
        expect(onPinchEnd).not.toHaveBeenCalled();
        pointer(svg, 'pointermove', 540, 240, 2);
        expect(getViewport().zoom).toBeCloseTo(50);
        pointer(svg, 'pointermove', 340, 240, 2);
        expect(getViewport().zoom).toBeCloseTo(100);
        setEditorDisabled(false);
        expect(onPinchEnd).not.toHaveBeenCalled();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lens()).toBeNull();
        pointer(svg, 'pointerup', 340, 240, 2);
        expect(onPinchEnd).toHaveBeenCalledOnce();
        pointer(svg, 'pointerup', 140, 240, 1);
    });

    it.each(['disable', 'unmount'] as const)('commits the latest pinch preview when %s ends the controller', end => {
        const harness = setup();
        pointer(harness.svg, 'pointerdown', 140, 240, 1);
        pointer(harness.svg, 'pointerdown', 340, 240, 2);
        pointer(harness.svg, 'pointermove', 360, 240, 2);
        const latest = harness.getViewport();
        harness[end]();
        expect(harness.onPinchEnd).toHaveBeenCalledExactlyOnceWith(latest);
    });

    it('delivers a native cancellation to the captured precision editor exactly once', () => {
        const { getByTestId, lens, cancel } = setup();
        const control = getByTestId('control');
        pointer(control, 'pointerdown');
        pointer(control, 'gotpointercapture');
        pointer(control, 'pointermove', 180, 240);
        expect(lens()).not.toBeNull();
        pointer(control, 'pointercancel', 180, 240);
        expect(cancel).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
    });

    it('notifies the precision editor once when pointer capture is unexpectedly lost', () => {
        const { getByTestId, lens, cancel } = setup();
        const control = getByTestId('control');
        pointer(control, 'pointerdown');
        pointer(control, 'gotpointercapture');
        pointer(control, 'pointermove', 180, 240);
        expect(lens()).not.toBeNull();
        pointer(control, 'lostpointercapture', 180, 240);
        expect(cancel).toHaveBeenCalledOnce();
        expect(lens()).toBeNull();
    });

    it.each(['pointercancel', 'lostpointercapture'])('cleans up on %s and permits another hold', eventType => {
        const { station, svg, store, lens } = setup();
        pointer(station, 'pointerdown');
        advanceHold();
        pointer(svg, eventType);
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lens()).toBeNull();
        act(() => store.dispatch(setSelected(new Set())));
        pointer(station, 'pointerdown');
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(true);
    });

    it('clears pending timers when disabled or unmounted', () => {
        const { station, store, disable, lens, unmount } = setup();
        pointer(station, 'pointerdown');
        disable();
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(lens()).toBeNull();
        unmount();
        advanceHold();
        expect(chooseStation).not.toHaveBeenCalled();
    });

    it('can unmount while a precision drag is active', () => {
        const { station, lens, unmount } = setup();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 180, 240);
        expect(lens()).not.toBeNull();
        expect(() => unmount()).not.toThrow();
        advanceHold();
        expect(chooseStation).not.toHaveBeenCalled();
    });

    it('pans immediately in line mode without starting a preview before choosing a source', () => {
        const { station, store, lens, drawing, move, onLinePanMove } = setupLine();
        pointer(station, 'pointerdown');
        pointer(station, 'pointermove', 161, 220);
        expect(onLinePanMove).toHaveBeenCalledWith({ x: 121, y: 180 });
        pointer(station, 'pointermove', 180, 240);
        expect(move).not.toHaveBeenCalled();
        expect(lens()).toBeNull();
        advanceHold();
        expect(store.getState().runtime.radialTouchMenu.visible).toBe(false);
        expect(drawing.begin).not.toHaveBeenCalled();
        pointer(station, 'pointerup', 180, 240);
        expect(lens()).toBeNull();
    });

    describe('touch line drawing', () => {
        it.each([false, true])('locks a station through a station-only picker with preselection=%s', selected => {
            const harness = setupLine(selected);
            vi.mocked(findNearbyElements).mockReturnValue({
                ...getNearbyData(),
                [MenuCategory.LINE]: [{ label: 'Line', elementId: 'line_0', action: vi.fn() }],
                [MenuCategory.MISC_NODE]: [{ label: 'Other node', elementId: 'misc_node_1', action: vi.fn() }],
                [MenuCategory.OPERATION]: [{ label: 'Paste', elementId: 'operation-paste', action: vi.fn() }],
            });
            pointer(harness.svg, 'pointerdown');
            advanceHold();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(true);
            const items = harness.container.querySelectorAll('[data-touch-menu-item]');
            expect([...items].map(item => item.getAttribute('data-touch-menu-item'))).toEqual(['station:0']);
            expect(harness.lens()).toBeNull();
            vi.mocked(document.elementsFromPoint).mockReturnValue([items[0]]);
            pointer(harness.svg, 'pointermove', 190, 180);
            pointer(harness.svg, 'pointerup', 190, 180);
            expect(harness.store.getState().runtime.selected).toEqual(new Set(['stn_A']));
            expect(harness.store.getState().runtime.mode).toBe('line-simple/single-color');
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.drawing.update).not.toHaveBeenCalled();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(false);
        });

        it('starts only after a second hold anywhere and sends live SVG coordinates to the controller', () => {
            const harness = setupLine();
            lockLineSource(harness);
            harness.setViewport({ x: 100, y: 200, zoom: 200 });
            pointer(harness.svg, 'pointerdown', 280, 400);
            advanceHold(449);
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.lens()).toBeNull();
            advanceHold(1);
            expect(harness.drawing.begin).toHaveBeenCalledExactlyOnceWith('stn_A', { x: 580, y: 920 });
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(false);
            expect(harness.lens()).not.toBeNull();
            pointer(harness.svg, 'pointermove', 300, 420);
            expect(harness.drawing.update).toHaveBeenLastCalledWith({ x: 620, y: 960 }, { x: 300, y: 420 });
            pointer(harness.svg, 'pointerup', 305, 425);
            expect(harness.drawing.finish).toHaveBeenCalledExactlyOnceWith({ x: 630, y: 970 }, { x: 305, y: 425 });
            expect(harness.lens()).toBeNull();
        });

        it('clears the locked source after a successful drop', () => {
            const harness = setupLine();
            lockLineSource(harness);
            pointer(harness.svg, 'pointerdown', 280, 400);
            advanceHold();
            pointer(harness.svg, 'pointerup', 300, 420);
            expect(harness.drawing.finish).toHaveBeenCalledOnce();
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(true);
            expect(harness.drawing.begin).toHaveBeenCalledOnce();
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it('keeps the source after an invalid drop so another hold can retry', () => {
            const harness = setupLine();
            lockLineSource(harness);
            harness.drawing.finish.mockReturnValue(false);
            pointer(harness.svg, 'pointerdown', 280, 400);
            advanceHold();
            pointer(harness.svg, 'pointerup', 300, 420);
            expect(harness.lens()).toBeNull();
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).toHaveBeenCalledTimes(2);
            expect(harness.drawing.begin).toHaveBeenLastCalledWith('stn_A', { x: 200, y: 320 });
            expect(findNearbyElements).toHaveBeenCalledOnce();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(false);
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it('keeps an armed source while dragging the canvas before the second hold', () => {
            const harness = setupLine();
            lockLineSource(harness);
            harness.onLinePanStart.mockClear();
            harness.onLinePanMove.mockClear();
            harness.onLinePanEnd.mockClear();
            pointer(harness.svg, 'pointerdown', 280, 400);
            expect(harness.onLinePanStart).toHaveBeenCalledExactlyOnceWith({ x: 240, y: 360 });
            pointer(harness.svg, 'pointermove', 281, 400);
            expect(harness.onLinePanMove).toHaveBeenCalledExactlyOnceWith({ x: 241, y: 360 });
            pointer(harness.svg, 'pointermove', 290, 400);
            advanceHold();
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.lens()).toBeNull();
            pointer(harness.svg, 'pointerup', 290, 400);
            expect(harness.onLinePanEnd).toHaveBeenCalledExactlyOnceWith({ x: 250, y: 360 });
            expect(harness.store.getState().runtime.selected).toEqual(new Set(['stn_A']));
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).toHaveBeenCalledExactlyOnceWith('stn_A', { x: 200, y: 320 });
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it.each([0, 4, 12])('ignores release jitter after a line-tool pan moves %ipx', displacement => {
            const harness = setupLine();
            lockLineSource(harness);
            harness.onLinePanEnd.mockClear();
            pointer(harness.svg, 'pointerdown', 280, 400);
            if (displacement) pointer(harness.svg, 'pointermove', 280 + displacement, 400);
            pointer(harness.svg, 'pointerup', 282 + displacement, 403);
            expect(harness.onLinePanEnd).toHaveBeenCalledExactlyOnceWith({ x: 240 + displacement, y: 360 });
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.drawing.finish).not.toHaveBeenCalled();
        });

        it.each(['pointercancel', 'pinch'])('preserves the source when %s cancels an active draft', cancelBy => {
            const harness = setupLine();
            lockLineSource(harness);
            pointer(harness.svg, 'pointerdown', 280, 400);
            advanceHold();
            pointer(harness.svg, 'pointermove', 300, 420);
            harness.drawing.cancel.mockClear();
            if (cancelBy === 'pinch') {
                pointer(harness.svg, 'pointerdown', 200, 300, 2);
                pointer(harness.svg, 'pointerup', 200, 300, 2);
                pointer(harness.svg, 'pointerup', 300, 420);
            } else {
                pointer(harness.svg, 'pointercancel', 300, 420);
            }
            expect(harness.drawing.cancel).toHaveBeenCalledOnce();
            expect(harness.drawing.finish).not.toHaveBeenCalled();
            expect(harness.lens()).toBeNull();
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).toHaveBeenCalledTimes(2);
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(false);
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it('clears a source when leaving the line tool', () => {
            const harness = setupLine();
            lockLineSource(harness);
            act(() => harness.store.dispatch(setMode('free')));
            act(() => harness.store.dispatch(setMode('line-simple/single-color')));
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(true);
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it('returns to source selection when the locked station has been deleted', () => {
            const harness = setupLine();
            lockLineSource(harness);
            window.graph.dropNode('stn_A');
            vi.mocked(findNearbyElements).mockReturnValue({
                ...getNearbyData(),
                [MenuCategory.STATION]: [
                    { label: 'Deleted station', elementId: 'stn_A', action: vi.fn() },
                    { label: 'Station B', elementId: 'stn_B', action: vi.fn() },
                ],
            });
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).not.toHaveBeenCalled();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(true);
            expect(
                harness.store.getState().runtime.radialTouchMenu.data[MenuCategory.STATION].map(item => item.elementId)
            ).toEqual(['stn_B']);
            pointer(harness.svg, 'pointerup', 240, 360);
        });

        it('clears a source when the drawing controller cannot begin it', () => {
            const harness = setupLine();
            lockLineSource(harness);
            harness.drawing.begin.mockReturnValueOnce(false);
            pointer(harness.svg, 'pointerdown', 280, 400);
            advanceHold();
            expect(harness.lens()).toBeNull();
            pointer(harness.svg, 'pointerup', 280, 400);
            pointer(harness.svg, 'pointerdown', 240, 360);
            advanceHold();
            expect(harness.drawing.begin).toHaveBeenCalledOnce();
            expect(harness.store.getState().runtime.radialTouchMenu.visible).toBe(true);
            pointer(harness.svg, 'pointerup', 240, 360);
        });
    });

    it.each(['touchstart', 'selectstart'])('prevents native %s selection on the drawing canvas', eventType => {
        const { station, getByTestId } = setup();
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        fireEvent(station, event);
        expect(event.defaultPrevented).toBe(true);
        const linkEvent = new Event(eventType, { bubbles: true, cancelable: true });
        fireEvent(getByTestId('link'), linkEvent);
        expect(linkEvent.defaultPrevented).toBe(false);
    });
});
