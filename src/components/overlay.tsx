import { LineId, NodeId } from '../constants/constants';
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
    const svgViewBoxZoom = useRootSelector(state => state.param.present.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.present.svgViewBoxMin);
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
        const OverlayComponent = nodeDefinitions[type]?.overlayComponent;
        if (!OverlayComponent) return null;

        return (
            <g className="removeMe">
                {/* @ts-ignore The graph keeps each node ID paired with its definition type. */}
                <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />
            </g>
        );
    }

    return null;
};
