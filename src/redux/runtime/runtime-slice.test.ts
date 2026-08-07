import { describe, expect, it } from 'vitest';
import store from '../index';
import { applyRedoAction, applyUndoAction } from '../param/param-slice';
import appReducer from './runtime-slice';

const realStore = store.getState();

describe('ParamSlice', () => {
    it('Can update refresh indicators on undo actions', () => {
        const nextState = appReducer(realStore.runtime, applyUndoAction('graph'));
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });

    it('Can update refresh indicators on redo actions', () => {
        const nextState = appReducer(realStore.runtime, applyRedoAction('graph'));
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });
});
