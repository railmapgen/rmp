import { TimelineEntry } from '../../constants/timeline';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { TIMELINE_CLIP_WIDTH, TIMELINE_CURSOR_WIDTH, TIMELINE_KEYFRAME_SLOT_WIDTH } from './timeline-track-dimensions';

export interface TrackEntryLayout {
    entry: TimelineEntry;
    index: number;
    start: number;
    width: number;
    center: number;
}

export const getTimelineTrackLayout = (track: TimelineEntry[]) => {
    let x = 0;
    const entries = track.map((entry, index): TrackEntryLayout => {
        const width = entry.kind === 'keyframe' ? TIMELINE_KEYFRAME_SLOT_WIDTH : TIMELINE_CLIP_WIDTH;
        const start = x + TIMELINE_CURSOR_WIDTH;
        x = start + width;
        return { entry, index, start, width, center: start + width / 2 };
    });
    return { entries, totalWidth: x + TIMELINE_CURSOR_WIDTH };
};

interface TimeAnchor {
    position: number;
    time: number;
}

export interface TimelineTrackTimeScale {
    ticks: TimeAnchor[];
    timeToPosition: (time: number) => number;
    positionToTime: (position: number) => number;
}

/** Each card spans its own elapsed seconds. Insertion gaps and instant keyframes consume no time. */
export const createTimelineTrackTimeScale = (
    entries: TrackEntryLayout[],
    totalWidth: number,
    timing?: TimelinePlaybackTiming
): TimelineTrackTimeScale => {
    const duration = timing?.duration ?? 0;
    const times =
        timing?.cursorTimes.length === entries.length + 1
            ? timing.cursorTimes
            : Array.from({ length: entries.length + 1 }, (_, index) =>
                  entries.length ? (index / entries.length) * duration : 0
              );
    const anchors: TimeAnchor[] = entries.flatMap(({ start, width }, index) => [
        { position: start, time: times[index] },
        { position: start + width, time: times[index + 1] },
    ]);
    if (!anchors.length) anchors.push({ position: 0, time: 0 }, { position: totalWidth, time: duration });
    const ticks = entries.map(({ start }, index) => ({ position: start, time: times[index] }));
    if (entries.length) ticks.push(anchors[anchors.length - 1]);
    else ticks.push({ position: 0, time: 0 });

    const interpolate = (value: number, from: keyof TimeAnchor, to: keyof TimeAnchor) => {
        const query = Number.isNaN(value) ? 0 : value;
        let low = 0;
        let high = anchors.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (anchors[middle][from] <= query) low = middle + 1;
            else high = middle;
        }
        if (low === 0) return anchors[0][to];
        const previous = anchors[low - 1];
        const next = anchors[low];
        if (!next) return previous[to];
        const fraction = (query - previous[from]) / (next[from] - previous[from]);
        return previous[to] + fraction * (next[to] - previous[to]);
    };

    return {
        ticks,
        timeToPosition: time => interpolate(time, 'time', 'position'),
        positionToTime: position => interpolate(position, 'position', 'time'),
    };
};
