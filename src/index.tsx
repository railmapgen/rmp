import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MultiDirectedGraph } from 'graphology';
import { ChakraProvider } from '@chakra-ui/react';
import { rmgChakraTheme } from '@railmapgen/rmg-components';
import './i18n/config';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from './constants/constants';
import AppRoot from './components/app-root';
import store from './redux';
import { AppState, setFullState } from './redux/app/app-slice';
import { RMPSave, upgrade } from './util/save';
import './index.css';

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
                    <AppRoot />
                </ChakraProvider>
            </Provider>
        </StrictMode>
    );
};

// top-level await is not possible here
upgrade(localStorage.getItem('rmp__param')).then(param => {
    const { version, ...save } = JSON.parse(param) as RMPSave;
    window.graph = graph.import(save.graph as any);
    const state: AppState = { ...save, graph: JSON.stringify(save.graph) };
    store.dispatch(setFullState(state));

    renderApp();
});
