import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, Theme } from '../../constants/constants';
import { LineDefinition, VideoLineLabel } from '../../constants/line-definitions';

type VideoGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export interface VideoLineAnnotation {
    year: string;
    monthDay: string;
    name: [string, string];
    color: string;
}

/** A Timeline can customize labels without recoloring its map or changing opening order. */
export const getVideoLineLabel = (graph: VideoGraph, line: LineDefinition): VideoLineLabel => {
    const edgeId = line.edgeIds.find(id => graph.hasEdge(id));
    const attrs = edgeId ? graph.getEdgeAttributes(edgeId) : undefined;
    const theme = attrs ? (attrs[attrs.style] as { color?: Theme } | undefined)?.color : undefined;
    const label = line.videoLabel;
    return {
        name: [...(label?.name ?? line.name)],
        lineNumber: label?.lineNumber ?? line.lineNumber,
        openingDate: label?.openingDate ?? line.openingDate,
        color: label?.color ?? theme?.[2] ?? '#64748b',
    };
};

export const getVideoLineAnnotation = (graph: VideoGraph, edgeId: LineId): VideoLineAnnotation | undefined => {
    const line: LineDefinition | undefined = graph
        .getAttribute('lineDefinitions')
        ?.find(line => line.edgeIds.includes(edgeId));
    if (!line || !graph.hasEdge(edgeId)) return;
    const label = getVideoLineLabel(graph, line);
    // Use this edge's color for imported labels, including legacy multi-color lines.
    const attrs = graph.getEdgeAttributes(edgeId);
    const theme = (attrs[attrs.style] as { color?: Theme } | undefined)?.color;
    const openingDate = /^\d{4}-\d{2}-\d{2}$/.test(label.openingDate) ? label.openingDate : '';
    return {
        year: openingDate.slice(0, 4),
        monthDay: openingDate.slice(5),
        name: [label.name[0].trim() || label.lineNumber.trim(), label.name[1].trim()],
        color: line.videoLabel?.color ?? theme?.[2] ?? '#64748b',
    };
};
