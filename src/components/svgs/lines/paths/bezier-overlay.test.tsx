import { MultiDirectedGraph } from 'graphology';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../../constants/lines';
import { MiscNodeType } from '../../../../constants/nodes';
import { makePoint } from '../../../../constants/path';
import { createStore } from '../../../../redux';
import { setSnapLines } from '../../../../redux/app/app-slice';
import { render } from '../../../../test-utils';
import { getBezierControlPoint } from '../../../../util/bezier-line';
import { BezierPathAttributes } from './bezier';
import { BezierLineOverlay } from './bezier-overlay';

const createGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    const addNode = (id: `misc_node_${string}`, x: number, y: number) =>
        graph.addNode(id, { visible: true, zIndex: 0, x, y, type: MiscNodeType.Virtual });
    const addBezier = (
        id: `line_${string}`,
        source: `misc_node_${string}`,
        target: `misc_node_${string}`,
        attrs: BezierPathAttributes
    ) =>
        graph.addDirectedEdgeWithKey(id, source, target, {
            visible: true,
            zIndex: 0,
            type: LinePathType.Bezier,
            style: LineStyleType.SingleColor,
            reconcileId: '',
            parallelIndex: -1,
            [LinePathType.Bezier]: attrs,
        });

    addNode('misc_node_a', 0, 0);
    addNode('misc_node_b', 100, 100);
    addNode('misc_node_c', 0, 100);
    addBezier('line_edited', 'misc_node_a', 'misc_node_b', { along: 0.5, normal: -0.35 });
    addBezier('line_neighbor', 'misc_node_a', 'misc_node_c', { along: 0, normal: -1 });
    return graph;
};

const dragControlTo = (snapLines: boolean) => {
    window.graph = createGraph();
    const store = createStore();
    store.dispatch(setSnapLines(snapLines));
    const { container } = render(
        <svg id="canvas">
            <BezierLineOverlay id="line_edited" svgViewBoxZoom={100} svgViewBoxMin={makePoint(0, 0)} />
        </svg>,
        { store }
    );
    const group = container.querySelector('g')!;
    const handle = container.querySelector('circle')!;
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 });
    fireEvent.pointerMove(group, { clientX: 20, clientY: 2, pointerId: 1 });

    const attrs = window.graph.getEdgeAttribute('line_edited', LinePathType.Bezier)!;
    return getBezierControlPoint(makePoint(0, 0), makePoint(100, 100), attrs);
};

describe('BezierLineOverlay tangent snapping', () => {
    it('aligns with a connected Bezier tangent when snap lines are enabled', () => {
        expect(dragControlTo(true)).toEqual(makePoint(20, 0));
    });

    it('keeps the pointer position when snap lines are disabled', () => {
        expect(dragControlTo(false)).toEqual(makePoint(20, 2));
    });
});
