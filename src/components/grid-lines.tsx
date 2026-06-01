import { useColorMode } from '@chakra-ui/react';
import React from 'react';
import { useRootSelector } from '../redux';
import { getViewpointSize, roundToMultiple } from '../util/helpers';

export interface GridLinesProps {
    svgWidth: number;
    svgHeight: number;
}

const GridLines = React.memo((props: GridLinesProps) => {
    const { svgWidth, svgHeight } = props;
    const liveViewport = useRootSelector(state => state.viewport.liveViewport);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const isToolsExpanded = useRootSelector(state => state.app.preference.toolsPanel.expand);

    const currentMin = liveViewport ? { x: liveViewport.x, y: liveViewport.y } : svgViewBoxMin;
    const currentZoom = liveViewport?.zoom ?? svgViewBoxZoom;

    const colorMode = useColorMode();
    const color = colorMode.colorMode === 'light' ? '#666464' : '#D3D3D4';

    if (currentZoom <= 0 || svgWidth <= 0 || svgHeight <= 0) return null;

    const svgViewRange = getViewpointSize(currentMin, currentZoom, svgWidth, svgHeight);
    const offset = isToolsExpanded ? (410 * currentZoom) / 100 : 0;
    const step = currentZoom > 30 ? (currentZoom > 120 ? 50 : 25) : 5;
    const standardWidth = currentZoom / 200;

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
                y={svgViewRange.yMin + currentZoom / 5}
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
                x={svgViewRange.xMin + currentZoom / 8 + offset}
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
});

export default GridLines;
