import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { LineId, OverlayProps } from '../../../../constants/constants';
import { makePoint } from '../../../../constants/path';
import { useRootDispatch } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../../redux/runtime/runtime-slice';
import { pointerPosToSVGCoord } from '../../../../util/helpers';
import { FreeformDrag, FreeformHandleSelection, FreeformLineEditorController } from './freeform-editor-controller';
import { getFreeformCenterlineD, getFreeformWidthStopGeometry } from './freeform-geometry';

/**
 * Renders and handles the edit overlay for a selected freeform line.
 *
 * The overlay owns pointer/keyboard interaction only; graph mutation and geometry calculations stay in the controller
 * and geometry modules so this component can be treated as a thin SVG interaction layer.
 */
export const FreeformLineOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: OverlayProps<LineId>) => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const [freeformDrag, setFreeformDrag] = React.useState<FreeformDrag>();
    const [handleSelection, setHandleSelection] = React.useState<FreeformHandleSelection>();

    const controller = React.useMemo(
        () =>
            new FreeformLineEditorController({
                graph: graph.current,
                selected: new Set([id]),
                svgViewBoxZoom,
            }),
        [id, svgViewBoxZoom]
    );
    const selectedFreeform = controller.getFreeformEditableById(id);
    const handleSize = controller.getHandleSize();

    // Drag frames only refresh the rendered graph. Saving once at gesture end keeps one drag as one undo step.
    /** Refresh the SVG immediately, and optionally persist a graph snapshot for undo history. */
    const refreshEdges = useEvent((save = false) => {
        if (save) dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    });

    /** Convert a browser pointer event into coordinates local to the selected edge's source node. */
    const getLocalPointerPosition = useEvent((event: React.MouseEvent<SVGElement>) => {
        const canvas = document.getElementById('canvas');
        const bbox = canvas?.getBoundingClientRect();
        if (!bbox || !selectedFreeform) return makePoint(0, 0);
        // The editor resolves persisted percentages into source-local SVG coordinates before handling pointer input.
        const point = pointerPosToSVGCoord(
            event.clientX - bbox.left,
            event.clientY - bbox.top,
            svgViewBoxZoom,
            svgViewBoxMin
        );
        return makePoint(point.x - selectedFreeform.source.x, point.y - selectedFreeform.source.y);
    });

    /** Start dragging a middle control point and capture the pointer before the canvas selection layer sees it. */
    const handlePointPointerDown = useEvent((pointId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0 || controller.isEndpointPoint(selectedFreeform, pointId)) {
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setHandleSelection({ edgeId: id, kind: 'point', id: pointId });
        setFreeformDrag({ edgeId: id, kind: 'point', id: pointId });
    });

    /** Start moving a width stop along the centerline. */
    const handleWidthPositionPointerDown = useEvent((stopId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0) {
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setHandleSelection({ edgeId: id, kind: 'width', id: stopId });
        setFreeformDrag({ edgeId: id, kind: 'width-position', id: stopId });
    });

    /** Start resizing a width stop from one of its side handles. */
    const handleWidthSizePointerDown = useEvent((stopId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0) {
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setHandleSelection({ edgeId: id, kind: 'width', id: stopId });
        setFreeformDrag({ edgeId: id, kind: 'width-size', id: stopId });
    });

    /** Remove a control point from the context menu gesture. */
    const handlePointContextMenu = useEvent((pointId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (controller.removeControlPoint(id, pointId)) refreshEdges(true);
        setHandleSelection(undefined);
        setFreeformDrag(undefined);
    });

    /** Double-clicking a control point creates a width stop at its nearest visible centerline position. */
    const handlePointDoubleClick = useEvent((pointId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        const stopId = nanoid(10);
        if (controller.addWidthStopAtPoint(id, pointId, stopId)) {
            refreshEdges(true);
            setHandleSelection({ edgeId: id, kind: 'width', id: stopId });
        }
        setFreeformDrag(undefined);
    });

    /** Remove a width stop from the context menu gesture. */
    const handleWidthContextMenu = useEvent((stopId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (controller.removeWidthStop(id, stopId)) refreshEdges(true);
        setHandleSelection(undefined);
        setFreeformDrag(undefined);
    });

    /** Apply live drag updates without saving undo history for every pointer frame. */
    const handleOverlayPointerMove = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        const editable = controller.getFreeformEditableById(id);
        if (!editable) return;
        event.stopPropagation();
        const localPoint = getLocalPointerPosition(event);
        const updated =
            freeformDrag.kind === 'point'
                ? controller.moveControlPoint(id, freeformDrag.id, localPoint)
                : freeformDrag.kind === 'width-position'
                  ? controller.moveWidthStop(id, freeformDrag.id, localPoint)
                  : controller.resizeWidthStop(id, freeformDrag.id, localPoint);
        if (updated) refreshEdges(false);
    });

    /** Finish the current drag and save exactly one graph snapshot for the completed gesture. */
    const handleOverlayPointerUp = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        event.stopPropagation();
        try {
            (event.target as Element).releasePointerCapture?.(event.pointerId);
        } catch {
            // no-op: the capturing handle can be replaced during drag re-rendering.
        }
        setFreeformDrag(undefined);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    });

    /** Insert a new control point by double-clicking the transparent centerline hit target. */
    const handlePathDoubleClick = useEvent((event: React.MouseEvent<SVGElement>) => {
        if (!selectedFreeform) return;
        event.stopPropagation();
        event.preventDefault();
        const pointId = nanoid(10);
        if (controller.insertControlPoint(id, getLocalPointerPosition(event), pointId)) {
            refreshEdges(true);
            setHandleSelection({ edgeId: id, kind: 'point', id: pointId });
        }
    });

    /** Delete the selected overlay handle without deleting the whole selected edge. */
    const handleKeyDelete = useEvent(() => {
        if (!handleSelection) return false;
        const removed =
            handleSelection.kind === 'point'
                ? controller.removeControlPoint(id, handleSelection.id)
                : controller.removeWidthStop(id, handleSelection.id);
        if (!removed) return false;
        refreshEdges(true);
        setHandleSelection(undefined);
        setFreeformDrag(undefined);
        return true;
    });

    React.useEffect(() => {
        // Capture the key before the canvas can interpret Delete as removing the selected edge as a whole.
        /** Intercept native Delete/Backspace while focus is not inside an editable form control. */
        const handleNativeKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') return;
            const target = event.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (!handleKeyDelete()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        document.addEventListener('keydown', handleNativeKeyDown, true);
        return () => document.removeEventListener('keydown', handleNativeKeyDown, true);
    }, [handleKeyDelete]);

    if (!selectedFreeform) return null;

    const centerlineD = getFreeformCenterlineD(selectedFreeform.attrs);
    const points = selectedFreeform.attrs.points;

    return (
        <g
            transform={`translate(${selectedFreeform.source.x}, ${selectedFreeform.source.y})`}
            onPointerMove={handleOverlayPointerMove}
            onPointerUp={handleOverlayPointerUp}
            onPointerCancel={handleOverlayPointerUp}
        >
            <path
                d={centerlineD}
                fill="none"
                stroke="transparent"
                strokeWidth={handleSize.hitStrokeWidth}
                pointerEvents="stroke"
                onPointerDown={event => event.stopPropagation()}
                onDoubleClick={handlePathDoubleClick}
            />
            <path
                d={centerlineD}
                fill="none"
                stroke="#3182CE"
                strokeWidth={handleSize.guideStrokeWidth}
                strokeDasharray={handleSize.dashArray}
                pointerEvents="none"
            />
            {/* Persisted percentages are resolved into source-local coordinates by the editor controller. */}
            {points.map((point, index) => {
                const isEndpoint = index === 0 || index === points.length - 1;
                const isSelected =
                    handleSelection?.kind === 'point' &&
                    handleSelection.edgeId === selectedFreeform.edgeId &&
                    handleSelection.id === point.id;
                return (
                    <circle
                        key={point.id}
                        cx={point.x}
                        cy={point.y}
                        r={
                            isEndpoint
                                ? handleSize.lockedPointRadius
                                : isSelected
                                  ? handleSize.selectedPointRadius
                                  : handleSize.pointRadius
                        }
                        fill={isEndpoint ? '#718096' : isSelected ? '#2B6CB0' : '#3182CE'}
                        stroke="#FFFFFF"
                        strokeWidth={handleSize.strokeWidth}
                        cursor={isEndpoint ? 'default' : 'move'}
                        pointerEvents={isEndpoint ? 'none' : undefined}
                        onPointerDown={event => handlePointPointerDown(point.id, event)}
                        onContextMenu={event => handlePointContextMenu(point.id, event)}
                        onDoubleClick={event => handlePointDoubleClick(point.id, event)}
                    />
                );
            })}
            {/* Width stops use computed normal handles because their stored data is centerline position + total width. */}
            {selectedFreeform.attrs.widthStops.map(stop => {
                const geometry = getFreeformWidthStopGeometry(selectedFreeform.attrs, stop.id);
                if (!geometry) return null;

                const isSelected =
                    handleSelection?.kind === 'width' &&
                    handleSelection.edgeId === selectedFreeform.edgeId &&
                    handleSelection.id === stop.id;
                const fill = isSelected ? '#C53030' : '#E53E3E';

                return (
                    <g key={stop.id}>
                        <line
                            x1={geometry.start.x}
                            y1={geometry.start.y}
                            x2={geometry.end.x}
                            y2={geometry.end.y}
                            stroke={fill}
                            strokeWidth={handleSize.strokeWidth}
                            pointerEvents="none"
                        />
                        <circle
                            cx={geometry.center.x}
                            cy={geometry.center.y}
                            r={isSelected ? handleSize.selectedWidthStopRadius : handleSize.widthStopRadius}
                            fill={fill}
                            stroke="#FFFFFF"
                            strokeWidth={handleSize.strokeWidth}
                            cursor="grab"
                            onPointerDown={event => handleWidthPositionPointerDown(stop.id, event)}
                            onContextMenu={event => handleWidthContextMenu(stop.id, event)}
                        />
                        <circle
                            cx={geometry.start.x}
                            cy={geometry.start.y}
                            r={isSelected ? handleSize.selectedWidthStopRadius : handleSize.widthStopRadius}
                            fill={fill}
                            stroke="#FFFFFF"
                            strokeWidth={handleSize.strokeWidth}
                            cursor="ew-resize"
                            onPointerDown={event => handleWidthSizePointerDown(stop.id, event)}
                            onContextMenu={event => handleWidthContextMenu(stop.id, event)}
                        />
                    </g>
                );
            })}
        </g>
    );
};
