import type { LineId } from '../../constants/constants';
import { getTimelineSettings, type TimelineDocument, type TimelineKeyframeStation } from '../../constants/timeline';
import type { TimelineGraph } from '../../timeline/timeline-project-context';
import { getTimelineKeyframeStation } from '../../util/timeline';
import type { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { createFrameStationGraph } from '../../util/video-export/video-export';
import stations from '../svgs/stations/stations';

/** Match playback's topology, including clips that start at the selected marker's time. */
export const getTimelineVisibleEdgesAtCursor = (
    graph: TimelineGraph,
    document: TimelineDocument,
    entryId: string,
    timing?: TimelinePlaybackTiming,
    sampleTime?: number
): Set<LineId> => {
    const fixed = new Set<LineId>((document.fixedResources ?? []).filter(id => graph.hasEdge(id)) as LineId[]);
    const visible = new Set(fixed);
    const index = document.track.findIndex(entry => entry.id === entryId);
    if (index < 0) return visible;

    const times = timing?.cursorTimes;
    const hasTiming =
        times?.length === document.track.length + 1 &&
        times.every((time, i) => Number.isFinite(time) && time >= 0 && (i === 0 || time >= times[i - 1]));
    if (!hasTiming) {
        for (const entry of document.track.slice(0, index)) {
            if (entry.kind !== 'edge' || !graph.hasEdge(entry.refId) || fixed.has(entry.refId)) continue;
            if (entry.phase === 'enter') visible.add(entry.refId);
            else visible.delete(entry.refId);
        }
        return visible;
    }

    const time = sampleTime !== undefined && Number.isFinite(sampleTime) ? sampleTime : times![index];
    document.track.forEach((entry, i) => {
        if (entry.kind !== 'edge' || !graph.hasEdge(entry.refId) || fixed.has(entry.refId) || times![i] > time) {
            return;
        }
        if (entry.phase === 'enter') visible.add(entry.refId);
        else if (!entry.showAnimation || time >= times![i + 1]) visible.delete(entry.refId);
    });
    return visible;
};

/** Resolve the exact editable marker appearance using the same station inference as playback. */
export const getTimelineKeyframeStationAtCursor = (
    graph: TimelineGraph,
    document: TimelineDocument,
    entryId: string,
    timing?: TimelinePlaybackTiming
): TimelineKeyframeStation | undefined => {
    const entry = document.track.find(item => item.id === entryId);
    if (!entry || entry.kind !== 'keyframe' || !graph.hasNode(entry.refId)) return undefined;
    if (!Object.hasOwn(stations, graph.getNodeAttribute(entry.refId, 'type'))) return undefined;
    const baseline = getTimelineSettings(document).autoChangeStationType
        ? createFrameStationGraph(graph, getTimelineVisibleEdgesAtCursor(graph, document, entryId, timing))
        : graph;
    const state = getTimelineKeyframeStation(baseline, document, entryId);
    return state
        ? { type: state.type, attrs: { ...structuredClone(stations[state.type].defaultAttrs), ...state.attrs } }
        : undefined;
};
