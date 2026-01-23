import React from 'react';
import {
    MdContentCopy,
    MdDelete,
    MdKeyboardArrowDown,
    MdKeyboardArrowLeft,
    MdKeyboardArrowRight,
    MdKeyboardArrowUp,
} from 'react-icons/md';
import { NODES_MOVE_DISTANCE } from '../../constants/canvas';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk } from '../../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges } from '../../util/clipboard';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';

/**
 * Virtual joystick component for touch devices to move selected nodes.
 * Shows 4 directional buttons (up, down, left, right) plus copy and delete buttons.
 * Positioned at the bottom of the screen when nodes are selected.
 */
export const VirtualJoystick: React.FC = () => {
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const { selected } = useRootSelector(state => state.runtime);

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch]);

    const handleMove = React.useCallback(
        (e: React.PointerEvent, xFactor: number, yFactor: number) => {
            e.stopPropagation();
            if (selected.size > 0) {
                selected.forEach(s => {
                    if (graph.current.hasNode(s)) {
                        graph.current.updateNodeAttribute(s, 'x', x => (x ?? 0) + xFactor * NODES_MOVE_DISTANCE);
                        graph.current.updateNodeAttribute(s, 'y', y => (y ?? 0) + yFactor * NODES_MOVE_DISTANCE);
                    }
                });
                refreshAndSave();
            }
        },
        [selected, refreshAndSave]
    );

    const handleMoveUp = React.useCallback((e: React.PointerEvent) => handleMove(e, 0, -1), [handleMove]);
    const handleMoveDown = React.useCallback((e: React.PointerEvent) => handleMove(e, 0, 1), [handleMove]);
    const handleMoveLeft = React.useCallback((e: React.PointerEvent) => handleMove(e, -1, 0), [handleMove]);
    const handleMoveRight = React.useCallback((e: React.PointerEvent) => handleMove(e, 1, 0), [handleMove]);

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

    // Position at bottom center of the SVG viewport
    const centerX = svgViewBoxMin.x + (width * svgViewBoxZoom) / 200; // Center horizontally
    const bottomY = svgViewBoxMin.y + ((height - 100) * svgViewBoxZoom) / 100; // 100px from bottom

    const buttonSize = 40;
    const buttonSpacing = 40;

    return (
        <g transform={`translate(${centerX}, ${bottomY})scale(${(1.5 * svgViewBoxZoom) / 100})`}>
            {/* Up button */}
            <g transform={`translate(0, -${buttonSpacing})`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    onPointerDown={handleMoveUp}
                />
                <MdKeyboardArrowUp x={-8} y={-8} fill="rgba(0, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Down button */}
            <g transform={`translate(0, ${buttonSpacing})`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    onPointerDown={handleMoveDown}
                />
                <MdKeyboardArrowDown x={-8} y={-8} fill="rgba(0, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Left button */}
            <g transform={`translate(-${buttonSpacing}, 0)`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    onPointerDown={handleMoveLeft}
                />
                <MdKeyboardArrowLeft x={-8} y={-8} fill="rgba(0, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Right button */}
            <g transform={`translate(${buttonSpacing}, 0)`}>
                <circle
                    r={buttonSize / 2}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    onPointerDown={handleMoveRight}
                />
                <MdKeyboardArrowRight x={-8} y={-8} fill="rgba(0, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Copy button */}
            <g transform={`translate(${buttonSpacing}, ${buttonSpacing})`}>
                <circle
                    r={(buttonSize / 2) * 0.8}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.3)"
                    strokeWidth="1"
                    onPointerDown={handleCopy}
                />
                <MdContentCopy x={-8} y={-8} fill="rgba(0, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>

            {/* Delete button */}
            <g transform={`translate(-${buttonSpacing}, ${buttonSpacing})`}>
                <circle
                    r={(buttonSize / 2) * 0.8}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(255, 0, 0, 0.5)"
                    strokeWidth="1"
                    onPointerDown={handleDelete}
                />
                <MdDelete x={-8} y={-8} fill="rgba(255, 0, 0, 0.7)" style={{ pointerEvents: 'none' }} />
            </g>
        </g>
    );
};

export default VirtualJoystick;
