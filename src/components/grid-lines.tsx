import { useColorMode } from '@chakra-ui/react';
import React from 'react';
import { useRootSelector } from '../redux';
import { getViewpointSize, roundToMultiple } from '../util/helpers';

export interface GridLinesProps {
    svgViewBoxMin: {
        x: number;
        y: number;
    };
    svgViewBoxZoom: number;
    svgWidth: number;
    svgHeight: number;
}

const GridLines = React.memo(
    (props: GridLinesProps) => {
        const { svgViewBoxMin, svgViewBoxZoom, svgWidth, svgHeight } = props;
        const {
            preference: {
                toolsPanel: { expand: isToolsExpanded },
            },
        } = useRootSelector(state => state.app);
        const colorMode = useColorMode();
        const color = colorMode.colorMode === 'light' ? '#666464' : '#D3D3D4';
        const svgViewRange = getViewpointSize(svgViewBoxMin, svgViewBoxZoom, svgWidth, svgHeight);
        const offset = isToolsExpanded ? (410 * svgViewBoxZoom) / 100 : 0;
        const step = svgViewBoxZoom > 30 ? (svgViewBoxZoom > 120 ? 50 : 25) : 5;
        const standardWidth = svgViewBoxZoom / 200;
        const r = {
            startX: roundToMultiple(svgViewRange.xMin + offset - step, step),
            endX: roundToMultiple(svgViewRange.xMax + offset + step, step),
            startY: roundToMultiple(svgViewRange.yMin - step, step),
            endY: roundToMultiple(svgViewRange.yMax + step, step),
        };
        const verticalLines = Array.from({ length: (r.endX - r.startX) / step + 1 }, (_, i) => {
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
        const horizontalLines = Array.from({ length: (r.endY - r.startY) / step + 1 }, (_, i) => {
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
        const verticalCoords = Array.from({ length: (r.endX - r.startX) / step / 5 + 1 }, (_, i) => {
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
        const horizontalCoords = Array.from({ length: (r.endY - r.startY) / step / 5 + 1 }, (_, i) => {
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
    },
    (prev, next) => {
        return (
            prev.svgViewBoxMin.x === next.svgViewBoxMin.x &&
            prev.svgViewBoxMin.y === next.svgViewBoxMin.y &&
            prev.svgViewBoxZoom === next.svgViewBoxZoom &&
            prev.svgWidth === next.svgWidth &&
            prev.svgHeight === next.svgHeight
        );
    }
);

export default GridLines;
