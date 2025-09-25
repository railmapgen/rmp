import React, { useCallback, useState } from 'react';
import useEvent from 'react-use-event-hook';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setSvgViewBoxMin } from '../../redux/param/param-slice';
import { clearSelected } from '../../redux/runtime/runtime-slice';
import { pointerPosToSVGCoord } from '../../util/helpers';
import { useNearbyElements, MenuLayerData } from '../../util/hooks/useNearbyElements';
import RadialTouchMenu from './radial-touch-menu';

interface TouchState {
    active: boolean;
    startPosition: { x: number; y: number };
    startViewBoxMin: { x: number; y: number };
}

interface MenuState {
    visible: boolean;
    position: { x: number; y: number };
    data: MenuLayerData[];
}

/**
 * TouchOverlay component handles all touch interactions for mobile devices.
 * It provides two main behaviors:
 * 1. When touching near elements: Shows radial menu for element interaction
 * 2. When touching empty space: Enables canvas panning
 */
export const TouchOverlay: React.FC = () => {
    const dispatch = useRootDispatch();
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const graph = React.useRef(window.graph);
    const { findNearbyElements } = useNearbyElements();

    // Touch panning state
    const [touchState, setTouchState] = useState<TouchState>({
        active: false,
        startPosition: { x: 0, y: 0 },
        startViewBoxMin: { x: 0, y: 0 },
    });

    // Radial menu state
    const [menuState, setMenuState] = useState<MenuState>({
        visible: false,
        position: { x: 0, y: 0 },
        data: [],
    });

    const handleTouchStart = useEvent((e: React.TouchEvent<HTMLDivElement>) => {
        // Only handle single finger touches
        if (e.touches.length !== 1) {
            return;
        }

        const touch = e.touches[0];
        const screenCoord = { x: touch.clientX, y: touch.clientY };

        // Convert screen coordinates to SVG coordinates
        const bbox = document.getElementById('canvas')?.getBoundingClientRect();
        if (!bbox) return;

        const relativeX = touch.clientX - bbox.left;
        const relativeY = touch.clientY - bbox.top;

        const svgCoord = pointerPosToSVGCoord(relativeX, relativeY, svgViewBoxZoom, svgViewBoxMin);

        // Search for nearby elements within a touch-friendly radius
        const TOUCH_RADIUS = 30; // Adjust based on testing
        const nearbyElements = findNearbyElements(graph.current, svgCoord, TOUCH_RADIUS, dispatch);

        if (nearbyElements.length > 0) {
            // Case A: Elements found - show radial menu
            setMenuState({
                visible: true,
                position: screenCoord,
                data: nearbyElements,
            });

            // Clear any active panning state
            setTouchState({
                active: false,
                startPosition: { x: 0, y: 0 },
                startViewBoxMin: { x: 0, y: 0 },
            });
        } else {
            // Case B: No elements - enter panning mode
            dispatch(clearSelected());

            setTouchState({
                active: true,
                startPosition: screenCoord,
                startViewBoxMin: { ...svgViewBoxMin },
            });

            // Close menu if it was open
            setMenuState({
                visible: false,
                position: { x: 0, y: 0 },
                data: [],
            });
        }
    });

    const handleTouchMove = useEvent((e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchState.active || e.touches.length !== 1) {
            return;
        }

        e.preventDefault(); // Prevent default scrolling behavior

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchState.startPosition.x;
        const deltaY = touch.clientY - touchState.startPosition.y;

        // Calculate new pan position based on zoom level
        // Higher zoom means smaller movements in SVG space
        const scaleFactor = svgViewBoxZoom / 100;
        const newViewBoxMin = {
            x: touchState.startViewBoxMin.x - deltaX * scaleFactor,
            y: touchState.startViewBoxMin.y - deltaY * scaleFactor,
        };

        dispatch(setSvgViewBoxMin(newViewBoxMin));
    });

    const handleTouchEnd = useEvent((e: React.TouchEvent<HTMLDivElement>) => {
        // Reset panning state
        setTouchState({
            active: false,
            startPosition: { x: 0, y: 0 },
            startViewBoxMin: { x: 0, y: 0 },
        });
    });

    const handleCloseMenu = useCallback(() => {
        setMenuState({
            visible: false,
            position: { x: 0, y: 0 },
            data: [],
        });
    }, []);

    return (
        <>
            {/* Touch interaction overlay */}
            <div
                style={{
                    position: 'fixed',
                    top: 40, // Match SVG wrapper positioning
                    left: 40,
                    right: 0,
                    bottom: 0,
                    zIndex: 100, // Above SVG but below menu
                    pointerEvents: 'auto',
                    touchAction: 'none', // Prevent default touch behaviors
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />

            {/* Radial touch menu */}
            <RadialTouchMenu
                data={menuState.data}
                position={menuState.position}
                onClose={handleCloseMenu}
                visible={menuState.visible}
            />
        </>
    );
};

export default TouchOverlay;
