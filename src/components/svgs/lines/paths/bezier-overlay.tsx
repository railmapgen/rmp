import React from 'react';
import useEvent from 'react-use-event-hook';
import { LineId } from '../../../../constants/constants';
import { LinePathOverlayProps, LinePathType } from '../../../../constants/lines';
import { PathPoint, makePoint } from '../../../../constants/path';
import { useRootDispatch, useRootSelector } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../../redux/runtime/runtime-slice';
import {
    defaultBezierControlAttributes,
    getBezierControlPoint,
    getBezierLocalCoordinates,
} from '../../../../util/bezier-line';
import { getBezierTangentCandidates, getSnappedBezierControlPoint } from '../../../../util/bezier-snap';
import { pointerPosToSVGCoord } from '../../../../util/helpers';
import type { BezierPathAttributes } from '../../../svgs/lines/paths/bezier';

interface BezierEditable {
    attrs: BezierPathAttributes;
    source: PathPoint;
    target: PathPoint;
}

const getBezierEditable = (id: LineId): BezierEditable | undefined => {
    if (!window.graph.hasEdge(id)) return undefined;
    const edgeAttrs = window.graph.getEdgeAttributes(id);
    if (edgeAttrs.type !== LinePathType.Bezier) return undefined;

    const [sourceId, targetId] = window.graph.extremities(id);
    const sourceAttrs = window.graph.getNodeAttributes(sourceId);
    const targetAttrs = window.graph.getNodeAttributes(targetId);
    return {
        attrs: edgeAttrs[LinePathType.Bezier] ?? defaultBezierControlAttributes,
        source: makePoint(sourceAttrs.x, sourceAttrs.y),
        target: makePoint(targetAttrs.x, targetAttrs.y),
    };
};

export const BezierLineOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: LinePathOverlayProps) => {
    const dispatch = useRootDispatch();
    const snapLines = useRootSelector(state => state.app.preference.snapLines);
    const [dragging, setDragging] = React.useState(false);
    const editable = getBezierEditable(id);

    const getPointerPosition = useEvent((event: React.PointerEvent<SVGElement>) => {
        const bbox = document.getElementById('canvas')?.getBoundingClientRect();
        if (!bbox) return undefined;
        const point = pointerPosToSVGCoord(
            event.clientX - bbox.left,
            event.clientY - bbox.top,
            svgViewBoxZoom,
            svgViewBoxMin
        );
        return makePoint(point.x, point.y);
    });

    const handlePointerDown = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
    });

    const handlePointerMove = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!dragging) return;
        const current = getBezierEditable(id);
        const pointer = getPointerPosition(event);
        if (!current || !pointer) return;

        event.stopPropagation();
        const snapDistance = 6 * (svgViewBoxZoom / 100);
        const snapped = snapLines
            ? getSnappedBezierControlPoint(pointer, getBezierTangentCandidates(window.graph, id), snapDistance)
            : undefined;
        const attrs = getBezierLocalCoordinates(current.source, current.target, snapped ?? pointer);
        window.graph.mergeEdgeAttributes(id, { [LinePathType.Bezier]: attrs });
        dispatch(refreshEdgesThunk());
    });

    const finishDrag = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!dragging) return;
        event.stopPropagation();
        try {
            (event.target as Element).releasePointerCapture?.(event.pointerId);
        } catch {
            // The captured circle can be replaced while the graph refreshes during dragging.
        }
        setDragging(false);
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshEdgesThunk());
    });

    if (!editable) return null;

    const control = getBezierControlPoint(editable.source, editable.target, editable.attrs);
    const screenToSvgScale = svgViewBoxZoom / 100;
    const guideStrokeWidth = 1.5 * screenToSvgScale;
    const handleStrokeWidth = 2 * screenToSvgScale;
    const handleRadius = 6 * screenToSvgScale;
    const dashArray = `${4 * screenToSvgScale} ${3 * screenToSvgScale}`;

    return (
        <g onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
            <line
                x1={editable.source.x}
                y1={editable.source.y}
                x2={control.x}
                y2={control.y}
                stroke="#3182CE"
                strokeWidth={guideStrokeWidth}
                strokeDasharray={dashArray}
                pointerEvents="none"
            />
            <line
                x1={editable.target.x}
                y1={editable.target.y}
                x2={control.x}
                y2={control.y}
                stroke="#3182CE"
                strokeWidth={guideStrokeWidth}
                strokeDasharray={dashArray}
                pointerEvents="none"
            />
            <circle
                cx={control.x}
                cy={control.y}
                r={handleRadius}
                fill="#3182CE"
                stroke="#FFFFFF"
                strokeWidth={handleStrokeWidth}
                cursor={dragging ? 'grabbing' : 'grab'}
                onPointerDown={handlePointerDown}
            />
        </g>
    );
};
