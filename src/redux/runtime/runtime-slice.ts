import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlertStatus } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { ActiveType, RuntimeMode, Theme } from '../../constants/constants';

/**
 * RuntimeState contains all the data that do not require any persistence.
 * All of them can be initiated with default value.
 */
interface RuntimeState {
    selected: string[];
    active: ActiveType | undefined;
    /**
     * Watch these refresh indicators to know whether there is a change in `window.graph`.
     */
    refresh: {
        nodes: Record<string, never>;
        edges: Record<string, never>;
    };
    mode: RuntimeMode;
    theme: Theme;
    globalAlerts: Partial<Record<AlertStatus, { message: string; url?: string; linkedApp?: string }>>;
}

const initialState: RuntimeState = {
    selected: [],
    active: undefined,
    refresh: {
        nodes: {},
        edges: {},
    },
    mode: 'free',
    theme: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
    globalAlerts: {},
};

const runtimeSlice = createSlice({
    name: 'runtime',
    initialState,
    reducers: {
        addSelected: (state, action: PayloadAction<string>) => {
            if (!state.selected.includes(action.payload))
                // only push if it is not already in selected
                state.selected.push(action.payload);
        },
        removeSelected: (state, action: PayloadAction<string>) => {
            state.selected.filter(_ => _ !== action.payload);
        },
        clearSelected: state => {
            state.selected = [];
        },
        setActive: (state, action: PayloadAction<ActiveType | undefined>) => {
            state.active = action.payload;
        },
        setRefreshNodes: state => {
            state.refresh.nodes = {};
        },
        setRefreshEdges: state => {
            state.refresh.edges = {};
        },
        setMode: (state, action: PayloadAction<RuntimeMode>) => {
            state.mode = action.payload;
        },
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },
        /**
         * If linkedApp is true, alert will try to open link in the current domain.
         * E.g. linkedApp=true, url='/rmp' will open https://railmapgen.github.io/rmp/
         * If you want to open a url outside the domain, DO NOT set or pass FALSE to linkedApp.
         */
        setGlobalAlert: (
            state,
            action: PayloadAction<{ status: AlertStatus; message: string; url?: string; linkedApp?: string }>
        ) => {
            const { status, message, url, linkedApp } = action.payload;
            state.globalAlerts[status] = { message, url, linkedApp };
        },
        closeGlobalAlert: (state, action: PayloadAction<AlertStatus>) => {
            delete state.globalAlerts[action.payload];
        },
    },
});

export const {
    addSelected,
    removeSelected,
    clearSelected,
    setActive,
    setRefreshNodes,
    setRefreshEdges,
    setMode,
    setTheme,
    setGlobalAlert,
    closeGlobalAlert,
} = runtimeSlice.actions;
export default runtimeSlice.reducer;
