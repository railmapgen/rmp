import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint, makePoint } from '../../../../constants/path';
import { getNearestFreeformControlSegmentIndex } from './freeform-geometry';
import {
    ResolvedFreeformPathAttributes,
    persistFreeformPathAttributes,
    resolveFreeformPathAttributes,
} from './freeform-model';

interface FreeformEditable {
    edgeId: LineId;
    attrs: ResolvedFreeformPathAttributes;
    source: PathPoint;
    targetRelative: PathPoint;
}

interface FreeformEditorContext {
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    svgViewBoxZoom: number;
}

/**
 * Encapsulates Freeform graph mutations so the overlay stays concerned with pointer events and rendering.
 *
 * Values are normalized when read and normalized again before being written, allowing geometry helpers to operate on
 * canonical source-local attributes.
 */
export class FreeformLineEditorController {
    private readonly graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    private readonly svgViewBoxZoom: number;

    /** Store the live graph and viewport context used by one overlay render. */
    constructor(context: FreeformEditorContext) {
        this.graph = context.graph;
        this.svgViewBoxZoom = context.svgViewBoxZoom;
    }

    /** Resolve an edge into normalized source-local Freeform edit data. */
    getFreeformEditableById(id: LineId): FreeformEditable | undefined {
        if (!this.graph.hasEdge(id)) return undefined;
        const edgeAttrs = this.graph.getEdgeAttributes(id);
        if (edgeAttrs.type !== LinePathType.Freeform) return undefined;

        const [sourceId, targetId] = this.graph.extremities(id);
        const sourceAttrs = this.graph.getNodeAttributes(sourceId);
        const targetAttrs = this.graph.getNodeAttributes(targetId);
        const source = makePoint(sourceAttrs.x, sourceAttrs.y);
        const targetRelative = makePoint(targetAttrs.x - source.x, targetAttrs.y - source.y);
        // Editing uses source-local SVG coordinates, resolved from the percentages stored on the graph edge.
        const attrs = resolveFreeformPathAttributes(edgeAttrs[LinePathType.Freeform], targetRelative);

        return attrs ? { edgeId: id, attrs, source, targetRelative } : undefined;
    }

    /** Scale overlay handles with zoom so they keep a stable screen size. */
    getHandleSize() {
        // Handles live in SVG coordinates but should remain a stable physical size as the canvas zoom changes.
        const scale = this.svgViewBoxZoom / 100;
        return {
            hitStrokeWidth: 16 * scale,
            guideStrokeWidth: 1.5 * scale,
            strokeWidth: 2 * scale,
            pointRadius: 4.5 * scale,
            selectedPointRadius: 6 * scale,
            lockedPointRadius: 4 * scale,
            dashArray: `${4 * scale} ${3 * scale}`,
        };
    }

    /** Identify node-owned endpoint handles, which are visible but not directly draggable. */
    isEndpointPoint(editable: FreeformEditable, pointId: string): boolean {
        const index = editable.attrs.points.findIndex(point => point.id === pointId);
        return index === 0 || index === editable.attrs.points.length - 1;
    }

    /** Apply a point mutation and persist the repaired chord-relative attributes. */
    private updateAttrs(
        edgeId: LineId,
        updater: (attrs: ResolvedFreeformPathAttributes) => ResolvedFreeformPathAttributes
    ): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;

        // Convert edited SVG geometry back to percentages before writing it to the graph and undo snapshots.
        const persisted = persistFreeformPathAttributes(updater(editable.attrs), editable.targetRelative);
        if (!persisted) return false;
        this.graph.mergeEdgeAttributes(edgeId, { [LinePathType.Freeform]: persisted });
        return true;
    }

    /** Move an editable middle control point in source-local coordinates. */
    moveControlPoint(edgeId: LineId, pointId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || this.isEndpointPoint(editable, pointId)) return false;
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            points: attrs.points.map(item => (item.id === pointId ? { ...item, ...point } : item)),
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

    /** Insert a new control point into the nearest authored segment. */
    insertControlPoint(edgeId: LineId, point: PathPoint, pointId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;
        // Insertion uses the raw control polygon, not the smoothed centerline, so later editing order remains intuitive.
        const insertIndex = getNearestFreeformControlSegmentIndex(editable.attrs, point);
        return this.updateAttrs(edgeId, attrs => ({
            ...attrs,
            points: [
                ...attrs.points.slice(0, insertIndex),
                { id: pointId, ...point },
                ...attrs.points.slice(insertIndex),
            ],
        }));
    }
}
