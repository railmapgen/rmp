import { describe, expect, it } from 'vitest';
import { LinePathType, LineStyleType } from '../../constants/lines';
import store from '../index';
import { redoAction, replaceGraph, undoAction } from '../param/param-slice';
import appReducer, { setMode } from './runtime-slice';

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

    it.each(['diagram', 'map'] as const)('resets drawing tools when replacing a %s project', type => {
        const firstDrawingState = appReducer(
            realStore.runtime,
            setMode(`line-${LinePathType.Diagonal}/${LineStyleType.SingleColor}`)
        );
        const secondDrawingState = appReducer(
            firstDrawingState,
            setMode(`line-${LinePathType.Freeform}/${LineStyleType.SingleColor}`)
        );
        const nextState = appReducer(secondDrawingState, replaceGraph({ type, graph: realStore.param.present }));

        expect(nextState.mode).toBe('free');
        expect(nextState.lastTool).toBeUndefined();
    });
});
