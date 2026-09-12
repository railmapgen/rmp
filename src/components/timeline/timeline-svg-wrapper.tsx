import { Box } from '@chakra-ui/react';
import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import { Id } from '../../constants/constants';
import { getTimelineElementCenter } from '../../util/timeline';
import TimelineSvgCanvas from './timeline-svg-canvas';
import { useTimelineViewport, viewportToTransform, Viewport } from './use-timeline-viewport';

interface TimelineSvgWrapperProps {
    selectedId?: Id;
    highlightedIds?: Set<Id>;
    onSelect: (id: Id | undefined) => void;
    viewport: Viewport;
    onViewportChange: (viewport: Viewport) => void;
}

export interface TimelineSvgHandle {
    focusElement: (id: Id) => void;
}

export default React.forwardRef<TimelineSvgHandle, TimelineSvgWrapperProps>(function TimelineSvgWrapper(
    { selectedId, highlightedIds, onSelect, viewport, onViewportChange },
    ref
) {
    const graph = React.useRef(window.graph);
    const { containerRef, size, viewportRef, applyViewport, isPanning, backgroundHandlers } = useTimelineViewport(
        viewport,
        onViewportChange,
        () => onSelect(undefined)
    );

    React.useImperativeHandle(
        ref,
        () => ({
            focusElement: (id: Id) => {
                const center = getTimelineElementCenter(graph.current, id);
                if (!center) return;
                const current = viewportRef.current;
                applyViewport({
                    x: center.x - (size.width * current.zoom) / 200,
                    y: center.y - (size.height * current.zoom) / 200,
                    zoom: current.zoom,
                });
            },
        }),
        [applyViewport, size.height, size.width, viewportRef]
    );

    return (
        <Box ref={containerRef} position="relative" width="100%" height="100%">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    userSelect: 'none',
                    touchAction: 'none',
                    cursor: isPanning ? 'grabbing' : 'grab',
                }}
                viewBox={`0 0 ${size.width} ${size.height}`}
                {...backgroundHandlers}
            >
                <rect
                    data-timeline-background
                    x="0"
                    y="0"
                    width={size.width}
                    height={size.height}
                    fill="transparent"
                    pointerEvents="all"
                />
                <g transform={viewportToTransform(viewport)}>
                    <utils.SvgAssetsContextProvider>
                        <TimelineSvgCanvas
                            selectedId={selectedId}
                            highlightedIds={highlightedIds}
                            onSelect={onSelect}
                        />
                    </utils.SvgAssetsContextProvider>
                </g>
            </svg>
        </Box>
    );
});
