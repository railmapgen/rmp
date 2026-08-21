import React from 'react';
import { LineId, NodeId, OverlayProps } from '../constants/constants';
import { useRootSelector } from '../redux';
import { linePaths } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const nodeDefinitions = { ...stations, ...miscNodes };

/**
 * Mounts editor overlays for the single selected node or line path.
 *
 * Node and line-path definitions own their editor capabilities; this renderer only mounts the overlay they register.
 */
export const Overlay = () => {
    const selected = useRootSelector(state => state.runtime.selected);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (window.graph.hasEdge(selectedId)) {
        const id = selectedId as LineId;
        const type = window.graph.getEdgeAttribute(id, 'type');
        const OverlayComponent = linePaths[type]?.overlayComponent;
        if (!OverlayComponent) return null;

        return (
            <g className="removeMe">
                <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />
            </g>
        );
    }

    if (window.graph.hasNode(selectedId)) {
        const id = selectedId as NodeId;
        const type = window.graph.getNodeAttribute(id, 'type');
        // The graph and registry keep each node ID paired with the matching station or miscellaneous-node definition.
        const OverlayComponent = nodeDefinitions[type]?.overlayComponent as React.FC<OverlayProps<NodeId>> | undefined;
        if (!OverlayComponent) return null;

        return (
            <g className="removeMe">
                <OverlayComponent id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />
            </g>
        );
    }

    return null;
};
