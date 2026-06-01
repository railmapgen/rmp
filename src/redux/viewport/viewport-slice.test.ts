import { describe, expect, it } from 'vitest';
import { createStore } from '..';
import { setSvgViewBoxMin } from '../param/param-slice';
import viewportReducer, { clearLiveViewport, commitLiveViewport, setLiveViewport } from './viewport-slice';

describe('ViewportSlice', () => {
    it('Can store transient live viewport', () => {
        const nextState = viewportReducer(undefined, setLiveViewport({ x: 10, y: 20, zoom: 150 }));

        expect(nextState.liveViewport).toEqual({ x: 10, y: 20, zoom: 150 });
    });

    it('Does not update state when viewport values are unchanged', () => {
        const state = viewportReducer(undefined, setLiveViewport({ x: 10, y: 20, zoom: 150 }));
        const nextState = viewportReducer(state, setLiveViewport({ x: 10, y: 20, zoom: 150 }));

        expect(nextState).toBe(state);
    });

    it('Can clear transient live viewport', () => {
        const state = viewportReducer(undefined, setLiveViewport({ x: 10, y: 20, zoom: 150 }));
        const nextState = viewportReducer(state, clearLiveViewport());

        expect(nextState.liveViewport).toBeUndefined();
    });

    it('Clears live viewport when persisted viewport updates', () => {
        const state = viewportReducer(undefined, setLiveViewport({ x: 10, y: 20, zoom: 150 }));
        const nextState = viewportReducer(state, setSvgViewBoxMin({ x: 10, y: 20 }));

        expect(nextState.liveViewport).toBeUndefined();
    });

    it('Can commit live viewport into param and clear the transient copy', () => {
        const store = createStore();
        store.dispatch(setLiveViewport({ x: 10, y: 20, zoom: 150 }));

        store.dispatch(commitLiveViewport());

        const nextState = store.getState();
        expect(nextState.param.svgViewBoxMin).toEqual({ x: 10, y: 20 });
        expect(nextState.param.svgViewBoxZoom).toBe(150);
        expect(nextState.viewport.liveViewport).toBeUndefined();
    });
});
