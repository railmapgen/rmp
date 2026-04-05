import React from 'react';
import useEvent from 'react-use-event-hook';
import { StnId } from '../constants/constants';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { refreshNodesThunk, setActive, setMode } from '../redux/runtime/runtime-slice';
import { offsetNodeTransform } from './imperative-dom';

interface NameDragState {
    startClientX: number;
    startClientY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    lastDeltaX: number;
    lastDeltaY: number;
    type: string;
}

/**
 * Hook for dragging station name labels with precise offsets.
 *
 * During drag, only imperative DOM updates are performed (via offsetNodeTransform).
 * The graph is updated once on pointer up, avoiding per-frame graph serialization
 * that would otherwise be triggered by useGraphEvents.
 *
 * Usage in a station component:
 * ```tsx
 * const nameDragHandlers = useNameDrag(id);
 * return <g id={`stn_name_${id}`} {...nameDragHandlers}>...</g>;
 * ```
 */
export const useNameDrag = (id: StnId) => {
    const graph = React.useRef(window.graph);
    const dispatch = useRootDispatch();
    const selected = useRootSelector(state => state.runtime.selected);
    const active = useRootSelector(state => state.runtime.active);
    const mode = useRootSelector(state => state.runtime.mode);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);

    const dragRef = React.useRef<NameDragState | null>(null);

    const onPointerDown = useEvent((e: React.PointerEvent<SVGElement>) => {
        if (!selected.has(id)) return;

        const type = graph.current.getNodeAttribute(id, 'type');

        const attr = (graph.current.getNodeAttributes(id) as any)[type];
        if (!attr || !('preciseNameOffsets' in attr) || !attr.preciseNameOffsets) return;

        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);

        dragRef.current = {
            startClientX: e.clientX,
            startClientY: e.clientY,
            initialOffsetX: attr.preciseNameOffsets.x,
            initialOffsetY: attr.preciseNameOffsets.y,
            lastDeltaX: 0,
            lastDeltaY: 0,
            type,
        };

        dispatch(setMode('free'));
        dispatch(setActive(id));
    });

    const onPointerMove = useEvent((e: React.PointerEvent<SVGElement>) => {
        if (!dragRef.current || mode !== 'free' || active !== id) return;

        e.currentTarget.setPointerCapture(e.pointerId);

        // Total delta from drag start, in SVG coordinates
        const totalDeltaX = -((dragRef.current.startClientX - e.clientX) * svgViewBoxZoom) / 100;
        const totalDeltaY = -((dragRef.current.startClientY - e.clientY) * svgViewBoxZoom) / 100;

        // Incremental delta for DOM update (offsetNodeTransform adds to existing translate)
        const incrementX = totalDeltaX - dragRef.current.lastDeltaX;
        const incrementY = totalDeltaY - dragRef.current.lastDeltaY;

        dragRef.current.lastDeltaX = totalDeltaX;
        dragRef.current.lastDeltaY = totalDeltaY;

        // Only imperative DOM update — no graph mutation during drag
        offsetNodeTransform(`stn_name_${id}` as `stn_${string}`, incrementX, incrementY);
    });

    const onPointerUp = useEvent((e: React.PointerEvent<SVGElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (dragRef.current && mode === 'free') {
            const hasMoved = dragRef.current.startClientX !== e.clientX || dragRef.current.startClientY !== e.clientY;

            if (hasMoved) {
                const totalDeltaX = -((dragRef.current.startClientX - e.clientX) * svgViewBoxZoom) / 100;
                const totalDeltaY = -((dragRef.current.startClientY - e.clientY) * svgViewBoxZoom) / 100;

                const { type } = dragRef.current;

                const attr = (graph.current.getNodeAttributes(id) as any)[type];

                // Update graph once with final position
                graph.current.mergeNodeAttributes(id, {
                    [type]: {
                        ...attr,
                        preciseNameOffsets: {
                            ...attr.preciseNameOffsets,
                            x: dragRef.current.initialOffsetX + totalDeltaX,
                            y: dragRef.current.initialOffsetY + totalDeltaY,
                        },
                    },
                });

                dispatch(saveGraph(graph.current.export()));
                dispatch(refreshNodesThunk());
            }
        }

        dragRef.current = null;
        dispatch(setActive(undefined));
    });

    return { onPointerDown, onPointerMove, onPointerUp };
};
