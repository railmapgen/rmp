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
}

export const initialState: AccountState = {
    state: 'logged-out',
    activeSubscriptions: defaultActiveSubscriptions,
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
    },
});

export const { setState, setActiveSubscriptions } = accountSlice.actions;
export default accountSlice.reducer;
