import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from './constants/constants';
import i18n from './i18n/config';
import './index.css';
import store from './redux';
import {
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setLoginStateTimeout,
    setState,
} from './redux/account/account-slice';
import {
    setAutoParallel,
    setTelemetryApp,
    setTelemetryProject,
    setToolsPanelExpansion,
    setUnlockSimplePath,
} from './redux/app/app-slice';
import { ParamState, setFullState } from './redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from './redux/runtime/runtime-slice';
import { registerOnRMTTokenResponse, requestToken } from './util/rmt-save';
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
const app = JSON.parse(localStorage.getItem(LocalStorageKey.APP) ?? '{}');
const param = localStorage.getItem(LocalStorageKey.PARAM);

// Load AppState.
(() => {
    if ('telemetry' in app) {
        if ('app' in app.telemetry) store.dispatch(setTelemetryApp(app.telemetry.app));
        if ('project' in app.telemetry) store.dispatch(setTelemetryProject(app.telemetry.project));
    }
    if ('preference' in app) {
        if ('unlockSimplePathAttempts' in app.preference)
            store.dispatch(setUnlockSimplePath(app.preference.unlockSimplePathAttempts));
        if ('toolsPanel' in app.preference && 'expand' in app.preference.toolsPanel)
            store.dispatch(setToolsPanelExpansion(app.preference.toolsPanel.expand));
        if ('autoParallel' in app.preference) store.dispatch(setAutoParallel(app.preference.autoParallel));
    }
    if ('state' in loginState) {
        store.dispatch(setState(loginState.state));
    }
    if ('activeSubscriptions' in loginState) {
        store.dispatch(setActiveSubscriptions(loginState.activeSubscriptions));
    }
})();

// Upgrade param and inject to ParamState.
// top-level await is not possible here
upgrade(param).then(param => {
    const { version, graph, ...save } = JSON.parse(param) as RMPSave;
    window.graph = MultiDirectedGraph.from(graph);
    const state: ParamState = { ...save, present: graph, past: [], future: [] };
    store.dispatch(setFullState(state));
    store.dispatch(refreshNodesThunk());
    store.dispatch(refreshEdgesThunk());

    renderApp();
    rmgRuntime.injectUITools();

    registerOnRMTTokenResponse(store);
    requestToken();
    window.setInterval(() => requestToken(), 15 * 60 * 1000); // 15 mins

    const accountStateTimeout = window.setTimeout(() => {
        logger.debug('Timeout 6s after start, logging out');
        store.dispatch(setState('logged-out'));
        store.dispatch(setActiveSubscriptions(defaultActiveSubscriptions));
        store.dispatch(setLoginStateTimeout(undefined));
    }, 6000);
    store.dispatch(setLoginStateTimeout(accountStateTimeout));
});
