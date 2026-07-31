import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { fireEvent } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    NodeAttributes,
    NodeId,
    Theme,
} from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { MiscNodeType } from '../../../constants/nodes';
import { makePoint } from '../../../constants/path';
import { StationType } from '../../../constants/stations';
import { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import { SameStyleLineEndpointOverlay } from './same-style-line-endpoint-overlay';

const RED: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const BLUE: Theme = [CityCode.Shanghai, 'sh4', '#5F259F', MonoColour.white];

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const addNode = (graph: TestGraph, id: NodeId, x: number, y: number) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x,
        y,
        type: id.startsWith('stn_') ? StationType.ShmetroInt : MiscNodeType.Virtual,
    });
};

const addBezier = (
    graph: TestGraph,
    id: LineId,
    source: NodeId,
    target: NodeId,
    color: Theme,
    sourceOffset = makePoint(0, 0),
    targetOffset = makePoint(0, 0)
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible: true,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            along: 0.5,
            normal: -0.35,
            sourceOffset,
            targetOffset,
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color },
        reconcileId: '',
        parallelIndex: -1,
    });
};

const createGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    addNode(graph, 'stn_center', 10, 20);
    addNode(graph, 'misc_node_left', -100, 20);
    addNode(graph, 'misc_node_right', 100, 20);
    addNode(graph, 'misc_node_bottom', 10, 120);
    addNode(graph, 'misc_node_simple', 10, -100);
    addNode(graph, 'misc_node_other_style', 120, 120);

    addBezier(graph, 'line_red_out', 'stn_center', 'misc_node_right', RED, makePoint(1, 2));
    addBezier(graph, 'line_red_in', 'misc_node_left', 'stn_center', RED, makePoint(9, 9), makePoint(3, 4));
    addBezier(graph, 'line_blue', 'stn_center', 'misc_node_bottom', BLUE);
    graph.addDirectedEdgeWithKey('line_simple', 'stn_center', 'misc_node_simple', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        [LinePathType.Simple]: { offset: 0 },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color: RED },
        reconcileId: '',
        parallelIndex: -1,
    });
    graph.addDirectedEdgeWithKey('line_red_other_style', 'stn_center', 'misc_node_other_style', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            along: 0.5,
            normal: -0.35,
            sourceOffset: { x: 0, y: 0 },
            targetOffset: { x: 0, y: 0 },
        },
        style: LineStyleType.BjsubwaySingleColor,
        [LineStyleType.BjsubwaySingleColor]: { color: RED },
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

const renderOverlay = () => {
    window.graph = createGraph();
    const store = createStore();
    const rendered = render(
        <svg id="canvas">
            <SameStyleLineEndpointOverlay id="stn_center" svgViewBoxZoom={100} svgViewBoxMin={makePoint(0, 0)} />
        </svg>,
        { store }
    );
    vi.spyOn(rendered.container.querySelector('#canvas')!, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 500,
        bottom: 500,
        width: 500,
        height: 500,
        toJSON: () => ({}),
    });
    return { ...rendered, store };
};

describe('SameStyleLineEndpointOverlay', () => {
    it('renders one control per Bezier LineStyleType + isSameStyle group', () => {
        const { getAllByTestId } = renderOverlay();

        const controls = getAllByTestId('station-line-endpoint-control');
        expect(controls).toHaveLength(3);
        expect(
            controls.map(control => control.dataset.edgeIds?.split(',').sort()).sort((a, b) => a!.length - b!.length)
        ).toEqual([['line_blue'], ['line_red_other_style'], ['line_red_in', 'line_red_out']]);
    });

    it('sets every endpoint in the dragged group to the same absolute control position', () => {
        const { getAllByTestId, store } = renderOverlay();
        const redControl = getAllByTestId('station-line-endpoint-control').find(control =>
            control.dataset.edgeIds?.includes('line_red_out')
        )!;
        redControl.setPointerCapture = vi.fn();
        redControl.releasePointerCapture = vi.fn();
        const undoCount = store.getState().param.past.length;

        fireEvent.pointerDown(redControl, { button: 0, pointerId: 1 });
        fireEvent.pointerMove(redControl, { clientX: 50, clientY: 70, pointerId: 1 });

        expect(window.graph.getEdgeAttribute('line_red_out', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 40, y: 50 },
            targetOffset: { x: 0, y: 0 },
        });
        expect(window.graph.getEdgeAttribute('line_red_in', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 9, y: 9 },
            targetOffset: { x: 40, y: 50 },
        });
        expect(window.graph.getEdgeAttribute('line_blue', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 0, y: 0 },
        });
        expect(store.getState().param.past).toHaveLength(undoCount);

        fireEvent.pointerUp(redControl, { pointerId: 1 });
        expect(store.getState().param.past).toHaveLength(undoCount + 1);
    });
});
