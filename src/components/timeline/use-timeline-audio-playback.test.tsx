import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyTimelineDocument, TimelineAudioEntry, TimelineDocument } from '../../constants/timeline';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { useTimelineAudioPlayback } from './use-timeline-audio-playback';

const NativeURL = URL;
const players: MockAudio[] = [];
const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn<(url: string) => void>();

class MockAudio {
    src: string;
    preload = '';
    currentTime = 0;
    duration = 100;
    paused = true;
    play = vi.fn(async () => {
        this.paused = false;
    });
    pause = vi.fn(() => {
        this.paused = true;
    });
    load = vi.fn();
    removeAttribute = vi.fn((name: string) => {
        if (name === 'src') this.src = '';
    });

    constructor(src: string) {
        this.src = src;
        players.push(this);
    }
}

const clip = (id: string, startTime: number, endTime: number): TimelineAudioEntry => ({
    id,
    kind: 'audio',
    blobId: `blob-${id}`,
    name: id,
    startSlot: 0,
    endSlot: 4,
    startTime,
    endTime,
});
const documentWith = (...audioTrack: TimelineAudioEntry[]): TimelineDocument => ({
    ...createEmptyTimelineDocument(),
    audioTrack,
});
const timing: TimelinePlaybackTiming = { duration: 20, cursorTimes: [0, 1.5, 5, 12, 20] };
interface PlaybackProps {
    timeline: TimelineDocument;
    timing: TimelinePlaybackTiming | undefined;
    time: number;
    playing: boolean;
}
const startHook = (
    props: PlaybackProps,
    getAudio = vi.fn(async (_id: string): Promise<Blob | undefined> => new Blob(['audio']))
) => ({
    ...renderHook(
        (next: PlaybackProps) =>
            useTimelineAudioPlayback(next.timeline, next.timing, next.time, next.playing, getAudio),
        { initialProps: props }
    ),
    getAudio,
});

beforeEach(() => {
    players.length = 0;
    createObjectURL.mockReset().mockImplementation(() => `blob:preview-${createObjectURL.mock.calls.length}`);
    revokeObjectURL.mockReset();
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal(
        'URL',
        class extends NativeURL {
            static createObjectURL = createObjectURL;
            static revokeObjectURL = revokeObjectURL;
        }
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('Timeline preview audio playback', () => {
    it('plays overlapping clips from offsets relative to each clip start and stops at their own ends', async () => {
        const timeline = documentWith(clip('first', 2, 8), clip('second', 5, 12));
        const props = { timeline, timing, time: 6.25, playing: true };
        const { rerender } = startHook(props);
        await waitFor(() => {
            expect(players).toHaveLength(2);
            expect(players.every(player => !player.paused)).toBe(true);
        });
        expect(players).toHaveLength(2);
        expect(players[0].currentTime).toBe(4.25);
        expect(players[1].currentTime).toBe(1.25);

        rerender({ ...props, time: 8 });
        expect(players[0].paused).toBe(true);
        expect(players[1].paused).toBe(false);
        expect(players[1].currentTime).toBe(3);

        rerender({ ...props, time: 12 });
        expect(players.every(player => player.paused)).toBe(true);
    });

    it('keeps future clips paused and uses exact subsecond seeks when playback is paused', async () => {
        const timeline = documentWith(clip('music', 5, 15));
        const props = { timeline, timing, time: 2, playing: true };
        const { rerender } = startHook(props);
        await waitFor(() => expect(players[0]?.pause).toHaveBeenCalled());
        expect(players[0].paused).toBe(true);
        expect(players[0].play).not.toHaveBeenCalled();
        expect(players[0].currentTime).toBe(0);

        rerender({ ...props, time: 7.125, playing: false });
        expect(players[0].paused).toBe(true);
        expect(players[0].currentTime).toBe(2.125);
        rerender({ ...props, time: 7.2, playing: false });
        expect(players[0].currentTime).toBeCloseTo(2.2);

        rerender({ ...props, time: 7.2, playing: true });
        expect(players[0].paused).toBe(false);
        expect(players[0].currentTime).toBeCloseTo(2.2);
    });

    it('corrects a playing seek in either direction without recreating audio resources', async () => {
        const timeline = documentWith(clip('music', 2, 18));
        const props = { timeline, timing, time: 4, playing: true };
        const { rerender, getAudio } = startHook(props);
        await waitFor(() => expect(players[0]?.paused).toBe(false));
        rerender({ ...props, time: 13.75 });
        expect(players[0].currentTime).toBe(11.75);
        rerender({ ...props, time: 3.25 });
        expect(players[0].currentTime).toBe(1.25);
        expect(getAudio).toHaveBeenCalledTimes(1);
        expect(createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('reuses audio when placement changes and follows cursor times for untouched clips', async () => {
        const legacy = { ...clip('music', 0, 20), startSlot: 1, endSlot: 3 };
        delete legacy.startTime;
        delete legacy.endTime;
        const timeline = documentWith(legacy);
        const props = { timeline, timing, time: 6, playing: true };
        const { rerender, getAudio } = startHook(props);
        await waitFor(() => expect(players[0]?.paused).toBe(false));
        expect(players[0].currentTime).toBe(4.5);

        rerender({ ...props, timeline: documentWith({ ...legacy, startTime: 5.25, endTime: 10 }) });
        expect(players[0].currentTime).toBe(0.75);
        expect(getAudio).toHaveBeenCalledTimes(1);
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        rerender({ ...props, timing: undefined });
        expect(players[0].paused).toBe(true);
    });

    it('stops when the media duration is shorter than the authored clip range', async () => {
        const timeline = documentWith(clip('short', 2, 18));
        const props = { timeline, timing, time: 3, playing: true };
        const { rerender } = startHook(props);
        await waitFor(() => expect(players[0]?.paused).toBe(false));
        players[0].duration = 3;
        rerender({ ...props, time: 5 });
        expect(players[0].paused).toBe(true);
        rerender({ ...props, time: 4.5, playing: false });
        expect(players[0].currentTime).toBe(2.5);
    });

    it('releases replaced players and object URLs, then releases the final resources on unmount', async () => {
        const props = { timeline: documentWith(clip('music', 0, 20)), timing, time: 4, playing: true };
        const { rerender, unmount } = startHook(props);
        await waitFor(() => expect(players[0]?.paused).toBe(false));
        const oldPlayer = players[0];
        const oldUrl = oldPlayer.src;
        rerender({ ...props, timeline: documentWith({ ...clip('music', 0, 20), blobId: 'replacement' }) });
        await waitFor(() => expect(players[1]?.paused).toBe(false));
        expect(oldPlayer.paused).toBe(true);
        expect(oldPlayer.removeAttribute).toHaveBeenCalledWith('src');
        expect(oldPlayer.load).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledWith(oldUrl);

        const finalUrl = players[1].src;
        unmount();
        expect(players[1].paused).toBe(true);
        expect(players[1].removeAttribute).toHaveBeenCalledWith('src');
        expect(players[1].load).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledWith(finalUrl);
        expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    });

    it('does not create or leak resources when a pending read finishes after unmount', async () => {
        let complete!: (blob: Blob) => void;
        const getAudio = vi.fn((_id: string) => new Promise<Blob>(resolve => (complete = resolve)));
        const { unmount } = startHook(
            { timeline: documentWith(clip('music', 0, 20)), timing, time: 4, playing: true },
            getAudio
        );
        unmount();
        await act(async () => complete(new Blob(['late audio'])));
        expect(players).toHaveLength(0);
        expect(createObjectURL).not.toHaveBeenCalled();
        expect(revokeObjectURL).not.toHaveBeenCalled();
    });

    it('still plays available clips when another resource read fails or a resource is missing', async () => {
        const getAudio = vi.fn(async (id: string): Promise<Blob | undefined> => {
            if (id === 'blob-broken') throw new Error('Cannot read audio asset');
            if (id === 'blob-missing') return undefined;
            return new Blob(['healthy audio']);
        });
        startHook(
            {
                timeline: documentWith(clip('broken', 0, 20), clip('healthy', 2, 18), clip('missing', 0, 20)),
                timing,
                time: 6.75,
                playing: true,
            },
            getAudio
        );
        await waitFor(() => expect(players[0]?.paused).toBe(false));
        expect(players).toHaveLength(1);
        expect(players[0].currentTime).toBe(4.75);
    });
});
