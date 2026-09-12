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
    isElementEntry,
    isNodeTimelineEntry,
    TimelineDocument,
    TimelineElementEntry,
    TimelineEntry,
    TimelineKeyframeEntry,
    TimelinePhase,
} from '../constants/timeline';

type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export interface TimelineCoverage {
    missingNodeIds: NodeId[];
    missingEdgeIds: LineId[];
    missingIds: Id[];
    missingNodeCount: number;
    missingEdgeCount: number;
    isComplete: boolean;
}

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

export const createTimelineEntry = (refId: Id, phase: TimelinePhase = 'enter'): TimelineElementEntry => {
    return isNodeTimelineEntry(refId)
        ? { id: `timeline_${nanoid(10)}`, kind: 'node', refId, phase, showAnimation: true }
        : { id: `timeline_${nanoid(10)}`, kind: 'edge', refId, phase, showAnimation: true };
};

export const insertTimelineExitEntry = (
    doc: TimelineDocument,
    refId: Id,
    index: number
): { document: TimelineDocument; cursor: number } => {
    const enterIndex = doc.track.findIndex(
        entry => isElementEntry(entry) && entry.refId === refId && entry.phase === 'enter'
    );
    if (
        enterIndex === -1 ||
        doc.track.some(entry => isElementEntry(entry) && entry.refId === refId && entry.phase === 'exit')
    ) {
        return { document: doc, cursor: index };
    }

    const insertionIndex = Math.max(0, Math.min(index, doc.track.length));
    const lastKeyframeIndex = doc.track.findLastIndex(entry => entry.kind === 'keyframe' && entry.refId === refId);
    const targetIndex = Math.max(insertionIndex, enterIndex + 1, lastKeyframeIndex + 1);
    const track = [...doc.track];
    track.splice(targetIndex, 0, createTimelineEntry(refId, 'exit'));

    return {
        document: { ...doc, track },
        cursor: targetIndex + 1,
    };
};

export const createKeyframeEntry = (
    graph: TimelineGraph,
    refId: NodeId,
    position?: { x: number; y: number }
): TimelineKeyframeEntry => {
    const x = position?.x ?? (graph.hasNode(refId) ? graph.getNodeAttribute(refId, 'x') : 0);
    const y = position?.y ?? (graph.hasNode(refId) ? graph.getNodeAttribute(refId, 'y') : 0);
    return { id: `timeline_${nanoid(10)}`, kind: 'keyframe', refId, x, y };
};

export const updateKeyframePosition = (
    doc: TimelineDocument,
    entryId: string,
    x: number,
    y: number
): TimelineDocument => ({
    ...doc,
    track: doc.track.map(entry => (entry.id === entryId && entry.kind === 'keyframe' ? { ...entry, x, y } : entry)),
});

/**
 * Insert a keyframe for `refId` at the given cursor index.
 * A station must enter the frame before it can be keyframed, so the enter entry
 * is added first when it is missing from the track.
 */
export const insertKeyframeEntry = (
    doc: TimelineDocument,
    graph: TimelineGraph,
    refId: NodeId,
    index: number
): { document: TimelineDocument; cursor: number } => {
    const insertionIndex = Math.max(0, Math.min(index, doc.track.length));
    const track = [...doc.track];
    let cursor = insertionIndex;

    const enterIndex = track.findIndex(
        entry => isElementEntry(entry) && entry.refId === refId && entry.phase === 'enter'
    );
    if (enterIndex === -1) {
        track.splice(cursor, 0, createTimelineEntry(refId));
        cursor += 1;
    } else {
        cursor = Math.max(cursor, enterIndex + 1);
    }
    const exitIndex = track.findIndex(
        entry => isElementEntry(entry) && entry.refId === refId && entry.phase === 'exit'
    );
    if (exitIndex !== -1) cursor = Math.min(cursor, exitIndex);
    track.splice(cursor, 0, createKeyframeEntry(graph, refId));

    return { document: { ...doc, track }, cursor };
};

export const insertTimelineEntry = (doc: TimelineDocument, refId: Id, index: number): TimelineDocument => {
    if (doc.track.some(entry => isElementEntry(entry) && entry.refId === refId)) return doc;

    const insertionIndex = Math.max(0, Math.min(index, doc.track.length));
    const track = [...doc.track];
    track.splice(insertionIndex, 0, createTimelineEntry(refId));

    return {
        ...doc,
        track,
    };
};

export const appendTimelineEntry = (doc: TimelineDocument, refId: Id): TimelineDocument => {
    return insertTimelineEntry(doc, refId, doc.track.length);
};

export const removeTimelineEntry = (doc: TimelineDocument, entryId: string): TimelineDocument => {
    const removedEntry = doc.track.find(entry => entry.id === entryId);
    if (!removedEntry) return doc;

    // Exit phases and keyframes depend on the enter card and are removed in the same undoable edit.
    const removeDependents = isElementEntry(removedEntry) && removedEntry.phase === 'enter';
    return {
        ...doc,
        track: doc.track.filter(entry =>
            removeDependents ? entry.refId !== removedEntry.refId : entry.id !== entryId
        ),
    };
};

export const moveTimelineEntry = (doc: TimelineDocument, fromIndex: number, toIndex: number): TimelineDocument => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return doc;
    if (fromIndex >= doc.track.length || toIndex >= doc.track.length) return doc;

    const track = [...doc.track];
    const [entry] = track.splice(fromIndex, 1);
    track.splice(toIndex, 0, entry);

    let visible = false;
    for (const candidate of track) {
        if (candidate.refId !== entry.refId) continue;
        if (isElementEntry(candidate) && candidate.phase === 'enter') visible = true;
        else {
            if (!visible) return doc;
            if (isElementEntry(candidate)) visible = false;
        }
    }

    return {
        ...doc,
        track,
    };
};

interface RawTimelineEntry {
    id?: unknown;
    kind?: unknown;
    refId?: unknown;
    phase?: unknown;
    showAnimation?: unknown;
    x?: unknown;
    y?: unknown;
}

const normalizeTimelineEntry = (entry?: RawTimelineEntry): TimelineEntry | undefined => {
    if (!entry || typeof entry.id !== 'string' || typeof entry.refId !== 'string') return undefined;

    if (entry.kind === 'keyframe') {
        if (typeof entry.x !== 'number' || !Number.isFinite(entry.x)) return undefined;
        if (typeof entry.y !== 'number' || !Number.isFinite(entry.y)) return undefined;
        return { id: entry.id, kind: 'keyframe', refId: entry.refId as NodeId, x: entry.x, y: entry.y };
    }

    if (entry.kind === 'node' || entry.kind === 'edge') {
        const phase = entry.phase === 'exit' ? ('exit' as const) : ('enter' as const);
        const showAnimation = entry.showAnimation !== false;
        return entry.kind === 'node'
            ? { id: entry.id, kind: 'node', refId: entry.refId as NodeId, phase, showAnimation }
            : { id: entry.id, kind: 'edge', refId: entry.refId as LineId, phase, showAnimation };
    }

    return undefined;
};

export type TimelineDocumentLike = Partial<Omit<TimelineDocument, 'track'>> & { track?: unknown };

export const normalizeTimelineDocument = (doc?: TimelineDocumentLike | null): TimelineDocument => {
    if (!doc || !Array.isArray(doc.track)) return createEmptyTimelineDocument();

    return {
        version: 1,
        mode: doc.mode === 'pro' ? 'pro' : 'quick',
        track: (doc.track as RawTimelineEntry[])
            .map(entry => normalizeTimelineEntry(entry))
            .filter((entry): entry is TimelineEntry => !!entry),
    };
};

export const getTimelineCoverage = (graph: TimelineGraph, doc: TimelineDocument): TimelineCoverage => {
    const addedRefs = new Set<Id>(doc.track.filter(isElementEntry).map(entry => entry.refId));
    const missingNodeIds = graph.nodes().filter(node => !addedRefs.has(node as NodeId)) as NodeId[];
    const missingEdgeIds = graph.edges().filter(edge => !addedRefs.has(edge as LineId)) as LineId[];
    const missingIds = [...missingNodeIds, ...missingEdgeIds];

    return {
        missingNodeIds,
        missingEdgeIds,
        missingIds,
        missingNodeCount: missingNodeIds.length,
        missingEdgeCount: missingEdgeIds.length,
        isComplete: missingIds.length === 0,
    };
};

export const getTimelineEntryTitle = (graph: TimelineGraph, entry: TimelineEntry): string => {
    if (entry.kind === 'keyframe') {
        return graph.hasNode(entry.refId) ? getNodePrimaryName(graph, entry.refId) : entry.refId;
    }

    if (entry.kind === 'node') {
        return getNodePrimaryName(graph, entry.refId);
    }

    if (!graph.hasEdge(entry.refId)) return entry.refId;

    const [source, target] = graph.extremities(entry.refId) as [NodeId, NodeId];
    return `${getNodePrimaryName(graph, source)} -> ${getNodePrimaryName(graph, target)}`;
};

export const getTimelineEntrySubtitle = (graph: TimelineGraph, entry: TimelineEntry): string => {
    if (entry.kind === 'keyframe') {
        return `${Math.round(entry.x * 100) / 100}, ${Math.round(entry.y * 100) / 100}`;
    }

    if (entry.kind === 'node') {
        if (!graph.hasNode(entry.refId)) return 'Missing node';
        return graph.getNodeAttribute(entry.refId, 'type');
    }

    if (!graph.hasEdge(entry.refId)) return 'Missing edge';
    const attrs = graph.getEdgeAttributes(entry.refId);
    return `${attrs.style} / ${attrs.type}`;
};

export const getTimelineEntryAccent = (graph: TimelineGraph, entry: TimelineEntry): string[] => {
    if (entry.kind === 'keyframe') return ['#805AD5'];
    if (entry.kind === 'node' && entry.refId.startsWith('stn_')) return ['#c3e1f3'];
    if (entry.kind === 'node' && entry.refId.startsWith('misc_')) return ['#f3c3e1'];
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
                color: getTimelineEntryAccent(graph, {
                    kind: 'edge',
                    refId: edgeId,
                    id: '',
                    phase: 'enter',
                    showAnimation: true,
                }),
                label,
            });
        }
    });
    return Array.from(lines.values());
};

export interface TimelinePreviewState {
    visibleIds: Set<Id>;
    /**
     * Interpolated positions of keyframed nodes at the cursor, overriding the graph position.
     */
    positions: Map<NodeId, { x: number; y: number }>;
}

interface TimelineKeyframeAt extends TimelineKeyframeEntry {
    index: number;
}

const interpolateKeyframes = (
    frames: TimelineKeyframeAt[],
    cursor: number,
    origin: { x: number; y: number }
): { x: number; y: number } => {
    let before: TimelineKeyframeAt | undefined;
    let after: TimelineKeyframeAt | undefined;
    for (const frame of frames) {
        if (frame.index <= cursor) before = frame;
        else {
            after = frame;
            break;
        }
    }

    if (before && after) {
        const t = (cursor - before.index) / (after.index - before.index);
        return { x: before.x + (after.x - before.x) * t, y: before.y + (after.y - before.y) * t };
    }
    if (before) return { x: before.x, y: before.y };
    return origin;
};

/**
 * Compute the canvas state at the timeline cursor.
 * Elements are visible from their enter card through their exit card, inclusive.
 * They disappear only when the cursor moves past the exit card.
 * Keyframed nodes get their position interpolated between the surrounding keyframes.
 */
export const getTimelinePreviewState = (
    graph: TimelineGraph,
    doc: TimelineDocument,
    cursor: number
): TimelinePreviewState => {
    const visibleIds = new Set<Id>();
    const keyframesByRef = new Map<NodeId, TimelineKeyframeAt[]>();

    doc.track.forEach((entry, index) => {
        if (entry.kind === 'keyframe') {
            const frames = keyframesByRef.get(entry.refId) ?? [];
            frames.push({ ...entry, index });
            keyframesByRef.set(entry.refId, frames);
            return;
        }

        if (index <= cursor) {
            if (entry.phase === 'enter') visibleIds.add(entry.refId);
            else if (index < cursor) visibleIds.delete(entry.refId);
        }
    });

    const positions = new Map<NodeId, { x: number; y: number }>();
    keyframesByRef.forEach((frames, refId) => {
        if (!graph.hasNode(refId)) return;
        const origin = { x: graph.getNodeAttribute(refId, 'x'), y: graph.getNodeAttribute(refId, 'y') };
        positions.set(refId, interpolateKeyframes(frames, cursor, origin));
    });

    return { visibleIds, positions };
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

export const insertTimelineEntries = (doc: TimelineDocument, refIds: Id[], index: number): TimelineDocument => {
    const existingRefs = new Set<Id>(doc.track.filter(isElementEntry).map(entry => entry.refId));
    const entries = refIds
        .filter(refId => {
            if (existingRefs.has(refId)) return false;
            existingRefs.add(refId);
            return true;
        })
        .map(refId => createTimelineEntry(refId));

    if (entries.length === 0) return doc;

    const insertionIndex = Math.max(0, Math.min(index, doc.track.length));
    const track = [...doc.track];
    track.splice(insertionIndex, 0, ...entries);

    return {
        ...doc,
        track,
    };
};

export const appendTimelineEntries = (doc: TimelineDocument, refIds: Id[]): TimelineDocument => {
    return insertTimelineEntries(doc, refIds, doc.track.length);
};
