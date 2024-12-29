import { AlertStatus } from '@chakra-ui/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';
import { CityCode, Id, MiscNodeId, RuntimeMode, StnId, Theme } from '../../constants/constants';
import { MAX_MASTER_NODE_FREE, MAX_MASTER_NODE_PRO } from '../../constants/master';
import { MiscNodeType } from '../../constants/nodes';
import i18n from '../../i18n/config';
import { countParallelLines, MAX_PARALLEL_LINES_FREE, MAX_PARALLEL_LINES_PRO } from '../../util/parallel';
import { setAutoParallel } from '../app/app-slice';
import { redoAction, undoAction } from '../param/param-slice';

/**
 * RuntimeState contains all the data that do not require any persistence.
 * All of them can be initiated with default value.
 */
interface RuntimeState {
    /**
     * Current selection (nodes and edges id, possible multiple selection).
     */
    selected: Set<Id>;
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
    /**
     * The state for color picker modal from rmg-palette.
     * prevTheme is used to save the temporary value and display in the app clip after clicking the theme button.
     * nextTheme is used to save the temporary value and let the component decide how to do with the newly selected.
     */
    paletteAppClip: {
        input: Theme | undefined;
        output: Theme | undefined;
    };
    masterNodesCount: number;
    parallelLinesCount: number;
    globalAlerts: Partial<Record<AlertStatus, { message: string; url?: string; linkedApp?: string }>>;
}

const initialState: RuntimeState = {
    selected: new Set<Id>(),
    active: undefined,
    refresh: {
        nodes: Date.now(),
        edges: Date.now(),
    },
    mode: 'free',
    lastTool: undefined,
    keepLastPath: false,
    theme: [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white],
    paletteAppClip: {
        input: undefined,
        output: undefined,
    },
    masterNodesCount: 0,
    parallelLinesCount: 0,
    globalAlerts: {},
};

/**
 * Thunk middleware to sum the master nodes count.
 */
export const refreshNodesThunk = createAsyncThunk('runtime/refreshNodes', async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    dispatch(setRefreshNodes());

    // no check on the first load
    if (state.account.timeout) return;

    let masterNodesCount = 0;
    window.graph.forEachNode((_, attr) => {
        if (attr.type === MiscNodeType.Master) {
            masterNodesCount += 1;
        }
    });
    dispatch(setMasterNodesCount(masterNodesCount));
    const maximumMasterNodes = state.account.activeSubscriptions.RMP_CLOUD ? MAX_MASTER_NODE_PRO : MAX_MASTER_NODE_FREE;
    if (masterNodesCount > maximumMasterNodes) {
        dispatch(
            setGlobalAlert({
                status: 'warning',
                message: `${i18n.t('header.settings.proLimitExceed.master')} ${i18n.t('header.settings.proLimitExceed.solution')}`,
            })
        );
    }
});

/**
 * Thunk middleware to sum the parallel lines count.
 */
export const refreshEdgesThunk = createAsyncThunk('runtime/refreshEdges', async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    dispatch(setRefreshEdges());

    // no check on the first load
    if (state.account.timeout) return;

    const parallelLinesCount = countParallelLines(window.graph);
    dispatch(setParallelLinesCount(parallelLinesCount));
    const maximumParallelLines = state.account.activeSubscriptions.RMP_CLOUD
        ? MAX_PARALLEL_LINES_PRO
        : MAX_PARALLEL_LINES_FREE;
    if (parallelLinesCount >= maximumParallelLines) {
        dispatch(setAutoParallel(false));
    }
    if (parallelLinesCount > maximumParallelLines) {
        dispatch(
            setGlobalAlert({
                status: 'warning',
                message: `${i18n.t('header.settings.proLimitExceed.parallel')} ${i18n.t('header.settings.proLimitExceed.solution')}`,
            })
        );
    }
});

const runtimeSlice = createSlice({
    name: 'runtime',
    initialState,
    reducers: {
        setSelected: (state, action: PayloadAction<Set<Id>>) => {
            state.selected = action.payload;
        },
        addSelected: (state, action: PayloadAction<Id>) => {
            state.selected.add(action.payload);
        },
        removeSelected: (state, action: PayloadAction<Id>) => {
            state.selected.delete(action.payload);
        },
        clearSelected: state => {
            state.selected = new Set<Id>();
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
        openPaletteAppClip: (state, action: PayloadAction<Theme>) => {
            state.paletteAppClip.input = action.payload;
            state.paletteAppClip.output = undefined;
        },
        closePaletteAppClip: state => {
            state.paletteAppClip.input = undefined;
        },
        onPaletteAppClipEmit: (state, action: PayloadAction<Theme>) => {
            state.paletteAppClip.input = undefined;
            state.paletteAppClip.output = action.payload;
        },
        setMasterNodesCount: (state, action: PayloadAction<number>) => {
            state.masterNodesCount = action.payload;
        },
        setParallelLinesCount: (state, action: PayloadAction<number>) => {
            state.parallelLinesCount = action.payload;
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

const { setMasterNodesCount, setParallelLinesCount } = runtimeSlice.actions;

export const {
    setSelected,
    addSelected,
    removeSelected,
    clearSelected,
    setActive,
    setRefreshNodes,
    setRefreshEdges,
    setMode,
    setKeepLastPath,
    setTheme,
    openPaletteAppClip,
    closePaletteAppClip,
    onPaletteAppClipEmit,
    setGlobalAlert,
    closeGlobalAlert,
} = runtimeSlice.actions;
export default runtimeSlice.reducer;
