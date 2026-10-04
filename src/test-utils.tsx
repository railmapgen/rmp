// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { Store } from '@reduxjs/toolkit';
import { render, RenderOptions } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React, { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from './constants/constants';
import { LinePathType, LineStyleType } from './constants/lines';
import { MiscNodeType } from './constants/nodes';
import { StationType } from './constants/stations';
import i18n from './i18n/config';
import { createStore } from './redux';
import { reconcileLineDefinitions } from './util/line-definitions';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    store: Store;
}

const initialOptions: CustomRenderOptions = {
    store: createStore(),
};

interface TestingProviderProps {
    children?: ReactNode;
    store: Store;
}

export const TestingProvider = (props: TestingProviderProps) => {
    const { children, store } = props;

    return (
        <I18nextProvider i18n={i18n}>
            <Provider store={store}>{children}</Provider>
        </I18nextProvider>
    );
};

const customRender = (ui: ReactElement, { store, ...renderOptions } = initialOptions) => {
    return render(ui, {
        wrapper: props => <TestingProvider store={store} {...props} />,
        ...renderOptions,
    });
};

export { customRender as render };

export const TEST_LINE_THEME: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];

export const createTestLineGraph = (connections: [string, string, Theme?][], virtual: string[] = []) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    const id = (name: string) => `${virtual.includes(name) ? 'misc_node' : 'stn'}_${name}`;
    [...new Set(connections.flatMap(([a, b]) => [a, b]))].forEach((name, index) => {
        graph.addNode(
            id(name),
            virtual.includes(name)
                ? {
                      x: index * 100,
                      y: 0,
                      zIndex: 0,
                      visible: true,
                      type: MiscNodeType.Virtual,
                      virtual: {},
                  }
                : {
                      x: index * 100,
                      y: 0,
                      zIndex: 0,
                      visible: true,
                      type: StationType.ShmetroBasic,
                      'shmetro-basic': { names: [name, `${name} en`], nameOffsetX: 'right', nameOffsetY: 'top' },
                  }
        );
    });
    connections.forEach(([a, b, color], index) =>
        graph.addDirectedEdgeWithKey(`line_${index}`, id(a), id(b), {
            type: LinePathType.Simple,
            simple: { offset: 0 },
            style: LineStyleType.SingleColor,
            'single-color': { color: color ?? TEST_LINE_THEME },
            visible: true,
            zIndex: 0,
            reconcileId: '',
            parallelIndex: -1,
        })
    );
    graph.replaceAttributes(reconcileLineDefinitions(graph.export()).attributes);
    return graph;
};
