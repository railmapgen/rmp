import React from 'react';
import useEvent from 'react-use-event-hook';
import { EdgeAttributes, LineId, NodeId, OverlayProps, Theme } from '../../../constants/constants';
import { LinePathType } from '../../../constants/lines';
import { PathPoint, makePoint } from '../../../constants/path';
import { useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { isTheme } from '../../../util/color';
import { pointerPosToSVGCoord, roundToMultiple } from '../../../util/helpers';
import { getBaseReconciledLineID } from '../../../util/reconcile';
import { areSameLineStyles } from '../../../util/same-style';
import { getBezierEndpointOffset } from '../lines/paths/bezier-endpoint';
import { defaultBezierPathAttributes } from '../lines/paths/bezier-model';

/**
 * Render-time representation of one `(LinePathType.Bezier, same LineStyle)` endpoint group at the selected node.
 *
 * `representativeAttrs` is used only for grouping subsequent edges; `point` is the shared absolute SVG position
 * displayed by the virtual handle. Every edge remains the source of its own persisted node-relative offset.
 */
interface EndpointGroup {
    edgeIds: LineId[];
    representativeAttrs: EdgeAttributes;
    point: PathPoint;
}

/** Minimal drag snapshot retained while graph refreshes rebuild the render-time endpoint groups. */
interface DraggingEndpointGroup {
    edgeIds: LineId[];
    point: PathPoint;
    hasMoved: boolean;
}

const FALLBACK_CONTROL_COLORS = ['#3182CE', '#DD6B20', '#805AD5', '#319795', '#D53F8C', '#4A5568'];
const CONTROL_RING_GAP = 3;
const CONTROL_STROKE_WIDTH = 3;
const HIGHLIGHT_RADIUS = 10;

/** Collect the authored colors from simple, multi-color, and layered line-style attributes. */
const getStyleThemes = (attrs: EdgeAttributes): Theme[] => {
    const themes: Theme[] = [];
    const seen = new Set<string>();
    const visit = (value: unknown) => {
        if (isTheme(value)) {
            const theme = value as Theme;
            const color = theme[2].toLowerCase();
            if (!seen.has(color)) {
                seen.add(color);
                themes.push(theme);
            }
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(visit);
        } else if (value && typeof value === 'object') {
            Object.values(value).forEach(visit);
        }
    };

    visit(attrs[attrs.style]);
    return themes;
};

/** Resolve the rendered groups for visible members, including reconciled lines whose DOM is owned by a base edge. */
const getVisibleRenderedLineIds = (edgeIds: LineId[]): LineId[] => [
    ...new Set(
        edgeIds
            .filter(
                edgeId => window.graph.hasEdge(edgeId) && window.graph.getEdgeAttribute(edgeId, 'visible') !== false
            )
            .map(edgeId => getBaseReconciledLineID(window.graph, edgeId))
    ),
];

/**
 * Groups every directly linked Bezier edge, including hidden edges, using the same style identity as line rendering.
 *
 * One absolute handle position is taken from the first edge in each group. Persisted inconsistencies are tolerated;
 * dragging the handle rewrites every group member to the chosen position.
 */
const getEndpointGroups = (nodeId: NodeId): EndpointGroup[] => {
    if (!window.graph.hasNode(nodeId)) return [];
    const node = window.graph.getNodeAttributes(nodeId);
    const groups: EndpointGroup[] = [];

    for (const edgeId of window.graph.edges(nodeId) as LineId[]) {
        const edgeAttrs = window.graph.getEdgeAttributes(edgeId);
        if (edgeAttrs.type !== LinePathType.Bezier) continue;

        const existing = groups.find(group => areSameLineStyles(group.representativeAttrs, edgeAttrs));
        if (existing) {
            existing.edgeIds.push(edgeId);
            continue;
        }

        const offset = getBezierEndpointOffset(window.graph, nodeId, edgeId);
        groups.push({
            edgeIds: [edgeId],
            representativeAttrs: edgeAttrs,
            point: makePoint(node.x + offset.x, node.y + offset.y),
        });
    }

    return groups;
};

/**
 * Shared node overlay that exposes one virtual endpoint per same-style Bezier group.
 *
 * The handle is transient editor UI. Dragging persists the same node-relative endpoint offset on every edge in
 * the group, restoring a single visual junction even if imported or manually edited attributes had diverged.
 */
export const SameStyleLineEndpointOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: OverlayProps<NodeId>) => {
    const dispatch = useRootDispatch();
    const [dragging, setDragging] = React.useState<DraggingEndpointGroup>();
    const [activeEdgeIds, setActiveEdgeIds] = React.useState<LineId[]>();
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
        setActiveEdgeIds(group.edgeIds);
        setDragging({ edgeIds: group.edgeIds, point: group.point, hasMoved: false });
    });

    const handlePointerMove = useEvent((event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging || !window.graph.hasNode(id)) return;
        const pointer = getPointerPosition(event);
        if (!pointer) return;

        event.stopPropagation();
        const node = window.graph.getNodeAttributes(id);
        const offset = makePoint(roundToMultiple(pointer.x - node.x, 0.01), roundToMultiple(pointer.y - node.y, 0.01));

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

        setDragging({ ...dragging, point: pointer, hasMoved: true });
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
        if (dragging.hasMoved) {
            dispatch(saveGraph(window.graph.export()));
            dispatch(refreshEdgesThunk());
        }
    });

    const screenToSvgScale = svgViewBoxZoom / 100;
    const radius = 5 * screenToSvgScale;
    const strokeWidth = 1.5 * screenToSvgScale;
    const controlStrokeWidth = CONTROL_STROKE_WIDTH * screenToSvgScale;
    const activeLineIds = activeEdgeIds ? getVisibleRenderedLineIds(activeEdgeIds) : [];
    const nodeAttrs = window.graph.hasNode(id) ? window.graph.getNodeAttributes(id) : undefined;
    const highlightClipId = `node-line-endpoint-highlight-clip-${id}`;
    const getRenderedGroupPoint = (group: EndpointGroup) =>
        dragging?.edgeIds.some(edgeId => group.edgeIds.includes(edgeId)) ? dragging.point : group.point;

    return (
        <g>
            {activeLineIds.length > 0 && nodeAttrs && (
                <>
                    <defs>
                        <clipPath id={highlightClipId} clipPathUnits="userSpaceOnUse">
                            {/* Node renderers expose different core IDs and local transforms; a screen-stable window
                                keeps the selected junction visible without coupling this shared overlay to each SVG. */}
                            <circle
                                data-testid="node-line-endpoint-highlight-clip"
                                data-node-overlay-id={id}
                                r={HIGHLIGHT_RADIUS * screenToSvgScale}
                                transform={`translate(${nodeAttrs.x}, ${nodeAttrs.y})`}
                            />
                        </clipPath>
                    </defs>
                    <g
                        data-testid="node-line-endpoint-highlight"
                        data-edge-ids={activeLineIds.join(',')}
                        clipPath={`url(#${highlightClipId})`}
                        pointerEvents="none"
                    >
                        {(['pre', 'main', 'post'] as const).map(layer =>
                            activeLineIds.map(edgeId => (
                                <use
                                    key={`${layer}-${edgeId}`}
                                    data-testid={layer === 'main' ? 'node-line-endpoint-highlight-segment' : undefined}
                                    href={`#${edgeId}${layer === 'main' ? '' : `.${layer}`}`}
                                />
                            ))
                        )}
                    </g>
                </>
            )}
            {groups.map((group, groupIndex) => {
                const isDragging = dragging?.edgeIds.some(edgeId => group.edgeIds.includes(edgeId)) ?? false;
                const isActive = activeEdgeIds?.some(edgeId => group.edgeIds.includes(edgeId)) ?? false;
                const point = getRenderedGroupPoint(group);
                const overlappingGroups = groups.filter(candidate => {
                    const candidatePoint = getRenderedGroupPoint(candidate);
                    // Beyond one base radius, enough of each control remains exposed to click independently.
                    return Math.hypot(candidatePoint.x - point.x, candidatePoint.y - point.y) <= radius;
                });
                const ringIndex = overlappingGroups.indexOf(group);
                const controlRadius =
                    radius + (overlappingGroups.length - ringIndex - 1) * CONTROL_RING_GAP * screenToSvgScale;
                const themes = getStyleThemes(group.representativeAttrs);
                const colors =
                    themes.length > 0
                        ? themes.map(theme => theme[2])
                        : [FALLBACK_CONTROL_COLORS[groupIndex % FALLBACK_CONTROL_COLORS.length]];
                const foreground = themes[0]?.[3] ?? '#FFFFFF';
                const gradientId = `node-line-endpoint-gradient-${group.edgeIds[0]}`;
                return (
                    <g
                        key={group.edgeIds[0]}
                        // Node dragging repaints graph elements imperatively, so expose this absolute-positioned group
                        // to the same repaint path instead of forcing a React refresh on every pointer movement.
                        data-node-overlay-id={id}
                        transform={`translate(${point.x}, ${point.y}) rotate(45)`}
                    >
                        {colors.length > 1 && (
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                                    {colors.flatMap((color, colorIndex) => [
                                        <stop
                                            key={`${colorIndex}-start`}
                                            offset={`${(colorIndex / colors.length) * 100}%`}
                                            stopColor={color}
                                        />,
                                        <stop
                                            key={`${colorIndex}-end`}
                                            offset={`${((colorIndex + 1) / colors.length) * 100}%`}
                                            stopColor={color}
                                        />,
                                    ])}
                                </linearGradient>
                            </defs>
                        )}
                        {/* The visible control interior and stroke both receive pointer events for a forgiving hitbox. */}
                        <circle
                            r={controlRadius}
                            fill="none"
                            stroke="white"
                            strokeWidth={controlStrokeWidth + 2 * screenToSvgScale}
                            pointerEvents="none"
                        />
                        <circle
                            data-testid="node-line-endpoint-control"
                            data-edge-ids={group.edgeIds.join(',')}
                            r={controlRadius}
                            stroke={colors.length > 1 ? `url(#${gradientId})` : colors[0]}
                            strokeWidth={controlStrokeWidth}
                            fill="none"
                            pointerEvents="all"
                            cursor={isDragging ? 'grabbing' : 'grab'}
                            onPointerDown={event => handlePointerDown(group, event)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={finishDrag}
                            onPointerCancel={finishDrag}
                        />
                        {isActive && (
                            <circle
                                r={controlRadius + 2 * screenToSvgScale}
                                fill="none"
                                stroke="#3182CE"
                                strokeWidth={2 * screenToSvgScale}
                                pointerEvents="none"
                            />
                        )}
                        <line
                            x1={-controlRadius}
                            y1={0}
                            x2={controlRadius}
                            y2={0}
                            stroke={foreground}
                            strokeWidth={strokeWidth}
                            pointerEvents="none"
                        />
                        <line
                            x1={0}
                            y1={-controlRadius}
                            x2={0}
                            y2={controlRadius}
                            stroke={foreground}
                            strokeWidth={strokeWidth}
                            pointerEvents="none"
                        />
                    </g>
                );
            })}
        </g>
    );
};
