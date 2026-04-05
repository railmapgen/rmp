import React from 'react';
import { StnId } from '../constants/constants';
import { StationAttributes, StationType } from '../constants/stations';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import { refreshNodesThunk } from '../redux/runtime/runtime-slice';

export interface NameLayout {
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
}

interface DragState {
    startClientX: number;
    startClientY: number;
    initialLayout: NameLayout;
}

const useStationAttrsUpdate = <T extends StationAttributes>(id: StnId, type: StationType) => {
    const dispatch = useRootDispatch();

    return React.useCallback(
        (nextAttrs: T) => {
            window.graph.mergeNodeAttributes(id, { [type]: nextAttrs });
            dispatch(saveGraph(window.graph.export()));
            dispatch(refreshNodesThunk());
        },
        [dispatch, id, type]
    );
};

export const useDraggableStationName = <T extends StationAttributes>(
    id: StnId,
    type: StationType,
    fallbackLayout: NameLayout
) => {
    const handleAttrsUpdate = useStationAttrsUpdate<T>(id, type);
    const selected = useRootSelector(state => state.runtime.selected);
    const mode = useRootSelector(state => state.runtime.mode);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);

    const dragRef = React.useRef<DragState | null>(null);
    const [previewPreciseNameOffsets, setPreviewPreciseNameOffsets] = React.useState<NameLayout | null>(null);

    const canDrag = mode === 'free' && selected.has(id);
    const getCurrentAttrs = React.useCallback(
        () => window.graph.getNodeAttribute(id, type) as unknown as T,
        [id, type]
    );

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGGElement>) => {
            if (!canDrag) return;

            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);

            const currentAttrs = getCurrentAttrs();
            const initialLayout = currentAttrs.preciseNameOffsets ?? fallbackLayout;
            dragRef.current = {
                startClientX: e.clientX,
                startClientY: e.clientY,
                initialLayout,
            };
            setPreviewPreciseNameOffsets(initialLayout);
        },
        [canDrag, fallbackLayout, getCurrentAttrs]
    );

    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGGElement>) => {
            if (!dragRef.current) return;

            const deltaX = -((dragRef.current.startClientX - e.clientX) * svgViewBoxZoom) / 100;
            const deltaY = -((dragRef.current.startClientY - e.clientY) * svgViewBoxZoom) / 100;

            setPreviewPreciseNameOffsets({
                ...dragRef.current.initialLayout,
                x: dragRef.current.initialLayout.x + deltaX,
                y: dragRef.current.initialLayout.y + deltaY,
            });
        },
        [svgViewBoxZoom]
    );

    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGGElement>) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }

            if (!dragRef.current) return;

            const deltaX = -((dragRef.current.startClientX - e.clientX) * svgViewBoxZoom) / 100;
            const deltaY = -((dragRef.current.startClientY - e.clientY) * svgViewBoxZoom) / 100;
            const nextLayout = {
                ...dragRef.current.initialLayout,
                x: dragRef.current.initialLayout.x + deltaX,
                y: dragRef.current.initialLayout.y + deltaY,
            };

            dragRef.current = null;
            setPreviewPreciseNameOffsets(null);

            if (deltaX === 0 && deltaY === 0) return;

            const currentAttrs = getCurrentAttrs();
            handleAttrsUpdate({
                ...currentAttrs,
                preciseNameOffsets: nextLayout,
            });
        },
        [getCurrentAttrs, handleAttrsUpdate, svgViewBoxZoom]
    );

    const onPointerCancel = React.useCallback((e: React.PointerEvent<SVGGElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        dragRef.current = null;
        setPreviewPreciseNameOffsets(null);
    }, []);

    return {
        canDrag,
        dragHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
        },
        previewPreciseNameOffsets,
    };
};
