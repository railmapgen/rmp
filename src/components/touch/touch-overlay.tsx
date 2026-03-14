import React from 'react';
import useEvent from 'react-use-event-hook';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, closeRadialTouchMenu, setActive, setRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory, findNearbyElements } from '../../util/graph-nearby-elements';
import { TOUCH_RADIAL_DEFER_MS, ZOOM_DAMPING_RANGE, ZOOM_MAX, ZOOM_MIN } from '../../constants/canvas';
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
    const { radialTouchMenu, active } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    // live refs keep zoom/min in sync with the latest dispatch so that consecutive
    // pinch events within the same React batch read up-to-date values instead of
    // the stale Redux snapshot captured at the start of the render.
    const touchDistRef = React.useRef(0);
    const liveZoomRef = React.useRef(svgViewBoxZoom);
    const liveMinRef = React.useRef(svgViewBoxMin);
    liveZoomRef.current = svgViewBoxZoom;
    liveMinRef.current = svgViewBoxMin;

    // delay single-finger logic so a quick second finger (pinch) can cancel it
    const singleTouchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const handleTouchStart = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length >= 2) {
            // cancel any pending single-touch work
            if (singleTouchTimerRef.current) {
                clearTimeout(singleTouchTimerRef.current);
                singleTouchTimerRef.current = null;
            }
            // multi-touch for zoom — only clear active for background drags,
            // not when a node is being interacted with (pointer captured by node)
            if (!active || active === 'background') {
                dispatch(setActive(undefined));
            }
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            touchDistRef.current = dx * dx + dy * dy;
        } else if (e.touches.length === 1) {
            touchDistRef.current = 0;

            if (radialTouchMenu.visible) {
                dispatch(closeRadialTouchMenu());
                return;
            }

            // defer expensive single-finger logic so pinch gestures skip it entirely
            const touch = e.touches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;
            singleTouchTimerRef.current = setTimeout(() => {
                singleTouchTimerRef.current = null;
                const bbox = document.getElementById('canvas')?.getBoundingClientRect();
                if (!bbox) return;
                const relativeX = clientX - bbox.left;
                const relativeY = clientY - bbox.top;
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
            }, TOUCH_RADIAL_DEFER_MS);
        }
    });

    const handleTouchMove = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        // safety: cancel single-touch timer if somehow still pending during multi-touch
        if (e.touches.length >= 2 && singleTouchTimerRef.current) {
            clearTimeout(singleTouchTimerRef.current);
            singleTouchTimerRef.current = null;
        }
        if (e.touches.length === 2 && touchDistRef.current > 0) {
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            const d = dx * dx + dy * dy;

            const currentZoom = liveZoomRef.current;
            const currentMin = liveMinRef.current;

            // continuous multiplicative zoom based on pinch distance ratio
            let ratio = Math.sqrt(d / touchDistRef.current);
            // dampen near ZOOM_MIN / ZOOM_MAX so the user feels deceleration
            const rawPinch = currentZoom / ratio;
            if (rawPinch < ZOOM_MIN + ZOOM_DAMPING_RANGE && ratio > 1) {
                const t = Math.max(0, (currentZoom - ZOOM_MIN) / ZOOM_DAMPING_RANGE);
                ratio = 1 + (ratio - 1) * t;
            } else if (rawPinch > ZOOM_MAX - ZOOM_DAMPING_RANGE && ratio < 1) {
                const t = Math.max(0, (ZOOM_MAX - currentZoom) / ZOOM_DAMPING_RANGE);
                ratio = 1 + (ratio - 1) * t;
            }
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
        // cancel single-touch timer only when all fingers are lifted.
        // during a pinch the timer is already cleared in handleTouchStart,
        // so this guard is a belt-and-suspenders safety net.
        if (e.touches.length === 0 && singleTouchTimerRef.current) {
            clearTimeout(singleTouchTimerRef.current);
            singleTouchTimerRef.current = null;
        }
        // reset pinch state so one remaining finger doesn't continue zooming
        touchDistRef.current = 0;
    });

    // cleanup timer on unmount
    React.useEffect(() => {
        return () => {
            if (singleTouchTimerRef.current) {
                clearTimeout(singleTouchTimerRef.current);
            }
        };
    }, []);

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
