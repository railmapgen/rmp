import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import i18n from '../i18n/config';
import { onLocalStorageChangeRMT, onRMPSaveUpdate } from '../util/rmt-save';
import { RMPSave, stringifyParam, upgrade } from '../util/save';
import { RootStore, startRootListening } from '.';
import { setActiveSubscriptions, setState } from './account/account-slice';
import {
    setAutoChangeStationType,
    setAutoParallel,
    setDisableWarningChangeType,
    setGridLines,
    setPredictNextNode,
    setRandomStationsNames,
    setSnapLines,
    setTelemetryApp,
    setTelemetryProject,
    setToolsPanelExpansion,
    setUnlockSimplePath,
} from './app/app-slice';
import { ParamState, setFullState } from './param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk, setGlobalAlert } from './runtime/runtime-slice';

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
        if ('unlockSimplePathAttempts' in appState.preference)
            store.dispatch(setUnlockSimplePath(appState.preference.unlockSimplePathAttempts));
        if ('toolsPanel' in appState.preference && 'expand' in appState.preference.toolsPanel)
            store.dispatch(setToolsPanelExpansion(appState.preference.toolsPanel.expand));
        if ('autoParallel' in appState.preference) store.dispatch(setAutoParallel(appState.preference.autoParallel));
        if ('randomStationsNames' in appState.preference)
            store.dispatch(setRandomStationsNames(appState.preference.randomStationsNames));
        if ('gridLines' in appState.preference) store.dispatch(setGridLines(appState.preference.gridLines));
        if ('snapLines' in appState.preference) store.dispatch(setSnapLines(appState.preference.snapLines));
        if ('predictNextNode' in appState.preference)
            store.dispatch(setPredictNextNode(appState.preference.predictNextNode));
        if ('autoChangeStationType' in appState.preference)
            store.dispatch(setAutoChangeStationType(appState.preference.autoChangeStationType));
        if ('disableWarning' in appState.preference) {
            if ('changeType' in appState.preference.disableWarning)
                store.dispatch(setDisableWarningChangeType(appState.preference.disableWarning.changeType));
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

    const { version, graph, ...save } = JSON.parse(param) as RMPSave;
    window.graph = MultiDirectedGraph.from(graph);
    const state: ParamState = { ...save, present: graph, past: [], future: [] };
    store.dispatch(setFullState(state));
    store.dispatch(refreshNodesThunk());
    store.dispatch(refreshEdgesThunk());

    onLocalStorageChangeRMT(store); // update the login state and token read from localStorage

    startRootListening({
        predicate: (_action, currentState, previousState) => {
            // TODO: check if the refresh nodes and edges will be dispatched in batch, otherwise
            // there might be a performance issue.
            // TODO: Dragging a node will trigger the refreshNodesThunk, however, the actual
            // graph is not preserved as we want to reduce the number of refreshes. But this
            // comparison will always return true on dragging a node.
            return (
                currentState.runtime.refresh.nodes !== previousState.runtime.refresh.nodes ||
                currentState.runtime.refresh.edges !== previousState.runtime.refresh.edges
            );
        },
        effect: (_action, listenerApi) => {
            try {
                localStorage.setItem(LocalStorageKey.PARAM, stringifyParam(store.getState().param));
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
};

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}
