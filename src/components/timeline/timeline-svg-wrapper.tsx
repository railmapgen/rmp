import { Box } from '@chakra-ui/react';
import { utils } from '@railmapgen/svg-assets';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { Id } from '../../constants/constants';
import { useRootSelector } from '../../redux';
import { getMousePosition } from '../../util/helpers';
import { getTimelineElementCenter } from '../../util/timeline';
import TimelineSvgCanvas from './timeline-svg-canvas';

interface TimelineSvgWrapperProps {
    selectedId?: Id;
    onSelect: (id: Id | undefined) => void;
}

export interface TimelineSvgHandle {
    focusElement: (id: Id) => void;
}

interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 400;

const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

const viewportToTransform = (viewport: Viewport) => {
    const scale = 100 / viewport.zoom;
    return `translate(${-viewport.x * scale}, ${-viewport.y * scale}) scale(${scale})`;
};

export default React.forwardRef<TimelineSvgHandle, TimelineSvgWrapperProps>(function TimelineSvgWrapper(
    { selectedId, onSelect },
    ref
) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const graph = React.useRef(window.graph);

    const { svgViewBoxMin, svgViewBoxZoom } = useRootSelector(state => state.param);

    const [size, setSize] = React.useState({ width: 1, height: 1 });
    const [viewport, setViewport] = React.useState<Viewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });
    const viewportStateRef = React.useRef<Viewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });
    const dragStateRef = React.useRef<{
        pointerId?: number;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        moved: boolean;
    }>({
        startX: 0,
        startY: 0,
        initialX: svgViewBoxMin.x,
        initialY: svgViewBoxMin.y,
        moved: false,
    });

    const applyViewport = React.useCallback((nextViewport: Viewport) => {
        viewportStateRef.current = nextViewport;
        setViewport(nextViewport);
    }, []);

    React.useEffect(() => {
        const nextViewport = {
            x: svgViewBoxMin.x,
            y: svgViewBoxMin.y,
            zoom: svgViewBoxZoom,
        };
        viewportStateRef.current = nextViewport;
        setViewport(nextViewport);
    }, [svgViewBoxMin.x, svgViewBoxMin.y, svgViewBoxZoom]);

    React.useLayoutEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;

            setSize({
                width: Math.max(1, entry.contentRect.width),
                height: Math.max(1, entry.contentRect.height),
            });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    React.useImperativeHandle(
        ref,
        () => ({
            focusElement: (id: Id) => {
                const center = getTimelineElementCenter(graph.current, id);
                if (!center) return;

                const currentViewport = viewportStateRef.current;
                applyViewport({
                    x: center.x - (size.width * currentViewport.zoom) / 200,
                    y: center.y - (size.height * currentViewport.zoom) / 200,
                    zoom: currentViewport.zoom,
                });
            },
        }),
        [applyViewport, size.height, size.width]
    );

    const handleBackgroundDown = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = getMousePosition(e);
        const currentViewport = viewportStateRef.current;

        dragStateRef.current = {
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            initialX: currentViewport.x,
            initialY: currentViewport.y,
            moved: false,
        };
    });

    const handleBackgroundMove = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (dragStateRef.current.pointerId !== e.pointerId) return;

        const { x, y } = getMousePosition(e);
        const dx = ((x - dragStateRef.current.startX) * viewportStateRef.current.zoom) / 100;
        const dy = ((y - dragStateRef.current.startY) * viewportStateRef.current.zoom) / 100;

        if (!dragStateRef.current.moved && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
            dragStateRef.current.moved = true;
        }

        applyViewport({
            x: dragStateRef.current.initialX - dx,
            y: dragStateRef.current.initialY - dy,
            zoom: viewportStateRef.current.zoom,
        });
    });

    const handleBackgroundUp = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (dragStateRef.current.pointerId !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (!dragStateRef.current.moved) {
            onSelect(undefined);
        }

        dragStateRef.current.pointerId = undefined;
    });

    const handleBackgroundCancel = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (dragStateRef.current.pointerId !== e.pointerId) return;
        dragStateRef.current.pointerId = undefined;
    });

    const handleWheel = useEvent((e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();

        const currentViewport = viewportStateRef.current;
        const zoomIntensity = e.ctrlKey || e.metaKey ? 0.0009 : 0.0015;
        const scaleMultiplier = Math.exp(e.deltaY * zoomIntensity);
        const newZoom = clampZoom(currentViewport.zoom * scaleMultiplier);

        if (newZoom === currentViewport.zoom) return;

        const { x, y } = getMousePosition(e);

        applyViewport({
            x: currentViewport.x + (x * currentViewport.zoom) / 100 - (x * newZoom) / 100,
            y: currentViewport.y + (y * currentViewport.zoom) / 100 - (y * newZoom) / 100,
            zoom: newZoom,
        });
    });

    const handleSelect = React.useCallback(
        (id: Id) => {
            onSelect(id);
        },
        [onSelect]
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
                    cursor: dragStateRef.current.pointerId ? 'grabbing' : 'grab',
                }}
                viewBox={`0 0 ${size.width} ${size.height}`}
                onPointerDown={handleBackgroundDown}
                onPointerMove={handleBackgroundMove}
                onPointerUp={handleBackgroundUp}
                onPointerCancel={handleBackgroundCancel}
                onWheel={handleWheel}
            >
                <defs>
                    <pattern id="timeline-opaque" width="5" height="5" patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="2.5" height="2.5" fill="black" fillOpacity="50%" />
                        <rect x="2.5" y="2.5" width="2.5" height="2.5" fill="black" fillOpacity="50%" />
                    </pattern>
                </defs>
                <rect x="0" y="0" width={size.width} height={size.height} fill="transparent" pointerEvents="all" />
                <g transform={viewportToTransform(viewport)}>
                    <utils.SvgAssetsContextProvider>
                        <TimelineSvgCanvas selectedId={selectedId} onSelect={handleSelect} />
                    </utils.SvgAssetsContextProvider>
                </g>
            </svg>
        </Box>
    );
});
