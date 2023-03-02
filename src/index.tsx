import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MultiDirectedGraph } from 'graphology';
import { ChakraProvider } from '@chakra-ui/react';
import { rmgChakraTheme } from '@railmapgen/rmg-components';
import i18n from './i18n/config';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from './constants/constants';
import AppRoot from './components/app-root';
import store from './redux';
import { setTelemetryApp } from './redux/app/app-slice';
import { ParamState, setFullState } from './redux/param/param-slice';
import { RMPSave, upgrade } from './util/save';
import './index.css';
import { I18nextProvider } from 'react-i18next';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}

const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const renderApp = () => {
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <Provider store={store}>
                <ChakraProvider theme={rmgChakraTheme}>
                    <I18nextProvider i18n={i18n}>
                        <AppRoot />
                    </I18nextProvider>
                </ChakraProvider>
            </Provider>
        </StrictMode>
    );
};

// Load localstorage first or they will be overwritten after first store.dispatch.
// A change in redux store will trigger the store.subscribe and will write states.
const app = JSON.parse(localStorage.getItem('rmp__app') ?? '{}');
const param = localStorage.getItem('rmp__param');

// Load AppState.
(() => {
    if ('telemetry' in app) {
        if ('app' in app.telemetry) store.dispatch(setTelemetryApp(app.telemetry.app));
    }
})();

// Upgrade param and inject to ParamState.
// top-level await is not possible here
upgrade(param).then(param => {
    const { version, ...save } = JSON.parse(param) as RMPSave;
    window.graph = graph.import(save.graph as any);
    const state: ParamState = { ...save, graph: JSON.stringify(save.graph) };
    store.dispatch(setFullState(state));

    renderApp();
});
