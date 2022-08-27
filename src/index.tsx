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
import { upgrade } from './util/save';
import { AppState, setFullState } from './redux/app/app-slice';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    }
}

const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
const { version, ...save } = JSON.parse(upgrade(localStorage.getItem('rmpParam')));
store.dispatch(setFullState(save as AppState));
window.graph = graph.import(JSON.parse(save.graph));

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
