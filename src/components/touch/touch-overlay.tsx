import React from 'react';
import useEvent from 'react-use-event-hook';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, closeRadialTouchMenu, setActive, setRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory, findNearbyElements } from '../../util/graph-nearby-elements';
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

    // Touch state variables for handling mobile gestures:
    // touchDist: tracks the distance between two fingers for pinch-to-zoom (0 when not zooming)
    const [touchDist, setTouchDist] = React.useState(0);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const handleTouchStart = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length == 1) {
            setTouchDist(0);

            if (radialTouchMenu.visible) {
                // If menu is already open, close it on this touch
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
        } else if (e.touches.length == 2) {
            // Multi-touch for zoom
            dispatch(setActive(undefined));
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            setTouchDist(dx * dx + dy * dy);
        }
    });

    const handleTouchMove = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length == 2 && touchDist > 0) {
            const [dx, dy] = [e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY];
            const d = dx * dx + dy * dy;

            let newSvgViewBoxZoom = svgViewBoxZoom;
            if (d - touchDist < 0 && svgViewBoxZoom + 10 <= 390) newSvgViewBoxZoom = svgViewBoxZoom + 10;
            else if (d - touchDist > 0 && svgViewBoxZoom - 10 >= 10) newSvgViewBoxZoom = svgViewBoxZoom - 10;
            dispatch(setSvgViewBoxZoom(newSvgViewBoxZoom));
            setTouchDist(d);

            // the mid-position the fingers touch will still be in the same place after zooming
            const bbox = e.currentTarget.getBoundingClientRect();
            const [x, y] = [
                (e.touches[0].clientX + e.touches[1].clientX) / 2 - bbox.left,
                (e.touches[0].clientY + e.touches[1].clientY) / 2 - bbox.top,
            ];
            const [x_factor, y_factor] = [x / bbox.width, y / bbox.height];
            dispatch(
                setSvgViewBoxMin({
                    x: svgViewBoxMin.x + (x * svgViewBoxZoom) / 100 - ((width * newSvgViewBoxZoom) / 100) * x_factor,
                    y: svgViewBoxMin.y + (y * svgViewBoxZoom) / 100 - ((height * newSvgViewBoxZoom) / 100) * y_factor,
                })
            );
        }
    });

    const handleTouchEnd = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        // Reset panning state
        setTouchDist(0);
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
