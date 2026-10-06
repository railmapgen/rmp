import { Box } from '@chakra-ui/react';
import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import { Id } from '../../constants/constants';
import { DEFAULT_MAP_STYLE, type MapStyle } from '../../map/map-style';
import type { TimelineGraph } from '../../timeline/timeline-project-context';
import { getTimelineElementCenter } from '../../util/timeline';
import { MapCanvasCore, type MapCanvasHandle } from '../map-canvas';
import { useSvgRenderContext } from '../svg-render-context';
import TimelineSvgCanvas from './timeline-svg-canvas';
import { useTimelineViewport, viewportToTransform, Viewport } from './use-timeline-viewport';

interface TimelineSvgWrapperProps {
    selectedId?: Id;
    highlightedIds?: Set<Id>;
    onSelect: (id: Id | undefined) => void;
    viewport: Viewport;
    onViewportChange: (viewport: Viewport) => void;
    graph?: TimelineGraph;
    mapEnabled?: boolean;
    mapStyle?: MapStyle;
    isSubscriber?: boolean;
}

export interface TimelineSvgHandle {
    focusElement: (id: Id) => void;
}

export default React.forwardRef<TimelineSvgHandle, TimelineSvgWrapperProps>(function TimelineSvgWrapper(
    { selectedId, highlightedIds, onSelect, viewport, onViewportChange, graph, mapEnabled, mapStyle, isSubscriber },
    ref
) {
    const renderContext = useSvgRenderContext();
    const renderGraph = graph ?? renderContext.graph;
    const mapCanvasRef = React.useRef<MapCanvasHandle>(null);
    const { containerRef, svgRef, size, viewportRef, applyViewport, isPanning, backgroundHandlers } =
        useTimelineViewport(viewport, onViewportChange, () => onSelect(undefined));

    React.useEffect(() => {
        mapCanvasRef.current?.updateViewport(viewport);
    }, [viewport]);

    React.useImperativeHandle(
        ref,
        () => ({
            focusElement: (id: Id) => {
                const center = getTimelineElementCenter(renderGraph, id);
                if (!center) return;
                const current = viewportRef.current;
                applyViewport({
                    x: center.x - (size.width * current.zoom) / 200,
                    y: center.y - (size.height * current.zoom) / 200,
                    zoom: current.zoom,
                });
            },
        }),
        [applyViewport, renderGraph, size.height, size.width, viewportRef]
    );

    return (
        <Box ref={containerRef} position="relative" width="100%" height="100%">
            <svg
                id="canvas"
                ref={svgRef}
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
                <defs>
                    <filter id="invisible" colorInterpolationFilters="sRGB">
                        <feColorMatrix type="saturate" values="0" />
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="0.42 0.84" />
                            <feFuncG type="table" tableValues="0.45 0.86" />
                            <feFuncB type="table" tableValues="0.54 0.92" />
                        </feComponentTransfer>
                    </filter>
                </defs>
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
                    <MapCanvasCore
                        ref={mapCanvasRef}
                        mapEnabled={mapEnabled ?? false}
                        mapStyle={mapStyle ?? DEFAULT_MAP_STYLE}
                        initialViewport={viewport}
                    />
                    <utils.SvgAssetsContextProvider>
                        <TimelineSvgCanvas
                            selectedId={selectedId}
                            highlightedIds={highlightedIds}
                            onSelect={onSelect}
                            graph={renderGraph}
                            mapEnabled={mapEnabled ?? false}
                            isSubscriber={isSubscriber ?? false}
                        />
                    </utils.SvgAssetsContextProvider>
                </g>
            </svg>
        </Box>
    );
});
