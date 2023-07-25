import { AlertStatus } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MiscNodeId, NodeType, RuntimeMode, StnId, Theme } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { StationType } from '../../constants/stations';
import { redoAction, undoAction } from '../param/param-slice';

/**
 * RuntimeState contains all the data that do not require any persistence.
 * All of them can be initiated with default value.
 */
interface RuntimeState {
    /**
     * Current selection (nodes and edges id, possible multiple selection).
     */
    selected: string[];
    active: StnId | MiscNodeId | 'background' | undefined;
    /**
     * Watch these refresh indicators to know whether there is a change in `window.graph`.
     */
    refresh: {
        nodes: number;
        edges: number;
    };
    mode: RuntimeMode;
    /**
     * The last tool used by the user.
     * Will be undefined on first load.
     * Will never be free!
     */
    lastTool: Omit<RuntimeMode, 'free'> | undefined;
    /**
     * If this is true, we will never set runtime.mode to free after placing edges.
     */
    keepLastPath: boolean;
    /**
     * The theme when users make single color lines and some stations.
     */
    theme: Theme;
    globalAlerts: Partial<Record<AlertStatus, { message: string; url?: string; linkedApp?: string }>>;
}

const initialState: RuntimeState = {
    selected: [],
    active: undefined,
    refresh: {
        nodes: Date.now(),
        edges: Date.now(),
    },
    mode: 'free',
    lastTool: undefined,
    keepLastPath: false,
    theme: [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white],
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
        setActive: (state, action: PayloadAction<StnId | MiscNodeId | 'background' | undefined>) => {
            state.active = action.payload;
        },
        setRefreshNodes: state => {
            state.refresh.nodes = Date.now();
        },
        setRefreshEdges: state => {
            state.refresh.edges = Date.now();
        },
        setMode: (state, action: PayloadAction<RuntimeMode>) => {
            if (state.mode !== 'free') state.lastTool = state.mode;
            state.mode = action.payload;
        },
        setKeepLastPath: (state, action: PayloadAction<boolean>) => {
            state.keepLastPath = action.payload;
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
    extraReducers: builder => {
        builder
            .addCase(undoAction, state => {
                state.refresh.nodes = Date.now();
                state.refresh.edges = Date.now();
            })
            .addCase(redoAction, state => {
                state.refresh.nodes = Date.now();
                state.refresh.edges = Date.now();
            });
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
    setKeepLastPath,
    setTheme,
    setGlobalAlert,
    closeGlobalAlert,
} = runtimeSlice.actions;
export default runtimeSlice.reducer;
