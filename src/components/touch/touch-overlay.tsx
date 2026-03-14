import React from 'react';
import useEvent from 'react-use-event-hook';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, closeRadialTouchMenu, setActive, setRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory, findNearbyElements } from '../../util/graph-nearby-elements';
import { ZOOM_MAX, ZOOM_MIN } from '../../constants/canvas';
import { getCanvasSize, pointerPosToSVGCoord } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';

/**
 * TouchOverlay component handles all touch interactions for mobile devices.
 * It provides two main behaviors:
 * 1. When touching near elements: Shows radial menu for element interaction
 * 2. When touching empty space: Enables canvas panning and pinch-to-zoom
 */
export const TouchOverlay: React.FC = () => {
    const dispatch = useRootDispatch();
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const { radialTouchMenu } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    // live refs keep zoom/min in sync with the latest dispatch so that consecutive
    // pinch events within the same React batch read up-to-date values instead of
    // the stale Redux snapshot captured at the start of the render.
    const touchDistRef = React.useRef(0);
    const liveZoomRef = React.useRef(svgViewBoxZoom);
    const liveMinRef = React.useRef(svgViewBoxMin);
    liveZoomRef.current = svgViewBoxZoom;
    liveMinRef.current = svgViewBoxMin;

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const handleTouchStart = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length >= 2) {
            // multi-touch for zoom
            dispatch(setActive(undefined));
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            touchDistRef.current = dx * dx + dy * dy;
        } else if (e.touches.length === 1) {
            touchDistRef.current = 0;

            if (radialTouchMenu.visible) {
                dispatch(closeRadialTouchMenu());
                return;
            }

            const touch = e.touches[0];
            const bbox = document.getElementById('canvas')?.getBoundingClientRect();
            if (!bbox) return;
            const relativeX = touch.clientX - bbox.left;
            const relativeY = touch.clientY - bbox.top;
            const svgCoord = pointerPosToSVGCoord(relativeX, relativeY, svgViewBoxZoom, svgViewBoxMin);
            const nearbyElements = findNearbyElements(graph.current, svgCoord, dispatch);
            if (
                [
                    ...nearbyElements[MenuCategory.STATION],
                    ...nearbyElements[MenuCategory.MISC_NODE],
                    ...nearbyElements[MenuCategory.LINE],
                ].length > 0
            ) {
                dispatch(
                    setRadialTouchMenu({
                        visible: true,
                        position: svgCoord,
                        data: nearbyElements,
                    })
                );
            } else {
                dispatch(clearSelected());
                dispatch(closeRadialTouchMenu());
            }
        }
    });

    const handleTouchMove = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length === 2 && touchDistRef.current > 0) {
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            const d = dx * dx + dy * dy;

            const currentZoom = liveZoomRef.current;
            const currentMin = liveMinRef.current;

            // continuous multiplicative zoom based on pinch distance ratio
            const ratio = Math.sqrt(d / touchDistRef.current);
            const newSvgViewBoxZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, currentZoom / ratio));

            // the mid-position the fingers touch will still be in the same place after zooming
            const bbox = e.currentTarget.getBoundingClientRect();
            const [x, y] = [
                (e.touches[0].clientX + e.touches[1].clientX) / 2 - bbox.left,
                (e.touches[0].clientY + e.touches[1].clientY) / 2 - bbox.top,
            ];
            const [x_factor, y_factor] = [x / bbox.width, y / bbox.height];
            const newMin = {
                x: currentMin.x + (x * currentZoom) / 100 - ((width * newSvgViewBoxZoom) / 100) * x_factor,
                y: currentMin.y + (y * currentZoom) / 100 - ((height * newSvgViewBoxZoom) / 100) * y_factor,
            };

            liveZoomRef.current = newSvgViewBoxZoom;
            liveMinRef.current = newMin;
            touchDistRef.current = d;

            dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
            dispatch(setSvgViewBoxMin(newMin));
        }
    });

    const handleTouchEnd = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        // reset pinch state
        touchDistRef.current = 0;
    });

    return (
        <rect
            className="removeMe"
            x={svgViewBoxMin.x}
            y={svgViewBoxMin.y}
            width={(width * svgViewBoxZoom) / 100}
            height={(height * svgViewBoxZoom) / 100}
            fill={radialTouchMenu.visible ? 'rgba(0,0,0,0.3)' : 'transparent'}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
    );
};

export default TouchOverlay;
