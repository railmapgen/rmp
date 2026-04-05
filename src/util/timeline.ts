import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, Id, LineId, NodeAttributes, NodeId } from '../constants/constants';
import {
    createEmptyTimelineDocument,
    isNodeTimelineEntry,
    TimelineDocument,
    TimelineEntry,
} from '../constants/timeline';

type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const getNodePrimaryName = (graph: TimelineGraph, nodeId: NodeId): string => {
    if (!graph.hasNode(nodeId)) return nodeId;

    const type = graph.getNodeAttribute(nodeId, 'type');
    const attrs = graph.getNodeAttribute(nodeId, type) as Record<string, unknown> | undefined;

    if (Array.isArray(attrs?.names) && typeof attrs.names[0] === 'string' && attrs.names[0].trim()) {
        return attrs.names[0];
    }
    if (typeof attrs?.content === 'string' && attrs.content.trim()) {
        return attrs.content;
    }

    return type;
};

export const createTimelineEntry = (refId: Id): TimelineEntry => {
    return isNodeTimelineEntry(refId)
        ? { id: `timeline_${nanoid(10)}`, kind: 'node', refId }
        : { id: `timeline_${nanoid(10)}`, kind: 'edge', refId };
};

export const appendTimelineEntry = (doc: TimelineDocument, refId: Id): TimelineDocument => {
    if (doc.track.some(entry => entry.refId === refId)) return doc;

    return {
        ...doc,
        track: [...doc.track, createTimelineEntry(refId)],
    };
};

export const removeTimelineEntry = (doc: TimelineDocument, entryId: string): TimelineDocument => ({
    ...doc,
    track: doc.track.filter(entry => entry.id !== entryId),
});

export const moveTimelineEntry = (doc: TimelineDocument, fromIndex: number, toIndex: number): TimelineDocument => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return doc;
    if (fromIndex >= doc.track.length || toIndex >= doc.track.length) return doc;

    const track = [...doc.track];
    const [entry] = track.splice(fromIndex, 1);
    track.splice(toIndex, 0, entry);

    return {
        ...doc,
        track,
    };
};

export const normalizeTimelineDocument = (doc?: TimelineDocument | null): TimelineDocument => {
    if (!doc || !Array.isArray(doc.track)) return createEmptyTimelineDocument();

    return {
        version: 1,
        track: doc.track.filter(
            (entry): entry is TimelineEntry =>
                !!entry &&
                typeof entry.id === 'string' &&
                (entry.kind === 'node' || entry.kind === 'edge') &&
                typeof entry.refId === 'string'
        ),
    };
};

export const getTimelineEntryTitle = (graph: TimelineGraph, entry: TimelineEntry): string => {
    if (entry.kind === 'node') {
        return getNodePrimaryName(graph, entry.refId);
    }

    if (!graph.hasEdge(entry.refId)) return entry.refId;

    const [source, target] = graph.extremities(entry.refId) as [NodeId, NodeId];
    return `${getNodePrimaryName(graph, source)} -> ${getNodePrimaryName(graph, target)}`;
};

export const getTimelineEntrySubtitle = (graph: TimelineGraph, entry: TimelineEntry): string => {
    if (entry.kind === 'node') {
        if (!graph.hasNode(entry.refId)) return 'Missing node';
        return graph.getNodeAttribute(entry.refId, 'type');
    }

    if (!graph.hasEdge(entry.refId)) return 'Missing edge';
    const attrs = graph.getEdgeAttributes(entry.refId);
    return `${attrs.style} / ${attrs.type}`;
};

export const getTimelineEntryAccent = (graph: TimelineGraph, entry: TimelineEntry): string => {
    if (entry.kind === 'node') return '#2B6CB0';
    if (!graph.hasEdge(entry.refId)) return '#718096';

    const attrs = graph.getEdgeAttributes(entry.refId) as Record<string, any>;
    const styleAttrs = attrs[attrs.style];

    return styleAttrs?.color?.[2] ?? styleAttrs?.colorA?.[2] ?? styleAttrs?.layers?.[0]?.color?.[2] ?? '#4A5568';
};

export const getTimelineElementCenter = (graph: TimelineGraph, id: Id): { x: number; y: number } | undefined => {
    if (isNodeTimelineEntry(id)) {
        if (!graph.hasNode(id)) return undefined;
        return {
            x: graph.getNodeAttribute(id, 'x'),
            y: graph.getNodeAttribute(id, 'y'),
        };
    }

    if (!graph.hasEdge(id)) return undefined;

    const [source, target] = graph.extremities(id) as [NodeId, NodeId];
    return {
        x: (graph.getNodeAttribute(source, 'x') + graph.getNodeAttribute(target, 'x')) / 2,
        y: (graph.getNodeAttribute(source, 'y') + graph.getNodeAttribute(target, 'y')) / 2,
    };
};
