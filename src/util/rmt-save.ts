import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { createStore } from '../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    setActiveSubscriptions,
} from '../redux/account/account-slice';
import { createHash } from './helpers';

export const SAVE_MANAGER_CHANNEL_NAME = 'rmt-save-manager';
export enum SaveManagerEventType {
    SAVE_CHANGED = 'SAVE_CHANGED',
    TOKEN_REQUEST = 'TOKEN_REQUEST',
}
export interface SaveManagerEvent {
    type: SaveManagerEventType;
    key?: LocalStorageKey.PARAM;
    token?: string;
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
 * Notify RMT only if the graph changes.
 */
let previousGraphHash: string | undefined;

export const onRMPSaveUpdate = async (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const graphHash = await createHash(JSON.stringify(graph));
    if (previousGraphHash && previousGraphHash !== graphHash) {
        notifyRMTSaveChange();
    }
    previousGraphHash = graphHash;
};

export const requestToken = async () => {
    saveManagerChannel.postMessage({
        type: SaveManagerEventType.TOKEN_REQUEST,
        from: 'rmp',
    } as SaveManagerEvent);
};

export interface APISubscription {
    type: 'RMP' | 'RMP_CLOUD' | 'RMP_EXPORT';
    expires: string;
}

export const registerOnRMTTokenResponse = async (store: ReturnType<typeof createStore>) => {
    const eventHandler = async (ev: MessageEvent<SaveManagerEvent>) => {
        const { type, token, from } = ev.data;
        if (type === SaveManagerEventType.TOKEN_REQUEST && from === 'rmt') {
            if (!token) {
                store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
                return;
            }

            const rep = await fetch('https://railmapgen.org/v1/subscription', {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (rep.status !== 200) {
                store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
                return;
            }

            const subscriptions = (await rep.json()).subscriptions as APISubscription[];

            const activeSubscriptions = structuredClone(defaultActiveSubscriptions);
            for (const subscription of subscriptions) {
                const type = subscription.type;
                if (type in activeSubscriptions) {
                    activeSubscriptions[type as keyof ActiveSubscriptions] = true;
                }
            }
            store.dispatch(setActiveSubscriptions(activeSubscriptions));
        }
    };
    saveManagerChannel.addEventListener('message', eventHandler);
};
