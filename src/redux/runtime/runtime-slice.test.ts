import { describe, expect, it } from 'vitest';
import store from '../index';
import { redoAction, undoAction } from '../param/param-slice';
import { LineStyleType } from '../../constants/lines';
import appReducer, { setLineStyle } from './runtime-slice';

const realStore = store.getState();

describe('ParamSlice', () => {
    it('Can update refresh indicators on undo actions', () => {
        const nextState = appReducer(realStore.runtime, undoAction());
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });

    it('Can update refresh indicators on redo actions', () => {
        const nextState = appReducer(realStore.runtime, redoAction());
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });

    it('Can update selected line style', () => {
        const nextState = appReducer(realStore.runtime, setLineStyle(LineStyleType.River));
        expect(nextState.lineStyle).toEqual(LineStyleType.River);
    });
});
