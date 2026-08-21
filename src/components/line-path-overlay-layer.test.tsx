import { MultiDirectedGraph } from 'graphology';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Id } from '../constants/constants';
import { LinePathOverlayProps, LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makePoint } from '../constants/path';
import { createStore } from '../redux';
import { LinePathOverlayLayer } from './line-path-overlay-layer';
import { linePaths, lineStyles } from './svgs/lines/lines';

const defaultFreeformOverlay = linePaths[LinePathType.Freeform].overlayComponent;

const addLine = (id: string, type: LinePathType) => {
    window.graph.addDirectedEdgeWithKey(id, 'misc_node_a', 'misc_node_b', {
        visible: true,
        zIndex: 0,
        type,
        [type]: structuredClone(linePaths[type].defaultAttrs),
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
        reconcileId: '',
        parallelIndex: -1,
    });
};

const renderOverlay = (
    selected: Set<Id>,
    viewport: { zoom: number; min: { x: number; y: number } } = { zoom: 100, min: makePoint(0, 0) }
) => {
    const initialState = createStore().getState();
    const store = createStore({
        runtime: { ...initialState.runtime, selected },
        param: {
            ...initialState.param,
            svgViewBoxZoom: viewport.zoom,
            svgViewBoxMin: viewport.min,
        },
    });
    return render(
        <Provider store={store}>
            <svg id="canvas">
                <LinePathOverlayLayer />
            </svg>
        </Provider>
    );
};

describe('LinePathOverlayLayer', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        window.graph.addNode('misc_node_a', {
            x: 0,
            y: 0,
            visible: true,
            zIndex: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
        });
        window.graph.addNode('misc_node_b', {
            x: 100,
            y: 0,
            visible: true,
            zIndex: 0,
            type: MiscNodeType.Virtual,
            [MiscNodeType.Virtual]: {},
        });
    });

    afterEach(() => {
        linePaths[LinePathType.Freeform].overlayComponent = defaultFreeformOverlay;
    });

    it('renders the overlay registered by the selected line path', async () => {
        addLine('line_freeform', LinePathType.Freeform);

        const { container } = renderOverlay(new Set<Id>(['line_freeform']));
        await waitFor(() => expect(container.querySelectorAll('circle')).toHaveLength(2));
    });

    it('passes viewport state from Redux to the selected path overlay', () => {
        addLine('line_freeform', LinePathType.Freeform);
        linePaths[LinePathType.Freeform].overlayComponent = (props: LinePathOverlayProps) => (
            <g
                data-testid="path-overlay"
                data-edge-id={props.id}
                data-zoom={props.svgViewBoxZoom}
                data-min={`${props.svgViewBoxMin.x},${props.svgViewBoxMin.y}`}
            />
        );

        const { getByTestId } = renderOverlay(new Set<Id>(['line_freeform']), { zoom: 125, min: makePoint(10, 20) });
        const overlay = getByTestId('path-overlay');

        expect(overlay.dataset).toMatchObject({ edgeId: 'line_freeform', zoom: '125', min: '10,20' });
    });

    it('renders nothing when the selected path has no registered overlay', () => {
        addLine('line_simple', LinePathType.Simple);

        const { container } = renderOverlay(new Set<Id>(['line_simple']));
        expect(container.querySelector('#canvas')?.children).toHaveLength(0);
    });

    it('renders nothing for multiple selections', () => {
        addLine('line_freeform', LinePathType.Freeform);

        const { container } = renderOverlay(new Set<Id>(['line_freeform', 'misc_node_a']));
        expect(container.querySelector('#canvas')?.children).toHaveLength(0);
    });
});
