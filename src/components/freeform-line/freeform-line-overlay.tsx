import React from 'react';
import {
    getFreeformCenterlineD,
    getFreeformControlPoints,
    getFreeformWidthStopGeometry,
} from '../../util/freeform-line';
import type { FreeformEditable, FreeformHandleSelection, FreeformHandleSize } from './freeform-line-editor-controller';
import type { FreeformOverlayHandlers } from './use-freeform-line-editor';

interface FreeformLineOverlayProps {
    selectedFreeform?: FreeformEditable;
    handleSize: FreeformHandleSize;
    handleSelection: FreeformHandleSelection;
    handlers: FreeformOverlayHandlers;
}

export const FreeformLineOverlay = (props: FreeformLineOverlayProps) => {
    const { selectedFreeform, handleSize, handleSelection, handlers } = props;
    if (!selectedFreeform) return null;

    const centerlineD = getFreeformCenterlineD(selectedFreeform.attrs, selectedFreeform.targetRelative);
    const points = getFreeformControlPoints(selectedFreeform.attrs, selectedFreeform.targetRelative);

    return (
        <g
            transform={`translate(${selectedFreeform.source.x}, ${selectedFreeform.source.y})`}
            onPointerMove={handlers.onOverlayPointerMove}
            onPointerUp={handlers.onOverlayPointerUp}
            onPointerCancel={handlers.onOverlayPointerUp}
        >
            <path
                d={centerlineD}
                fill="none"
                stroke="transparent"
                strokeWidth={handleSize.hitStrokeWidth}
                pointerEvents="stroke"
                onPointerDown={handlers.onPathPointerDown}
                onDoubleClick={handlers.onPathDoubleClick}
            />
            <path
                d={centerlineD}
                fill="none"
                stroke="#3182CE"
                strokeWidth={handleSize.guideStrokeWidth}
                strokeDasharray={handleSize.dashArray}
                pointerEvents="none"
            />
            {points.map((point, index) => {
                const isEndpoint = index === 0 || index === points.length - 1;
                const isSelected =
                    handleSelection?.kind === 'point' &&
                    handleSelection.edgeId === selectedFreeform.edgeId &&
                    handleSelection.id === point.id;
                return (
                    <circle
                        key={point.id}
                        cx={point.x}
                        cy={point.y}
                        r={
                            isEndpoint
                                ? handleSize.lockedPointRadius
                                : isSelected
                                  ? handleSize.selectedPointRadius
                                  : handleSize.pointRadius
                        }
                        fill={isEndpoint ? '#718096' : isSelected ? '#2B6CB0' : '#3182CE'}
                        stroke="#FFFFFF"
                        strokeWidth={handleSize.strokeWidth}
                        cursor={isEndpoint ? 'default' : 'move'}
                        pointerEvents={isEndpoint ? 'none' : undefined}
                        onPointerDown={event => handlers.onPointPointerDown(point.id, event)}
                        onContextMenu={event => handlers.onPointContextMenu(point.id, event)}
                        onDoubleClick={event => handlers.onPointDoubleClick(point.id, event)}
                    />
                );
            })}
            {selectedFreeform.attrs.widthStops.map(stop => {
                const geometry = getFreeformWidthStopGeometry(
                    selectedFreeform.attrs,
                    selectedFreeform.targetRelative,
                    stop.id
                );
                if (!geometry) return null;

                const isSelected =
                    handleSelection?.kind === 'width' &&
                    handleSelection.edgeId === selectedFreeform.edgeId &&
                    handleSelection.id === stop.id;
                const fill = isSelected ? '#C53030' : '#E53E3E';

                return (
                    <g key={stop.id}>
                        <line
                            x1={geometry.start.x}
                            y1={geometry.start.y}
                            x2={geometry.end.x}
                            y2={geometry.end.y}
                            stroke={fill}
                            strokeWidth={handleSize.strokeWidth}
                            pointerEvents="none"
                        />
                        <circle
                            cx={geometry.center.x}
                            cy={geometry.center.y}
                            r={isSelected ? handleSize.selectedWidthStopRadius : handleSize.widthStopRadius}
                            fill={fill}
                            stroke="#FFFFFF"
                            strokeWidth={handleSize.strokeWidth}
                            cursor="grab"
                            onPointerDown={event => handlers.onWidthPositionPointerDown(stop.id, event)}
                            onContextMenu={event => handlers.onWidthContextMenu(stop.id, event)}
                        />
                        <circle
                            cx={geometry.start.x}
                            cy={geometry.start.y}
                            r={isSelected ? handleSize.selectedWidthStopRadius : handleSize.widthStopRadius}
                            fill={fill}
                            stroke="#FFFFFF"
                            strokeWidth={handleSize.strokeWidth}
                            cursor="ew-resize"
                            onPointerDown={event => handlers.onWidthSizePointerDown(stop.id, event)}
                            onContextMenu={event => handlers.onWidthContextMenu(stop.id, event)}
                        />
                    </g>
                );
            })}
        </g>
    );
};
