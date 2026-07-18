import React from 'react';
import { Id, LineId } from '../constants/constants';
import { LinePathOverlayProps, LinePathType } from '../constants/lines';
import { PathPoint } from '../constants/path';
import { linePaths } from './svgs/lines/lines';

interface LinePathOverlayLayerProps {
    selected: Set<Id>;
    svgViewBoxZoom: number;
    svgViewBoxMin: PathPoint;
}

export const LinePathOverlayLayer = (props: LinePathOverlayLayerProps) => {
    const { selected, svgViewBoxZoom, svgViewBoxMin } = props;
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (!window.graph.hasEdge(selectedId)) return null;

    const id = selectedId as LineId;
    const type = window.graph.getEdgeAttribute(id, 'type') as LinePathType;
    const OverlayComponent = linePaths[type]?.overlayComponent as React.FC<LinePathOverlayProps> | undefined;
    if (!OverlayComponent) return null;

    return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
};
