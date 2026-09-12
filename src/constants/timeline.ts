import { Id, LineId, NodeId } from './constants';

export const TIMELINE_DOCUMENT_VERSION = 1;

/**
 * The timeline has two modes sharing the same track data.
 * `quick` is the simplified mode where every element only enters the frame.
 * `pro` unlocks exit phases, animation toggles and keyframes.
 */
export type TimelineMode = 'quick' | 'pro';

export type TimelinePhase = 'enter' | 'exit';

export interface TimelineElementEntryBase {
    id: string;
    phase: TimelinePhase;
    showAnimation: boolean;
}

export type TimelineElementEntry =
    | (TimelineElementEntryBase & { kind: 'node'; refId: NodeId })
    | (TimelineElementEntryBase & { kind: 'edge'; refId: LineId });

export interface TimelineKeyframeEntry {
    id: string;
    kind: 'keyframe';
    refId: NodeId;
    x: number;
    y: number;
}

export type TimelineEntry = TimelineElementEntry | TimelineKeyframeEntry;

export interface TimelineDocument {
    version: typeof TIMELINE_DOCUMENT_VERSION;
    mode: TimelineMode;
    track: TimelineEntry[];
}

export const createEmptyTimelineDocument = (): TimelineDocument => ({
    version: TIMELINE_DOCUMENT_VERSION,
    mode: 'quick',
    track: [],
});

export const isNodeTimelineEntry = (id: Id): id is NodeId => !id.startsWith('line_');

export const isElementEntry = (entry: TimelineEntry): entry is TimelineElementEntry =>
    entry.kind === 'node' || entry.kind === 'edge';

export const isKeyframeEntry = (entry: TimelineEntry): entry is TimelineKeyframeEntry => entry.kind === 'keyframe';
