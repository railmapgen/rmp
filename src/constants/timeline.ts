import { Id, LineId, NodeId } from './constants';

export const TIMELINE_DOCUMENT_VERSION = 1;

export type TimelineEntry =
    | {
          id: string;
          kind: 'node';
          refId: NodeId;
      }
    | {
          id: string;
          kind: 'edge';
          refId: LineId;
      };

export interface TimelineDocument {
    version: typeof TIMELINE_DOCUMENT_VERSION;
    track: TimelineEntry[];
}

export const createEmptyTimelineDocument = (): TimelineDocument => ({
    version: TIMELINE_DOCUMENT_VERSION,
    track: [],
});

export const isNodeTimelineEntry = (id: Id): id is NodeId => !id.startsWith('line_');
