import { describe, expect, it } from 'vitest';
import viewportReducer, { clearGridViewport, setGridViewport } from './viewport-slice';

describe('ViewportSlice', () => {
    it('Can store transient grid viewport', () => {
        const nextState = viewportReducer(undefined, setGridViewport({ x: 10, y: 20, zoom: 150 }));

        expect(nextState.gridViewport).toEqual({ x: 10, y: 20, zoom: 150 });
    });

    it('Does not update state when viewport values are unchanged', () => {
        const state = viewportReducer(undefined, setGridViewport({ x: 10, y: 20, zoom: 150 }));
        const nextState = viewportReducer(state, setGridViewport({ x: 10, y: 20, zoom: 150 }));

        expect(nextState).toBe(state);
    });

    it('Can clear transient grid viewport', () => {
        const state = viewportReducer(undefined, setGridViewport({ x: 10, y: 20, zoom: 150 }));
        const nextState = viewportReducer(state, clearGridViewport());

        expect(nextState.gridViewport).toBeUndefined();
    });
});
