import { Box } from '@chakra-ui/react';
import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Id, LineId, NodeId } from '../../constants/constants';
import { TimelineDocument, TimelineKeyframeEntry } from '../../constants/timeline';
import { useRootSelector } from '../../redux';
import { roundToMultiple } from '../../util/helpers';
import { getLines, getNodes } from '../../util/process-elements';
import { getTimelinePreviewState } from '../../util/timeline';
import SvgLayer from '../svg-layer';
import { useTimelineViewport, viewportToTransform, Viewport } from './use-timeline-viewport';

const getTimelinePointerPosition = (e: React.PointerEvent<SVGElement>) => {
    // Use the stationary root SVG rather than the dragged station as the coordinate origin.
    const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget;
    const bounds = svg.getBoundingClientRect();
    return {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
    };
};

interface TimelinePreviewProps {
    document: TimelineDocument;
    cursor: number;
    viewport: Viewport;
    /**
     * The keyframe clip currently selected in the track, if any.
     * Its referenced node becomes draggable in this preview.
     */
    editableKeyframe?: TimelineKeyframeEntry;
    onKeyframeMove: (entryId: string, x: number, y: number) => void;
    onViewportChange: (viewport: Viewport) => void;
}

export default function TimelinePreview({
    document,
    cursor,
    viewport,
    editableKeyframe,
    onKeyframeMove,
    onViewportChange,
}: TimelinePreviewProps) {
    const { containerRef, size, isPanning, backgroundHandlers } = useTimelineViewport(viewport, onViewportChange);
    const graph = React.useRef(window.graph);
    const [dragPosition, setDragPosition] = React.useState<{ x: number; y: number } | undefined>(undefined);
    const dragStateRef = React.useRef<
        | {
              pointerId: number;
              startX: number;
              startY: number;
              originX: number;
              originY: number;
          }
        | undefined
    >(undefined);

    const {
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const isSubscriber = useRootSelector(state => state.account.activeSubscriptions.RMP_CLOUD);

    const previewState = React.useMemo(
        () => getTimelinePreviewState(graph.current, document, cursor),
        [document, cursor, refreshNodes, refreshEdges]
    );

    const elements = React.useMemo(() => {
        const overrides = new Map(previewState.positions);
        if (dragPosition && editableKeyframe) overrides.set(editableKeyframe.refId, dragPosition);

        const target = graph.current.copy();
        overrides.forEach((position, id) => {
            if (target.hasNode(id)) target.mergeNodeAttributes(id, position);
        });
        // Filter authored edges before getLines joins reconciled segments into a single render element.
        for (const id of target.edges()) {
            if (!previewState.visibleIds.has(id as LineId)) target.dropEdge(id);
        }

        return [
            ...getLines(target, { showReconcileWarnings: false }),
            ...getNodes(target).filter(element => previewState.visibleIds.has(element.id)),
        ];
    }, [previewState, dragPosition, editableKeyframe, refreshNodes, refreshEdges]);

    const selected = React.useMemo(
        () => (editableKeyframe ? new Set<Id>([editableKeyframe.refId]) : new Set<Id>()),
        [editableKeyframe]
    );

    const handlePointerDown = useEvent((node: NodeId, e: React.PointerEvent<SVGElement>) => {
        if (!editableKeyframe || node !== editableKeyframe.refId || e.button !== 0) return;

        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = getTimelinePointerPosition(e);
        dragStateRef.current = {
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            originX: editableKeyframe.x,
            originY: editableKeyframe.y,
        };
        setDragPosition({ x: editableKeyframe.x, y: editableKeyframe.y });
    });

    const handlePointerMove = useEvent((node: NodeId, e: React.PointerEvent<SVGElement>) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== e.pointerId) return;

        const { x, y } = getTimelinePointerPosition(e);
        const dx = ((x - dragState.startX) * viewport.zoom) / 100;
        const dy = ((y - dragState.startY) * viewport.zoom) / 100;
        setDragPosition({
            x: roundToMultiple(dragState.originX + dx, 0.01),
            y: roundToMultiple(dragState.originY + dy, 0.01),
        });
    });

    const handlePointerUp = useEvent((node: NodeId, e: React.PointerEvent<SVGElement>) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== e.pointerId) return;

        e.currentTarget.releasePointerCapture(e.pointerId);
        dragStateRef.current = undefined;
        if (dragPosition && editableKeyframe) {
            onKeyframeMove(editableKeyframe.id, dragPosition.x, dragPosition.y);
        }
        setDragPosition(undefined);
    });

    const handleNoop = useEvent(() => {});
    const handlePointerCancel = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        backgroundHandlers.onPointerCancel(e);
        if (dragStateRef.current?.pointerId !== e.pointerId) return;
        dragStateRef.current = undefined;
        setDragPosition(undefined);
    });
    return (
        <Box ref={containerRef} position="relative" width="100%" height="100%" overflow="hidden">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    userSelect: 'none',
                    touchAction: 'none',
                    cursor: isPanning ? 'grabbing' : editableKeyframe ? 'move' : 'grab',
                }}
                viewBox={`0 0 ${size.width} ${size.height}`}
                {...backgroundHandlers}
                onPointerCancel={handlePointerCancel}
            >
                <g transform={viewportToTransform(viewport)}>
                    <utils.SvgAssetsContextProvider>
                        <SvgLayer
                            elements={elements}
                            selected={selected}
                            mapEnabled={mapEnabled}
                            isSubscriber={isSubscriber}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                            handleEdgePointerDown={handleNoop}
                            handleEdgeDoubleClick={handleNoop}
                        />
                    </utils.SvgAssetsContextProvider>
                </g>
            </svg>
        </Box>
    );
}
