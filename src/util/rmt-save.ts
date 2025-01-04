import { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { subscription_endpoint } from '../constants/server';
import { createStore } from '../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setLoginStateTimeout,
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
/**
 * The default graph on state initialization will be an empty graph.
 * Of course we shouldn't notify RMT if the graph is empty so we record
 * and sent the message only if the previousGraphHash is not the defaultGraphHash.
 */
let defaultGraphHash: string | undefined;

// Notify rmt to update save when the state is changed.
export const onRMPSaveUpdate = async (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    if (!defaultGraphHash) {
        // top-level await is not supported so we are computing it in the first call
        const emptyGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export();
        defaultGraphHash = await createHash(JSON.stringify(emptyGraph));
        logger.debug(`Default graph hash: ${defaultGraphHash}`);
    }

    const graphHash = await createHash(JSON.stringify(graph));
    if (previousGraphHash && previousGraphHash !== defaultGraphHash && previousGraphHash !== graphHash) {
        logger.debug(`Notify RMP save change, hash: ${graphHash}`);
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
    logger.debug('Requesting token from RMT');
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
            logger.debug(`Received token from RMT: ${token}`);

            if (store.getState().account.timeout) {
                logger.debug('Clear login state timeout');
                window.clearTimeout(store.getState().account.timeout);
                store.dispatch(setLoginStateTimeout(undefined));
            }

            if (!token) {
                logger.debug('Token is empty, logging out');
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
                logger.debug('Token is invalid, expiring the login state');
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
            logger.debug(`Token is valid, setting active subscriptions: ${JSON.stringify(activeSubscriptions)}`);
        }
    };
    saveManagerChannel.addEventListener('message', eventHandler);
};
