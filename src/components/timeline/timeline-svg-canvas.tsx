import React from 'react';
import useEvent from 'react-use-event-hook';
import { Id, LineId, NodeId } from '../../constants/constants';
import { useRootSelector } from '../../redux';
import { getLines, getNodes } from '../../util/process-elements';
import SvgLayer from '../svg-layer';

interface TimelineSvgCanvasProps {
    selectedId?: Id;
    onSelect: (id: Id) => void;
}

export default function TimelineSvgCanvas({ selectedId, onSelect }: TimelineSvgCanvasProps) {
    const graph = React.useRef(window.graph);
    const {
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);

    const elements = React.useMemo(
        () => [...getLines(graph.current), ...getNodes(graph.current)],
        [refreshEdges, refreshNodes]
    );
    const selected = React.useMemo(() => (selectedId ? new Set<Id>([selectedId]) : new Set<Id>()), [selectedId]);

    const handlePointerDown = useEvent((node: NodeId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();
        onSelect(node);
    });

    const handleEdgePointerDown = useEvent((edge: LineId, e: React.PointerEvent<SVGElement>) => {
        e.stopPropagation();
        onSelect(edge);
    });

    return (
        <SvgLayer
            elements={elements}
            selected={selected}
            handlePointerDown={handlePointerDown}
            handlePointerMove={() => {}}
            handlePointerUp={() => {}}
            handleEdgePointerDown={handleEdgePointerDown}
            handleEdgeDoubleClick={() => {}}
        />
    );
}
