import React from 'react';
import useEvent from 'react-use-event-hook';

interface TimelinePlaybackClockOptions {
    playing: boolean;
    duration: number;
    /** Captured when playback begins; subsequent display-time updates do not move the origin. */
    startTime: number;
    onTick: (time: number) => void;
    onComplete: () => void;
}

const PreviewFrameRates = [15, 10, 5];
const RecoveryMilliseconds = 3000;

/** Limit preview work without slowing the real playback clock or the exported video. */
export const useTimelinePlaybackClock = ({
    playing,
    duration,
    startTime,
    onTick,
    onComplete,
}: TimelinePlaybackClockOptions) => {
    const startTimeRef = React.useRef(startTime);
    startTimeRef.current = startTime;
    const tick = useEvent(onTick);
    const complete = useEvent(onComplete);

    React.useEffect(() => {
        if (!playing || !Number.isFinite(duration) || duration <= 0) return;
        const origin = performance.now();
        const start = Math.max(0, Math.min(duration, Number.isFinite(startTimeRef.current) ? startTimeRef.current : 0));
        let frame: number;
        let cancelled = false;
        let tier = 0;
        let lastUpdate = origin;
        let lastAnimationFrame = origin;
        let healthySince: number | undefined = origin;

        const update = () => {
            if (cancelled) return;
            const now = performance.now();
            const time = Math.min(duration, start + Math.max(0, now - origin) / 1000);
            if (time >= duration) {
                cancelled = true;
                tick(duration);
                complete();
                return;
            }

            const interval = 1000 / PreviewFrameRates[tier];
            const slowFrame = now - lastAnimationFrame > interval * 1.5;
            lastAnimationFrame = now;
            let slowUpdate = false;
            // rAF timestamps can fall just below an exact 60 Hz divisor through rounding.
            if (now - lastUpdate >= interval - 1) {
                tick(time);
                slowUpdate = performance.now() - now > interval * 0.7;
                lastUpdate = now;
            }

            if (slowFrame || slowUpdate) {
                tier = Math.min(PreviewFrameRates.length - 1, tier + 1);
                healthySince = undefined;
            } else {
                healthySince ??= now;
                if (tier > 0 && now - healthySince >= RecoveryMilliseconds) {
                    tier--;
                    healthySince = now;
                }
            }
            if (!cancelled) frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [playing, duration, tick, complete]);
};
