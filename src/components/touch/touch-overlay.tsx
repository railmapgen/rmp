import React, { useCallback, useState } from 'react';
import useEvent from 'react-use-event-hook';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, setActive } from '../../redux/runtime/runtime-slice';
import { getCanvasSize, pointerPosToSVGCoord } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import {
    MenuCategory,
    MenuLayerData,
    emptyMenuLayerData,
    useNearbyElements,
} from '../../util/hooks/use-nearby-elements';
import RadialTouchMenu from './radial-touch-menu';

interface MenuState {
    visible: boolean;
    position: { x: number; y: number };
    data: MenuLayerData;
}

/**
 * TouchOverlay component handles all touch interactions for mobile devices.
 * It provides two main behaviors:
 * 1. When touching near elements: Shows radial menu for element interaction
 * 2. When touching empty space: Enables canvas panning and pinch-to-zoom
 */
export const TouchOverlay: React.FC = () => {
    const dispatch = useRootDispatch();
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const graph = React.useRef(window.graph);
    const { findNearbyElements } = useNearbyElements();

    // Touch state variables for handling mobile gestures:
    // touchDist: tracks the distance between two fingers for pinch-to-zoom (0 when not zooming)
    const [touchDist, setTouchDist] = React.useState(0);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    // Radial menu state
    const [menuState, setMenuState] = useState<MenuState>({
        visible: false,
        position: { x: 0, y: 0 },
        data: emptyMenuLayerData,
    });

    const handleTouchStart = useEvent((e: React.TouchEvent<SVGRectElement>) => {
        if (e.touches.length == 1) {
            setTouchDist(0);

            if (menuState.visible) {
                // If menu is already open, close it on this touch
                handleCloseMenu();
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
                setMenuState({
                    visible: true,
                    position: svgCoord, // use svg coords directly
                    data: nearbyElements,
                });
            } else {
                dispatch(clearSelected());
                handleCloseMenu();
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

    const handleCloseMenu = useCallback(() => {
        setMenuState({
            visible: false,
            position: { x: 0, y: 0 },
            data: emptyMenuLayerData,
        });
    }, []);

    return (
        <g className="removeMe">
            {/* Interaction overlay rect */}
            <rect
                x={svgViewBoxMin.x}
                y={svgViewBoxMin.y}
                width={(width * svgViewBoxZoom) / 100}
                height={(height * svgViewBoxZoom) / 100}
                fill={menuState.visible ? 'rgba(0,0,0,0.3)' : 'transparent'}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />
            {/* Radial touch menu (SVG elements only) */}
            <RadialTouchMenu
                data={menuState.data}
                position={menuState.position}
                onClose={handleCloseMenu}
                visible={menuState.visible}
            />
        </g>
    );
};

export default TouchOverlay;
