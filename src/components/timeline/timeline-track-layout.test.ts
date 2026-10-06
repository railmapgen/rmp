import { describe, expect, it } from 'vitest';
import { TimelineEntry } from '../../constants/timeline';
import { createTimelineTrackTimeScale, getTimelineTrackLayout } from './timeline-track-layout';

describe('timeline card time scale', () => {
    it('aligns unequal durations with card starts and ends and keeps gaps at their boundary time', () => {
        const track: TimelineEntry[] = [
            { id: 'short', kind: 'pause', duration: 1, position: 'after' },
            { id: 'long', kind: 'pause', duration: 10, position: 'after' },
            { id: 'end', kind: 'pause', duration: 2, position: 'after' },
        ];
        const { entries, totalWidth } = getTimelineTrackLayout(track);
        const scale = createTimelineTrackTimeScale(entries, totalWidth, {
            duration: 13,
            cursorTimes: [0, 1, 11, 13],
        });
        expect(scale.ticks).toEqual([
            { position: 24, time: 0 },
            { position: 208, time: 1 },
            { position: 392, time: 11 },
            { position: 552, time: 13 },
        ]);
        for (const [time, position] of [
            [0.5, 104],
            [6, 288],
            [12, 472],
        ]) {
            expect(scale.timeToPosition(time)).toBe(position);
            expect(scale.positionToTime(position)).toBe(time);
        }
        expect(scale.positionToTime(196)).toBe(1);
        expect(scale.timeToPosition(1)).toBe(208);
        expect(scale.timeToPosition(-1)).toBe(24);
        expect(scale.positionToTime(-1)).toBe(0);
        expect(scale.timeToPosition(100)).toBe(552);
        expect(scale.positionToTime(1000)).toBe(13);
    });

    it('skips overlapping entrances and instant keyframes when advancing or seeking backward', () => {
        const track: TimelineEntry[] = [
            { id: 'node', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
            { id: 'key', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 },
            { id: 'edge', kind: 'edge', refId: 'line_a', phase: 'enter', showAnimation: true },
            { id: 'last_key', kind: 'keyframe', refId: 'stn_a', x: 10, y: 20 },
        ];
        const { entries, totalWidth } = getTimelineTrackLayout(track);
        const scale = createTimelineTrackTimeScale(entries, totalWidth, {
            duration: 8,
            cursorTimes: [0, 0, 0, 8, 8],
        });
        expect(scale.timeToPosition(0)).toBe(252);
        expect(scale.timeToPosition(6)).toBe(372);
        expect(scale.timeToPosition(2)).toBe(292);
        expect(scale.timeToPosition(8)).toBe(456);
        expect(scale.positionToTime(216)).toBe(0);
        expect(scale.positionToTime(446)).toBe(8);
        expect(scale.ticks.map(tick => tick.time)).toEqual([0, 0, 0, 8, 8]);
    });
});
