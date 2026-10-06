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
 * `startTime`/`endTime`, when set, place clips at exact video times in seconds.
 */
export interface TimelineTimedEntry {
    id: string;
    kind: 'audio' | 'label';
    startSlot: number;
    endSlot: number;
    startTime?: number;
    endTime?: number;
    /** Initial label span in seconds, until its end is placed explicitly. */
    duration?: number;
}

export const TIMELINE_LABEL_DEFAULT_SECONDS = 15;

export interface TimelineAudioEntry extends TimelineTimedEntry {
    kind: 'audio';
    blobId: string;
    name: string;
}

/** Text overlays occupy their own lane and never change the map animation schedule. */
export interface TimelineLabelEntry extends TimelineTimedEntry {
    kind: 'label';
    text: string;
}

export const TIMELINE_CAMERA_ZOOM_LEVELS = [1, 2, 4, 8, 16] as const;
export type TimelineCameraZoom = (typeof TIMELINE_CAMERA_ZOOM_LEVELS)[number];
export const isTimelineCameraZoom = (value: unknown): value is TimelineCameraZoom =>
    typeof value === 'number' && TIMELINE_CAMERA_ZOOM_LEVELS.includes(value as TimelineCameraZoom);

export type TimelineLengthUnit = 'km' | 'mi';

export interface TimelineSettings {
    speedMultiplier: number;
    cameraZoom: TimelineCameraZoom;
    autoChangeStationType: boolean;
    showYear: boolean;
    showLineName: boolean;
    showLineLength: boolean;
    lineLengthUnit: TimelineLengthUnit;
}

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
    speedMultiplier: 1,
    cameraZoom: 2,
    autoChangeStationType: true,
    showYear: false,
    showLineName: false,
    showLineLength: false,
    lineLengthUnit: 'km',
};

export interface TimelineDocument {
    version: typeof TIMELINE_DOCUMENT_VERSION;
    track: TimelineEntry[];
    audioTrack?: TimelineAudioEntry[];
    labelTrack?: TimelineLabelEntry[];
    settings?: TimelineSettings;
}

export const getTimelineSettings = (document: TimelineDocument): TimelineSettings => {
    const settings = { ...DEFAULT_TIMELINE_SETTINGS, ...document.settings };
    return {
        ...settings,
        cameraZoom: isTimelineCameraZoom(settings.cameraZoom)
            ? settings.cameraZoom
            : DEFAULT_TIMELINE_SETTINGS.cameraZoom,
        lineLengthUnit: settings.lineLengthUnit === 'mi' ? 'mi' : 'km',
    };
};

export const createEmptyTimelineDocument = (): TimelineDocument => ({
    version: TIMELINE_DOCUMENT_VERSION,
    track: [],
    settings: { ...DEFAULT_TIMELINE_SETTINGS },
});

export const isNodeTimelineEntry = (id: Id): id is NodeId => !id.startsWith('line_');

export const isElementEntry = (entry: TimelineEntry): entry is TimelineElementEntry =>
    entry.kind === 'node' || entry.kind === 'edge';

export const isKeyframeEntry = (entry: TimelineEntry): entry is TimelineKeyframeEntry => entry.kind === 'keyframe';

export const isPauseEntry = (entry: TimelineEntry): entry is TimelinePauseEntry => entry.kind === 'pause';
export const isAudioEntry = (entry: TimelineAudioEntry): entry is TimelineAudioEntry => entry.kind === 'audio';
