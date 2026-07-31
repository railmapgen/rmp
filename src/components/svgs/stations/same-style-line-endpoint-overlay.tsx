import React from 'react';
import useEvent from 'react-use-event-hook';
import { EdgeAttributes, LineId } from '../../../constants/constants';
import { LinePathType } from '../../../constants/lines';
import { PathPoint, makePoint } from '../../../constants/path';
import { StationOverlayProps } from '../../../constants/stations';
import { useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { pointerPosToSVGCoord, roundToMultiple } from '../../../util/helpers';
import { areSameLineStyles } from '../../../util/same-style';
import { defaultBezierPathAttributes } from '../lines/paths/bezier-model';

interface EndpointGroup {
    edgeIds: LineId[];
    representativeAttrs: EdgeAttributes;
    point: PathPoint;
}

interface DraggingEndpointGroup {
    edgeIds: LineId[];
    point: PathPoint;
}

const getEndpointOffset = (stationId: StationOverlayProps['id'], edgeId: LineId): PathPoint => {
    const attrs = window.graph.getEdgeAttribute(edgeId, LinePathType.Bezier) ?? defaultBezierPathAttributes;
    return window.graph.source(edgeId) === stationId
        ? (attrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset)
        : (attrs.targetOffset ?? defaultBezierPathAttributes.targetOffset);
};

/** Group only the selected station's directly linked, visible Bezier edges. */
const getEndpointGroups = (stationId: StationOverlayProps['id']): EndpointGroup[] => {
    if (!window.graph.hasNode(stationId)) return [];
    const station = window.graph.getNodeAttributes(stationId);
    const groups: EndpointGroup[] = [];

    for (const edgeId of window.graph.edges(stationId) as LineId[]) {
        const edgeAttrs = window.graph.getEdgeAttributes(edgeId);
        if (!edgeAttrs.visible || edgeAttrs.type !== LinePathType.Bezier) continue;

        const existing = groups.find(group => areSameLineStyles(group.representativeAttrs, edgeAttrs));
        if (existing) {
            existing.edgeIds.push(edgeId);
            continue;
        }

        const offset = getEndpointOffset(stationId, edgeId);
        groups.push({
            edgeIds: [edgeId],
            representativeAttrs: edgeAttrs,
            point: makePoint(station.x + offset.x, station.y + offset.y),
        });
    }

    return groups;
};

/**
 * Shared station overlay that exposes one virtual endpoint per same-style Bezier group.
 *
 * The handle is transient editor UI. Dragging persists the same station-relative endpoint offset on every edge in
 * the group, restoring a single visual junction even if imported or manually edited attributes had diverged.
 */
export const SameStyleLineEndpointOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: StationOverlayProps) => {
    const dispatch = useRootDispatch();
    const [dragging, setDragging] = React.useState<DraggingEndpointGroup>();
    const groups = getEndpointGroups(id);

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

    const handlePointerDown = useEvent((group: EndpointGroup, event: React.PointerEvent<SVGCircleElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging({ edgeIds: group.edgeIds, point: group.point });
    });

    const handlePointerMove = useEvent((event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging || !window.graph.hasNode(id)) return;
        const pointer = getPointerPosition(event);
        if (!pointer) return;

        event.stopPropagation();
        const station = window.graph.getNodeAttributes(id);
        const offset = makePoint(
            roundToMultiple(pointer.x - station.x, 0.01),
            roundToMultiple(pointer.y - station.y, 0.01)
        );

        for (const edgeId of dragging.edgeIds) {
            if (!window.graph.hasEdge(edgeId)) continue;
            const edgeAttrs = window.graph.getEdgeAttributes(edgeId);
            if (edgeAttrs.type !== LinePathType.Bezier) continue;

            const current = edgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
            const next = {
                ...defaultBezierPathAttributes,
                ...current,
                sourceOffset: {
                    ...(current.sourceOffset ?? defaultBezierPathAttributes.sourceOffset),
                },
                targetOffset: {
                    ...(current.targetOffset ?? defaultBezierPathAttributes.targetOffset),
                },
            };
            if (window.graph.source(edgeId) === id) next.sourceOffset = offset;
            else if (window.graph.target(edgeId) === id) next.targetOffset = offset;
            else continue;

            window.graph.mergeEdgeAttributes(edgeId, { [LinePathType.Bezier]: next });
        }

        setDragging({ ...dragging, point: pointer });
        dispatch(refreshEdgesThunk());
    });

    const finishDrag = useEvent((event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging) return;
        event.stopPropagation();
        try {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
            // The captured control may be replaced by a graph refresh during the drag.
        }
        setDragging(undefined);
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshEdgesThunk());
    });

    const screenToSvgScale = svgViewBoxZoom / 100;
    const radius = 5 * screenToSvgScale;
    const strokeWidth = 1.5 * screenToSvgScale;

    return (
        <g>
            {groups.map(group => {
                const point = dragging && dragging.edgeIds[0] === group.edgeIds[0] ? dragging.point : group.point;
                return (
                    <g key={group.edgeIds[0]} transform={`translate(${point.x}, ${point.y}) rotate(45)`}>
                        <line
                            x1={-radius}
                            y1={0}
                            x2={radius}
                            y2={0}
                            stroke="black"
                            strokeWidth={strokeWidth}
                            pointerEvents="none"
                        />
                        <line
                            x1={0}
                            y1={-radius}
                            x2={0}
                            y2={radius}
                            stroke="black"
                            strokeWidth={strokeWidth}
                            pointerEvents="none"
                        />
                        <circle
                            data-testid="station-line-endpoint-control"
                            data-edge-ids={group.edgeIds.join(',')}
                            r={radius}
                            stroke="black"
                            strokeWidth={strokeWidth}
                            fill="white"
                            fillOpacity={0.5}
                            cursor={dragging ? 'grabbing' : 'grab'}
                            onPointerDown={event => handlePointerDown(group, event)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={finishDrag}
                            onPointerCancel={finishDrag}
                        />
                    </g>
                );
            })}
        </g>
    );
};
