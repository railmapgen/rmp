import { TimelineTimedEntry } from '../constants/timeline';

export interface TimelinePlaybackTiming {
    duration: number;
    cursorTimes: number[];
}

export const formatTimelineTime = (seconds: number) => {
    const tenths = Math.round(Math.max(0, seconds) * 10);
    return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
};

/** Independent clips use seconds, with cursor anchors supported for untouched clips. */
export const getTimelineClipRange = (entry: TimelineTimedEntry, cursorTimes: number[], duration: number) => {
    const clamp = (time: number) => Math.max(0, Math.min(duration, time));
    const lastSlot = Math.max(0, cursorTimes.length - 1);
    const slotTime = (slot: number) => cursorTimes[Math.max(0, Math.min(lastSlot, Math.round(slot)))] ?? 0;
    const start = clamp(Number.isFinite(entry.startTime) ? entry.startTime! : slotTime(entry.startSlot));
    const hasLabelDuration = entry.kind === 'label' && Number.isFinite(entry.duration) && entry.duration! > 0;
    const end = clamp(
        Number.isFinite(entry.endTime)
            ? entry.endTime!
            : hasLabelDuration
              ? start + entry.duration!
              : slotTime(entry.endSlot)
    );
    return { start, end: Math.max(start, end) };
};

export const getTimelineAudioRange = getTimelineClipRange;

export const getTimelineCursorAtTime = (cursorTimes: number[], time: number) => {
    let low = 0;
    let high = cursorTimes.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (cursorTimes[middle] <= time + 1e-6) low = middle + 1;
        else high = middle;
    }
    return Math.max(0, low - 1);
};
