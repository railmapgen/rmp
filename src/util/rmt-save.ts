import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { subscription_endpoint } from '../constants/server';
import { createStore } from '../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setState,
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

/**
 * Remember the previous hash of the graph state.
 * Notify RMT only if the graph changes.
 */
let previousGraphHash: string | undefined;

// Notify rmt to update save when the state is changed.
export const onRMPSaveUpdate = async (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const graphHash = await createHash(JSON.stringify(graph));
    if (previousGraphHash && previousGraphHash !== graphHash) {
        saveManagerChannel.postMessage({
            type: SaveManagerEventType.SAVE_CHANGED,
            key: LocalStorageKey.PARAM,
            from: 'rmp',
        } as SaveManagerEvent);
    }
    previousGraphHash = graphHash;
};

// Token returned from will be handled in registerOnRMTTokenResponse.
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

// Update subscription info on token received.
export const registerOnRMTTokenResponse = async (store: ReturnType<typeof createStore>) => {
    const eventHandler = async (ev: MessageEvent<SaveManagerEvent>) => {
        const { type, token, from } = ev.data;
        if (type === SaveManagerEventType.TOKEN_REQUEST && from === 'rmt') {
            if (!token) {
                store.dispatch(setState('logged-out'));
                store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
                return;
            }

            const rep = await fetch(subscription_endpoint, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (rep.status !== 200) {
                store.dispatch(setState('expired'));
                store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
                return;
            }

            store.dispatch(setState('free'));
            const subscriptions = (await rep.json()).subscriptions as APISubscription[];

            const activeSubscriptions = structuredClone(defaultActiveSubscriptions);
            for (const subscription of subscriptions) {
                const type = subscription.type;
                if (type in activeSubscriptions) {
                    store.dispatch(setState('subscriber'));
                    activeSubscriptions[type as keyof ActiveSubscriptions] = true;
                }
            }
            store.dispatch(setActiveSubscriptions(activeSubscriptions));
        }
    };
    saveManagerChannel.addEventListener('message', eventHandler);
};
