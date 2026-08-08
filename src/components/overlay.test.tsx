import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    OverlayProps,
    Theme,
} from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makePoint } from '../constants/path';
import { StationType } from '../constants/stations';
import { createStore } from '../redux';
import { render } from '../test-utils';
import { Overlay } from './overlay';
import { SameStyleLineEndpointOverlay } from './svgs/common/same-style-line-endpoint-overlay';
import { linePaths, lineStyles } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const RED: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const defaultFreeformOverlay = linePaths[LinePathType.Freeform].overlayComponent;
const virtualNode = miscNodes[MiscNodeType.Virtual];
const defaultVirtualOverlay = virtualNode.overlayComponent;

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

const createNodeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_int', {
        visible: true,
        zIndex: 0,
        x: 10,
        y: 20,
        type: StationType.ShmetroInt,
        [StationType.ShmetroInt]: structuredClone(stations[StationType.ShmetroInt].defaultAttrs),
    });
    graph.addNode('misc_node_other', {
        visible: true,
        zIndex: 0,
        x: 100,
        y: 20,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
    graph.addDirectedEdgeWithKey('line_red', 'stn_int', 'misc_node_other', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            along: 0.5,
            normal: -0.35,
            sourceOffset: { x: 0, y: 0 },
            targetOffset: { x: 0, y: 0 },
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color: RED },
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
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
            present: {
                ...initialState.param.present,
                svgViewBoxZoom: viewport.zoom,
                svgViewBoxMin: viewport.min,
            },
        },
    });
    return render(
        <svg id="canvas">
            <Overlay />
        </svg>,
        { store }
    );
};

describe('Overlay', () => {
    describe('line path overlays', () => {
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

        it('passes viewport state to the selected path overlay', () => {
            addLine('line_freeform', LinePathType.Freeform);
            linePaths[LinePathType.Freeform].overlayComponent = (props: OverlayProps<LineId>) => (
                <g
                    data-testid="path-overlay"
                    data-edge-id={props.id}
                    data-zoom={props.svgViewBoxZoom}
                    data-min={`${props.svgViewBoxMin.x},${props.svgViewBoxMin.y}`}
                />
            );

            const { getByTestId } = renderOverlay(new Set<Id>(['line_freeform']), {
                zoom: 125,
                min: makePoint(10, 20),
            });
            const overlay = getByTestId('path-overlay');

            expect(overlay.dataset).toMatchObject({ edgeId: 'line_freeform', zoom: '125', min: '10,20' });
            expect(overlay.closest('.removeMe')).not.toBeNull();
        });

        it('renders nothing when the selected path has no registered overlay', () => {
            addLine('line_simple', LinePathType.Simple);

            const { container } = renderOverlay(new Set<Id>(['line_simple']));
            expect(container.querySelector('#canvas')?.children).toHaveLength(0);
        });

        it('renders nothing for multiple selections', () => {
            const { container } = renderOverlay(new Set<Id>(['line_freeform', 'misc_node_a']));
            expect(container.querySelector('#canvas')?.children).toHaveLength(0);
        });
    });

    describe('node overlays', () => {
        afterEach(() => {
            virtualNode.overlayComponent = defaultVirtualOverlay;
        });

        it('mounts the generic endpoint overlay registered by ShmetroIntStation', () => {
            window.graph = createNodeGraph();

            const { getAllByTestId } = renderOverlay(new Set<Id>(['stn_int']));

            const controls = getAllByTestId('node-line-endpoint-control');
            expect(controls).toHaveLength(1);
            expect(controls[0].closest('.removeMe')).not.toBeNull();
        });

        it('does not provide the generic overlay as a fallback for other stations', () => {
            window.graph = createNodeGraph();
            window.graph.setNodeAttribute('stn_int', 'type', StationType.ShmetroBasic);

            const { queryByTestId } = renderOverlay(new Set<Id>(['stn_int']));

            expect(queryByTestId('node-line-endpoint-control')).toBeNull();
        });

        it('mounts an overlay registered by a miscellaneous node', () => {
            window.graph = createNodeGraph();
            virtualNode.overlayComponent = SameStyleLineEndpointOverlay;

            const { getAllByTestId } = renderOverlay(new Set<Id>(['misc_node_other']));

            expect(getAllByTestId('node-line-endpoint-control')).toHaveLength(1);
        });
    });
});
