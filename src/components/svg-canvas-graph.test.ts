import { act, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeId, RuntimeMode } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { createStore } from '../redux';
import { initializeProject } from '../redux/param/param-slice';
import { setMode } from '../redux/runtime/runtime-slice';
import { createTestLineGraph, render, TEST_LINE_THEME } from '../test-utils';
import SvgCanvas, { CanvasLineDrawingHandle, findConnectableTarget } from './svg-canvas-graph';
import { linePaths } from './svgs/lines/lines';

vi.mock('./overlay', () => ({ Overlay: () => null }));
vi.mock('./svg-layer', () => ({
    default: (props: {
        handlePointerDown: (node: NodeId, event: React.PointerEvent<SVGElement>) => void;
        handlePointerMove: (node: NodeId, event: React.PointerEvent<SVGElement>) => void;
        handlePointerUp: (node: NodeId, event: React.PointerEvent<SVGElement>) => void;
    }) =>
        React.createElement(
            'g',
            {},
            ...(['stn_A', 'stn_B'] as const).map(id =>
                React.createElement('circle', {
                    key: id,
                    id: `stn_core_${id}`,
                    onPointerDown: (event: React.PointerEvent<SVGCircleElement>) => props.handlePointerDown(id, event),
                    onPointerMove: (event: React.PointerEvent<SVGCircleElement>) => props.handlePointerMove(id, event),
                    onPointerUp: (event: React.PointerEvent<SVGCircleElement>) => props.handlePointerUp(id, event),
                })
            )
        ),
}));
vi.mock('../util/hooks', async importOriginal => ({
    ...(await importOriginal<typeof import('../util/hooks')>()),
    useWindowSize: () => ({ width: 800, height: 600 }),
}));

const setupCanvas = ({ path = LinePathType.Simple, keepLastPath = false, isSubscriber = true } = {}) => {
    window.graph = createTestLineGraph([['A', 'B']]);
    window.graph.clearEdges();
    const initial = createStore().getState();
    const mode: RuntimeMode = `line-${path}/${LineStyleType.SingleColor}`;
    const store = createStore({
        app: {
            ...initial.app,
            telemetry: { ...initial.app.telemetry, project: false },
            preference: { ...initial.app.preference, autoParallel: false, autoChangeStationType: false },
        },
        account: {
            ...initial.account,
            activeSubscriptions: { ...initial.account.activeSubscriptions, RMP_CLOUD: isSubscriber },
        },
        param: {
            ...initial.param,
            present: { ...initial.param.present, graph: window.graph.export() },
        },
        runtime: { ...initial.runtime, mode, keepLastPath, theme: TEST_LINE_THEME },
    });
    const ref = React.createRef<CanvasLineDrawingHandle>();
    const result = render(React.createElement('svg', { id: 'canvas' }, React.createElement(SvgCanvas, { ref })), {
        store,
    });
    const hit = (node?: 'A' | 'B') => {
        vi.mocked(document.elementsFromPoint).mockReturnValue(
            node ? [result.container.querySelector(`#stn_core_stn_${node}`)!] : []
        );
    };
    const begin = (pointer = { x: 45, y: 60 }, source: NodeId = 'stn_A') => {
        let started = false;
        act(() => {
            started = ref.current!.begin(source, pointer);
        });
        return started;
    };
    const finish = (pointer = { x: 100, y: 0 }) => {
        let created = false;
        act(() => {
            created = ref.current!.finish(pointer, { x: 200, y: 100 });
        });
        return created;
    };
    return { ...result, store, ref, mode, hit, begin, finish };
};

beforeEach(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: vi.fn().mockReturnValue([]) });
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 600));
    Object.defineProperties(Element.prototype, {
        setPointerCapture: { configurable: true, value: vi.fn() },
        releasePointerCapture: { configurable: true, value: vi.fn() },
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('findConnectableTarget', () => {
    it('resolves a connectable target from an ancestor element', () => {
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        core.setAttribute('id', 'stn_core_misc_node_target');

        const child = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        core.appendChild(child);

        expect(findConnectableTarget([child])).toEqual({
            id: 'stn_core_misc_node_target',
            matchedPrefix: 'stn_core_',
        });
    });

    it('continues scanning later elements when the first element is not connectable', () => {
        const nonConnectable = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const connectable = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        connectable.setAttribute('id', 'virtual_circle_misc_node_target');

        expect(findConnectableTarget([nonConnectable, connectable])).toEqual({
            id: 'virtual_circle_misc_node_target',
            matchedPrefix: 'virtual_circle_',
        });
    });
});

describe('canvas line controller', () => {
    it('previews from the source to an arbitrary absolute starting point without creating an edge', () => {
        const { begin, container, store } = setupCanvas();
        expect(begin()).toBe(true);
        expect(container.querySelector('path')).toHaveAttribute('d', 'M 0 0 L 45 60');
        expect(container.querySelector('path')?.closest('.removeMe')).toHaveAttribute('pointer-events', 'none');
        expect(store.getState().runtime.active).toBe('stn_A');
        expect(store.getState().runtime.pointerPosition).toBeUndefined();
        expect(window.graph.size).toBe(0);
        expect(store.getState().param.past).toHaveLength(0);
        expect(window.graph.getNodeAttribute('stn_A', 'x')).toBe(0);
    });

    it('snaps to the actual hovered target, updates highlighting only on transitions, and follows the finger off target', () => {
        const { begin, hit, ref, store, container } = setupCanvas();
        begin();
        hit('B');
        act(() => ref.current!.update({ x: 98, y: 4 }, { x: 200, y: 100 }));
        expect(container.querySelector('path')).toHaveAttribute('d', 'M 0 0 L 100 0');
        expect(store.getState().runtime.selected).toEqual(new Set(['stn_A', 'stn_B']));
        const highlighted = store.getState().runtime.selected;
        act(() => ref.current!.update({ x: 96, y: 2 }, { x: 198, y: 98 }));
        expect(store.getState().runtime.selected).toBe(highlighted);
        hit();
        act(() => ref.current!.update({ x: 80, y: 40 }, { x: 180, y: 140 }));
        expect(container.querySelector('path')).toHaveAttribute('d', 'M 0 0 L 80 40');
        expect(store.getState().runtime.selected).toEqual(new Set(['stn_A']));
    });

    it('commits exactly one edge and undo snapshot, applies the chosen theme, and consumes the session', () => {
        const { begin, hit, finish, store } = setupCanvas();
        begin();
        hit('B');
        expect(finish()).toBe(true);
        expect(window.graph.size).toBe(1);
        const [edge] = window.graph.edges();
        expect(window.graph.extremities(edge)).toEqual(['stn_A', 'stn_B']);
        expect(window.graph.getEdgeAttribute(edge, LineStyleType.SingleColor)?.color).toEqual(TEST_LINE_THEME);
        expect(store.getState().param.past).toHaveLength(1);
        expect(store.getState().runtime.selected).toEqual(new Set([edge]));
        expect(store.getState().runtime.mode).toBe('free');
        expect(store.getState().runtime.active).toBeUndefined();
        expect(finish()).toBe(false);
        expect(window.graph.size).toBe(1);
        expect(store.getState().param.past).toHaveLength(1);
    });

    it.each(['A', undefined] as const)('keeps the source available for retry after dropping on %s', target => {
        const { begin, hit, finish, store } = setupCanvas();
        begin();
        hit(target);
        expect(finish()).toBe(false);
        expect(store.getState().runtime.mode).toBe(`line-${LinePathType.Simple}/${LineStyleType.SingleColor}`);
        expect(store.getState().runtime.selected).toEqual(new Set(['stn_A']));
        expect(store.getState().param.past).toHaveLength(0);
        expect(window.graph.size).toBe(0);
        expect(begin()).toBe(true);
        hit('B');
        expect(finish()).toBe(true);
    });

    it('keeps the tool active after success when keepLastPath is enabled', () => {
        const { begin, hit, finish, store, mode } = setupCanvas({ keepLastPath: true });
        begin();
        hit('B');
        expect(finish()).toBe(true);
        expect(store.getState().runtime.mode).toBe(mode);
    });

    it('cancels without persisting geometry and restores the source selection', () => {
        const { begin, hit, ref, finish, store, container } = setupCanvas();
        begin();
        hit('B');
        act(() => ref.current!.update({ x: 100, y: 0 }, { x: 200, y: 100 }));
        act(() => ref.current!.cancel());
        expect(container.querySelector('path')).toBeNull();
        expect(store.getState().runtime.active).toBeUndefined();
        expect(store.getState().runtime.pointerPosition).toBeUndefined();
        expect(store.getState().runtime.selected).toEqual(new Set(['stn_A']));
        expect(finish()).toBe(false);
        expect(window.graph.size).toBe(0);
        expect(store.getState().param.past).toHaveLength(0);
    });

    it('clears an active preview when its canvas unmounts', () => {
        const { begin, unmount, store } = setupCanvas();
        begin();
        unmount();
        expect(store.getState().runtime.active).toBeUndefined();
        expect(store.getState().runtime.pointerPosition).toBeUndefined();
        expect(window.graph.size).toBe(0);
        expect(store.getState().param.past).toHaveLength(0);
    });

    it.each(['tool', 'project', 'source'] as const)('rejects a stale gesture after its %s changes', change => {
        const { begin, hit, ref, finish, store } = setupCanvas();
        begin();
        act(() => {
            if (change === 'tool') store.dispatch(setMode(`line-${LinePathType.Bezier}/${LineStyleType.SingleColor}`));
            else if (change === 'project')
                store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
            else window.graph.dropNode('stn_A');
        });
        hit('B');
        expect(finish()).toBe(false);
        expect(store.getState().runtime.active).toBeUndefined();
        expect(window.graph.size).toBe(0);
        expect(store.getState().param.past).toHaveLength(0);
        act(() => ref.current!.update({ x: 100, y: 0 }, { x: 200, y: 100 }));
    });

    it('rejects unavailable line tools and missing sources', () => {
        const unavailable = setupCanvas({ isSubscriber: false });
        expect(unavailable.begin()).toBe(false);
        unavailable.unmount();
        const valid = setupCanvas();
        expect(valid.begin({ x: 10, y: 20 }, 'stn_missing')).toBe(false);
        expect(window.graph.size).toBe(0);
    });

    it('uses the path-owned drawing session and forwards the final release sample before committing', () => {
        const behavior = linePaths[LinePathType.Freeform].drawingBehavior!;
        const createSession = behavior.createSession;
        const sessionSpy = vi.spyOn(behavior, 'createSession').mockImplementation((source, pointer) => {
            const session = createSession(source, pointer);
            vi.spyOn(session, 'pointerMove');
            vi.spyOn(session, 'createAttrs');
            return session;
        });
        const { begin, hit, ref, finish, store } = setupCanvas({ path: LinePathType.Freeform });
        expect(begin()).toBe(true);
        expect(sessionSpy).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 45, y: 60 });
        const session = sessionSpy.mock.results[0].value;
        act(() => ref.current!.update({ x: 70, y: 60 }, { x: 170, y: 160 }));
        hit('B');
        expect(finish({ x: 95, y: 5 })).toBe(true);
        expect(session.pointerMove).toHaveBeenLastCalledWith({ x: 95, y: 5 });
        expect(session.createAttrs).toHaveBeenCalledWith({ x: 100, y: 0 }, { x: 95, y: 5 });
        expect(window.graph.getEdgeAttribute(window.graph.edges()[0], 'type')).toBe(LinePathType.Freeform);
        expect(store.getState().param.past).toHaveLength(1);
    });

    it('retains desktop creation through the shared controller', () => {
        const { container, hit, store } = setupCanvas();
        const source = container.querySelector('#stn_core_stn_A')!;
        const event = (type: string, x: number, y: number) => {
            const value = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperties(value, {
                clientX: { value: x },
                clientY: { value: y },
                pointerId: { value: 1 },
                pointerType: { value: 'mouse' },
            });
            fireEvent(source, value);
        };
        event('pointerdown', 0, 0);
        hit('B');
        event('pointermove', 100, 0);
        event('pointerup', 100, 0);
        expect(window.graph.size).toBe(1);
        expect(store.getState().param.past).toHaveLength(1);
        expect(store.getState().runtime.pointerPosition).toBeUndefined();
    });
});
