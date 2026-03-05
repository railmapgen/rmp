import { useColorMode } from '@chakra-ui/react';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useRootSelector } from '../redux';
import { getViewpointSize, roundToMultiple } from '../util/helpers';

export interface GridLinesProps {
    x: number;
    y: number;
    zoom: number;
    svgWidth: number;
    svgHeight: number;
}

export interface GridLinesRef {
    updateGrid: (x: number, y: number, zoom: number) => void;
}

const GridLines = React.memo(
    forwardRef<GridLinesRef, GridLinesProps>((props, ref) => {
        // eslint-disable-next-line react/prop-types
        const { svgWidth, svgHeight, x: propsX, y: propsY, zoom: propsZoom } = props;

        const [viewState, setViewState] = useState({
            x: propsX,
            y: propsY,
            zoom: propsZoom,
        });

        useEffect(() => {
            setViewState({ x: propsX, y: propsY, zoom: propsZoom });
        }, [propsX, propsY, propsZoom]);

        useImperativeHandle(ref, () => ({
            updateGrid: (newX, newY, newZoom) => {
                setViewState({ x: newX, y: newY, zoom: newZoom });
            },
        }));

        const { x, y, zoom: svgViewBoxZoom } = viewState;
        const svgViewBoxMin = { x, y };

        const {
            preference: {
                toolsPanel: { expand: isToolsExpanded },
            },
        } = useRootSelector(state => state.app);

        const colorMode = useColorMode();
        const color = colorMode.colorMode === 'light' ? '#666464' : '#D3D3D4';

        if (svgViewBoxZoom <= 0 || svgWidth <= 0 || svgHeight <= 0) return null;

        const svgViewRange = getViewpointSize(svgViewBoxMin, svgViewBoxZoom, svgWidth, svgHeight);
        const offset = isToolsExpanded ? (410 * svgViewBoxZoom) / 100 : 0;
        const step = svgViewBoxZoom > 30 ? (svgViewBoxZoom > 120 ? (svgViewBoxZoom > 200 ? 225 : 75) : 25) : 5;
        const standardWidth = svgViewBoxZoom / 200;

        const r = {
            startX: roundToMultiple(svgViewRange.xMin + offset - step, step),
            endX: roundToMultiple(svgViewRange.xMax + offset + step, step),
            startY: roundToMultiple(svgViewRange.yMin - step, step),
            endY: roundToMultiple(svgViewRange.yMax + step, step),
        };

        const verticalLines = Array.from({ length: Math.max(0, (r.endX - r.startX) / step + 1) }, (_, i) => {
            const pos = r.startX + i * step;
            const width = pos % (step * 5) === 0 ? 2 * standardWidth : standardWidth;
            return (
                <line
                    key={`grid_vl_${pos}`}
                    x1={pos}
                    y1={r.startY}
                    x2={pos}
                    y2={r.endY}
                    strokeWidth={width}
                    stroke={color}
                    opacity="0.5"
                />
            );
        });

        const horizontalLines = Array.from({ length: Math.max(0, (r.endY - r.startY) / step + 1) }, (_, i) => {
            const pos = r.startY + i * step;
            const width = pos % (step * 5) === 0 ? 2 * standardWidth : standardWidth;
            return (
                <line
                    key={`grid_hl_${pos}`}
                    x1={r.startX}
                    y1={pos}
                    x2={r.endX}
                    y2={pos}
                    strokeWidth={width}
                    stroke={color}
                    opacity="0.5"
                />
            );
        });

        const verticalCoords = Array.from({ length: Math.max(0, (r.endX - r.startX) / step / 5 + 1) }, (_, i) => {
            const pos = roundToMultiple(r.startX, 5 * step) + i * 5 * step;
            return (
                <text
                    key={`grid_vc_${pos}`}
                    x={pos}
                    y={svgViewRange.yMin + svgViewBoxZoom / 5}
                    fontSize={standardWidth * 25}
                    fill={color}
                    textAnchor="middle"
                    opacity="0.5"
                >
                    {pos}
                </text>
            );
        });

        const horizontalCoords = Array.from({ length: Math.max(0, (r.endY - r.startY) / step / 5 + 1) }, (_, i) => {
            const pos = roundToMultiple(r.startY, 5 * step) + i * 5 * step;
            return (
                <text
                    key={`grid_hc_${pos}`}
                    x={svgViewRange.xMin + svgViewBoxZoom / 8 + offset}
                    y={pos}
                    fontSize={standardWidth * 25}
                    fill={color}
                    textAnchor="start"
                    opacity="0.5"
                >
                    {pos}
                </text>
            );
        });

        return (
            <g id="grid-lines" className="removeMe">
                {verticalLines}
                {horizontalLines}
                {verticalCoords}
                {horizontalCoords}
            </g>
        );
    })
);

export default GridLines;
