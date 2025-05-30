import rmgRuntime from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from './constants/constants';
import i18n from './i18n/config';
// eslint-disable-next-line import/no-unassigned-import
import './index.css';
import store from './redux';
import { setActiveSubscriptions, setState } from './redux/account/account-slice';
import {
    setAutoParallel,
    setRandomStationsNames,
    setTelemetryApp,
    setTelemetryProject,
    setToolsPanelExpansion,
    setUnlockSimplePath,
    setGridLines,
    setSnapLines,
} from './redux/app/app-slice';
import { ParamState, setFullState } from './redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from './redux/runtime/runtime-slice';
import { onLocalStorageChangeRMT } from './util/rmt-save';
import { RMPSave, upgrade } from './util/save';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}

const renderApp = () => {
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <React.StrictMode>
            <Provider store={store}>
                <I18nextProvider i18n={i18n}>
                    <AppRoot />
                </I18nextProvider>
            </Provider>
        </React.StrictMode>
    );
};

// Load localstorage first or they will be overwritten after first store.dispatch.
// A change in redux store will trigger the store.subscribe and will write states.
const loginState = JSON.parse(localStorage.getItem(LocalStorageKey.LOGIN_STATE) ?? '{}');
const appState = JSON.parse(localStorage.getItem(LocalStorageKey.APP) ?? '{}');
const paramState = localStorage.getItem(LocalStorageKey.PARAM);

// Load AppState.
(() => {
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
    }
    if ('state' in loginState) {
        store.dispatch(setState(loginState.state));
    }
    if ('activeSubscriptions' in loginState) {
        store.dispatch(setActiveSubscriptions(loginState.activeSubscriptions));
    }
})();

// top-level await is not possible here
// also wait for the rmgRuntime to be ready for info.json
rmgRuntime.ready().then(async () => {
    // Upgrade param and inject to ParamState.
    const param = await upgrade(paramState);

    const { version, graph, ...save } = JSON.parse(param) as RMPSave;
    window.graph = MultiDirectedGraph.from(graph);
    const state: ParamState = { ...save, present: graph, past: [], future: [] };
    store.dispatch(setFullState(state));
    store.dispatch(refreshNodesThunk());
    store.dispatch(refreshEdgesThunk());

    renderApp();
    rmgRuntime.injectUITools();

    onLocalStorageChangeRMT(store); // update the login state and token read from localStorage
});
