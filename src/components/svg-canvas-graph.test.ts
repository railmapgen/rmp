import { act, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeId, RuntimeMode } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { createStore } from '../redux';
import { setMode, setPointerPosition } from '../redux/runtime/runtime-slice';
import { createTestLineGraph, render, TEST_LINE_THEME } from '../test-utils';
import SvgCanvas from './svg-canvas-graph';

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
    const result = render(React.createElement('svg', { id: 'canvas' }, React.createElement(SvgCanvas)), {
        store,
    });
    const hit = (node?: 'A' | 'B') => {
        vi.mocked(document.elementsFromPoint).mockReturnValue(
            node ? [result.container.querySelector(`#stn_core_stn_${node}`)!] : []
        );
    };
    return { ...result, store, mode, hit };
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

describe('SvgCanvas', () => {
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

describe('canvas node drag guides', () => {
    it.each(['takeover', 'cancel'])('clears active snap guides when %s replaces the pointer session', end => {
        const { container, store } = setupCanvas();
        act(() => store.dispatch(setMode('free')));
        const source = container.querySelector('#stn_core_stn_A')!;
        const pointer = (type: string, x: number, y: number) => {
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperties(event, {
                clientX: { value: x },
                clientY: { value: y },
                pointerId: { value: 1 },
                pointerType: { value: 'touch' },
            });
            fireEvent(source, event);
        };
        pointer('pointerdown', 0, 0);
        pointer('pointermove', 1, 1);
        pointer('pointermove', 2, 1);
        expect(container.querySelector('path[stroke="cyan"]')).not.toBeNull();
        act(() => store.dispatch(setPointerPosition(end === 'takeover' ? { x: 1, y: 1 } : undefined)));
        expect(container.querySelector('path[stroke="cyan"]')).toBeNull();
    });
});
