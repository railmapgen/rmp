import { describe, expect, it } from 'vitest';
import { GlobalAlertId } from '../../constants/global-alerts';
import { LinePathType, LineStyleType } from '../../constants/lines';
import store from '../index';
import { redoAction, replaceGraph, undoAction } from '../param/param-slice';
import appReducer, { closeGlobalAlert, setGlobalAlert, setMode } from './runtime-slice';

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

describe('global alerts', () => {
    it('keeps alerts from different businesses even when their statuses match', () => {
        const withMasterAlert = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.MasterNodeLimitExceeded,
                status: 'warning',
                message: 'Master limit exceeded',
            })
        );
        const withBothAlerts = appReducer(
            withMasterAlert,
            setGlobalAlert({
                id: GlobalAlertId.ParallelLineLimitExceeded,
                status: 'warning',
                message: 'Parallel limit exceeded',
            })
        );

        expect(withBothAlerts.globalAlerts).toMatchObject({
            [GlobalAlertId.MasterNodeLimitExceeded]: {
                status: 'warning',
                message: 'Master limit exceeded',
            },
            [GlobalAlertId.ParallelLineLimitExceeded]: {
                status: 'warning',
                message: 'Parallel limit exceeded',
            },
        });
    });

    it('replaces an existing alert with the same id', () => {
        const firstState = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.OpenFileFailed,
                status: 'error',
                message: 'First failure',
                url: 'https://example.com/first',
            })
        );
        const nextState = appReducer(
            firstState,
            setGlobalAlert({
                id: GlobalAlertId.OpenFileFailed,
                status: 'warning',
                message: 'Updated failure',
            })
        );

        expect(nextState.globalAlerts).toEqual({
            [GlobalAlertId.OpenFileFailed]: {
                status: 'warning',
                message: 'Updated failure',
                url: undefined,
                linkedApp: undefined,
            },
        });
    });

    it('closes only the requested alert and ignores an unknown id', () => {
        const withMasterAlert = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.MasterNodeLimitExceeded,
                status: 'warning',
                message: 'Master limit exceeded',
            })
        );
        const withBothAlerts = appReducer(
            withMasterAlert,
            setGlobalAlert({
                id: GlobalAlertId.ParallelLineLimitExceeded,
                status: 'warning',
                message: 'Parallel limit exceeded',
            })
        );

        const afterUnknownId = appReducer(withBothAlerts, closeGlobalAlert(GlobalAlertId.DownloadImageTooBig));
        expect(afterUnknownId).toBe(withBothAlerts);

        const afterClose = appReducer(afterUnknownId, closeGlobalAlert(GlobalAlertId.MasterNodeLimitExceeded));
        expect(afterClose.globalAlerts).toEqual({
            [GlobalAlertId.ParallelLineLimitExceeded]: {
                status: 'warning',
                message: 'Parallel limit exceeded',
                url: undefined,
                linkedApp: undefined,
            },
        });
    });
});
