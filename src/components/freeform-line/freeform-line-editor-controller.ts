import { MultiDirectedGraph } from 'graphology';
import { LineId, NodeAttributes, EdgeAttributes, GraphAttributes, Id } from '../../constants/constants';
import { LinePathType } from '../../constants/lines';
import { PathPoint, makePoint } from '../../constants/path';
import {
    FreeformPathAttributes,
    addFreeformWidthStop,
    getFreeformControlPoints,
    getFreeformWidthStopGeometry,
    getNearestFreeformCenterlineT,
    insertFreeformControlPointAtNearestSegment,
    moveFreeformControlPoint,
    moveFreeformWidthStop,
    normalizeFreeformPathAttributes,
    removeFreeformControlPoint,
    removeFreeformWidthStop,
    resizeFreeformWidthStop,
} from '../../util/freeform-line';

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
    attrs: FreeformPathAttributes;
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

export class FreeformLineEditorController {
    private readonly graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    private readonly selected: Set<Id>;
    private readonly svgViewBoxZoom: number;

    constructor(context: FreeformEditorContext) {
        this.graph = context.graph;
        this.selected = context.selected;
        this.svgViewBoxZoom = context.svgViewBoxZoom;
    }

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
        const attrs = normalizeFreeformPathAttributes(edgeAttrs[LinePathType.Freeform], targetRelative);
        if (!attrs) return undefined;

        return { edgeId, attrs, source, target, targetRelative };
    }

    getSelectedFreeform(): FreeformEditable | undefined {
        if (this.selected.size !== 1) return undefined;
        return this.getFreeformEditableById(Array.from(this.selected)[0]);
    }

    getHandleSize(): FreeformHandleSize {
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

    isEndpointPoint(editable: FreeformEditable, pointId: string): boolean {
        const points = getFreeformControlPoints(editable.attrs, editable.targetRelative);
        const index = points.findIndex(point => point.id === pointId);
        return index === 0 || index === points.length - 1;
    }

    updateAttrs(
        edgeId: LineId,
        updater: (attrs: FreeformPathAttributes, editable: FreeformEditable) => FreeformPathAttributes
    ): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;

        const nextAttrs = normalizeFreeformPathAttributes(updater(editable.attrs, editable), editable.targetRelative);
        if (!nextAttrs) return false;

        this.graph.mergeEdgeAttributes(edgeId, { [LinePathType.Freeform]: nextAttrs });
        return true;
    }

    moveControlPoint(edgeId: LineId, pointId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || this.isEndpointPoint(editable, pointId)) return false;
        return this.updateAttrs(edgeId, attrs =>
            moveFreeformControlPoint(attrs, editable.targetRelative, pointId, point)
        );
    }

    removeControlPoint(edgeId: LineId, pointId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || this.isEndpointPoint(editable, pointId)) return false;
        return this.updateAttrs(edgeId, attrs => removeFreeformControlPoint(attrs, editable.targetRelative, pointId));
    }

    insertControlPoint(edgeId: LineId, point: PathPoint, pointId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;
        return this.updateAttrs(edgeId, attrs =>
            insertFreeformControlPointAtNearestSegment(attrs, editable.targetRelative, point, () => pointId)
        );
    }

    addWidthStopAtPoint(edgeId: LineId, pointId: string, stopId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        const point = editable?.attrs.points.find(item => item.id === pointId);
        if (!editable || !point) return false;

        const t = getNearestFreeformCenterlineT(editable.attrs, editable.targetRelative, point);
        return this.updateAttrs(edgeId, attrs => addFreeformWidthStop(attrs, editable.targetRelative, () => stopId, t));
    }

    moveWidthStop(edgeId: LineId, stopId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable) return false;

        const t = getNearestFreeformCenterlineT(editable.attrs, editable.targetRelative, point);
        return this.updateAttrs(edgeId, attrs => moveFreeformWidthStop(attrs, editable.targetRelative, stopId, t));
    }

    resizeWidthStop(edgeId: LineId, stopId: string, point: PathPoint): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        const geometry = editable
            ? getFreeformWidthStopGeometry(editable.attrs, editable.targetRelative, stopId)
            : undefined;
        if (!editable || !geometry) return false;

        return this.updateAttrs(edgeId, attrs =>
            resizeFreeformWidthStop(
                attrs,
                editable.targetRelative,
                stopId,
                Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) * 2
            )
        );
    }

    removeWidthStop(edgeId: LineId, stopId: string): boolean {
        const editable = this.getFreeformEditableById(edgeId);
        if (!editable || editable.attrs.widthStops.length <= 1) return false;
        return this.updateAttrs(edgeId, attrs => removeFreeformWidthStop(attrs, editable.targetRelative, stopId));
    }
}
