import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelinePlaybackClock } from './use-timeline-playback-clock';

type PlaybackOptions = Parameters<typeof useTimelinePlaybackClock>[0];
let now: number;
let nextFrameId: number;
const pendingFrames = new Map<number, FrameRequestCallback>();
const requestFrame = vi.fn<(callback: FrameRequestCallback) => number>();
const cancelFrame = vi.fn<(id: number) => void>();

const frameAt = (time: number) => {
    act(() => {
        now = time;
        const callbacks = [...pendingFrames.values()];
        pendingFrames.clear();
        callbacks.forEach(callback => callback(now));
    });
};
const driveUntil = (time: number, frameMilliseconds = 17) => {
    while (now + frameMilliseconds <= time) frameAt(now + frameMilliseconds);
};
const startClock = (overrides: Partial<PlaybackOptions> = {}) => {
    const options: PlaybackOptions = {
        playing: true,
        duration: 60,
        startTime: 0,
        onTick: vi.fn(),
        onComplete: vi.fn(),
        ...overrides,
    };
    return {
        ...renderHook((props: PlaybackOptions) => useTimelinePlaybackClock(props), { initialProps: options }),
        options,
    };
};

beforeEach(() => {
    now = 0;
    nextFrameId = 0;
    pendingFrames.clear();
    requestFrame.mockReset().mockImplementation(callback => {
        const id = ++nextFrameId;
        pendingFrames.set(id, callback);
        return id;
    });
    cancelFrame.mockReset().mockImplementation(id => {
        pendingFrames.delete(id);
    });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Timeline preview playback clock', () => {
    it('limits normal animation frames to 15 preview updates per second', () => {
        const { options } = startClock();
        for (const time of [17, 34, 51]) frameAt(time);
        expect(options.onTick).not.toHaveBeenCalled();
        driveUntil(1020);
        expect(options.onTick).toHaveBeenCalledTimes(15);
        expect(options.onTick).toHaveBeenNthCalledWith(1, 0.068);
        expect(options.onTick).toHaveBeenLastCalledWith(1.02);
        expect(pendingFrames.size).toBe(1);
        expect(options.onComplete).not.toHaveBeenCalled();
    });

    it('uses elapsed wall time after blocked frames and completes at the exact duration before the next update interval', () => {
        const { options } = startClock({ startTime: 3.125, duration: 4 });
        frameAt(67);
        expect(options.onTick).toHaveBeenLastCalledWith(3.192);
        frameAt(500);
        expect(options.onTick).toHaveBeenLastCalledWith(3.625);
        frameAt(800);
        expect(options.onTick).toHaveBeenLastCalledWith(3.925);
        const updates = vi.mocked(options.onTick).mock.calls.length;
        frameAt(850);
        expect(options.onTick).toHaveBeenCalledTimes(updates);
        frameAt(875);
        expect(options.onTick).toHaveBeenLastCalledWith(4);
        expect(options.onComplete).toHaveBeenCalledOnce();
        expect(pendingFrames.size).toBe(0);
        frameAt(1200);
        expect(options.onComplete).toHaveBeenCalledOnce();
    });

    it('keeps a 15 FPS cadence on 60 Hz frames despite timestamp rounding', () => {
        const { options } = startClock();
        for (let frame = 1; frame <= 60; frame++) frameAt((frame * 1000) / 60 - 0.05);
        expect(options.onTick).toHaveBeenCalledTimes(15);
        expect(vi.mocked(options.onTick).mock.lastCall?.[0]).toBeCloseTo(0.99995);
    });

    it('steps down to 10 then 5 FPS when animation frames are repeatedly blocked', () => {
        const { options } = startClock();
        for (const time of [70, 220, 270, 320, 520, 620, 720]) frameAt(time);
        expect(vi.mocked(options.onTick).mock.calls.map(([time]) => time)).toEqual([0.07, 0.22, 0.32, 0.52, 0.72]);
    });

    it('also lowers the frame rate when the update callback consumes the frame budget', () => {
        const onTick = vi.fn<(time: number) => void>(() => {
            now += 90;
        });
        startClock({ onTick });
        for (const time of [70, 170, 360, 370]) frameAt(time);
        expect(onTick.mock.calls.map(([time]) => time)).toEqual([0.07, 0.17, 0.37]);
    });

    it('recovers one tier after each three seconds of healthy frames and stops at 15 FPS', () => {
        const { options } = startClock();
        frameAt(200);
        frameAt(400);
        driveUntil(10000);
        const times = vi.mocked(options.onTick).mock.calls.map(([time]) => time);
        const expectInterval = (start: number, end: number, interval: number) => {
            const samples = times.filter(time => time >= start && time <= end);
            expect(samples.length).toBeGreaterThan(4);
            for (let index = 1; index < samples.length; index++)
                expect(samples[index] - samples[index - 1]).toBeCloseTo(interval, 6);
        };
        expectInterval(1, 3, 0.204);
        expectInterval(4, 6, 0.102);
        expectInterval(7, 8, 0.068);
        expectInterval(9, 10, 0.068);
    });

    it('uses new callbacks without restarting the origin when the displayed start time rerenders', () => {
        const { options, rerender } = startClock({ startTime: 1, duration: 2 });
        frameAt(70);
        expect(options.onTick).toHaveBeenLastCalledWith(1.07);
        const onTick = vi.fn();
        const onComplete = vi.fn();
        rerender({ ...options, startTime: 1.07, onTick, onComplete });
        frameAt(140);
        expect(onTick.mock.lastCall?.[0]).toBeCloseTo(1.14);
        expect(options.onTick).toHaveBeenCalledOnce();
        expect(cancelFrame).not.toHaveBeenCalled();
        frameAt(1000);
        expect(onTick).toHaveBeenLastCalledWith(2);
        expect(onComplete).toHaveBeenCalledOnce();
        expect(options.onComplete).not.toHaveBeenCalled();
    });

    it('cancels paused and unmounted clocks, ignores stale callbacks and resumes from the latest time', () => {
        const { options, rerender, unmount } = startClock({ playing: false, startTime: 2 });
        expect(requestFrame).not.toHaveBeenCalled();
        rerender({ ...options, playing: true });
        frameAt(70);
        expect(options.onTick).toHaveBeenLastCalledWith(2.07);
        const stale = [...pendingFrames.values()][0];
        rerender({ ...options, startTime: 2.07 });
        expect(cancelFrame).toHaveBeenCalledOnce();
        expect(pendingFrames.size).toBe(0);
        now = 300;
        act(() => stale(now));
        expect(options.onTick).toHaveBeenCalledOnce();

        rerender({ ...options, playing: true, startTime: 2.07 });
        frameAt(370);
        expect(vi.mocked(options.onTick).mock.lastCall?.[0]).toBeCloseTo(2.14);
        const afterUnmount = [...pendingFrames.values()][0];
        unmount();
        expect(cancelFrame).toHaveBeenCalledTimes(2);
        expect(pendingFrames.size).toBe(0);
        now = 500;
        act(() => afterUnmount(now));
        expect(options.onTick).toHaveBeenCalledTimes(2);
        expect(options.onComplete).not.toHaveBeenCalled();
    });

    it('does not schedule playback without a usable duration', () => {
        const { options, rerender } = startClock({ duration: 0 });
        for (const duration of [NaN, Infinity, -1]) rerender({ ...options, duration });
        expect(requestFrame).not.toHaveBeenCalled();
        expect(options.onTick).not.toHaveBeenCalled();
        expect(options.onComplete).not.toHaveBeenCalled();
    });

    it('does not queue another frame when its update callback unmounts the clock', () => {
        let unmountClock = () => {};
        const onTick = vi.fn<(time: number) => void>(() => unmountClock());
        const { unmount, options } = startClock({ onTick });
        unmountClock = unmount;
        frameAt(70);
        expect(onTick).toHaveBeenCalledOnce();
        expect(cancelFrame).toHaveBeenCalledOnce();
        expect(requestFrame).toHaveBeenCalledOnce();
        expect(pendingFrames.size).toBe(0);
        expect(options.onComplete).not.toHaveBeenCalled();
    });
});
