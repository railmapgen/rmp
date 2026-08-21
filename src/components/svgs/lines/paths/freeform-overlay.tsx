import { nanoid } from 'nanoid';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { LinePathOverlayProps } from '../../../../constants/lines';
import { makePoint } from '../../../../constants/path';
import { useRootDispatch } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../../redux/runtime/runtime-slice';
import { pointerPosToSVGCoord } from '../../../../util/helpers';
import { FreeformLineEditorController } from './freeform-editor-controller';
import { makeFreeformOpenPath } from './freeform-geometry';

type FreeformHandleSelection = { edgeId: string; id: string } | undefined;
type FreeformDrag = { edgeId: string; id: string } | undefined;

/**
 * Render and handle the control-point editor for a selected Freeform line.
 *
 * Graph mutation and coordinate normalization remain in the controller so this component is a thin SVG interaction
 * layer.
 */
export const FreeformLineOverlay = ({ id, svgViewBoxZoom, svgViewBoxMin }: LinePathOverlayProps) => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const [freeformDrag, setFreeformDrag] = React.useState<FreeformDrag>();
    const [handleSelection, setHandleSelection] = React.useState<FreeformHandleSelection>();

    const controller = React.useMemo(
        () =>
            new FreeformLineEditorController({
                graph: graph.current,
                svgViewBoxZoom,
            }),
        [svgViewBoxZoom]
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
        const bbox = document.getElementById('canvas')?.getBoundingClientRect();
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

    /** Start dragging a middle control point before the canvas selection layer sees the event. */
    const handlePointPointerDown = useEvent((pointId: string, event: React.PointerEvent<SVGElement>) => {
        if (!selectedFreeform || event.button !== 0 || controller.isEndpointPoint(selectedFreeform, pointId)) {
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setHandleSelection({ edgeId: id, id: pointId });
        setFreeformDrag({ edgeId: id, id: pointId });
    });

    /** Remove a control point from the context-menu gesture. */
    const handlePointContextMenu = useEvent((pointId: string, event: React.MouseEvent<SVGElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (controller.removeControlPoint(id, pointId)) refreshEdges(true);
        setHandleSelection(undefined);
        setFreeformDrag(undefined);
    });

    /** Apply live drag updates without saving undo history for every pointer frame. */
    const handleOverlayPointerMove = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        event.stopPropagation();
        if (controller.moveControlPoint(id, freeformDrag.id, getLocalPointerPosition(event))) refreshEdges();
    });

    /** Finish the current drag and save exactly one graph snapshot. */
    const handleOverlayPointerUp = useEvent((event: React.PointerEvent<SVGElement>) => {
        if (!freeformDrag) return;
        event.stopPropagation();
        try {
            (event.target as Element).releasePointerCapture?.(event.pointerId);
        } catch {
            // The capturing handle can be replaced during drag re-rendering.
        }
        setFreeformDrag(undefined);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    });

    /** Insert a control point by double-clicking the transparent centerline hit target. */
    const handlePathDoubleClick = useEvent((event: React.MouseEvent<SVGElement>) => {
        if (!selectedFreeform) return;
        event.stopPropagation();
        event.preventDefault();
        const pointId = nanoid(10);
        if (controller.insertControlPoint(id, getLocalPointerPosition(event), pointId)) {
            refreshEdges(true);
            setHandleSelection({ edgeId: id, id: pointId });
        }
    });

    /** Delete the selected control point without deleting the selected edge. */
    const handleKeyDelete = useEvent(() => {
        if (!handleSelection || !controller.removeControlPoint(id, handleSelection.id)) return false;
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

    const centerlineD = makeFreeformOpenPath(selectedFreeform.attrs).d;
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
                    handleSelection?.edgeId === selectedFreeform.edgeId && handleSelection.id === point.id;
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
                    />
                );
            })}
        </g>
    );
};
