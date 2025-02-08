import { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { subscription_endpoint } from '../constants/server';
import { createStore, RootDispatch } from '../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setState,
    setToken,
} from '../redux/account/account-slice';
import { createHash } from './helpers';

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

export interface APISubscription {
    type: 'RMP' | 'RMP_CLOUD' | 'RMP_EXPORT';
    expires: string;
}

const updateToken = async (store: ReturnType<typeof createStore>, token: string) => {
    logger.debug(`Updating token to: ${token}`);
    store.dispatch(setToken(token));
};

export const updateLoginStateAndSubscriptions = async (dispatch: RootDispatch, token: string) => {
    const rep = await fetch(subscription_endpoint, {
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (rep.status !== 200) {
        logger.debug('Token is invalid, expiring the login state');
        dispatch(setState('expired'));
        dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
        return;
    }

    dispatch(setState('free'));
    const subscriptions = (await rep.json()).subscriptions as APISubscription[];

    const activeSubscriptions = structuredClone(defaultActiveSubscriptions);
    for (const subscription of subscriptions) {
        const type = subscription.type;
        if (type in activeSubscriptions) {
            dispatch(setState('subscriber'));
            activeSubscriptions[type as keyof ActiveSubscriptions] = true;
        }
    }
    dispatch(setActiveSubscriptions(activeSubscriptions));
    logger.debug(`Token is valid, setting active subscriptions: ${JSON.stringify(activeSubscriptions)}`);
};

/**
 * Account state managed and persisted to localStorage by RMT.
 * Read Only.
 */
interface AccountState {
    id: number;
    name: string;
    email: string;
    token: string;
    expires: string;
    refreshToken: string;
    refreshExpires: string;
}

/**
 * Watch the localStorage change and update the login state and token.
 */
export const onLocalStorageChangeRMT = (store: ReturnType<typeof createStore>) => {
    const handleAccountChange = (accountString?: string) => {
        if (!accountString) {
            logger.debug('Account string is empty, logging out');
            store.dispatch(setToken(undefined));
            store.dispatch(setState('logged-out'));
            store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
            return;
        }

        const accountState = JSON.parse(accountString) as AccountState;
        const { token } = accountState;
        updateToken(store, token);
        updateLoginStateAndSubscriptions(store.dispatch, token);
    };

    // Record the previous account string and only handle the change.
    let previousAccountString = localStorage.getItem(LocalStorageKey.ACCOUNT);
    handleAccountChange(previousAccountString ?? undefined);

    window.onstorage = () => {
        const accountString = localStorage.getItem(LocalStorageKey.ACCOUNT);
        if (previousAccountString === accountString) {
            return;
        }
        previousAccountString = accountString;

        logger.debug(`Account string changed to: ${accountString}`);
        handleAccountChange(accountString ?? undefined);
    };
};
