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
import { getBezierControlPoint, getBezierEffectiveEndpoints, getBezierLocalCoordinates } from './bezier-geometry';
import { BezierPathAttributes } from './bezier-model';
import { BezierLineOverlay } from './bezier-overlay';

const createGraph = (editedAttrs: BezierPathAttributes = { along: 0.5, normal: -0.35 }) => {
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
    addBezier('line_edited', 'misc_node_a', 'misc_node_b', editedAttrs);
    addBezier('line_neighbor', 'misc_node_a', 'misc_node_c', { along: 0, normal: -1 });
    return graph;
};

const renderOverlay = (snapLines: boolean, editedAttrs?: BezierPathAttributes) => {
    window.graph = createGraph(editedAttrs);
    const store = createStore();
    store.dispatch(setSnapLines(snapLines));
    return render(
        <svg id="canvas">
            <BezierLineOverlay id="line_edited" svgViewBoxZoom={100} svgViewBoxMin={makePoint(0, 0)} />
        </svg>,
        { store }
    );
};

const dragOverlayTo = (snapLines: boolean, pointer = makePoint(20, 8), editedAttrs?: BezierPathAttributes) => {
    const { container } = renderOverlay(snapLines, editedAttrs);
    const group = container.querySelector('g')!;
    const handle = container.querySelector('circle')!;
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 });
    fireEvent.pointerMove(group, { clientX: pointer.x, clientY: pointer.y, pointerId: 1 });

    const attrs = window.graph.getEdgeAttribute('line_edited', LinePathType.Bezier)!;
    const effective = getBezierEffectiveEndpoints(makePoint(0, 0), makePoint(100, 100), attrs);
    return {
        attrs,
        container,
        control: getBezierControlPoint(effective.source, effective.target, attrs),
    };
};

const dragControlTo = (snapLines: boolean) => {
    return dragOverlayTo(snapLines).control;
};

const getEditedAttrsForControl = (x: number, y: number): BezierPathAttributes => {
    return getBezierLocalCoordinates(makePoint(0, 0), makePoint(100, 100), makePoint(x, y));
};

describe('BezierLineOverlay tangent snapping', () => {
    it('aligns with a connected Bezier tangent when snap lines are enabled', () => {
        expect(dragControlTo(true)).toEqual(makePoint(20, 0));
    });

    it('keeps the pointer position when snap lines are disabled', () => {
        const control = dragControlTo(false);

        expect(control.x).toBeCloseTo(20);
        expect(control.y).toBeCloseTo(8);
    });

    it('uses effective endpoints and preserves their offsets while moving the control point', () => {
        const initialAttrs: BezierPathAttributes = {
            along: 0.5,
            normal: -0.35,
            sourceOffset: { x: 10, y: 5 },
            targetOffset: { x: -20, y: 15 },
        };
        const { attrs, container } = dragOverlayTo(false, makePoint(30, 40), initialAttrs);
        const guides = Array.from(container.querySelectorAll('line'));

        expect(attrs.sourceOffset).toEqual(initialAttrs.sourceOffset);
        expect(attrs.targetOffset).toEqual(initialAttrs.targetOffset);
        expect(guides[0]).toHaveAttribute('x1', '10');
        expect(guides[0]).toHaveAttribute('y1', '5');
        expect(guides[1]).toHaveAttribute('x1', '80');
        expect(guides[1]).toHaveAttribute('y1', '115');
    });

    it('highlights only the aligned overlay guide line while snapped', () => {
        const { container } = dragOverlayTo(true);
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#FC8181', '#3182CE']);
    });

    it('stores an exact zero normal and highlights both guides when snapping straight', () => {
        const { attrs, container, control } = dragOverlayTo(true, makePoint(20, 22));
        const guides = Array.from(container.querySelectorAll('line'));

        expect(attrs.normal).toBe(0);
        expect(control.x).toBeCloseTo(21);
        expect(control.y).toBeCloseTo(21);
        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#FC8181', '#FC8181']);
    });

    it('highlights an already aligned overlay guide line when selected', () => {
        const { container } = renderOverlay(true, getEditedAttrsForControl(20, 0));
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#FC8181', '#3182CE']);
    });

    it('does not highlight a merely nearby overlay guide line when selected', () => {
        const { container } = renderOverlay(true, getEditedAttrsForControl(20, 0.02));
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#3182CE', '#3182CE']);
    });

    it('highlights both guides for a persisted straight Bezier', () => {
        const { container } = renderOverlay(true, { along: 0.5, normal: 0 });
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#FC8181', '#FC8181']);
    });

    it('does not report a shallow unsnapped curve as straight', () => {
        const { container } = renderOverlay(true, { along: 0.5, normal: Number.EPSILON });
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#3182CE', '#3182CE']);
    });

    it('keeps the default overlay guide color when snapping is disabled', () => {
        const { container } = dragOverlayTo(false);
        const guides = Array.from(container.querySelectorAll('line'));

        expect(guides.map(guide => guide.getAttribute('stroke'))).toEqual(['#3182CE', '#3182CE']);
    });
});
