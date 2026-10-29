import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
    getTimelineSettings,
    isElementEntry,
    isNodeTimelineEntry,
    isPauseEntry,
    TimelineDocument,
    TimelineAudioEntry,
    TimelineLabelEntry,
    TIMELINE_LABEL_DEFAULT_SECONDS,
    TimelineElementEntry,
    TimelineEntry,
    TimelineKeyframeEntry,
    TimelineKeyframeStation,
    TimelinePauseEntry,
    TimelinePausePosition,
    TimelinePhase,
    TimelineSettings,
    TIMELINE_DOCUMENT_VERSION,
} from '../constants/timeline';
import { defaultStationAttributes, StationType, STATION_TYPE_VALUES } from '../constants/stations';
import {
    createTimelineOverlayModule,
    getTimelineOverlayModules,
    TimelineOverlayModule,
    TimelineOverlayRegion,
} from '../constants/timeline-overlays';
import { getThemeKey } from './line-definitions';

type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

/** Move at a region-local insertion index; callers commit only after the drop completes. */
export const moveTimelineOverlayModule = (
    modules: readonly TimelineOverlayModule[],
    id: string,
    region: TimelineOverlayRegion,
    index: number,
    isSubscriber: boolean
): TimelineOverlayModule[] => {
    const module = modules.find(item => item.id === id);
    if (!module || (region === 'top-right' && !isSubscriber)) return [...modules];
    const remaining = modules.filter(item => item.id !== id);
    const siblings = remaining.filter(item => item.region === region);
    const target = siblings[Math.max(0, Math.min(siblings.length, index))];
    const position = target
        ? remaining.findIndex(item => item.id === target.id)
        : siblings.length
          ? remaining.findIndex(item => item.id === siblings[siblings.length - 1].id) + 1
          : remaining.length;
    return [...remaining.slice(0, position), { ...module, region }, ...remaining.slice(position)];
};

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

export const insertTimelineLabel = (doc: TimelineDocument, text: string, index: number): TimelineDocument => {
    const startSlot = Math.max(0, Math.min(index, doc.track.length - 1));
    return {
        ...doc,
        labelTrack: [
            ...(doc.labelTrack ?? []),
            {
                id: `timeline_${nanoid(10)}`,
                kind: 'label',
                text,
                startSlot,
                endSlot: startSlot + 1,
                duration: TIMELINE_LABEL_DEFAULT_SECONDS,
            },
        ],
    };
};

export const insertTimelineExitEntry = (
    doc: TimelineDocument,
    refId: Id,
    index: number
): { document: TimelineDocument; cursor: number } => {
    if (doc.fixedResources?.includes(refId)) return { document: doc, cursor: index };
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

export const createPauseEntry = (position: TimelinePausePosition, duration = 1): TimelinePauseEntry => ({
    id: `timeline_${nanoid(10)}`,
    kind: 'pause',
    position,
    duration,
});

export const insertTimelinePause = (
    doc: TimelineDocument,
    position: TimelinePausePosition,
    index: number
): { document: TimelineDocument; cursor: number } => {
    const insertionIndex = Math.max(0, Math.min(index, doc.track.length));
    const track = [...doc.track];
    track.splice(insertionIndex, 0, createPauseEntry(position));
    return { document: { ...doc, track }, cursor: insertionIndex + 1 };
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

/** The supplied graph may already reflect automatic station types at this cursor. */
export const getTimelineKeyframeStation = (
    graph: TimelineGraph,
    doc: TimelineDocument,
    entryId: string
): TimelineKeyframeStation | undefined => {
    const index = doc.track.findIndex(entry => entry.id === entryId && entry.kind === 'keyframe');
    const target = doc.track[index];
    if (!target || target.kind !== 'keyframe' || !target.refId.startsWith('stn_') || !graph.hasNode(target.refId)) {
        return undefined;
    }
    for (let i = index; i >= 0; i--) {
        const entry = doc.track[i];
        if (entry.kind === 'keyframe' && entry.refId === target.refId && entry.station) {
            return structuredClone(entry.station);
        }
    }
    const type = graph.getNodeAttribute(target.refId, 'type');
    if (!STATION_TYPE_VALUES.has(type as StationType)) return undefined;
    return {
        type: type as StationType,
        attrs: structuredClone(graph.getNodeAttribute(target.refId, type as StationType) ?? defaultStationAttributes),
    };
};

/** Save only this keyframe's appearance, without sharing mutable station attributes. */
export const updateKeyframeStation = (
    doc: TimelineDocument,
    entryId: string,
    station: TimelineKeyframeStation
): TimelineDocument => {
    if (!doc.track.some(entry => entry.id === entryId && entry.kind === 'keyframe' && entry.refId.startsWith('stn_'))) {
        return doc;
    }
    return {
        ...doc,
        track: doc.track.map(entry =>
            entry.id === entryId && entry.kind === 'keyframe' ? { ...entry, station: structuredClone(station) } : entry
        ),
    };
};

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
    if (enterIndex === -1 && !doc.fixedResources?.includes(refId)) {
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
    if (doc.fixedResources?.includes(refId)) return doc;
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

export const normalizeTimelineFixedResources = (value: unknown): Id[] =>
    Array.isArray(value)
        ? [...new Set(value.filter((id): id is Id => typeof id === 'string' && /^(stn_|misc_node_|line_).+/.test(id)))]
        : [];

/** Retain clip anchors at the same insertion boundaries when visual entries disappear. */
export const filterTimelineTrack = (
    doc: TimelineDocument,
    predicate: (entry: TimelineEntry, index: number) => boolean
): TimelineDocument => {
    const retainedBefore = [0];
    const track = doc.track.filter((entry, index) => {
        const keep = predicate(entry, index);
        retainedBefore.push(retainedBefore[index] + Number(keep));
        return keep;
    });
    if (track.length === doc.track.length) return doc;
    const mapSlot = (slot: number) =>
        retainedBefore[Math.max(0, Math.min(doc.track.length, Number.isFinite(slot) ? Math.round(slot) : 0))];
    const rebase = <T extends TimelineAudioEntry | TimelineLabelEntry>(entries: T[] | undefined): T[] | undefined =>
        entries?.map(entry => {
            const startSlot = mapSlot(entry.startSlot);
            return { ...entry, startSlot, endSlot: Math.max(startSlot, mapSlot(entry.endSlot)) };
        });
    const audioTrack = rebase(doc.audioTrack);
    const labelTrack = rebase(doc.labelTrack);
    return { ...doc, track, ...(audioTrack ? { audioTrack } : {}), ...(labelTrack ? { labelTrack } : {}) };
};

/** Selecting fixed resources is one undoable edit; deselection does not recreate earlier track cards. */
export const setTimelineFixedResources = (doc: TimelineDocument, ids: Iterable<Id>): TimelineDocument => {
    const fixedResources = normalizeTimelineFixedResources([...ids]);
    const fixed = new Set(fixedResources);
    return filterTimelineTrack({ ...doc, fixedResources }, entry => !isElementEntry(entry) || !fixed.has(entry.refId));
};

export const removeTimelineEntry = (doc: TimelineDocument, entryId: string): TimelineDocument => {
    const removedEntry = doc.track.find(entry => entry.id === entryId);
    if (!removedEntry) return doc;

    // Exit phases and keyframes depend on the enter card and are removed in the same undoable edit.
    const removeDependents = isElementEntry(removedEntry) && removedEntry.phase === 'enter';
    return filterTimelineTrack(doc, entry =>
        removeDependents ? isPauseEntry(entry) || entry.refId !== removedEntry.refId : entry.id !== entryId
    );
};

const isElementPlacementValid = (
    track: TimelineEntry[],
    entry: TimelineEntry,
    fixedResources: readonly Id[] = []
): boolean => {
    if (isPauseEntry(entry)) return true;

    let visible = fixedResources.includes(entry.refId);
    for (const candidate of track) {
        if (isPauseEntry(candidate)) continue;
        if (candidate.refId !== entry.refId) continue;
        if (isElementEntry(candidate) && candidate.phase === 'enter') visible = true;
        else {
            if (!visible) return false;
            if (isElementEntry(candidate)) visible = false;
        }
    }

    return true;
};

export const moveTimelineEntry = (doc: TimelineDocument, fromIndex: number, toIndex: number): TimelineDocument => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return doc;
    if (fromIndex >= doc.track.length || toIndex >= doc.track.length) return doc;

    const track = [...doc.track];
    const [entry] = track.splice(fromIndex, 1);
    track.splice(toIndex, 0, entry);
    if (!isElementPlacementValid(track, entry, doc.fixedResources)) return doc;

    return {
        ...doc,
        track,
    };
};

/** Moves a block of selected entries together, preserving their relative order. */
export const moveTimelineEntries = (
    doc: TimelineDocument,
    entryIds: Iterable<string>,
    insertAt: number
): TimelineDocument => {
    const selected = new Set(entryIds);
    const block = doc.track.filter(entry => selected.has(entry.id));
    if (!block.length) return doc;

    const remaining = doc.track.filter(entry => !selected.has(entry.id));
    const at = Math.max(0, Math.min(insertAt, remaining.length));
    const track = [...remaining.slice(0, at), ...block, ...remaining.slice(at)];

    if (track.every((entry, index) => entry === doc.track[index])) return doc;
    if (!block.every(entry => isElementPlacementValid(track, entry, doc.fixedResources))) return doc;

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
    position?: unknown;
    duration?: unknown;
    station?: unknown;
}

const isSerializableStationValue = (value: unknown, ancestors = new Set<object>()): boolean => {
    if (value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object' || ancestors.has(value)) return false;
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
    ancestors.add(value);
    const valid = Object.values(value).every(child => isSerializableStationValue(child, ancestors));
    ancestors.delete(value);
    return valid;
};

const normalizeKeyframeStation = (value: unknown): TimelineKeyframeStation | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const station = value as Partial<TimelineKeyframeStation>;
    if (!STATION_TYPE_VALUES.has(station.type as StationType)) return undefined;
    const attrs = station.attrs;
    if (
        !attrs ||
        typeof attrs !== 'object' ||
        Array.isArray(attrs) ||
        !Array.isArray(attrs.names) ||
        !attrs.names.length ||
        !attrs.names.every(name => typeof name === 'string') ||
        !isSerializableStationValue(attrs)
    ) {
        return undefined;
    }
    if (attrs.preciseNameOffsets !== undefined) {
        const offsets = attrs.preciseNameOffsets;
        if (
            !offsets ||
            !Number.isFinite(offsets.x) ||
            !Number.isFinite(offsets.y) ||
            !['start', 'middle', 'end'].includes(offsets.anchor)
        ) {
            return undefined;
        }
    }
    return { type: station.type as StationType, attrs: structuredClone(attrs) };
};

const normalizeTimelineEntry = (entry?: RawTimelineEntry): TimelineEntry | undefined => {
    if (!entry || typeof entry.id !== 'string') return undefined;

    if (entry.kind === 'pause') {
        const position = entry.position === 'after' ? 'after' : entry.position === 'before' ? 'before' : undefined;
        if (!position || typeof entry.duration !== 'number' || !Number.isFinite(entry.duration)) return undefined;
        return {
            id: entry.id,
            kind: 'pause',
            position,
            duration: Math.max(0, entry.duration),
        };
    }

    if (typeof entry.refId !== 'string') return undefined;

    if (entry.kind === 'keyframe') {
        if (typeof entry.x !== 'number' || !Number.isFinite(entry.x)) return undefined;
        if (typeof entry.y !== 'number' || !Number.isFinite(entry.y)) return undefined;
        const station = entry.refId.startsWith('stn_') ? normalizeKeyframeStation(entry.station) : undefined;
        return {
            id: entry.id,
            kind: 'keyframe',
            refId: entry.refId as NodeId,
            x: entry.x,
            y: entry.y,
            ...(station ? { station } : {}),
        };
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

export type TimelineDocumentLike = Partial<
    Omit<TimelineDocument, 'track' | 'version' | 'overlayModules' | 'fixedResources' | 'settings'>
> & {
    track?: unknown;
    version?: number;
    overlayModules?: unknown;
    fixedResources?: unknown;
    settings?: unknown;
};

/** Sequential content migrations, independent of the painter's save versions. */
export const TIMELINE_DOCUMENT_UPGRADE_COLLECTION: Record<number, (doc: TimelineDocumentLike) => TimelineDocumentLike> =
    {
        1: doc => {
            const modules: TimelineOverlayModule[] = [];
            if (!Array.isArray(doc.overlayModules)) {
                const settings =
                    doc.settings && typeof doc.settings === 'object' ? (doc.settings as Record<string, unknown>) : {};
                if (settings.showYear === true)
                    modules.push(createTimelineOverlayModule('date', 'top-left', 'timeline_overlay_legacy_date'));
                if (settings.showLineName === true)
                    modules.push(
                        createTimelineOverlayModule('line-identity', 'top-left', 'timeline_overlay_legacy_line')
                    );
                if (settings.showLineLength === true) {
                    const length = createTimelineOverlayModule(
                        'line-length',
                        'top-left',
                        'timeline_overlay_legacy_length'
                    );
                    length.settings.unit = settings.lineLengthUnit === 'mi' ? 'mi' : 'km';
                    modules.push(length);
                }
            }
            return {
                ...doc,
                version: 2,
                settings: getTimelineSettings({
                    version: TIMELINE_DOCUMENT_VERSION,
                    track: [],
                    settings: doc.settings as TimelineSettings | undefined,
                }),
                overlayModules: [...modules, ...getTimelineOverlayModules(doc)],
            };
        },
    };

export const upgradeTimelineDocument = (source: TimelineDocumentLike): TimelineDocumentLike => {
    let doc = source;
    let version = doc.version ?? 1;
    if (!Number.isInteger(version) || version < 1 || version > TIMELINE_DOCUMENT_VERSION) {
        throw new Error(`Unsupported Timeline document version: ${version}`);
    }
    while (version < TIMELINE_DOCUMENT_VERSION) {
        const upgrade = TIMELINE_DOCUMENT_UPGRADE_COLLECTION[version];
        if (!upgrade) throw new Error(`Unsupported Timeline document version: ${version}`);
        doc = upgrade(doc);
        const nextVersion = doc.version;
        if (nextVersion === undefined || nextVersion <= version) throw new Error('Invalid Timeline document upgrade');
        version = nextVersion;
    }
    return doc;
};

export const normalizeTimelineDocument = (source?: TimelineDocumentLike | null): TimelineDocument => {
    if (!source) return createEmptyTimelineDocument();
    const doc = upgradeTimelineDocument(source);
    if (!Array.isArray(doc.track)) return createEmptyTimelineDocument();

    const normalized: TimelineDocument = {
        version: TIMELINE_DOCUMENT_VERSION,
        track: (doc.track as RawTimelineEntry[])
            .map(entry => normalizeTimelineEntry(entry))
            .filter((entry): entry is TimelineEntry => !!entry),
        overlayModules: getTimelineOverlayModules(doc),
        fixedResources: normalizeTimelineFixedResources(doc.fixedResources),
    };
    if (doc.settings && typeof doc.settings === 'object') {
        normalized.settings = getTimelineSettings({ ...normalized, settings: doc.settings as TimelineSettings });
    }
    const audioTrack = (doc as { audioTrack?: unknown }).audioTrack;
    if (Array.isArray(audioTrack)) {
        normalized.audioTrack = audioTrack
            .filter((entry): entry is TimelineAudioEntry => {
                if (!entry || typeof entry !== 'object') return false;
                const candidate = entry as Partial<TimelineAudioEntry>;
                return (
                    candidate.kind === 'audio' &&
                    typeof candidate.id === 'string' &&
                    typeof candidate.blobId === 'string' &&
                    typeof candidate.name === 'string' &&
                    typeof candidate.startSlot === 'number' &&
                    Number.isFinite(candidate.startSlot) &&
                    typeof candidate.endSlot === 'number' &&
                    Number.isFinite(candidate.endSlot) &&
                    candidate.startSlot >= 0 &&
                    candidate.endSlot >= candidate.startSlot
                );
            })
            .map(entry => {
                const normalizedEntry = {
                    ...entry,
                    startSlot: Math.round(entry.startSlot),
                    endSlot: Math.round(entry.endSlot),
                };
                if (typeof entry.startTime !== 'number' || !Number.isFinite(entry.startTime) || entry.startTime < 0) {
                    delete normalizedEntry.startTime;
                }
                if (typeof entry.endTime !== 'number' || !Number.isFinite(entry.endTime) || entry.endTime < 0) {
                    delete normalizedEntry.endTime;
                } else if (normalizedEntry.startTime !== undefined) {
                    normalizedEntry.endTime = Math.max(normalizedEntry.startTime, entry.endTime);
                }
                return normalizedEntry;
            });
    }
    const labelTrack = (doc as { labelTrack?: unknown }).labelTrack;
    if (Array.isArray(labelTrack)) {
        normalized.labelTrack = labelTrack
            .filter((entry): entry is TimelineLabelEntry => {
                if (!entry || typeof entry !== 'object') return false;
                const candidate = entry as Partial<TimelineLabelEntry>;
                return (
                    candidate.kind === 'label' &&
                    typeof candidate.id === 'string' &&
                    typeof candidate.text === 'string' &&
                    typeof candidate.startSlot === 'number' &&
                    Number.isFinite(candidate.startSlot) &&
                    candidate.startSlot >= 0 &&
                    typeof candidate.endSlot === 'number' &&
                    Number.isFinite(candidate.endSlot) &&
                    candidate.endSlot >= candidate.startSlot
                );
            })
            .map(entry => {
                const clip: TimelineLabelEntry = {
                    id: entry.id,
                    kind: 'label',
                    text: entry.text,
                    startSlot: Math.round(entry.startSlot),
                    endSlot: Math.round(entry.endSlot),
                };
                if (typeof entry.startTime === 'number' && Number.isFinite(entry.startTime) && entry.startTime >= 0)
                    clip.startTime = entry.startTime;
                if (typeof entry.duration === 'number' && Number.isFinite(entry.duration) && entry.duration > 0)
                    clip.duration = entry.duration;
                if (typeof entry.endTime === 'number' && Number.isFinite(entry.endTime) && entry.endTime >= 0)
                    clip.endTime = Math.max(clip.startTime ?? 0, entry.endTime);
                return clip;
            });
    }
    return setTimelineFixedResources(normalized, normalized.fixedResources ?? []);
};

export const getTimelineCoverage = (graph: TimelineGraph, doc: TimelineDocument): TimelineCoverage => {
    const addedRefs = new Set<Id>([
        ...(doc.fixedResources ?? []),
        ...doc.track.filter(isElementEntry).map(entry => entry.refId),
    ]);
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
    if (entry.kind === 'pause') return entry.position === 'before' ? 'Frame pause before' : 'Frame pause after';
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
    if (entry.kind === 'pause') return `${entry.duration}s`;
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
    if (entry.kind === 'pause') return ['#805AD5'];
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

const themeToStr = (theme: Theme | undefined) =>
    getThemeKey(theme ?? [CityCode.Other, 'other', '#000000', MonoColour.black]);

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
 * The cursor represents the insertion position before the next track entry.
 * Elements are visible after their enter card and through their exit card, inclusive.
 * They disappear only when the cursor moves past the exit card.
 * Keyframed nodes get their position interpolated between the surrounding keyframes.
 */
export const getTimelinePreviewState = (
    graph: TimelineGraph,
    doc: TimelineDocument,
    cursor: number
): TimelinePreviewState => {
    const visibleIds = new Set<Id>(doc.fixedResources ?? []);
    const fixedIds = new Set(doc.fixedResources ?? []);
    const keyframesByRef = new Map<NodeId, TimelineKeyframeAt[]>();

    doc.track.forEach((entry, index) => {
        if (entry.kind === 'keyframe') {
            const frames = keyframesByRef.get(entry.refId) ?? [];
            frames.push({ ...entry, index });
            keyframesByRef.set(entry.refId, frames);
            return;
        }

        if (index < cursor && isElementEntry(entry) && !fixedIds.has(entry.refId)) {
            if (entry.phase === 'enter') visibleIds.add(entry.refId);
            else visibleIds.delete(entry.refId);
        }
    });

    const positions = new Map<NodeId, { x: number; y: number }>();
    keyframesByRef.forEach((frames, refId) => {
        if (!graph.hasNode(refId)) return;
        const origin = { x: graph.getNodeAttribute(refId, 'x'), y: graph.getNodeAttribute(refId, 'y') };
        positions.set(refId, interpolateKeyframes(frames, cursor - 1, origin));
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
    const existingRefs = new Set<Id>([
        ...(doc.fixedResources ?? []),
        ...doc.track.filter(isElementEntry).map(entry => entry.refId),
    ]);
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
