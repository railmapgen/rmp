import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { MiscNodeType } from '../../../constants/nodes';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import InfoMultipleSection from './info-multiple-selection';

const realState = store.getState();

const createGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('misc_node_visible', {
        x: 10,
        y: 20,
        type: MiscNodeType.Virtual,
        visible: true,
        zIndex: 0,
        [MiscNodeType.Virtual]: {},
    });
    graph.addNode('misc_node_hidden', {
        x: 30,
        y: 40,
        type: MiscNodeType.Virtual,
        visible: false,
        zIndex: 0,
        [MiscNodeType.Virtual]: {},
    });
    return graph;
};

describe('InfoMultipleSection visibility', () => {
    beforeEach(() => {
        window.graph = createGraph();
    });

    it('shows mixed visibility as indeterminate and toggles node-only selections without refreshing edges', async () => {
        const mockStore = createStore({
            param: {
                ...realState.param,
                present: { ...realState.param.present, graph: window.graph.export() },
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['misc_node_visible', 'misc_node_hidden']),
                isDetailsOpen: 'show',
                refresh: { nodes: 1, edges: 2, images: 3 },
            },
        });

        render(<InfoMultipleSection />, { store: mockStore });

        const visibleCheckbox = screen.getByRole('checkbox', { name: 'Visible in export' });
        expect(visibleCheckbox).toBePartiallyChecked();

        fireEvent.click(visibleCheckbox);

        await waitFor(() => {
            expect(window.graph.getNodeAttribute('misc_node_visible', 'visible')).toBe(true);
            expect(window.graph.getNodeAttribute('misc_node_hidden', 'visible')).toBe(true);
            expect(visibleCheckbox).toBeChecked();
            expect(visibleCheckbox).not.toBePartiallyChecked();
        });
        expect(mockStore.getState().runtime.refresh.nodes).not.toBe(1);
        expect(mockStore.getState().runtime.refresh.edges).toBe(2);

        fireEvent.click(visibleCheckbox);

        await waitFor(() => {
            expect(window.graph.getNodeAttribute('misc_node_visible', 'visible')).toBe(false);
            expect(window.graph.getNodeAttribute('misc_node_hidden', 'visible')).toBe(false);
            expect(visibleCheckbox).not.toBeChecked();
            expect(visibleCheckbox).not.toBePartiallyChecked();
        });

        fireEvent.click(visibleCheckbox);

        await waitFor(() => {
            expect(window.graph.getNodeAttribute('misc_node_visible', 'visible')).toBe(true);
            expect(window.graph.getNodeAttribute('misc_node_hidden', 'visible')).toBe(false);
            expect(visibleCheckbox).toBePartiallyChecked();
        });

        fireEvent.click(visibleCheckbox);

        await waitFor(() => {
            expect(window.graph.getNodeAttribute('misc_node_visible', 'visible')).toBe(true);
            expect(window.graph.getNodeAttribute('misc_node_hidden', 'visible')).toBe(true);
            expect(visibleCheckbox).toBeChecked();
            expect(visibleCheckbox).not.toBePartiallyChecked();
        });
    });
});
