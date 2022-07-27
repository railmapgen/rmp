import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MultiDirectedGraph } from 'graphology';
import { ChakraProvider } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from './constants/constants';
import { StationType } from './constants/stations';
import { LineType } from './constants/lines';
import AppRoot from './components/app-root';
import chakraTheme from './theme/theme';
import store from './redux';
import './i18n/config';
import stations from './components/station/stations';

declare global {
    interface Window {
        graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        init: () => void; // debug only
    }
}

const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
window.graph = graph.import(JSON.parse(JSON.parse(localStorage.getItem('AppState') ?? '{}')?.graph ?? '{}'));

const init = () => {
    localStorage.clear();
    window.graph.addNode('stn_1', {
        x: 250,
        y: 150,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: {
            ...stations[StationType.ShmetroBasic].defaultAttrs,
            names: ['车站1', 'Stn 1'],
        },
    });
    window.graph.addNode('stn_2', {
        x: 250,
        y: 250,
        type: StationType.ShmetroInt,
        [StationType.ShmetroInt]: {
            ...stations[StationType.ShmetroInt].defaultAttrs,
            names: ['车站2', 'Stn 2'],
        },
    });
    window.graph.addNode('stn_3', {
        x: 250,
        y: 350,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: {
            ...stations[StationType.ShmetroBasic].defaultAttrs,
            names: ['车站3', 'Stn 3'],
        },
    });
    window.graph.addNode('stn_4', {
        x: 150,
        y: 250,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: {
            ...stations[StationType.ShmetroBasic].defaultAttrs,
            names: ['车站4', 'Stn 4'],
        },
    });
    window.graph.addNode('stn_5', {
        x: 350,
        y: 250,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: {
            ...stations[StationType.ShmetroBasic].defaultAttrs,
            names: ['车站5', 'Stn 5'],
        },
    });
    window.graph.addEdgeWithKey('line_1_1', 'stn_1', 'stn_2', {
        color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
        type: LineType.Diagonal,
        reconcileId: '',
        diagonal: {
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
        },
    });
    window.graph.addEdgeWithKey('line_1_2', 'stn_2', 'stn_3', {
        color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
        type: LineType.Diagonal,
        reconcileId: '',
        diagonal: {
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
        },
    });
    window.graph.addEdgeWithKey('line_2_1', 'stn_4', 'stn_2', {
        color: [CityCode.Shanghai, 'sh2', '#97D700', MonoColour.black],
        type: LineType.Diagonal,
        reconcileId: '',
        diagonal: {
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
        },
    });
    window.graph.addEdgeWithKey('line_2_2', 'stn_2', 'stn_5', {
        color: [CityCode.Shanghai, 'sh2', '#97D700', MonoColour.black],
        type: LineType.Diagonal,
        reconcileId: '',
        diagonal: {
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
        },
    });
    localStorage.setItem('AppState', JSON.stringify({ graph: JSON.stringify(window.graph.export()) }));
};
window.init = init;

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
