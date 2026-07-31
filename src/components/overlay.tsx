import React from 'react';
import { LineId, NodeId, OverlayProps } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { useRootSelector } from '../redux';
import { linePaths } from './svgs/lines/lines';
import miscNodes from './svgs/nodes/misc-nodes';
import stations from './svgs/stations/stations';

const nodeDefinitions = { ...stations, ...miscNodes };

/**
 * Mounts the editor overlay registered by the single selected node or line path.
 */
export const Overlay = () => {
    const selected = useRootSelector(state => state.runtime.selected);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (window.graph.hasEdge(selectedId)) {
        const id = selectedId as LineId;
        const type = window.graph.getEdgeAttribute(id, 'type') as LinePathType;
        const OverlayComponent = linePaths[type]?.overlayComponent as React.FC<OverlayProps<LineId>> | undefined;
        if (!OverlayComponent) return null;

        return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
    }

    if (window.graph.hasNode(selectedId)) {
        const id = selectedId as NodeId;
        const type = window.graph.getNodeAttribute(id, 'type');
        const definition = nodeDefinitions[type as keyof typeof nodeDefinitions] as
            | { overlayComponent?: React.FC<OverlayProps<NodeId>> }
            | undefined;
        const OverlayComponent = definition?.overlayComponent;
        if (!OverlayComponent) return null;

        return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
    }

    return null;
};
