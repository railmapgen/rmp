import React from 'react';
import useEvent from 'react-use-event-hook';
import { Id, LineId, NodeId } from '../../constants/constants';
import type { TimelineGraph } from '../../timeline/timeline-project-context';
import { getLines, getNodes } from '../../util/process-elements';
import SvgLayer from '../svg-layer';
import { useSvgRenderContext } from '../svg-render-context';

interface TimelineSvgCanvasProps {
    selectedId?: Id;
    highlightedIds?: Set<Id>;
    onSelect: (id: Id) => void;
    graph: TimelineGraph;
    mapEnabled: boolean;
    isSubscriber: boolean;
}

export default function TimelineSvgCanvas({
    selectedId,
    highlightedIds,
    onSelect,
    graph,
    mapEnabled,
    isSubscriber,
}: TimelineSvgCanvasProps) {
    const { fontRevision } = useSvgRenderContext();
    const elements = React.useMemo(() => [...getLines(graph), ...getNodes(graph)], [graph]);
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
            key={fontRevision}
            elements={elements}
            selected={selected}
            highlighted={highlightedIds}
            mapEnabled={mapEnabled}
            isSubscriber={isSubscriber}
            handlePointerDown={handlePointerDown}
            handlePointerMove={() => {}}
            handlePointerUp={() => {}}
            handleEdgePointerDown={handleEdgePointerDown}
            handleEdgeDoubleClick={() => {}}
        />
    );
}
