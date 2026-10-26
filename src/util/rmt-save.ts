import { logger } from '@railmapgen/rmg-runtime';
import type { Dispatch } from '@reduxjs/toolkit';
import { LocalStorageKey } from '../constants/constants';
import { GlobalAlertId } from '../constants/global-alerts';
import { closeGlobalAlert } from '../redux/runtime/runtime-slice';
import {
    fetchLoginStateAndSubscriptions as syncLoginStateAndSubscriptions,
    onLocalStorageChangeRMT as watchRMTAccount,
} from './account-sync';

export type { APISubscription } from './account-sync';

export const SAVE_MANAGER_CHANNEL_NAME = 'rmt-save-manager';
export enum SaveManagerEventType {
    SAVE_CHANGED = 'SAVE_CHANGED',
}
export interface SaveManagerEvent {
    type: SaveManagerEventType;
    key?: LocalStorageKey.PARAM;
    token?: string;
    from: 'rmp' | 'rmt';
}

export const saveManagerChannel = new BroadcastChannel(SAVE_MANAGER_CHANNEL_NAME);

// Notify rmt to update save when the state is changed.
export const onRMPSaveUpdate = () => {
    logger.debug('Notify RMP save change');
    saveManagerChannel.postMessage({
        type: SaveManagerEventType.SAVE_CHANGED,
        key: LocalStorageKey.PARAM,
        from: 'rmp',
    } as SaveManagerEvent);
};

const clearCloudLimitAlerts = (dispatch: Dispatch) => {
    dispatch(closeGlobalAlert(GlobalAlertId.MasterNodeLimitExceeded));
    dispatch(closeGlobalAlert(GlobalAlertId.ParallelLineLimitExceeded));
};

export const fetchLoginStateAndSubscriptions = (dispatch: Dispatch, token: string) =>
    syncLoginStateAndSubscriptions(dispatch, token, {
        onCloudSubscription: () => clearCloudLimitAlerts(dispatch),
    });

export const onLocalStorageChangeRMT = (store: { dispatch: Dispatch }) =>
    watchRMTAccount(store, {
        onCloudSubscription: () => clearCloudLimitAlerts(store.dispatch),
    });
