import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalAlertId } from '../constants/global-alerts';
import { createStore } from '../redux';
import { APISubscription, fetchLoginStateAndSubscriptions } from './rmt-save';

afterEach(() => {
    vi.unstubAllGlobals();
});

const createStoreWithLimitAlerts = () => {
    const initialState = createStore().getState();
    return createStore({
        runtime: {
            ...initialState.runtime,
            globalAlerts: {
                [GlobalAlertId.MasterNodeLimitExceeded]: {
                    status: 'warning',
                    message: 'Master limit exceeded',
                },
                [GlobalAlertId.ParallelLineLimitExceeded]: {
                    status: 'warning',
                    message: 'Parallel limit exceeded',
                },
            },
        },
    });
};

const mockSubscriptions = (subscriptions: APISubscription[]) => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ subscriptions }),
        })
    );
};

describe('fetchLoginStateAndSubscriptions', () => {
    it('closes only the master limit alert when RMP Cloud is active', async () => {
        mockSubscriptions([{ type: 'RMP_CLOUD', expires: '2099-01-01T00:00:00Z' }]);
        const store = createStoreWithLimitAlerts();

        await fetchLoginStateAndSubscriptions(store.dispatch, 'token');

        expect(store.getState().runtime.globalAlerts).toEqual({
            [GlobalAlertId.ParallelLineLimitExceeded]: {
                status: 'warning',
                message: 'Parallel limit exceeded',
            },
        });
    });

    it('does not close the master limit alert for an unrelated subscription', async () => {
        mockSubscriptions([{ type: 'RMP_EXPORT', expires: '2099-01-01T00:00:00Z' }]);
        const store = createStoreWithLimitAlerts();

        await fetchLoginStateAndSubscriptions(store.dispatch, 'token');

        expect(store.getState().runtime.globalAlerts).toHaveProperty(GlobalAlertId.MasterNodeLimitExceeded);
    });
});
