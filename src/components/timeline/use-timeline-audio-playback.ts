import React from 'react';
import { TimelineDocument } from '../../constants/timeline';
import { getTimelineAudioRange, TimelinePlaybackTiming } from '../../util/timeline-playback';

/** Keep overlapping audio clips on the same clock as the video preview. */
export const useTimelineAudioPlayback = (
    timeline: TimelineDocument,
    timing: TimelinePlaybackTiming | undefined,
    time: number,
    playing: boolean,
    getAudio: (id: string) => Promise<Blob | undefined>
) => {
    const players = React.useRef(new Map<string, HTMLAudioElement>());
    const [revision, setRevision] = React.useState(0);
    React.useEffect(() => {
        let cancelled = false;
        const urls: string[] = [];
        const prepared = new Map<string, HTMLAudioElement>();
        void Promise.allSettled(
            (timeline.audioTrack ?? []).map(async entry => {
                const blob = await getAudio(entry.blobId);
                if (!blob || cancelled) return;
                const url = URL.createObjectURL(blob);
                urls.push(url);
                const audio = new Audio(url);
                audio.preload = 'auto';
                prepared.set(entry.id, audio);
            })
        )
            .then(() => {
                if (cancelled) return;
                players.current = prepared;
                setRevision(value => value + 1);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            prepared.forEach(audio => {
                audio.pause();
                audio.removeAttribute('src');
                audio.load();
            });
            urls.forEach(url => URL.revokeObjectURL(url));
            players.current = new Map();
        };
        // Placement changes reuse the decoded audio resources.
    }, [getAudio, JSON.stringify((timeline.audioTrack ?? []).map(entry => [entry.id, entry.blobId]))]);

    React.useEffect(() => {
        players.current.forEach((audio, id) => {
            const entry = timeline.audioTrack?.find(clip => clip.id === id);
            if (!entry || !timing) {
                audio.pause();
                return;
            }
            const { start, end } = getTimelineAudioRange(entry, timing.cursorTimes, timing.duration);
            const offset = Math.max(0, time - start);
            const active =
                playing && time >= start && time < end && (!Number.isFinite(audio.duration) || offset < audio.duration);
            if (!active) audio.pause();
            if (!Number.isFinite(audio.duration) || offset <= audio.duration) {
                if (Math.abs(audio.currentTime - offset) > 0.2 || !playing) audio.currentTime = offset;
            }
            if (active && audio.paused) void audio.play().catch(() => {});
        });
    }, [timeline.audioTrack, timing, time, playing, revision]);
};
