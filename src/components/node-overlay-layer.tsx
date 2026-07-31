import React from 'react';
import { NodeId, NodeOverlayProps } from '../constants/constants';
import { useRootSelector } from '../redux';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const nodeDefinitions = { ...stations, ...miscNodes };

/**
 * Mount the selected node type's direct-manipulation UI above the normal graph layers.
 *
 * Like line-path overlays, node overlays are opt-in and only appear for one unambiguous selection.
 */
export const NodeOverlayLayer = () => {
    const selected = useRootSelector(state => state.runtime.selected);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (!window.graph.hasNode(selectedId)) return null;

    const id = selectedId as NodeId;
    const type = window.graph.getNodeAttribute(id, 'type');
    const definition = nodeDefinitions[type as keyof typeof nodeDefinitions] as
        | { overlayComponent?: React.FC<NodeOverlayProps> }
        | undefined;
    const OverlayComponent = definition?.overlayComponent;
    if (!OverlayComponent) return null;

    return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
};
