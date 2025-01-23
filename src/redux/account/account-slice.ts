import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveSubscriptions {
    RMP_CLOUD: boolean;
    RMP_EXPORT: boolean;
}

export const defaultActiveSubscriptions: ActiveSubscriptions = {
    RMP_CLOUD: false,
    RMP_EXPORT: false,
};

/**
 * AccountState contains information of the current user.
 * Note login and management part should leave to rmg-home and only authenticate here.
 */
export interface AccountState {
    state: 'logged-out' | 'free' | 'subscriber' | 'expired';
    activeSubscriptions: ActiveSubscriptions;
    /**
     * Use this token to communicate with server.
     * Must be up to date as it is updated on storage event in onLocalStorageChangeRMT.
     * Undefined means not logged in.
     *
     * (Optional) If the subsequent request returns 401, call requestToken to refresh
     * it on RMT side, and then retry the request.
     */
    token: string | undefined;
}

export const initialState: AccountState = {
    state: 'logged-out',
    activeSubscriptions: defaultActiveSubscriptions,
    token: undefined,
};

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        setState: (state, action: PayloadAction<AccountState['state']>) => {
            state.state = action.payload;
        },
        setActiveSubscriptions: (state, action: PayloadAction<ActiveSubscriptions>) => {
            state.activeSubscriptions = action.payload;
        },
        setToken: (state, action: PayloadAction<string | undefined>) => {
            state.token = action.payload;
        },
    },
});

export const { setState, setActiveSubscriptions, setToken } = accountSlice.actions;
export default accountSlice.reducer;
