import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, Id, NodeAttributes, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createStore } from '../redux';
import { NodeOverlayLayer } from './node-overlay-layer';
import { SameStyleLineEndpointOverlay } from './svgs/common/same-style-line-endpoint-overlay';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const RED: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const virtualNode = miscNodes[MiscNodeType.Virtual];
const defaultVirtualOverlay = virtualNode.overlayComponent;

const createGraph = () => {
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

const renderLayer = (selected: Set<Id>) => {
    const initialState = createStore().getState();
    const store = createStore({
        runtime: { ...initialState.runtime, selected },
    });
    return render(
        <Provider store={store}>
            <svg id="canvas">
                <NodeOverlayLayer />
            </svg>
        </Provider>
    );
};

describe('NodeOverlayLayer', () => {
    afterEach(() => {
        virtualNode.overlayComponent = defaultVirtualOverlay;
    });

    it('mounts the generic endpoint overlay registered by ShmetroIntStation', () => {
        window.graph = createGraph();

        const { getAllByTestId } = renderLayer(new Set<Id>(['stn_int']));

        expect(stations[StationType.ShmetroInt].overlayComponent).toBe(SameStyleLineEndpointOverlay);
        expect(getAllByTestId('node-line-endpoint-control')).toHaveLength(1);
    });

    it('does not provide the generic overlay as a fallback for other stations', () => {
        window.graph = createGraph();
        window.graph.setNodeAttribute('stn_int', 'type', StationType.ShmetroBasic);

        const { queryByTestId } = renderLayer(new Set<Id>(['stn_int']));

        expect(stations[StationType.ShmetroBasic].overlayComponent).not.toBe(SameStyleLineEndpointOverlay);
        expect(queryByTestId('node-line-endpoint-control')).toBeNull();
    });

    it('mounts an overlay registered by a miscellaneous node', () => {
        window.graph = createGraph();
        virtualNode.overlayComponent = SameStyleLineEndpointOverlay;

        const { getAllByTestId } = renderLayer(new Set<Id>(['misc_node_other']));

        expect(getAllByTestId('node-line-endpoint-control')).toHaveLength(1);
    });

    it('renders no node overlay for multiple selections', () => {
        window.graph = createGraph();

        const { queryByTestId } = renderLayer(new Set<Id>(['stn_int', 'line_red']));

        expect(queryByTestId('node-line-endpoint-control')).toBeNull();
    });
});
