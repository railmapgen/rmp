import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, Id, LineId, NodeAttributes } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint, makePoint } from '../../../../constants/path';
import {
    getNearestFreeformCenterlineT,
    getNearestFreeformControlSegmentIndex,
    getFreeformWidthStopGeometry,
    getWidthAtT,
} from './freeform-geometry';
import {
    ResolvedFreeformPathAttributes,
    persistFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';

export type FreeformHandleSelection =
    | { edgeId: LineId; kind: 'point'; id: string }
    | { edgeId: LineId; kind: 'width'; id: string }
    | undefined;

export type FreeformDrag =
    | { edgeId: LineId; kind: 'point'; id: string }
    | { edgeId: LineId; kind: 'width-position'; id: string }
    | { edgeId: LineId; kind: 'width-size'; id: string }
    | undefined;

export interface FreeformEditable {
    edgeId: LineId;
    attrs: ResolvedFreeformPathAttributes;
    source: PathPoint;
    target: PathPoint;
    targetRelative: PathPoint;
}

export interface FreeformHandleSize {
    hitStrokeWidth: number;
    guideStrokeWidth: number;
    strokeWidth: number;
    pointRadius: number;
    selectedPointRadius: number;
    lockedPointRadius: number;
    widthStopRadius: number;
    selectedWidthStopRadius: number;
    dashArray: string;
}

interface FreeformEditorContext {
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    selected: Set<Id>;
    svgViewBoxZoom: number;
}

/**
 * Encapsulates freeform edit mutations so the overlay stays mostly concerned with pointer events and rendering.
 *
 * This controller is also the graph boundary for freeform editing: values are normalized when read and normalized again
 * before being written, so lower-level geometry helpers can assume canonical attributes.
 */
export class FreeformLineEditorController {
    private readonly graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    private readonly selected: Set<Id>;
    private readonly svgViewBoxZoom: number;

    /** Store the live graph and viewport context used by one overlay render. */
    constructor(context: FreeformEditorContext) {
        this.graph = context.graph;
        this.selected = context.selected;
        this.svgViewBoxZoom = context.svgViewBoxZoom;
    }

    /** Resolve an edge id into normalized freeform edit data, including source-relative target coordinates. */
    getFreeformEditableById(id: Id): FreeformEditable | undefined {
        if (!this.graph.hasEdge(id)) return undefined;
        const edgeId = id as LineId;
        const edgeAttrs = this.graph.getEdgeAttributes(edgeId);
        if (edgeAttrs.type !== LinePathType.Freeform) return undefined;

        const [sourceId, targetId] = this.graph.extremities(edgeId);
        const sourceAttrs = this.graph.getNodeAttributes(sourceId);
        const targetAttrs = this.graph.getNodeAttributes(targetId);
        const source = makePoint(sourceAttrs.x, sourceAttrs.y);
        const target = makePoint(targetAttrs.x, targetAttrs.y);
        const targetRelative = makePoint(target.x - source.x, target.y - source.y);
        // Editing uses source-local SVG coordinates, resolved from the percentages stored on the graph edge.
        const attrs = resolveFreeformPathAttributes(edgeAttrs[LinePathType.Freeform], targetRelative);
        if (!attrs) return undefined;

        return { edgeId, attrs, source, target, targetRelative };
    }

    /** Return the editable only when a single selected item is a freeform edge. */
    getSelectedFreeform(): FreeformEditable | undefined {
        if (this.selected.size !== 1) return undefined;
        return this.getFreeformEditableById(Array.from(this.selected)[0]);
    }

    /** Scale overlay handles with zoom so they keep a stable screen size while the canvas coordinate system changes. */
    getHandleSize(): FreeformHandleSize {
        // Handles live in SVG coordinates but should remain a stable physical size as the canvas zoom changes.
        const screenToSvgScale = this.svgViewBoxZoom / 100;
        return {
            hitStrokeWidth: 16 * screenToSvgScale,
            guideStrokeWidth: 1.5 * screenToSvgScale,
            strokeWidth: 2 * screenToSvgScale,
            pointRadius: 4.5 * screenToSvgScale,
            selectedPointRadius: 6 * screenToSvgScale,
            lockedPointRadius: 4 * screenToSvgScale,
            widthStopRadius: 4 * screenToSvgScale,
            selectedWidthStopRadius: 5.5 * screenToSvgScale,
            dashArray: `${4 * screenToSvgScale} ${3 * screenToSvgScale}`,
        };
    }

    /** Identify node-owned endpoint handles, which are visible anchors but not directly draggable control points. */
    isEndpointPoint(editable: FreeformEditable, pointId: string): boolean {
        const points = editable.attrs.points;
        const index = points.findIndex(point => point.id === pointId);
        return index === 0 || index === points.length - 1;
    }

    /** Apply a mutation to canonical attrs and write the repaired result back to the graph. */
    updateAttrs(
        edgeId: LineId,
        updater: (attrs: ResolvedFreeformPathAttributes, editable: FreeformEditable) => ResolvedFreeformPathAttributes
    ): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;

        // Convert edited SVG geometry back to percentages before writing it to the graph and undo snapshots.
        const nextAttrs = persistFreeformPathAttributes(updater(editable.attrs, editable), editable.targetRelative);
        if (!nextAttrs) return false;

        this.graph.mergeEdgeAttributes(edgeId, { [LinePathType.Freeform]: nextAttrs });
        return true;
    }

    /** Move an editable middle control point in source-relative coordinates. */
    moveControlPoint(edgeId: LineId, pointId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || this.isEndpointPoint(editable, pointId)) return false;
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            points: attrs.points.map(item => (item.id === pointId ? { ...item, x: point.x, y: point.y } : item)),
        }));
    }

    /** Remove a middle control point while preserving endpoint anchors. */
    removeControlPoint(edgeId: LineId, pointId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || this.isEndpointPoint(editable, pointId)) return false;
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            points: attrs.points.filter(item => item.id !== pointId),
        }));
    }

    /** Insert a new control point into the nearest authored segment instead of appending by creation time. */
    insertControlPoint(edgeId: LineId, point: PathPoint, pointId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;
        // Insertion uses the raw control polygon, not the smoothed centerline, so later editing order remains intuitive.
        const insertIndex = getNearestFreeformControlSegmentIndex(editable.attrs, point);
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            points: [
                ...attrs.points.slice(0, insertIndex),
                { id: pointId, x: point.x, y: point.y },
                ...attrs.points.slice(insertIndex),
            ],
        }));
    }

    /** Create a width stop at the visible centerline position nearest to a control point. */
    addWidthStopAtPoint(edgeId: LineId, pointId: string, stopId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        const point = editable?.attrs.points.find(item => item.id === pointId);
        if (!editable || !point) return false;

        // Store the stop at the rendered curve position and initialize it with the current interpolated width.
        const t = getNearestFreeformCenterlineT(editable.attrs, point);
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            widthStops: [...attrs.widthStops, { id: stopId, t, width: getWidthAtT(attrs, t) }],
        }));
    }

    /** Drag a width stop along the rendered centerline by projecting the pointer onto that curve. */
    moveWidthStop(edgeId: LineId, stopId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;

        const t = getNearestFreeformCenterlineT(editable.attrs, point);
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            widthStops: attrs.widthStops.map(stop => (stop.id === stopId ? { ...stop, t } : stop)),
        }));
    }

    /** Resize a width stop from one side handle while storing full outline width. */
    resizeWidthStop(edgeId: LineId, stopId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        const geometry = editable ? getFreeformWidthStopGeometry(editable.attrs, stopId) : undefined;
        if (!editable || !geometry) return false;

        // A width stop expands symmetrically around the centerline, so one side-handle distance is half the width.
        const width = Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) * 2;
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            widthStops: attrs.widthStops.map(stop => (stop.id === stopId ? { ...stop, width } : stop)),
        }));
    }

    /** Remove a width stop unless it is the last remaining sample needed for width interpolation. */
    removeWidthStop(edgeId: LineId, stopId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || editable.attrs.widthStops.length <= 1) return false;
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            widthStops: attrs.widthStops.filter(stop => stop.id !== stopId),
        }));
    }
}
