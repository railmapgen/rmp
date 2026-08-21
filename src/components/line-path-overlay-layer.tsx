import React from 'react';
import { LineId } from '../constants/constants';
import { LinePathOverlayProps, LinePathType } from '../constants/lines';
import { useRootSelector } from '../redux';
import { linePaths } from './svgs/lines/lines';

/**
 * Renders the path-specific editing UI for the currently selected line above the regular graph layers.
 *
 * Some line paths need temporary visuals such as control points, guides, or enlarged interaction targets. Those
 * visuals belong to the editor rather than the exported map and vary with the path's geometry, so each path type may
 * register its own overlay while this component provides their common mounting point. An overlay is shown only for a
 * single selected edge because path editing requires one unambiguous geometry to operate on.
 */
export const LinePathOverlayLayer = () => {
    const selected = useRootSelector(state => state.runtime.selected);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
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
