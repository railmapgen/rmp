import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { MultiDirectedGraph } from 'graphology';
import AppRoot from './components/app-root';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from './constants/constants';
import i18n from './i18n/config';
import './index.css';
import store from './redux';
import { setTelemetryApp } from './redux/app/app-slice';
import { ParamState, setFullState } from './redux/param/param-slice';
import { RMPSave, upgrade } from './util/save';
import rmgRuntime from '@railmapgen/rmg-runtime';

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
const app = JSON.parse(localStorage.getItem(LocalStorageKey.APP) ?? '{}');
const param = localStorage.getItem(LocalStorageKey.PARAM);

// Load AppState.
(() => {
    if ('telemetry' in app) {
        if ('app' in app.telemetry) store.dispatch(setTelemetryApp(app.telemetry.app));
    }
})();

// Upgrade param and inject to ParamState.
// top-level await is not possible here
upgrade(param).then(param => {
    const { version, graph, ...save } = JSON.parse(param) as RMPSave;
    window.graph = MultiDirectedGraph.from(graph);
    const state: ParamState = { ...save, present: graph, past: [], future: [] };
    store.dispatch(setFullState(state));

    renderApp();
    rmgRuntime.injectUITools();
});
