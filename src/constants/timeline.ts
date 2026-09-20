import { Id, LineId, NodeId } from './constants';

export const TIMELINE_DOCUMENT_VERSION = 1;

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

export type TimelinePausePosition = 'before' | 'after';

export interface TimelinePauseEntry {
    id: string;
    kind: 'pause';
    position: TimelinePausePosition;
    duration: number;
    refId?: never;
    phase?: never;
    showAnimation?: never;
}

export type TimelineEntry = TimelineElementEntry | TimelineKeyframeEntry | TimelinePauseEntry;

/**
 * Audio is deliberately kept out of the visual track so clips may overlap.
 * `startSlot`/`endSlot` are discrete cursor indices (0 = before the first entry,
 * track.length = after the last one), snapped to the centre of each insertion cursor.
 */
export interface TimelineAudioEntry {
    id: string;
    kind: 'audio';
    blobId: string;
    name: string;
    startSlot: number;
    endSlot: number;
}

export interface TimelineDocument {
    version: typeof TIMELINE_DOCUMENT_VERSION;
    track: TimelineEntry[];
    audioTrack?: TimelineAudioEntry[];
}

export const createEmptyTimelineDocument = (): TimelineDocument => ({
    version: TIMELINE_DOCUMENT_VERSION,
    track: [],
});

export const isNodeTimelineEntry = (id: Id): id is NodeId => !id.startsWith('line_');

export const isElementEntry = (entry: TimelineEntry): entry is TimelineElementEntry =>
    entry.kind === 'node' || entry.kind === 'edge';

export const isKeyframeEntry = (entry: TimelineEntry): entry is TimelineKeyframeEntry => entry.kind === 'keyframe';

export const isPauseEntry = (entry: TimelineEntry): entry is TimelinePauseEntry => entry.kind === 'pause';
export const isAudioEntry = (entry: TimelineAudioEntry): entry is TimelineAudioEntry => entry.kind === 'audio';
