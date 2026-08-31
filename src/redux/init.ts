import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import i18n from '../i18n/config';
import { onLocalStorageChangeRMT, onRMPSaveUpdate } from '../util/rmt-save';
import { normalizeTimelineStationFlags, RMPSave, stringifyParam, upgrade } from '../util/save';
import { RootStore, startRootListening } from '.';
import { setActiveSubscriptions, setState } from './account/account-slice';
import {
    setAutoChangeStationType,
    setAutoParallel,
    setDisableMapPerformanceOptimization,
    setDisableWarningChangeType,
    setEnableActionDateFormatValidation,
    setGridLines,
    setPredictNextNode,
    setRandomStationsNames,
    setShowOnlyFavorites,
    setSnapLines,
    setStationNameTranslationMode,
    setTelemetryApp,
    setTelemetryProject,
    setTimelineFeatureEnabled,
    setToolsPanelExpansion,
    toggleFavoriteLineStyle,
    toggleFavoriteMiscNode,
    toggleFavoriteStation,
} from './app/app-slice';
import { initializeProject, ProjectSnapshot } from './param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk, setGlobalAlert } from './runtime/runtime-slice';
import { normalizeRandomStationsNames, normalizeStationNameTranslationMode } from './state-migration';
import { loadTimeline } from './timeline/timeline-slice';

export const initStore = async (store: RootStore) => {
    // Load localstorage first or they will be overwritten after first store.dispatch.
    // A change in redux store will trigger the store.subscribe and will write states.
    const loginState = JSON.parse(rmgRuntime.storage.get(LocalStorageKey.LOGIN_STATE) ?? '{}');
    const appState = JSON.parse(rmgRuntime.storage.get(LocalStorageKey.APP) ?? '{}');
    const paramState = localStorage.getItem(LocalStorageKey.PARAM);

    // Load AppState.
    if ('telemetry' in appState) {
        if ('app' in appState.telemetry) store.dispatch(setTelemetryApp(appState.telemetry.app));
        if ('project' in appState.telemetry) store.dispatch(setTelemetryProject(appState.telemetry.project));
    }
    if ('preference' in appState) {
        if ('toolsPanel' in appState.preference) {
            if ('expand' in appState.preference.toolsPanel)
                store.dispatch(setToolsPanelExpansion(appState.preference.toolsPanel.expand));
            if ('showOnlyFavorites' in appState.preference.toolsPanel)
                store.dispatch(setShowOnlyFavorites(appState.preference.toolsPanel.showOnlyFavorites));
        }
        if ('autoParallel' in appState.preference) store.dispatch(setAutoParallel(appState.preference.autoParallel));
        if ('randomStationsNames' in appState.preference)
            store.dispatch(
                setRandomStationsNames(normalizeRandomStationsNames(appState.preference.randomStationsNames))
            );
        if ('stationNameTranslationMode' in appState.preference)
            store.dispatch(
                setStationNameTranslationMode(
                    normalizeStationNameTranslationMode(appState.preference.stationNameTranslationMode)
                )
            );
        if ('gridLines' in appState.preference) store.dispatch(setGridLines(appState.preference.gridLines));
        if ('snapLines' in appState.preference) store.dispatch(setSnapLines(appState.preference.snapLines));
        if ('predictNextNode' in appState.preference)
            store.dispatch(setPredictNextNode(appState.preference.predictNextNode));
        if ('autoChangeStationType' in appState.preference)
            store.dispatch(setAutoChangeStationType(appState.preference.autoChangeStationType));
        if ('timelineFeatureEnabled' in appState.preference)
            store.dispatch(setTimelineFeatureEnabled(appState.preference.timelineFeatureEnabled));
        if ('enableActionDateFormatValidation' in appState.preference)
            store.dispatch(setEnableActionDateFormatValidation(appState.preference.enableActionDateFormatValidation));
        if ('disableWarning' in appState.preference) {
            if ('changeType' in appState.preference.disableWarning)
                store.dispatch(setDisableWarningChangeType(appState.preference.disableWarning.changeType));
        }
        if ('favorites' in appState.preference) {
            // load favorites with error handling for invalid/missing IDs
            if (
                'lineStyles' in appState.preference.favorites &&
                Array.isArray(appState.preference.favorites.lineStyles)
            ) {
                appState.preference.favorites.lineStyles.forEach((type: string) => {
                    store.dispatch(toggleFavoriteLineStyle(type as any));
                });
            }
            if ('stations' in appState.preference.favorites && Array.isArray(appState.preference.favorites.stations)) {
                appState.preference.favorites.stations.forEach((type: string) => {
                    store.dispatch(toggleFavoriteStation(type as any));
                });
            }
            if (
                'miscNodes' in appState.preference.favorites &&
                Array.isArray(appState.preference.favorites.miscNodes)
            ) {
                appState.preference.favorites.miscNodes.forEach((type: string) => {
                    store.dispatch(toggleFavoriteMiscNode(type as any));
                });
            }
        }
    }
    if ('state' in loginState) {
        store.dispatch(setState(loginState.state));
    }
    if ('activeSubscriptions' in loginState) {
        store.dispatch(setActiveSubscriptions(loginState.activeSubscriptions));
    }

    // Upgrade param and inject to ParamState.
    const param = await upgrade(paramState);

    const { version, graph, timeline: timelineSave, ...save } = JSON.parse(param) as RMPSave;
    window.graph = MultiDirectedGraph.from(graph);
    if (store.getState().app.preference.timelineFeatureEnabled) {
        normalizeTimelineStationFlags(window.graph);
    }
    const project: ProjectSnapshot = {
        ...save,
        mapEnabled: save.mapEnabled ?? false,
        mapStyle: save.mapStyle ?? structuredClone(DEFAULT_MAP_STYLE),
        graph,
    };
    store.dispatch(initializeProject(project));
    await Promise.all([store.dispatch(refreshNodesThunk()), store.dispatch(refreshEdgesThunk())]);

    // Restore timeline state if present in the save
    if (timelineSave) {
        store.dispatch(
            loadTimeline({
                enabled: timelineSave.enabled,
                totalDuration: timelineSave.totalDuration,
                currentTime: timelineSave.currentTime,
                dateRows: timelineSave.dateRows ?? [],
                groups: timelineSave.groups ?? [],
                lines: timelineSave.lines ?? [],
                actionRows: timelineSave.actionRows ?? [],
                diffs: timelineSave.diffs ?? [],
                baseGraph: (timelineSave.baseGraph ?? graph) as any,
            })
        );
    }

    onLocalStorageChangeRMT(store); // update the login state and token read from localStorage

    startRootListening({
        predicate: (action, currentState, previousState) => {
            const currentProject = currentState.param.present;
            const previousProject = previousState.param.present;
            if (action.type === 'param/saveGraph') return true;

            return (
                [
                    'param/replaceProjectState',
                    'param/setMapEnabled',
                    'param/setMapStyle',
                    'param/setSvgViewport',
                    'param/setSvgViewBoxZoom',
                    'param/setSvgViewBoxMin',
                    'undo',
                    'redo',
                ].includes(action.type) && JSON.stringify(currentProject) !== JSON.stringify(previousProject)
            );
        },
        effect: (_action, listenerApi) => {
            try {
                const state = store.getState();
                const { undoStack, redoStack, unsavedDate, validationUndoPending, ...timelineForSave } = state.timeline;
                localStorage.setItem(LocalStorageKey.PARAM, stringifyParam(state.param, timelineForSave));
                onRMPSaveUpdate(); // notify rmt to update the save
            } catch (error) {
                if (error instanceof Error && error.name == 'QuotaExceededError') {
                    logger.error('Local storage quota exceeded, unable to save state.');
                    const message = i18n.t('localStorageQuotaExceeded');
                    listenerApi.dispatch(setGlobalAlert({ status: 'error', message }));
                }
            }
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return JSON.stringify(currentState.app) !== JSON.stringify(previousState.app);
        },
        effect: async (_action, listenerApi) => {
            try {
                rmgRuntime.storage.set(LocalStorageKey.APP, JSON.stringify(listenerApi.getState().app));
            } catch (error) {
                if (error instanceof Error && error.name == 'QuotaExceededError') {
                    logger.error('Local storage quota exceeded, unable to save state.');
                    const message = i18n.t('localStorageQuotaExceeded');
                    listenerApi.dispatch(setGlobalAlert({ status: 'error', message }));
                }
            }
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            return JSON.stringify(currentState.account) !== JSON.stringify(previousState.account);
        },
        effect: async (_action, listenerApi) => {
            try {
                rmgRuntime.storage.set(LocalStorageKey.LOGIN_STATE, JSON.stringify(listenerApi.getState().account));
            } catch (error) {
                if (error instanceof Error && error.name == 'QuotaExceededError') {
                    logger.error('Local storage quota exceeded, unable to save state.');
                    const message = i18n.t('localStorageQuotaExceeded');
                    listenerApi.dispatch(setGlobalAlert({ status: 'error', message }));
                }
            }
        },
    });

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            // Only trigger on timeline config changes (exclude undo/redo stacks)
            const currTe = currentState.timeline;
            const prevTe = previousState.timeline;
            return (
                currTe.enabled !== prevTe.enabled ||
                currTe.totalDuration !== prevTe.totalDuration ||
                currTe.currentTime !== prevTe.currentTime ||
                JSON.stringify(currTe.dateRows) !== JSON.stringify(prevTe.dateRows) ||
                JSON.stringify(currTe.groups) !== JSON.stringify(prevTe.groups) ||
                JSON.stringify(currTe.lines) !== JSON.stringify(prevTe.lines) ||
                JSON.stringify(currTe.actionRows) !== JSON.stringify(prevTe.actionRows) ||
                JSON.stringify(currTe.diffs) !== JSON.stringify(prevTe.diffs)
            );
        },
        effect: (_action, listenerApi) => {
            try {
                const state = store.getState();
                const { undoStack, redoStack, unsavedDate, validationUndoPending, ...timelineForSave } = state.timeline;
                localStorage.setItem(LocalStorageKey.PARAM, stringifyParam(state.param, timelineForSave));
                onRMPSaveUpdate();
            } catch (error) {
                if (error instanceof Error && error.name == 'QuotaExceededError') {
                    logger.error('Local storage quota exceeded, unable to save state.');
                    const message = i18n.t('localStorageQuotaExceeded');
                    listenerApi.dispatch(setGlobalAlert({ status: 'error', message }));
                }
            }
        },
    });
};

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}
