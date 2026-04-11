import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    Theme,
} from '../constants/constants';
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

export const getTimelineEntryAccent = (graph: TimelineGraph, entry: TimelineEntry): string[] => {
    if (entry.kind === 'node') return ['#2B6CB0'];
    if (!graph.hasEdge(entry.refId)) return ['#718096'];

    const attrs = graph.getEdgeAttributes(entry.refId) as Record<string, any>;
    const styleAttrs = attrs[attrs.style] || {};

    if (attrs.style === 'dual-color' || attrs.style === 'mrt-tape-out') {
        const colorA = styleAttrs?.colorA?.[2] ?? '#000000';
        const colorB = styleAttrs?.colorB?.[2] ?? '#000000';
        return [colorA, colorB];
    }

    if (attrs.style === 'london-rail') {
        const colorBackground = styleAttrs?.colorBackground?.[2] ?? '#000000';
        const colorForeground = styleAttrs?.colorForeground?.[2] ?? '#000000';
        return [colorBackground, colorForeground];
    }

    if (attrs.style === 'generic') {
        const layers = styleAttrs?.layers;
        if (Array.isArray(layers) && layers.length > 0) {
            return layers.map((layer: any) => layer?.color?.[2] ?? '#000000');
        }
        return ['#000000'];
    }

    return [styleAttrs?.color?.[2] ?? styleAttrs?.colorA?.[2] ?? styleAttrs?.layers?.[0]?.color?.[2] ?? '#4A5568'];
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

export const getEdgeTheme = (graph: TimelineGraph, edgeId: LineId): Theme | undefined => {
    if (!graph.hasEdge(edgeId)) return undefined;
    const attrs = graph.getEdgeAttributes(edgeId) as Record<string, any>;
    const styleAttrs = attrs[attrs.style];
    return styleAttrs?.color ?? styleAttrs?.colorA ?? styleAttrs?.layers?.[0]?.color;
};

export const getEdgeColorString = (theme: Theme | undefined): string => {
    return theme ? theme[2] : '#000000';
};

const themeToStr = (t: Theme | undefined) => {
    const tDef = t ?? [CityCode.Other, 'other', '#000000', 'black'];
    return tDef[0] === CityCode.Other && tDef[1] === 'other'
        ? `${tDef[0]}-${tDef[1]}-${tDef[2]}-${tDef[3]}`
        : `${tDef[0]}-${tDef[1]}`;
};

export const getEdgeThemeString = (graph: TimelineGraph, edgeId: LineId): string => {
    if (!graph.hasEdge(edgeId)) return 'unknown';

    const attrs = graph.getEdgeAttributes(edgeId) as Record<string, any>;
    const styleAttrs = attrs[attrs.style] || {};

    if (attrs.style === 'dual-color' || attrs.style === 'mrt-tape-out') {
        const strA = themeToStr(styleAttrs?.colorA);
        const strB = themeToStr(styleAttrs?.colorB);
        return [strA, strB].sort().join('::');
    }

    if (attrs.style === 'london-rail') {
        const strBg = themeToStr(styleAttrs?.colorBackground);
        const strFg = themeToStr(styleAttrs?.colorForeground);
        return [strBg, strFg].join('::');
    }

    if (attrs.style === 'generic') {
        const layers = styleAttrs?.layers;
        if (Array.isArray(layers) && layers.length > 0) {
            return layers.map((layer: any) => themeToStr(layer?.color)).join('::');
        }
        return themeToStr(undefined);
    }

    const theme = getEdgeTheme(graph, edgeId);
    return themeToStr(theme);
};

export const getAdjacentLineColors = (graph: TimelineGraph, nodeId: NodeId) => {
    if (!graph.hasNode(nodeId)) return [];
    const lines = new Map<string, { themeStr: string; color: string[]; label: string }>(); // themeStr -> info
    graph.forEachEdge(nodeId, edge => {
        const edgeId = edge as LineId;
        const theme = getEdgeTheme(graph, edgeId);
        const themeStr = getEdgeThemeString(graph, edgeId);
        if (!lines.has(themeStr)) {
            const label = theme && theme[1] !== 'other' ? theme[1] : '';
            lines.set(themeStr, {
                themeStr,
                color: getTimelineEntryAccent(graph, { kind: 'edge', refId: edgeId, id: '' }),
                label,
            });
        }
    });
    return Array.from(lines.values());
};

export const findShortestPathByLine = (
    graph: TimelineGraph,
    startNode: NodeId,
    endNode: NodeId,
    themeStr: string
): Id[] | null => {
    const queue: { current: NodeId; path: Id[] }[] = [{ current: startNode, path: [startNode] }];
    const visited = new Set<NodeId>([startNode]);

    while (queue.length > 0) {
        const { current, path } = queue.shift()!;
        if (current === endNode) {
            return path;
        }

        graph.forEachEdge(current, (edge, attr, source, target) => {
            const edgeThemeStr = getEdgeThemeString(graph, edge as LineId);
            if (edgeThemeStr !== themeStr) return;

            const neighbor = (source === current ? target : source) as NodeId;
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({
                    current: neighbor,
                    path: [...path, edge as LineId, neighbor],
                });
            }
        });
    }

    return null;
};

export const appendTimelineEntries = (doc: TimelineDocument, refIds: Id[]): TimelineDocument => {
    let currentDoc = doc;
    for (const refId of refIds) {
        currentDoc = appendTimelineEntry(currentDoc, refId);
    }
    return currentDoc;
};
