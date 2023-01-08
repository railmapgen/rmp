import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * AppState contains all the settings users want to preserve after restart.
 * However non of them should be included in the save.
 */
export interface AppState {
    telemetry: {
        /**
         * App level telemetry such as app load and import/export data.
         */
        app: boolean;
        /**
         * Project level telemetry such as stations' type and count.
         */
        project: boolean;
    };
}

export const initialState: AppState = {
    telemetry: {
        app: true,
        project: true,
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
    },
});

export const { setTelemetryApp, setTelemetryProject } = appSlice.actions;
export default appSlice.reducer;
