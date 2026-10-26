import { Box } from '@chakra-ui/react';
import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import { Id } from '../../constants/constants';
import { DEFAULT_MAP_STYLE, type MapStyle } from '../../map/map-style';
import type { TimelineGraph } from '../../timeline/timeline-project-context';
import { getTimelineElementCenter } from '../../util/timeline';
import { calculateCanvasSize } from '../../util/helpers';
import { MapCanvasCore, type MapCanvasHandle } from '../map-canvas';
import { useSvgRenderContext } from '../svg-render-context';
import TimelineSvgCanvas from './timeline-svg-canvas';
import { useTimelineViewport, viewportToTransform, Viewport } from './use-timeline-viewport';

interface TimelineSvgWrapperProps {
    selectedId?: Id;
    selectedIds?: Set<Id>;
    visibleIds?: Set<Id>;
    highlightedIds?: Set<Id>;
    onSelect: (id: Id | undefined) => void;
    viewport: Viewport;
    onViewportChange: (viewport: Viewport) => void;
    graph?: TimelineGraph;
    mapEnabled?: boolean;
    mapStyle?: MapStyle;
    isSubscriber?: boolean;
    fitToGraph?: boolean;
    readOnly?: boolean;
    canvasId?: string;
}

export interface TimelineSvgHandle {
    focusElement: (id: Id) => void;
}

export default React.forwardRef<TimelineSvgHandle, TimelineSvgWrapperProps>(function TimelineSvgWrapper(
    {
        selectedId,
        selectedIds,
        visibleIds,
        highlightedIds,
        onSelect,
        viewport,
        onViewportChange,
        graph,
        mapEnabled,
        mapStyle,
        isSubscriber,
        fitToGraph = false,
        readOnly = false,
        canvasId = 'canvas',
    },
    ref
) {
    const renderContext = useSvgRenderContext();
    const renderGraph = graph ?? renderContext.graph;
    const mapCanvasRef = React.useRef<MapCanvasHandle>(null);
    const [fittedViewport, setFittedViewport] = React.useState<Viewport>();
    const { containerRef, svgRef, size, viewportRef, applyViewport, isPanning, backgroundHandlers } =
        useTimelineViewport(viewport, onViewportChange, () => onSelect(undefined));
    const effectiveViewport = fitToGraph && readOnly ? (fittedViewport ?? viewport) : viewport;

    React.useLayoutEffect(() => {
        if (!fitToGraph || size.width <= 1 || size.height <= 1) return;
        // Measure the existing editor canvas so the overview keeps the full map extent
        // even when its own layer contains only the chosen resources.
        const bounds = calculateCanvasSize(renderGraph);
        const zoom =
            Math.max((bounds.xMax - bounds.xMin) / size.width, (bounds.yMax - bounds.yMin) / size.height) * 100;
        const next = {
            x: (bounds.xMin + bounds.xMax - (size.width * zoom) / 100) / 2,
            y: (bounds.yMin + bounds.yMax - (size.height * zoom) / 100) / 2,
            zoom,
        };
        if (readOnly) setFittedViewport(next);
        else applyViewport(next);
    }, [fitToGraph, readOnly, renderGraph, renderContext.fontRevision, size.width, size.height, applyViewport]);

    React.useEffect(() => {
        mapCanvasRef.current?.updateViewport(effectiveViewport);
    }, [effectiveViewport]);

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
                id={canvasId}
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    userSelect: 'none',
                    touchAction: 'none',
                    cursor: readOnly ? 'default' : isPanning ? 'grabbing' : 'grab',
                    pointerEvents: readOnly ? 'none' : undefined,
                }}
                viewBox={`0 0 ${size.width} ${size.height}`}
                {...(readOnly ? {} : backgroundHandlers)}
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
                <g transform={viewportToTransform(effectiveViewport)}>
                    <MapCanvasCore
                        ref={mapCanvasRef}
                        mapEnabled={mapEnabled ?? false}
                        mapStyle={mapStyle ?? DEFAULT_MAP_STYLE}
                        initialViewport={effectiveViewport}
                        forceDetailed
                    />
                    <utils.SvgAssetsContextProvider>
                        <TimelineSvgCanvas
                            selectedId={selectedId}
                            selectedIds={selectedIds}
                            visibleIds={visibleIds}
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
