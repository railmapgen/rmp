import { AlertStatus } from '@chakra-ui/react';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { Translation } from '@railmapgen/rmg-translate';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';
import { CityCode, Id, MiscNodeId, NodeType, RuntimeMode, StationCity, StnId, Theme } from '../../constants/constants';
import { MAX_MASTER_NODE_FREE, MAX_MASTER_NODE_PRO } from '../../constants/master';
import { MiscNodeType } from '../../constants/nodes';
import { STATION_TYPE_VALUES, StationType } from '../../constants/stations';
import i18n from '../../i18n/config';
import { Node2Font } from '../../util/fonts';
import { countParallelLines, MAX_PARALLEL_LINES_FREE, MAX_PARALLEL_LINES_PRO } from '../../util/parallel';
import { setAutoParallel } from '../app/app-slice';
import { loadFonts } from '../fonts/fonts-slice';
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
    /**
     * The position of pointer down for nodes in svg-canvas-graph,
     * defined by the pointer down event, undefined if on pointer up.
     */
    pointerPosition?: { x: number; y: number };
    active: StnId | MiscNodeId | 'background' | undefined;
    /**
     * Watch these refresh indicators to know whether there is a change in `window.graph`.
     */
    refresh: {
        nodes: number;
        edges: number;
        param: number;
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
     * input is used to save the temporary value and display in the app clip after clicking the theme button.
     * output is used to save the temporary value and let the component decide how to do with the newly selected.
     */
    paletteAppClip: {
        input: Theme | undefined;
        output: Theme | undefined;
    };
    count: {
        stations: number;
        miscNodes: number;
        lines: number;
        masters: number;
        parallel: number;
        mostFrequentStationType: StationType;
    };
    /**
     * Cached random station names.
     */
    stationNames: { [key in StationCity]?: { [key in keyof Translation]: string }[] };
    globalAlerts: Partial<Record<AlertStatus, { message: string; url?: string; linkedApp?: string }>>;
}

const initialState: RuntimeState = {
    selected: new Set<Id>(),
    active: undefined,
    refresh: {
        nodes: Date.now(),
        edges: Date.now(),
        param: Date.now(),
    },
    mode: 'free',
    lastTool: undefined,
    keepLastPath: false,
    theme: [CityCode.Shanghai, 'sh1', '#E3002B', MonoColour.white],
    paletteAppClip: {
        input: undefined,
        output: undefined,
    },
    count: {
        stations: 0,
        miscNodes: 0,
        lines: 0,
        masters: 0,
        parallel: 0,
        mostFrequentStationType: StationType.ShmetroBasic,
    },
    stationNames: {},
    globalAlerts: {},
};

/**
 * Thunk middleware to sum the master nodes count.
 */
export const refreshNodesThunk = createAsyncThunk('runtime/refreshNodes', async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    dispatch(setRefreshNodes());

    let [stations, miscNodes, masters] = [0, 0, 0];
    const existsTypes: { [k in NodeType]?: number } = {};
    window.graph.forEachNode((id, attr) => {
        const { type } = attr;
        if (id.startsWith('stn')) {
            stations += 1;
        } else if (id.startsWith('misc_node')) {
            miscNodes += 1;
        }
        if (type === MiscNodeType.Master) {
            masters += 1;
        }

        existsTypes[type] = (existsTypes[type] || 0) + 1;
    });

    const mostFrequentStationType = (Object.entries(existsTypes) as [StationType, number][])
        .filter(([type]) => STATION_TYPE_VALUES.has(type))
        .reduce((a, b) => (b[1] > a[1] ? b : a), [StationType.ShmetroBasic, 0])[0];
    dispatch(setNodesCount({ stations, miscNodes, masters, mostFrequentStationType }));
    const maximumMasterNodes = state.account.activeSubscriptions.RMP_CLOUD ? MAX_MASTER_NODE_PRO : MAX_MASTER_NODE_FREE;
    if (masters > maximumMasterNodes) {
        dispatch(
            setGlobalAlert({
                status: 'warning',
                message: `${i18n.t('header.settings.proLimitExceed.master')} ${i18n.t('header.settings.proLimitExceed.solution')}`,
            })
        );
    }

    const languages = (Object.keys(existsTypes) as NodeType[]).filter(t => t in Node2Font).flatMap(t => Node2Font[t]!);
    dispatch(loadFonts([...new Set(languages)]));
});

/**
 * Thunk middleware to sum the parallel lines count.
 */
export const refreshEdgesThunk = createAsyncThunk('runtime/refreshEdges', async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    dispatch(setRefreshEdges());

    const lines = window.graph.size;

    const parallelLinesCount = countParallelLines(window.graph);
    dispatch(setEdgesCount({ lines, parallel: parallelLinesCount }));
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
        setPointerPosition: (state, action: PayloadAction<{ x: number; y: number } | undefined>) => {
            state.pointerPosition = action.payload;
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
        setRefreshParam: state => {
            state.refresh.param = Date.now();
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
        setNodesCount: (
            state,
            action: PayloadAction<{
                stations: number;
                miscNodes: number;
                masters: number;
                mostFrequentStationType: StationType;
            }>
        ) => {
            const { stations, miscNodes, masters } = action.payload;
            state.count.stations = stations;
            state.count.miscNodes = miscNodes;
            state.count.masters = masters;
            state.count.mostFrequentStationType = action.payload.mostFrequentStationType;
        },
        setEdgesCount: (state, action: PayloadAction<{ lines: number; parallel: number }>) => {
            const { lines, parallel } = action.payload;
            state.count.lines = lines;
            state.count.parallel = parallel;
        },
        setStationNames: (
            state,
            action: PayloadAction<{ cityName: StationCity; names: { [key in keyof Translation]: string }[] }>
        ) => {
            state.stationNames[action.payload.cityName] = action.payload.names;
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

const { setNodesCount, setEdgesCount } = runtimeSlice.actions;

export const {
    setSelected,
    addSelected,
    removeSelected,
    clearSelected,
    setPointerPosition,
    setActive,
    setRefreshNodes,
    setRefreshEdges,
    setRefreshParam,
    setMode,
    setKeepLastPath,
    setTheme,
    openPaletteAppClip,
    closePaletteAppClip,
    onPaletteAppClipEmit,
    setStationNames,
    setGlobalAlert,
    closeGlobalAlert,
} = runtimeSlice.actions;
export default runtimeSlice.reducer;
