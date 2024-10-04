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
     * This timeout is used to reset the account state to 'logged-out' after a certain time.
     * Without this, no matter user subscribed or not, the 'logged-out' state right after
     * the initial load will show the proLimitExceed alert. This is not desired.
     *
     * So we first read the previous state from localstorage, and use it in the first few seconds
     * before we get a reply from rmt. It is saved in localstorage `rmp__login_state`.
     *
     * If there is a reply from rmt, registerOnRMTTokenResponse will clear this timeout and
     * state will be updated there.
     * If there is no reply from rmt, this timeout will set the state to 'logged-out',
     * making sure the subscription info saved in localstorage is not used forever.
     */
    timeout: number | undefined;
}

export const initialState: AccountState = {
    state: 'logged-out',
    activeSubscriptions: defaultActiveSubscriptions,
    timeout: undefined,
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
        setLoginStateTimeout: (state, action: PayloadAction<number | undefined>) => {
            state.timeout = action.payload;
        },
    },
});

export const { setState, setActiveSubscriptions, setLoginStateTimeout } = accountSlice.actions;
export default accountSlice.reducer;
