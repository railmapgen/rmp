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
    activeSubscriptions: ActiveSubscriptions;
}

export const initialState: AccountState = {
    activeSubscriptions: defaultActiveSubscriptions,
};

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {
        setActiveSubscriptions: (state, action: PayloadAction<ActiveSubscriptions>) => {
            state.activeSubscriptions = action.payload;
        },
    },
});

export const { setActiveSubscriptions } = accountSlice.actions;
export default accountSlice.reducer;
