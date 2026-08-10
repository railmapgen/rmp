import { fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { beforeEach, describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createStore } from '../redux';
import { render } from '../test-utils';
import PredictNextNode from './predict-next-node';
import { linePaths, lineStyles } from './svgs/lines/lines';
import stations from './svgs/stations/stations';

const SELECTED_NODE: NodeId = 'misc_node_selected';
const STATION_SELECTED_NODE: NodeId = 'stn_selected';
const EXISTING_LINE = 'line_existing';

const createPredictionGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('misc_node_previous', {
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
    graph.addNode(SELECTED_NODE, {
        visible: true,
        zIndex: 0,
        x: 100,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
    graph.addDirectedEdgeWithKey(EXISTING_LINE, 'misc_node_previous', SELECTED_NODE, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Diagonal,
        [LinePathType.Diagonal]: structuredClone(linePaths[LinePathType.Diagonal].defaultAttrs),
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
        reconcileId: '',
        parallelIndex: 0,
    });
    return graph;
};

const createStationPredictionGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('misc_node_previous', {
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: MiscNodeType.Virtual,
        [MiscNodeType.Virtual]: {},
    });
    graph.addNode(STATION_SELECTED_NODE, {
        visible: true,
        zIndex: 0,
        x: 100,
        y: 0,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: structuredClone(stations[StationType.ShmetroBasic].defaultAttrs),
    });
    graph.addDirectedEdgeWithKey(EXISTING_LINE, 'misc_node_previous', STATION_SELECTED_NODE, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            ...structuredClone(linePaths[LinePathType.Bezier].defaultAttrs),
            targetOffset: { x: 12, y: 13 },
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: structuredClone(lineStyles[LineStyleType.SingleColor].defaultAttrs),
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

const renderPrediction = (mapEnabled: boolean, selectedNode: NodeId = SELECTED_NODE) => {
    const initialState = createStore().getState();
    const store = createStore({
        app: {
            ...initialState.app,
            telemetry: { ...initialState.app.telemetry, project: false },
        },
        param: {
            ...initialState.param,
            present: { ...initialState.param.present, mapEnabled },
        },
        runtime: {
            ...initialState.runtime,
            selected: new Set([selectedNode]),
        },
    });
    return render(
        <svg>
            <PredictNextNode />
        </svg>,
        { store }
    );
};

const createPredictedVirtualNode = (mapEnabled: boolean, selectedNode: NodeId = SELECTED_NODE) => {
    const rendered = renderPrediction(mapEnabled, selectedNode);
    // Capture before creation changes the selection and React reuses the preview DOM for the next prediction.
    const previewPathDs = Array.from(rendered.container.querySelectorAll('#prediction > path')).map(path =>
        path.getAttribute('d')
    );
    fireEvent.pointerDown(rendered.container.querySelector('#virtual_circle_misc_node_virtual_prediction_1')!, {
        clientX: 190,
        clientY: -10,
    });

    const newLine = window.graph.edges().find(id => id !== EXISTING_LINE)!;
    return {
        ...rendered,
        previewPathDs,
        attrs: window.graph.getEdgeAttributes(newLine),
    };
};

describe('PredictNextNode', () => {
    beforeEach(() => {
        window.graph = createPredictionGraph();
    });

    it('uses a Bezier preview and line while the map is shown without enabling unsupported parallel state', () => {
        const { previewPathDs, attrs } = createPredictedVirtualNode(true);
        const expectedPreview = linePaths[LinePathType.Bezier].generatePath(100, 190, 0, -10).d;

        expect(previewPathDs).toHaveLength(2);
        expect(previewPathDs[0]).toBe(expectedPreview);
        expect(attrs.type).toBe(LinePathType.Bezier);
        expect(attrs[LinePathType.Bezier]).toEqual(linePaths[LinePathType.Bezier].defaultAttrs);
        expect(attrs[LinePathType.Diagonal]).toBeUndefined();
        expect(attrs.parallelIndex).toBe(-1);
    });

    it('preserves the existing Diagonal prediction and auto-parallel behavior while the map is hidden', () => {
        const { previewPathDs, attrs } = createPredictedVirtualNode(false);
        const expectedAttrs = {
            ...linePaths[LinePathType.Diagonal].defaultAttrs,
            startFrom: 'to' as const,
        };
        const expectedPreview = linePaths[LinePathType.Diagonal].generatePath(100, 190, 0, -10, expectedAttrs).d;

        expect(previewPathDs).toHaveLength(2);
        expect(previewPathDs[0]).toBe(expectedPreview);
        expect(attrs.type).toBe(LinePathType.Diagonal);
        expect(attrs[LinePathType.Diagonal]).toEqual(expectedAttrs);
        expect(attrs[LinePathType.Bezier]).toBeUndefined();
        expect(attrs.parallelIndex).toBe(0);
    });

    it('continues a same-style station endpoint offset when predicting a Bezier', () => {
        window.graph = createStationPredictionGraph();

        const { attrs, previewPathDs } = createPredictedVirtualNode(true, STATION_SELECTED_NODE);
        const expectedPreview = linePaths[LinePathType.Bezier].generatePath(100, 190, 0, -10, {
            ...linePaths[LinePathType.Bezier].defaultAttrs,
            sourceOffset: { x: 12, y: 13 },
        }).d;

        expect(previewPathDs[0]).toBe(expectedPreview);
        expect(attrs[LinePathType.Bezier]).toMatchObject({
            sourceOffset: { x: 12, y: 13 },
            targetOffset: { x: 0, y: 0 },
        });
    });
});
