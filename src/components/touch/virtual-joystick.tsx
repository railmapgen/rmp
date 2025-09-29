import React from 'react';
import {
    MdContentCopy,
    MdDelete,
    MdKeyboardArrowDown,
    MdKeyboardArrowLeft,
    MdKeyboardArrowRight,
    MdKeyboardArrowUp,
} from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk } from '../../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges } from '../../util/clipboard';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';

interface VirtualJoystickProps {
    svgViewBoxMin: { x: number; y: number };
    svgViewBoxZoom: number;
}

/**
 * Virtual joystick component for touch devices to move selected nodes.
 * Shows 4 directional buttons (up, down, left, right) plus copy and delete buttons.
 * Positioned at the bottom of the screen when nodes are selected.
 */
export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ svgViewBoxMin, svgViewBoxZoom }) => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const { selected } = useRootSelector(state => state.runtime);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch]);

    // Movement distance (same as keyboard controls in svg-wrapper.tsx)
    const MOVE_DISTANCE = 10;

    const handleMove = React.useCallback(
        (xFactor: number, yFactor: number) => {
            if (selected.size > 0) {
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.updateNodeAttribute(s, 'x', x => (x ?? 0) + xFactor * MOVE_DISTANCE);
                        graph.current.updateNodeAttribute(s, 'y', y => (y ?? 0) + yFactor * MOVE_DISTANCE);
                    }
                });
                refreshAndSave();
            }
        },
        [selected, refreshAndSave]
    );

    const handleMoveUp = React.useCallback(() => handleMove(0, -1), [handleMove]);
    const handleMoveDown = React.useCallback(() => handleMove(0, 1), [handleMove]);
    const handleMoveLeft = React.useCallback(() => handleMove(-1, 0), [handleMove]);
    const handleMoveRight = React.useCallback(() => handleMove(1, 0), [handleMove]);

    const handleCopy = React.useCallback(() => {
        if (selected.size > 0) {
            const data = exportSelectedNodesAndEdges(graph.current, selected);
            navigator.clipboard.writeText(data);
        }
    }, [selected]);

    const handleDelete = React.useCallback(() => {
        if (selected.size > 0) {
            dispatch(clearSelected());
            selected.forEach(s => {
                if (graph.current.hasNode(s)) {
                    graph.current.dropNode(s);
                } else if (graph.current.hasEdge(s)) {
                    graph.current.dropEdge(s);
                }
            });
            refreshAndSave();
        }
    }, [selected, dispatch, refreshAndSave]);

    if (selected.size === 0) {
        return null;
    }

    // Position at bottom center of the SVG viewport
    const centerX = svgViewBoxMin.x + (width * svgViewBoxZoom) / 200; // Center horizontally
    const bottomY = svgViewBoxMin.y + (height * svgViewBoxZoom) / 100 - 80; // 80px from bottom

    const buttonSize = 40;
    const buttonSpacing = 50;

    return (
        <g transform={`translate(${centerX}, ${bottomY})`} className="virtual-joystick">
            {/* Background circle */}
            <circle r="120" fill="rgba(0, 0, 0, 0.1)" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="1" />

            {/* Up button */}
            <g transform={`translate(0, -${buttonSpacing})`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleMoveUp}
                />
                <MdKeyboardArrowUp
                    x={-12}
                    y={-12}
                    width={24}
                    height={24}
                    fill="rgba(0, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>

            {/* Down button */}
            <g transform={`translate(0, ${buttonSpacing})`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleMoveDown}
                />
                <MdKeyboardArrowDown
                    x={-12}
                    y={-12}
                    width={24}
                    height={24}
                    fill="rgba(0, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>

            {/* Left button */}
            <g transform={`translate(-${buttonSpacing}, 0)`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleMoveLeft}
                />
                <MdKeyboardArrowLeft
                    x={-12}
                    y={-12}
                    width={24}
                    height={24}
                    fill="rgba(0, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>

            {/* Right button */}
            <g transform={`translate(${buttonSpacing}, 0)`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleMoveRight}
                />
                <MdKeyboardArrowRight
                    x={-12}
                    y={-12}
                    width={24}
                    height={24}
                    fill="rgba(0, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>

            {/* Copy button */}
            <g transform={`translate(-${buttonSpacing * 0.7}, -${buttonSpacing * 0.7})`}>
                <circle
                    r={(buttonSize / 2) * 0.8}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleCopy}
                />
                <MdContentCopy
                    x={-10}
                    y={-10}
                    width={20}
                    height={20}
                    fill="rgba(0, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>

            {/* Delete button */}
            <g transform={`translate(${buttonSpacing * 0.7}, -${buttonSpacing * 0.7})`}>
                <circle
                    r={(buttonSize / 2) * 0.8}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(255, 0, 0, 0.5)"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={handleDelete}
                />
                <MdDelete
                    x={-10}
                    y={-10}
                    width={20}
                    height={20}
                    fill="rgba(255, 0, 0, 0.7)"
                    style={{ pointerEvents: 'none' }}
                />
            </g>
        </g>
    );
};

export default VirtualJoystick;
