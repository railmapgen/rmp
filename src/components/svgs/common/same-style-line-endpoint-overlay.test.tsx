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
import { moveNodesAndRedrawLines } from '../../../util/imperative-dom';
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
    targetOffset = makePoint(0, 0),
    visible = true
) => {
    graph.addDirectedEdgeWithKey(id, source, target, {
        visible,
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

const createGraph = (otherStyleOffset = makePoint(0, 0)) => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    addNode(graph, 'stn_center', 10, 20);
    addNode(graph, 'misc_node_left', -100, 20);
    addNode(graph, 'misc_node_right', 100, 20);
    addNode(graph, 'misc_node_bottom', 10, 120);
    addNode(graph, 'misc_node_hidden', 10, 160);
    addNode(graph, 'misc_node_simple', 10, -100);
    addNode(graph, 'misc_node_other_style', 120, 120);

    addBezier(graph, 'line_red_out', 'stn_center', 'misc_node_right', RED, makePoint(1, 2));
    addBezier(graph, 'line_red_in', 'misc_node_left', 'stn_center', RED, makePoint(9, 9), makePoint(3, 4));
    addBezier(graph, 'line_red_hidden', 'stn_center', 'misc_node_hidden', RED, makePoint(7, 8), makePoint(0, 0), false);
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
            sourceOffset: otherStyleOffset,
            targetOffset: { x: 0, y: 0 },
        },
        style: LineStyleType.BjsubwaySingleColor,
        [LineStyleType.BjsubwaySingleColor]: { color: RED },
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

const renderOverlay = (graph = createGraph()) => {
    window.graph = graph;
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

        const controls = getAllByTestId('node-line-endpoint-control');
        expect(controls).toHaveLength(3);
        expect(
            controls.map(control => control.dataset.edgeIds?.split(',').sort()).sort((a, b) => a!.length - b!.length)
        ).toEqual([['line_blue'], ['line_red_other_style'], ['line_red_hidden', 'line_red_in', 'line_red_out']]);
    });

    it('uses each line group color for its endpoint control', () => {
        const { getAllByTestId } = renderOverlay();
        const controls = getAllByTestId('node-line-endpoint-control');
        const redControl = controls.find(control => control.dataset.edgeIds?.includes('line_red_out'))!;
        const blueControl = controls.find(control => control.dataset.edgeIds === 'line_blue')!;

        expect(redControl).toHaveAttribute('stroke', RED[2]);
        expect(blueControl).toHaveAttribute('stroke', BLUE[2]);
    });

    it('leaves the control center available to the selected node drag target', () => {
        const { getAllByTestId } = renderOverlay();

        for (const control of getAllByTestId('node-line-endpoint-control')) {
            expect(control).toHaveAttribute('fill', 'none');
            expect(control).toHaveAttribute('pointer-events', 'stroke');
        }
    });

    it('renders co-located group controls as separately clickable concentric rings', () => {
        const { getAllByTestId } = renderOverlay();
        const coLocatedControls = getAllByTestId('node-line-endpoint-control').filter(
            control => control.parentElement?.getAttribute('transform') === 'translate(10, 20) rotate(45)'
        );

        expect(coLocatedControls.map(control => control.getAttribute('r')).sort()).toEqual(['5', '8']);
    });

    it('treats controls 0.5 SVG units apart as overlapping at 100% zoom', () => {
        const { getAllByTestId } = renderOverlay(createGraph(makePoint(0.5, 0)));
        const controls = getAllByTestId('node-line-endpoint-control');
        const nearbyControls = controls.filter(control =>
            ['line_blue', 'line_red_other_style'].includes(control.dataset.edgeIds ?? '')
        );

        expect(nearbyControls.map(control => control.getAttribute('r')).sort()).toEqual(['5', '8']);
    });

    it('keeps controls separate when their centers are more than one radius apart', () => {
        const { getAllByTestId } = renderOverlay(createGraph(makePoint(5.01, 0)));
        const controls = getAllByTestId('node-line-endpoint-control');
        const separateControls = controls.filter(control =>
            ['line_blue', 'line_red_other_style'].includes(control.dataset.edgeIds ?? '')
        );

        expect(separateControls.map(control => control.getAttribute('r')).sort()).toEqual(['5', '5']);
    });

    it('keeps the clicked group lines above the selected node after the pointer is released', () => {
        const { getAllByTestId, getByTestId, store } = renderOverlay();
        const redControl = getAllByTestId('node-line-endpoint-control').find(control =>
            control.dataset.edgeIds?.includes('line_red_out')
        )!;
        redControl.setPointerCapture = vi.fn();
        redControl.releasePointerCapture = vi.fn();
        const undoCount = store.getState().param.past.length;

        fireEvent.pointerDown(redControl, { button: 0, pointerId: 1 });

        const highlight = getByTestId('node-line-endpoint-highlight');
        expect(highlight.dataset.edgeIds?.split(',').sort()).toEqual(['line_red_in', 'line_red_out']);
        expect(highlight).toHaveAttribute('clip-path', 'url(#node-line-endpoint-highlight-clip-stn_center)');
        const highlightClip = getByTestId('node-line-endpoint-highlight-clip');
        expect(highlightClip).toHaveAttribute('r', '10');
        expect(highlightClip).toHaveAttribute('transform', 'translate(10, 20)');
        expect(
            getAllByTestId('node-line-endpoint-highlight-segment')
                .map(segment => segment.getAttribute('href'))
                .sort()
        ).toEqual(['#line_red_in', '#line_red_out']);

        fireEvent.pointerUp(redControl, { pointerId: 1 });
        expect(getByTestId('node-line-endpoint-highlight')).toBeInTheDocument();
        expect(store.getState().param.past).toHaveLength(undoCount);

        window.graph.mergeNodeAttributes('stn_center', { x: 15, y: 17 });
        moveNodesAndRedrawLines(window.graph, ['stn_center'], 5, -3);
        expect(highlightClip).toHaveAttribute('transform', 'translate(15,17)');
    });

    it('moves endpoint controls with the selected node during an imperative drag repaint', () => {
        const { getAllByTestId } = renderOverlay();
        const redControl = getAllByTestId('node-line-endpoint-control').find(control =>
            control.dataset.edgeIds?.includes('line_red_out')
        )!;
        const redControlGroup = redControl.parentElement!;

        expect(redControlGroup.getAttribute('transform')).toBe('translate(13, 24) rotate(45)');

        window.graph.mergeNodeAttributes('stn_center', { x: 15, y: 17 });
        moveNodesAndRedrawLines(window.graph, ['stn_center'], 5, -3);

        expect(redControlGroup.getAttribute('transform')).toBe('translate(18,21) rotate(45)');
    });

    it('sets every endpoint in the dragged group to the same absolute control position', () => {
        const { getAllByTestId, store } = renderOverlay();
        const redControl = getAllByTestId('node-line-endpoint-control').find(control =>
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
        expect(window.graph.getEdgeAttribute('line_red_hidden', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 40, y: 50 },
            targetOffset: { x: 0, y: 0 },
        });
        expect(window.graph.getEdgeAttribute('line_blue', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 0, y: 0 },
        });
        expect(store.getState().param.past).toHaveLength(undoCount);

        fireEvent.pointerUp(redControl, { pointerId: 1 });
        expect(store.getState().param.past).toHaveLength(undoCount + 1);
    });
});
