import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageKey } from '../constants/constants';
import { onRMPSaveUpdate } from '../util/rmt-save';
import { createStore } from '.';
import { initStore } from './init';
import { saveGraph, setSvgViewport } from './param/param-slice';
import { refreshEdgesThunk } from './runtime/runtime-slice';

vi.mock('../util/rmt-save', () => ({
    onLocalStorageChangeRMT: vi.fn(),
    onRMPSaveUpdate: vi.fn(),
}));

const store = createStore();
const flushListenerEffects = () => new Promise(resolve => setTimeout(resolve, 0));

describe('project persistence', () => {
    beforeAll(async () => {
        let now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => ++now);
        localStorage.clear();
        await initStore(store);
        await flushListenerEffects();
    });

    beforeEach(() => {
        localStorage.removeItem(LocalStorageKey.PARAM);
        vi.mocked(onRMPSaveUpdate).mockClear();
    });

    afterAll(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('does not persist render-only refreshes', async () => {
        await store.dispatch(refreshEdgesThunk());
        await flushListenerEffects();

        expect(localStorage.getItem(LocalStorageKey.PARAM)).toBeNull();
        expect(onRMPSaveUpdate).not.toHaveBeenCalled();
    });

    it('persists a committed graph once without writing again for its refresh', async () => {
        store.dispatch(saveGraph(structuredClone(store.getState().param.present.graph)));
        await store.dispatch(refreshEdgesThunk());
        await flushListenerEffects();

        expect(localStorage.getItem(LocalStorageKey.PARAM)).toBeTruthy();
        expect(onRMPSaveUpdate).toHaveBeenCalledTimes(1);
    });

    it('persists committed viewport changes', async () => {
        store.dispatch(setSvgViewport({ zoom: 125, min: { x: 10, y: 20 } }));
        await flushListenerEffects();

        expect(localStorage.getItem(LocalStorageKey.PARAM)).toBeTruthy();
        expect(onRMPSaveUpdate).toHaveBeenCalledTimes(1);
    });
});
