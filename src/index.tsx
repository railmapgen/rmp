import rmgRuntime from '@railmapgen/rmg-runtime';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MultiDirectedGraph } from 'graphology';
import { ChakraProvider } from '@chakra-ui/react';
import { EdgeAttributes, Events, GraphAttributes, NodeAttributes } from './constants/constants';
import AppRoot from './components/app-root';
import store from './redux';
import './i18n/config';
import { RMPSave, upgrade } from './util/save';
import { AppState, setFullState } from './redux/app/app-slice';
import './index.css';
import { rmgChakraTheme } from '@railmapgen/rmg-components';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}

const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
const { version, ...save } = JSON.parse(upgrade(localStorage.getItem('rmp__param'))) as RMPSave;
window.graph = graph.import(save.graph as any);
const state: AppState = { ...save, graph: JSON.stringify(save.graph) };
store.dispatch(setFullState(state));

const renderApp = () => {
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <Provider store={store}>
                <ChakraProvider theme={rmgChakraTheme}>
                    <AppRoot />
                </ChakraProvider>
            </Provider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(() => {
    renderApp();
    rmgRuntime.event(Events.APP_LOAD, { isStandaloneWindow: rmgRuntime.isStandaloneWindow() });
});
