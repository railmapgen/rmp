import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MultiDirectedGraph } from 'graphology';
import { ChakraProvider } from '@chakra-ui/react';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from './constants/constants';
import AppRoot from './components/app-root';
import chakraTheme from './theme/theme';
import store from './redux';
import './i18n/config';
import { RMPSave, upgrade } from './util/save';
import { AppState, setFullState } from './redux/app/app-slice';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}

const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
const { version, ...save } = JSON.parse(upgrade(localStorage.getItem('rmpParam'))) as RMPSave;
window.graph = graph.import(save.graph as any);
const state: AppState = { ...save, graph: JSON.stringify(save.graph) };
store.dispatch(setFullState(state));

const renderApp = () => {
    const root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <Provider store={store}>
            <ChakraProvider theme={chakraTheme}>
                <AppRoot />
            </ChakraProvider>
        </Provider>
    );
};

renderApp();
