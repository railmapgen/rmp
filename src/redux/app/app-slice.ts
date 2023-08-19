import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * AppState contains all the settings users want to preserve after restart.
 * However non of them should be included in the save.
 */
export interface AppState {
    telemetry: {
        /**
         * App level telemetry such as app load and import/export works/images.
         */
        app: boolean;
        /**
         * Project level telemetry such as stations' type and count.
         */
        project: boolean;
    };
    preference: {
        /**
         * Number of possible attempts to unlock the simple path.
         * Default to 3, unlocked when -1, disabled on 0.
         */
        unlockSimplePathAttempts: number;
    };
}

export const initialState: AppState = {
    telemetry: {
        app: true,
        project: true,
    },
    preference: {
        unlockSimplePathAttempts: 3,
    },
};

const appSlice = createSlice({
    name: 'param',
    initialState,
    reducers: {
        setTelemetryApp: (state, action: PayloadAction<boolean>) => {
            state.telemetry.app = action.payload;
        },
        setTelemetryProject: (state, action: PayloadAction<boolean>) => {
            state.telemetry.project = action.payload;
        },
        setUnlockSimplePath: (state, action: PayloadAction<number>) => {
            state.preference.unlockSimplePathAttempts = action.payload;
        },
    },
});

export const { setTelemetryApp, setTelemetryProject, setUnlockSimplePath } = appSlice.actions;
export default appSlice.reducer;
