import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import store, { createStore } from '../../../redux';
import { setActiveSubscriptions } from '../../../redux/account/account-slice';
import { render } from '../../../test-utils';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import InfoSection from './info-section';

vi.mock('./line-type-section', () => ({ default: () => null }));
vi.mock('./reconcile-section', () => ({ default: () => null }));

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

const createLineGraph = (type: LinePathType, visible: boolean) => {
    const graph = createGraph();
    graph.addNode('misc_node_target', {
        x: 30,
        y: 40,
        type: MiscNodeType.Virtual,
        visible: true,
        zIndex: 0,
        [MiscNodeType.Virtual]: {},
    });
    graph.addDirectedEdgeWithKey('line_policy_visibility', 'misc_node_visible', 'misc_node_target', {
        type,
        style: LineStyleType.SingleColor,
        visible,
        zIndex: 0,
        reconcileId: '',
        parallelIndex: -1,
        [type]: structuredClone(linePaths[type].defaultAttrs),
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
    });
    return graph;
};

const renderSelectedLine = (type: LinePathType, visible: boolean) => {
    window.graph = createLineGraph(type, visible);
    const mockStore = createStore({
        param: {
            ...realState.param,
            present: { ...realState.param.present, graph: window.graph.export(), mapEnabled: false },
        },
        runtime: {
            ...realState.runtime,
            selected: new Set(['line_policy_visibility']),
            isDetailsOpen: 'show',
        },
    });
    mockStore.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false }));
    render(<InfoSection />, { store: mockStore });
    return mockStore;
};

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

    it('shows a policy-hidden line as export-hidden and locked with a Pro badge', () => {
        renderSelectedLine(LinePathType.Bezier, true);

        const visibilityField = screen.getByRole('group', { name: 'Visible in export' });
        const visibleSwitch = within(visibilityField).getByRole('checkbox');
        const label = visibilityField.querySelector('label');

        expect(visibleSwitch).not.toBeChecked();
        expect(visibleSwitch).toBeDisabled();
        expect(label).not.toBeNull();
        expect(within(label!).getByText('Visible in export')).toBeInTheDocument();
        expect(within(label!).getByText('PRO')).toBeInTheDocument();

        fireEvent.click(visibleSwitch);
        expect(window.graph.getEdgeAttribute('line_policy_visibility', 'visible')).toBe(true);
    });

    it('keeps a user-hidden permitted line editable without a Pro badge', () => {
        renderSelectedLine(LinePathType.Diagonal, false);

        const visibilityField = screen.getByRole('group', { name: 'Visible in export' });
        const visibleSwitch = within(visibilityField).getByRole('checkbox');

        expect(visibleSwitch).not.toBeChecked();
        expect(visibleSwitch).toBeEnabled();
        expect(within(visibilityField).queryByText('PRO')).not.toBeInTheDocument();

        fireEvent.click(visibleSwitch);
        expect(window.graph.getEdgeAttribute('line_policy_visibility', 'visible')).toBe(true);
    });
});
