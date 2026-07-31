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
} from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { makePoint } from '../../../../constants/path';
import { StationType } from '../../../../constants/stations';
import store, { createStore } from '../../../../redux';
import { render } from '../../../../test-utils';
import { LineSpecificAttributes } from '../../../panels/details/specific-attrs';
import { linePaths } from '../lines';
import { BezierPathAttributes } from './bezier-model';

const AttrsComponent = linePaths[LinePathType.Bezier].attrsComponent;
const realState = store.getState();
const RED: Theme = [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white];
const BLUE: Theme = [CityCode.Shanghai, 'sh4', '#5F259F', MonoColour.white];

type TestGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const addNode = (graph: TestGraph, id: NodeId) => {
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: id.startsWith('stn_') ? StationType.ShmetroBasic : MiscNodeType.Virtual,
    });
};

const addBezier = (
    graph: TestGraph,
    id: LineId,
    source: NodeId,
    target: NodeId,
    color: Theme,
    sourceOffset: { x: number; y: number },
    targetOffset: { x: number; y: number },
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

const createGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    [
        'stn_center',
        'stn_target',
        'misc_node_left',
        'misc_node_hidden',
        'misc_node_blue',
        'misc_node_other_style',
        'misc_node_target',
    ].forEach(id => addNode(graph, id as NodeId));

    addBezier(graph, 'line_selected', 'stn_center', 'stn_target', RED, makePoint(1.25, 2.5), makePoint(3.75, 4.5));
    addBezier(graph, 'line_incoming', 'misc_node_left', 'stn_center', RED, makePoint(9, 10), makePoint(5, 6));
    addBezier(graph, 'line_hidden', 'stn_center', 'misc_node_hidden', RED, makePoint(7, 8), makePoint(11, 12), false);
    addBezier(graph, 'line_blue', 'stn_center', 'misc_node_blue', BLUE, makePoint(13, 14), makePoint(15, 16));
    addBezier(graph, 'line_target_peer', 'stn_target', 'misc_node_target', RED, makePoint(17, 18), makePoint(19, 20));
    graph.addDirectedEdgeWithKey('line_other_style', 'stn_center', 'misc_node_other_style', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            along: 0.5,
            normal: -0.35,
            sourceOffset: makePoint(21, 22),
            targetOffset: makePoint(23, 24),
        },
        style: LineStyleType.BjsubwaySingleColor,
        [LineStyleType.BjsubwaySingleColor]: { color: RED },
        reconcileId: '',
        parallelIndex: -1,
    });
    return graph;
};

const renderSelectedLineAttrs = () => {
    const testStore = createStore({
        runtime: {
            ...realState.runtime,
            selected: new Set(['line_selected']),
            isDetailsOpen: 'show',
        },
    });
    return render(<LineSpecificAttributes />, { store: testStore });
};

const getInputByValue = (container: HTMLElement, value: string) =>
    Array.from(container.querySelectorAll('input')).find(input => input.value === value)!;

const commitInputValue = (container: HTMLElement, currentValue: string, nextValue: string) => {
    const input = getInputByValue(container, currentValue);
    fireEvent.change(input, { target: { value: nextValue } });
    fireEvent.blur(input);
};

describe('Bezier path attributes', () => {
    it('exposes along, normal, and both endpoint XY offsets', () => {
        const attrs: BezierPathAttributes = {
            along: 0.25,
            normal: -0.5,
            sourceOffset: { x: 1, y: 2 },
            targetOffset: { x: 3, y: 4 },
        };

        const { container } = render(
            <AttrsComponent
                id="line_bezier"
                attrs={attrs}
                handleAttrsUpdate={vi.fn()}
                parallelIndex={-1}
                recalculateParallelIndex={vi.fn()}
            />
        );

        expect(Array.from(container.querySelectorAll('input')).map(input => input.value)).toEqual([
            '0.25',
            '-0.5',
            '1',
            '2',
            '3',
            '4',
        ]);
    });

    it('synchronizes an edited source offset across every same-style Bezier at any station type', () => {
        window.graph = createGraph();
        const { container } = renderSelectedLineAttrs();

        commitInputValue(container, '1.25', '40');

        expect(window.graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 40, y: 2.5 },
            targetOffset: { x: 3.75, y: 4.5 },
        });
        expect(window.graph.getEdgeAttribute('line_incoming', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 9, y: 10 },
            targetOffset: { x: 40, y: 2.5 },
        });
        expect(window.graph.getEdgeAttribute('line_hidden', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 40, y: 2.5 },
            targetOffset: { x: 11, y: 12 },
        });
        expect(window.graph.getEdgeAttribute('line_blue', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 13, y: 14 },
        });
        expect(window.graph.getEdgeAttribute('line_other_style', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 21, y: 22 },
        });
        expect(window.graph.getEdgeAttribute('line_target_peer', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 17, y: 18 },
        });
    });

    it('synchronizes an edited target offset using the target station group', () => {
        window.graph = createGraph();
        const { container } = renderSelectedLineAttrs();

        commitInputValue(container, '4.5', '70');

        expect(window.graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 1.25, y: 2.5 },
            targetOffset: { x: 3.75, y: 70 },
        });
        expect(window.graph.getEdgeAttribute('line_target_peer', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 3.75, y: 70 },
            targetOffset: { x: 19, y: 20 },
        });
        expect(window.graph.getEdgeAttribute('line_incoming', LinePathType.Bezier)).toMatchObject({
            targetOffset: { x: 5, y: 6 },
        });
    });

    it('does not propagate an edited offset through a non-station endpoint', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        ['misc_node_center', 'misc_node_target', 'misc_node_peer'].forEach(id => addNode(graph, id as NodeId));
        addBezier(
            graph,
            'line_selected',
            'misc_node_center',
            'misc_node_target',
            RED,
            makePoint(1.25, 2.5),
            makePoint(3.75, 4.5)
        );
        addBezier(graph, 'line_peer', 'misc_node_peer', 'misc_node_center', RED, makePoint(9, 10), makePoint(5, 6));
        window.graph = graph;
        const { container } = renderSelectedLineAttrs();

        commitInputValue(container, '1.25', '40');

        expect(window.graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 40, y: 2.5 },
        });
        expect(window.graph.getEdgeAttribute('line_peer', LinePathType.Bezier)).toMatchObject({
            targetOffset: { x: 5, y: 6 },
        });
    });
});
