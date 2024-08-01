import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { createHash } from './helpers';

export const SAVE_MANAGER_CHANNEL_NAME = 'rmt-save-manager';
export enum SaveManagerEventType {
    SAVE_CHANGED = 'SAVE_CHANGED',
}
export interface SaveManagerEvent {
    type: SaveManagerEventType;
    key: LocalStorageKey.PARAM;
    from: 'rmp' | 'rmt';
}

export const saveManagerChannel = new BroadcastChannel(SAVE_MANAGER_CHANNEL_NAME);

export const notifyRMTSaveChange = () => {
    saveManagerChannel.postMessage({
        type: SaveManagerEventType.SAVE_CHANGED,
        key: LocalStorageKey.PARAM,
        from: 'rmp',
    } as SaveManagerEvent);
};

/**
 * Remember the previous hash of the graph state.
 * Notify the rmt only if the graph changes.
 */
let previousGraphHash: string | undefined;

/**
 * Slightly reduce the server load by notifying a sequence of updates once.
 */
let notifyRMTSaveTimeout: number | undefined;

const SAVE_UPDATE_TIMEOUT_MS = 60 * 1000; // 60s

export const onRMTSaveUpdate = async (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    if (notifyRMTSaveTimeout) {
        return;
    }
    const graphHash = await createHash(JSON.stringify(graph));
    if (previousGraphHash && previousGraphHash !== graphHash) {
        notifyRMTSaveTimeout = window.setTimeout(() => {
            notifyRMTSaveChange();
            notifyRMTSaveTimeout = undefined;
        }, SAVE_UPDATE_TIMEOUT_MS);
    }
    previousGraphHash = graphHash;
};
