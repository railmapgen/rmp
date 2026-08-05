import { fireEvent, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { StationType } from '../../../constants/stations';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import NodePositionSection from './node-position-section';

const realState = store.getState();

const createGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_test', {
        x: 10,
        y: 20,
        type: StationType.ShmetroBasic,
        visible: true,
        zIndex: 0,
    });
    return graph;
};

const getSavedCoordinate = (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, axis: 'x' | 'y') =>
    graph.nodes.find(node => node.key === 'stn_test')?.attributes?.[axis];

describe('NodePositionSection', () => {
    beforeEach(() => {
        window.graph = createGraph();
    });

    it('keeps the last valid coordinate when users blur an invalid value', async () => {
        const mockStore = createStore({
            param: {
                ...realState.param,
                present: window.graph.export(),
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['stn_test']),
                isDetailsOpen: 'show',
            },
        });

        render(<NodePositionSection />, { store: mockStore });

        const [xInput] = screen.getAllByRole('textbox');
        expect(await screen.findByDisplayValue('10')).toBeInTheDocument();

        fireEvent.change(xInput, { target: { value: '-' } });
        expect(xInput).toHaveValue('-');

        fireEvent.blur(xInput);

        expect(xInput).toHaveValue('10');
        expect(window.graph.getNodeAttribute('stn_test', 'x')).toBe(10);
        expect(getSavedCoordinate(mockStore.getState().param.present, 'x')).toBe(10);
        expect(JSON.stringify(mockStore.getState().param.present)).not.toContain('"x":null');
    });

    it('commits valid coordinates on blur', async () => {
        const mockStore = createStore({
            param: {
                ...realState.param,
                present: window.graph.export(),
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['stn_test']),
                isDetailsOpen: 'show',
            },
        });

        render(<NodePositionSection />, { store: mockStore });

        const [xInput] = screen.getAllByRole('textbox');
        expect(await screen.findByDisplayValue('10')).toBeInTheDocument();

        fireEvent.change(xInput, { target: { value: '25.5' } });
        fireEvent.blur(xInput);

        expect(xInput).toHaveValue('25.5');
        expect(window.graph.getNodeAttribute('stn_test', 'x')).toBe(25.5);
        expect(getSavedCoordinate(mockStore.getState().param.present, 'x')).toBe(25.5);
    });
});
