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
import { type BezierEndpoint, getBezierTangentCandidates, getBezierTangentSnap } from '../../../../util/bezier-snap';
import { pointerPosToSVGCoord } from '../../../../util/helpers';
import type { BezierPathAttributes } from '../../../svgs/lines/paths/bezier';

interface BezierEditable {
    attrs: BezierPathAttributes;
    source: PathPoint;
    target: PathPoint;
}

// Drag snapping should feel like a screen-space affordance, so it scales with
// zoom. Already-aligned highlighting uses a much smaller geometry tolerance
// below so nearby-but-not-aligned curves do not look snapped when selected.
const BEZIER_TANGENT_SNAP_DISTANCE = 12;
const BEZIER_TANGENT_ALIGNMENT_DISTANCE = 0.01;
const BEZIER_OVERLAY_STROKE = '#3182CE';
// Match the existing snap-point guide color so tangent snap feedback reads as
// part of the same alignment system.
const BEZIER_OVERLAY_SNAP_STROKE = '#FC8181';

type BezierSnapEndpoints = Record<BezierEndpoint, boolean>;

const INACTIVE_BEZIER_SNAP_ENDPOINTS: BezierSnapEndpoints = {
    source: false,
    target: false,
};

/** Convert snap metadata into direct lookup flags for the two overlay guide lines. */
const getBezierSnapEndpoints = (endpoints: BezierEndpoint[]): BezierSnapEndpoints => ({
    source: endpoints.includes('source'),
    target: endpoints.includes('target'),
});

/**
 * Detect which side of an already-selected Bezier is exactly tangent-aligned.
 *
 * This is separate from drag snapping because selection feedback should only
 * show true persisted alignment, not every nearby tangent within the larger
 * drag-assist radius.
 */
const getAlignedBezierSnapEndpoints = (id: LineId, control: PathPoint, snapLines: boolean): BezierSnapEndpoints => {
    if (!snapLines) return INACTIVE_BEZIER_SNAP_ENDPOINTS;

    const snap = getBezierTangentSnap(
        control,
        getBezierTangentCandidates(window.graph, id),
        BEZIER_TANGENT_ALIGNMENT_DISTANCE
    );
    return snap ? getBezierSnapEndpoints(snap.endpoints) : INACTIVE_BEZIER_SNAP_ENDPOINTS;
};

/** Read the selected Bezier's editable geometry from the graph at render/drag time. */
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

/**
 * Selection overlay for editing a Bezier line's shared tangent-intersection
 * handle. The graph is refreshed during dragging for live feedback, but the
 * undoable save entry is written only when the drag finishes.
 */
export const BezierLineOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: LinePathOverlayProps) => {
    const dispatch = useRootDispatch();
    const snapLines = useRootSelector(state => state.app.preference.snapLines);
    const [dragging, setDragging] = React.useState(false);
    const [snapEndpoints, setSnapEndpoints] = React.useState<BezierSnapEndpoints>(INACTIVE_BEZIER_SNAP_ENDPOINTS);
    const editable = getBezierEditable(id);

    const getPointerPosition = useEvent((event: React.PointerEvent<SVGElement>) => {
        // Pointer events are delivered in screen coordinates; converting through
        // the canvas bounds keeps dragging consistent with the current SVG viewBox.
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
        const current = getBezierEditable(id);
        const currentControl = current
            ? getBezierControlPoint(current.source, current.target, current.attrs)
            : undefined;
        // During a drag, rendered color comes from state instead of recomputing
        // from graph data. Seed that state from the selected line's current
        // alignment so a perfectly aligned handle does not flicker blue before
        // the first pointer move.
        setSnapEndpoints(
            currentControl
                ? getAlignedBezierSnapEndpoints(id, currentControl, snapLines)
                : INACTIVE_BEZIER_SNAP_ENDPOINTS
        );
        setDragging(true);
    });

    const handlePointerMove = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!dragging) return;
        const current = getBezierEditable(id);
        const pointer = getPointerPosition(event);
        if (!current || !pointer) return;

        event.stopPropagation();
        // Scale the snap radius by viewBox zoom so users feel roughly the same
        // pixel-distance snap threshold at different zoom levels.
        const snapDistance = BEZIER_TANGENT_SNAP_DISTANCE * (svgViewBoxZoom / 100);
        const snap = snapLines
            ? getBezierTangentSnap(pointer, getBezierTangentCandidates(window.graph, id), snapDistance)
            : undefined;
        setSnapEndpoints(snap ? getBezierSnapEndpoints(snap.endpoints) : INACTIVE_BEZIER_SNAP_ENDPOINTS);
        // Save local chord coordinates rather than absolute control coordinates
        // so subsequent node movement preserves the intended curve shape.
        const attrs = getBezierLocalCoordinates(current.source, current.target, snap?.point ?? pointer);
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
        setSnapEndpoints(INACTIVE_BEZIER_SNAP_ENDPOINTS);
        setDragging(false);
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshEdgesThunk());
    });

    if (!editable) return null;

    const control = getBezierControlPoint(editable.source, editable.target, editable.attrs);
    // Selection state should show persisted alignment. Drag state should show
    // the active snap target even before the graph refresh catches up.
    const alignedSnapEndpoints = getAlignedBezierSnapEndpoints(id, control, snapLines);
    const visibleSnapEndpoints = dragging ? snapEndpoints : alignedSnapEndpoints;
    const screenToSvgScale = svgViewBoxZoom / 100;
    const guideStrokeWidth = 1.5 * screenToSvgScale;
    const handleStrokeWidth = 2 * screenToSvgScale;
    const handleRadius = 6 * screenToSvgScale;
    const dashArray = `${4 * screenToSvgScale} ${3 * screenToSvgScale}`;
    const sourceGuideStroke = visibleSnapEndpoints.source ? BEZIER_OVERLAY_SNAP_STROKE : BEZIER_OVERLAY_STROKE;
    const targetGuideStroke = visibleSnapEndpoints.target ? BEZIER_OVERLAY_SNAP_STROKE : BEZIER_OVERLAY_STROKE;

    return (
        <g onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
            <line
                x1={editable.source.x}
                y1={editable.source.y}
                x2={control.x}
                y2={control.y}
                stroke={sourceGuideStroke}
                strokeWidth={guideStrokeWidth}
                strokeDasharray={dashArray}
                pointerEvents="none"
            />
            <line
                x1={editable.target.x}
                y1={editable.target.y}
                x2={control.x}
                y2={control.y}
                stroke={targetGuideStroke}
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
