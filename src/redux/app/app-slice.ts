import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StationCity } from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { MiscNodeType } from '../../constants/nodes';
import { StationType } from '../../constants/stations';

/**
 * AppState contains all the settings users want to preserve after restart.
 * However non of them should be included in the save.
 */
export interface AppState {
    telemetry: {
        /**
         * App level telemetry such as app load and import/export works/images.
         *
         * WARNING! Use rmgRuntime.isAllowAnalytics() instead.
         * This is not read or write currently, but kept in the localstorage due to previous versions.
         */
        app: boolean;
        /**
         * Project level telemetry such as stations'/lines' addition and their count.
         */
        project: boolean;
    };
    preference: {
        /**
         * Settings for the tools panel.
         */
        toolsPanel: {
            /**
             * Whether to expand the tools panel. Remembered for next run.
             */
            expand: boolean;
            /**
             * Whether to show only favorited tools.
             */
            showOnlyFavorites: boolean;
            /**
             * Whether to hide "Learn how to add" links in tools panel.
             */
            hideLearnHowToAdd: boolean;
        };
        /**
         * Whether to enable parallel for new lines.
         */
        autoParallel: boolean;
        randomStationsNames: 'none' | StationCity;
        gridLines: boolean;
        snapLines: boolean;
        predictNextNode: boolean;
        autoChangeStationType: boolean;
        /**
         * Whether to disable warnings.
         */
        disableWarning: {
            /**
             * Whether to disable the change type warning dialog when changing station/line types.
             */
            changeType: boolean;
        };
        /**
         * User's favorite tools.
         */
        favorites: {
            linePaths: LinePathType[];
            lineStyles: LineStyleType[];
            stations: StationType[];
            miscNodes: MiscNodeType[];
        };
    };
}

export const initialState: AppState = {
    telemetry: {
        app: true,
        project: true,
    },
    preference: {
        toolsPanel: {
            expand: true,
            showOnlyFavorites: false,
            hideLearnHowToAdd: false,
        },
        autoParallel: true,
        randomStationsNames: 'none',
        gridLines: false,
        snapLines: true,
        predictNextNode: true,
        autoChangeStationType: true,
        disableWarning: {
            changeType: false,
        },
        favorites: {
            linePaths: [],
            lineStyles: [],
            stations: [],
            miscNodes: [],
        },
    },
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setTelemetryApp: (state, action: PayloadAction<boolean>) => {
            state.telemetry.app = action.payload;
        },
        setTelemetryProject: (state, action: PayloadAction<boolean>) => {
            state.telemetry.project = action.payload;
        },
        setToolsPanelExpansion: (state, action: PayloadAction<boolean>) => {
            state.preference.toolsPanel.expand = action.payload;
        },
        setAutoParallel: (state, action: PayloadAction<boolean>) => {
            state.preference.autoParallel = action.payload;
        },
        setRandomStationsNames: (state, action: PayloadAction<'none' | StationCity>) => {
            state.preference.randomStationsNames = action.payload;
        },
        setGridLines: (state, action: PayloadAction<boolean>) => {
            state.preference.gridLines = action.payload;
        },
        setSnapLines: (state, action: PayloadAction<boolean>) => {
            state.preference.snapLines = action.payload;
        },
        setPredictNextNode: (state, action: PayloadAction<boolean>) => {
            state.preference.predictNextNode = action.payload;
        },
        setAutoChangeStationType: (state, action: PayloadAction<boolean>) => {
            state.preference.autoChangeStationType = action.payload;
        },
        setDisableWarningChangeType: (state, action: PayloadAction<boolean>) => {
            state.preference.disableWarning.changeType = action.payload;
        },
        setShowOnlyFavorites: (state, action: PayloadAction<boolean>) => {
            state.preference.toolsPanel.showOnlyFavorites = action.payload;
        },
        setHideLearnHowToAdd: (state, action: PayloadAction<boolean>) => {
            state.preference.toolsPanel.hideLearnHowToAdd = action.payload;
        },
        toggleFavoriteLinePath: (state, action: PayloadAction<LinePathType>) => {
            const index = state.preference.favorites.linePaths.indexOf(action.payload);
            if (index === -1) {
                state.preference.favorites.linePaths.push(action.payload);
            } else {
                state.preference.favorites.linePaths.splice(index, 1);
            }
        },
        toggleFavoriteLineStyle: (state, action: PayloadAction<LineStyleType>) => {
            const index = state.preference.favorites.lineStyles.indexOf(action.payload);
            if (index === -1) {
                state.preference.favorites.lineStyles.push(action.payload);
            } else {
                state.preference.favorites.lineStyles.splice(index, 1);
            }
        },
        toggleFavoriteStation: (state, action: PayloadAction<StationType>) => {
            const index = state.preference.favorites.stations.indexOf(action.payload);
            if (index === -1) {
                state.preference.favorites.stations.push(action.payload);
            } else {
                state.preference.favorites.stations.splice(index, 1);
            }
        },
        toggleFavoriteMiscNode: (state, action: PayloadAction<MiscNodeType>) => {
            const index = state.preference.favorites.miscNodes.indexOf(action.payload);
            if (index === -1) {
                state.preference.favorites.miscNodes.push(action.payload);
            } else {
                state.preference.favorites.miscNodes.splice(index, 1);
            }
        },
    },
});

export const {
    setTelemetryApp,
    setTelemetryProject,
    setToolsPanelExpansion,
    setAutoParallel,
    setRandomStationsNames,
    setGridLines,
    setSnapLines,
    setPredictNextNode,
    setAutoChangeStationType,
    setDisableWarningChangeType,
    setShowOnlyFavorites,
    setHideLearnHowToAdd,
    toggleFavoriteLinePath,
    toggleFavoriteLineStyle,
    toggleFavoriteStation,
    toggleFavoriteMiscNode,
} = appSlice.actions;
export default appSlice.reducer;
