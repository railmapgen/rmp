import type { SerializedGraph } from 'graphology-types';
import type { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import type { TimelineDocument } from '../constants/timeline';
import type { MapStyle } from '../map/map-style';

export const TIMELINE_PROJECT_VERSION = 1 as const;
export const TIMELINE_PROJECT_APP = 'rmp-timeline' as const;

export type TimelineProjectGraph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

/** The complete undoable content of a Timeline project. */
export interface TimelineProjectRevision {
    rmpVersion: number;
    graph: TimelineProjectGraph;
    mapEnabled: boolean;
    mapStyle: MapStyle;
    svgViewBoxZoom: number;
    svgViewBoxMin: { x: number; y: number };
    timeline: TimelineDocument;
}

/** IndexedDB record. Undo/redo stacks are deliberately session-only. */
export interface TimelineProjectRecord {
    id: string;
    name: string;
    version: typeof TIMELINE_PROJECT_VERSION;
    createdAt: number;
    updatedAt: number;
    revision: TimelineProjectRevision;
}

export type TimelineProjectSummary = Pick<TimelineProjectRecord, 'id' | 'name' | 'version' | 'createdAt' | 'updatedAt'>;
export type TimelineAssetKind = 'image' | 'audio';

export interface TimelineAssetRecord {
    key: string;
    projectId: string;
    kind: TimelineAssetKind;
    id: string;
    blob: Blob;
    name?: string;
}

export interface TimelineProjectFileAsset {
    kind: TimelineAssetKind;
    id: string;
    data: string;
    name?: string;
}

/** Portable, self-contained Timeline project format. */
export interface TimelineProjectFile {
    app: typeof TIMELINE_PROJECT_APP;
    version: typeof TIMELINE_PROJECT_VERSION;
    name: string;
    revision: TimelineProjectRevision;
    assets: TimelineProjectFileAsset[];
}

export const makeTimelineAssetKey = (projectId: string, kind: TimelineAssetKind, id: string) =>
    `${projectId}\u0000${kind}\u0000${id}`;
