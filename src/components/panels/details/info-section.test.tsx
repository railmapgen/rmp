import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { MiscNodeType } from '../../../constants/nodes';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import InfoSection from './info-section';

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
    return graph;
};

const getSavedVisible = (graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, id: string) =>
    graph.nodes.find(node => node.key === id)?.attributes?.visible;

describe('InfoSection visibility', () => {
    beforeEach(() => {
        window.graph = createGraph();
    });

    it('toggles the selected node visibility and only refreshes nodes', async () => {
        const mockStore = createStore({
            param: {
                ...realState.param,
                present: { ...realState.param.present, graph: window.graph.export() },
            },
            runtime: {
                ...realState.runtime,
                selected: new Set(['misc_node_visible']),
                isDetailsOpen: 'show',
                refresh: { nodes: 1, edges: 2, images: 3 },
            },
        });

        render(<InfoSection />, { store: mockStore });

        expect(screen.getByText('Visible in export')).toBeInTheDocument();
        const visibleSwitch = screen.getByRole('checkbox');
        expect(visibleSwitch).toBeChecked();

        fireEvent.click(visibleSwitch);

        await waitFor(() => {
            expect(window.graph.getNodeAttribute('misc_node_visible', 'visible')).toBe(false);
        });
        expect(getSavedVisible(mockStore.getState().param.present.graph, 'misc_node_visible')).toBe(false);
        expect(mockStore.getState().runtime.refresh.nodes).not.toBe(1);
        expect(mockStore.getState().runtime.refresh.edges).toBe(2);
    });
});
