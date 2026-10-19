import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageKey } from '../constants/constants';
import { subscription_endpoint } from '../constants/server';
import accountReducer, {
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setState,
} from '../redux/account/account-slice';
import { type APISubscription, fetchLoginStateAndSubscriptions, onLocalStorageChangeRMT } from './account-sync';

vi.mock('@railmapgen/rmg-runtime', () => ({ logger: { debug: vi.fn() } }));

const createAccountStore = () => configureStore({ reducer: { account: accountReducer } });
const cloudSubscription: APISubscription = { type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' };
const response = (subscriptions: APISubscription[] = [], status = 200) =>
    ({ status, json: async () => ({ subscriptions }) }) as Response;
const setAccount = (token?: string) => {
    if (token) localStorage.setItem(LocalStorageKey.ACCOUNT, JSON.stringify({ token }));
    else localStorage.removeItem(LocalStorageKey.ACCOUNT);
};
const notifyStorage = (key: string | null = LocalStorageKey.ACCOUNT) => {
    window.onstorage?.call(window, new StorageEvent('storage', { key }));
};

let previousStorageHandler: typeof window.onstorage;
beforeEach(() => {
    localStorage.clear();
    previousStorageHandler = window.onstorage;
});
afterEach(() => {
    window.onstorage = previousStorageHandler;
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('account subscription verification compatibility', () => {
    it('verifies the bearer token and invokes the Cloud callback after updating permissions', async () => {
        const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response([cloudSubscription]));
        vi.stubGlobal('fetch', fetch);
        const store = createAccountStore();
        const onCloudSubscription = vi.fn(() => {
            expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(true);
        });

        await fetchLoginStateAndSubscriptions(store.dispatch, 'account-token', { onCloudSubscription });

        expect(fetch).toHaveBeenCalledWith(subscription_endpoint, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer account-token',
            },
        });
        expect(store.getState().account).toMatchObject({
            state: 'subscriber',
            activeSubscriptions: { RMP_CLOUD: true, RMP_EXPORT: false },
        });
        expect(onCloudSubscription).toHaveBeenCalledOnce();
    });

    it.each([
        { subscriptions: [], state: 'free', cloud: false, export: false },
        {
            subscriptions: [{ ...cloudSubscription, type: 'RMP_EXPORT' }],
            state: 'subscriber',
            cloud: false,
            export: true,
        },
    ])(
        'keeps Cloud permissions independent for $subscriptions',
        async ({ subscriptions, state, cloud, export: exp }) => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(subscriptions as APISubscription[])));
            const store = createAccountStore();
            store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: true }));
            const onCloudSubscription = vi.fn();

            await fetchLoginStateAndSubscriptions(store.dispatch, 'account-token', { onCloudSubscription });

            expect(store.getState().account).toMatchObject({
                state,
                activeSubscriptions: { RMP_CLOUD: cloud, RMP_EXPORT: exp },
            });
            expect(onCloudSubscription).not.toHaveBeenCalled();
        }
    );

    it('expires the login and clears subscriptions when the token is rejected', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([], 401)));
        const store = createAccountStore();
        store.dispatch(setState('subscriber'));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: true }));
        const onCloudSubscription = vi.fn();

        await fetchLoginStateAndSubscriptions(store.dispatch, 'expired-token', { onCloudSubscription });

        expect(store.getState().account).toMatchObject({
            state: 'expired',
            activeSubscriptions: defaultActiveSubscriptions,
        });
        expect(onCloudSubscription).not.toHaveBeenCalled();
    });

    it('propagates network errors without changing the previous account state', async () => {
        const error = new TypeError('Offline');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
        const store = createAccountStore();
        store.dispatch(setState('subscriber'));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: true }));
        const previous = store.getState().account;
        const dispatch = vi.spyOn(store, 'dispatch');
        const onCloudSubscription = vi.fn();

        await expect(fetchLoginStateAndSubscriptions(store.dispatch, 'token', { onCloudSubscription })).rejects.toBe(
            error
        );

        expect(store.getState().account).toBe(previous);
        expect(dispatch).not.toHaveBeenCalled();
        expect(onCloudSubscription).not.toHaveBeenCalled();
    });
});

describe('RMT account synchronization compatibility', () => {
    it('initializes from the current RMT account without reading or changing project storage', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([cloudSubscription])));
        setAccount('initial-token');
        localStorage.setItem(LocalStorageKey.PARAM, 'painter-project');
        // jsdom Storage proxies ignore instance spies; the fallback mock owns its methods directly.
        const storageMethods = localStorage instanceof Storage ? Storage.prototype : localStorage;
        const readStorage = vi.spyOn(storageMethods, 'getItem');
        const writeStorage = vi.spyOn(storageMethods, 'setItem');
        const store = createAccountStore();
        const onCloudSubscription = vi.fn();

        expect(onLocalStorageChangeRMT(store, { onCloudSubscription })).toBeUndefined();

        await vi.waitFor(() => expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(true));
        expect(store.getState().account.token).toBe('initial-token');
        expect(readStorage.mock.calls).toEqual([[LocalStorageKey.ACCOUNT]]);
        expect(writeStorage).not.toHaveBeenCalled();
        expect(onCloudSubscription).toHaveBeenCalledOnce();
    });

    it('updates subscriptions on login, token expiration and logout, and skips unchanged accounts', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(response([cloudSubscription]))
            .mockResolvedValueOnce(response([], 401));
        vi.stubGlobal('fetch', fetch);
        const store = createAccountStore();
        onLocalStorageChangeRMT(store);

        setAccount('subscriber-token');
        notifyStorage();
        await vi.waitFor(() => expect(store.getState().account.activeSubscriptions.RMP_CLOUD).toBe(true));
        notifyStorage();
        expect(fetch).toHaveBeenCalledTimes(1);

        setAccount('expired-token');
        notifyStorage();
        await vi.waitFor(() => expect(store.getState().account.state).toBe('expired'));
        expect(store.getState().account.activeSubscriptions).toEqual(defaultActiveSubscriptions);
        setAccount();
        notifyStorage();

        expect(store.getState().account).toEqual({
            token: undefined,
            state: 'logged-out',
            activeSubscriptions: defaultActiveSubscriptions,
        });
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
