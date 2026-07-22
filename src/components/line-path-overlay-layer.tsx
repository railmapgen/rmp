import React from 'react';
import { Id, LineId } from '../constants/constants';
import { LinePathOverlayProps, LinePathType } from '../constants/lines';
import { PathPoint } from '../constants/path';
import { linePaths } from './svgs/lines/lines';

interface LinePathOverlayLayerProps {
    /** Current canvas selection; overlays are intentionally limited to one selected edge. */
    selected: Set<Id>;
    /** Current zoom used by path editors to keep controls at a stable on-screen size. */
    svgViewBoxZoom: number;
    /** Current viewport origin used when converting pointer positions to SVG coordinates. */
    svgViewBoxMin: PathPoint;
}

/**
 * Mounts the editor overlay registered by the selected edge's path type.
 *
 * Path geometry has different handles and interaction rules, so this layer only resolves the appropriate component;
 * it deliberately leaves path-specific graph mutations and event handling to that component. Multiple selections do
 * not have one unambiguous local editing context and therefore do not render an overlay.
 */
export const LinePathOverlayLayer = (props: LinePathOverlayLayerProps) => {
    const { selected, svgViewBoxZoom, svgViewBoxMin } = props;
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (!window.graph.hasEdge(selectedId)) return null;

    const id = selectedId as LineId;
    const type = window.graph.getEdgeAttribute(id, 'type') as LinePathType;
    // Editable geometry is path-specific; routing through the registry keeps those rules out of the canvas layer.
    const OverlayComponent = linePaths[type]?.overlayComponent as React.FC<LinePathOverlayProps> | undefined;
    if (!OverlayComponent) return null;

    return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
};
