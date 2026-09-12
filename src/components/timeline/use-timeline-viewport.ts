import React from 'react';
import useEvent from 'react-use-event-hook';
import { getMousePosition } from '../../util/helpers';

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export const viewportToTransform = (viewport: Viewport) => {
    const scale = 100 / viewport.zoom;
    return `translate(${-viewport.x * scale}, ${-viewport.y * scale}) scale(${scale})`;
};

/** Shared canvas sizing, panning and pointer-centered zoom for the editor and preview. */
export const useTimelineViewport = (
    viewport: Viewport,
    onViewportChange: (viewport: Viewport) => void,
    onBackgroundClick?: () => void
) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const viewportRef = React.useRef(viewport);
    const [size, setSize] = React.useState({ width: 1, height: 1 });
    const [isPanning, setIsPanning] = React.useState(false);
    const panRef = React.useRef<
        | {
              pointerId: number;
              startX: number;
              startY: number;
              initialX: number;
              initialY: number;
              moved: boolean;
          }
        | undefined
    >(undefined);

    React.useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);

    React.useLayoutEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry)
                setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const applyViewport = useEvent((next: Viewport) => {
        viewportRef.current = next;
        onViewportChange(next);
    });
    const onPointerDown = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (e.target !== e.currentTarget && !(e.target as Element).hasAttribute('data-timeline-background')) return;
        if (e.button !== 0 || panRef.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = getMousePosition(e);
        panRef.current = {
            pointerId: e.pointerId,
            startX: x,
            startY: y,
            initialX: viewportRef.current.x,
            initialY: viewportRef.current.y,
            moved: false,
        };
        setIsPanning(true);
    });
    const onPointerMove = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== e.pointerId) return;
        const { x, y } = getMousePosition(e);
        const dx = ((x - pan.startX) * viewportRef.current.zoom) / 100;
        const dy = ((y - pan.startY) * viewportRef.current.zoom) / 100;
        pan.moved ||= Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
        applyViewport({ x: pan.initialX - dx, y: pan.initialY - dy, zoom: viewportRef.current.zoom });
    });
    const onPointerUp = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        panRef.current = undefined;
        setIsPanning(false);
        if (!pan.moved) onBackgroundClick?.();
    });
    const onPointerCancel = useEvent((e: React.PointerEvent<SVGSVGElement>) => {
        if (panRef.current?.pointerId !== e.pointerId) return;
        panRef.current = undefined;
        setIsPanning(false);
    });
    const onWheel = useEvent((e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const current = viewportRef.current;
        const zoom = Math.max(
            10,
            Math.min(400, current.zoom * Math.exp(e.deltaY * (e.ctrlKey || e.metaKey ? 0.0009 : 0.0015)))
        );
        if (zoom === current.zoom) return;
        const { x, y } = getMousePosition(e);
        applyViewport({
            x: current.x + (x * (current.zoom - zoom)) / 100,
            y: current.y + (y * (current.zoom - zoom)) / 100,
            zoom,
        });
    });

    return {
        containerRef,
        size,
        viewportRef,
        applyViewport,
        isPanning,
        backgroundHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onWheel },
    };
};
