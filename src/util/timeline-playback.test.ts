import { describe, expect, it } from 'vitest';
import { TimelineAudioEntry, TimelineLabelEntry } from '../constants/timeline';
import {
    formatTimelineTime,
    getTimelineAudioRange,
    getTimelineClipRange,
    getTimelineCursorAtTime,
} from './timeline-playback';

const audio: TimelineAudioEntry = {
    id: 'music',
    kind: 'audio',
    blobId: 'audio',
    name: 'song',
    startSlot: 1,
    endSlot: 3,
};

describe('real-time timeline placement', () => {
    it('uses 15 seconds for new labels while retaining existing placements and manual lengths', () => {
        const existing: TimelineLabelEntry = { id: 'label', kind: 'label', text: 'Caption', startSlot: 1, endSlot: 2 };
        const inserted = { ...existing, duration: 15 };
        expect(getTimelineClipRange(existing, [0, 10, 60], 60)).toEqual({ start: 10, end: 60 });
        expect(getTimelineClipRange(inserted, [0, 10, 60], 60)).toEqual({ start: 10, end: 25 });
        expect(getTimelineClipRange(inserted, [0, 50, 60], 60)).toEqual({ start: 50, end: 60 });
        expect(getTimelineClipRange({ ...inserted, startTime: 1.25, endTime: 23 }, [0, 10, 60], 60)).toEqual({
            start: 1.25,
            end: 23,
        });
    });
    it('resolves untouched music at authored cursor times including the final overview', () => {
        expect(getTimelineAudioRange(audio, [0, 0.2, 3.25, 6.4], 6.4)).toEqual({ start: 0.2, end: 6.4 });
    });
    it('preserves edited seconds when drawing speed or visual order changes', () => {
        const edited = { ...audio, startTime: 1.45, endTime: 4.15 };
        expect(getTimelineAudioRange(edited, [0, 2, 4, 8], 8)).toEqual({ start: 1.45, end: 4.15 });
        expect(getTimelineAudioRange(edited, [0, 1, 3, 6], 6)).toEqual({ start: 1.45, end: 4.15 });
    });
    it('clamps out-of-range music to the complete video and never produces a negative span', () => {
        expect(getTimelineAudioRange({ ...audio, startTime: 4, endTime: 20 }, [0, 2], 8)).toEqual({ start: 4, end: 8 });
        expect(getTimelineAudioRange({ ...audio, startTime: 9, endTime: 1 }, [0, 2], 8)).toEqual({ start: 8, end: 8 });
    });
    it('finds the active cursor when adjacent stations overlap a drawing clip', () => {
        expect(getTimelineCursorAtTime([0, 0, 2.5, 5], 1.1)).toBe(1);
        expect(getTimelineCursorAtTime([0, 0, 2.5, 5], 5)).toBe(3);
    });
    it('formats elapsed time without losing a minute boundary to rounding', () => {
        expect(formatTimelineTime(59.96)).toBe('1:00.0');
        expect(formatTimelineTime(3.25)).toBe('0:03.3');
    });
});
