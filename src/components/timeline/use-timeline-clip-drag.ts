import React from 'react';
import { TimelineDocument, TimelineTimedEntry } from '../../constants/timeline';
import { getTimelineClipRange, TimelinePlaybackTiming } from '../../util/timeline-playback';
import { TimelineTrackTimeScale } from './timeline-track-layout';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface ClipDrag {
    entryId: string;
    mode: 'move' | 'start' | 'end';
    pointerId: number;
    target: HTMLDivElement;
    originX: number;
    originPosition: number;
    originStart: number;
    originEnd: number;
    width: number;
    scrollParents: { element: HTMLElement; left: number }[];
    start: number;
    end: number;
}

/** Shared pointer placement for media and text clips; commit once when the drag ends. */
export function useTimelineClipDrag({
    document,
    totalWidth,
    timing,
    timeScale,
    onCommit,
}: {
    document: TimelineDocument;
    totalWidth: number;
    timing?: TimelinePlaybackTiming;
    timeScale?: TimelineTrackTimeScale;
    onCommit: (entryId: string, start: number, end: number) => void;
}) {
    const dragRef = React.useRef<ClipDrag | undefined>(undefined);
    const dragFrameRef = React.useRef<number | undefined>(undefined);
    const [draft, setDraft] = React.useState<{ entryId: string; start: number; end: number }>();
    const laneRef = React.useRef<HTMLDivElement>(null);
    const duration = timing?.duration ?? 0;
    const cursorTimes = timing?.cursorTimes ?? [0];
    const cancelDragFrame = () => {
        if (dragFrameRef.current !== undefined) cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = undefined;
    };
    const releaseDrag = () => {
        const drag = dragRef.current;
        dragRef.current = undefined;
        cancelDragFrame();
        if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    };
    React.useEffect(() => {
        releaseDrag();
        setDraft(undefined);
    }, [document, duration, timeScale, totalWidth]);
    React.useEffect(() => releaseDrag, []);

    const handlePointerDown = (
        event: React.PointerEvent<HTMLDivElement>,
        entry: TimelineTimedEntry,
        mode: 'move' | 'start' | 'end'
    ) => {
        if (event.button !== 0 || !duration || dragRef.current || (event.target as Element).closest('button')) return;
        const lane = laneRef.current;
        const bounds = lane?.getBoundingClientRect();
        if (!lane || !bounds || bounds.width <= 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const range = getTimelineClipRange(entry, cursorTimes, duration);
        const scrollParents: ClipDrag['scrollParents'] = [];
        for (let parent = lane.parentElement; parent; parent = parent.parentElement)
            scrollParents.push({ element: parent, left: parent.scrollLeft });
        const boundaryTime = mode === 'end' ? range.end : range.start;
        dragRef.current = {
            entryId: entry.id,
            mode,
            pointerId: event.pointerId,
            target: event.currentTarget,
            originX: event.clientX,
            originPosition: timeScale?.timeToPosition(boundaryTime) ?? (boundaryTime / duration) * bounds.width,
            originStart: range.start,
            originEnd: range.end,
            width: bounds.width,
            scrollParents,
            ...range,
        };
        setDraft({ entryId: entry.id, ...range });
    };
    const updateDrag = (drag: ClipDrag, clientX: number) => {
        const scroll = drag.scrollParents.reduce((delta, { element, left }) => delta + element.scrollLeft - left, 0);
        const position = drag.originPosition + clientX - drag.originX + scroll;
        const time = timeScale?.positionToTime(position) ?? clamp((position / drag.width) * duration, 0, duration);
        if (drag.mode === 'move') {
            const span = drag.originEnd - drag.originStart;
            drag.start = clamp(time, 0, duration - span);
            drag.end = drag.start + span;
        } else if (drag.mode === 'start') {
            drag.start = clamp(time, 0, Math.max(0, drag.originEnd - 0.01));
        } else {
            drag.end = clamp(time, Math.min(duration, drag.originStart + 0.01), duration);
        }
    };
    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.stopPropagation();
        updateDrag(drag, event.clientX);
        // Paint only this clip lane, at most once per display frame; project edits wait for pointerup.
        if (dragFrameRef.current !== undefined) return;
        dragFrameRef.current = requestAnimationFrame(() => {
            dragFrameRef.current = undefined;
            const active = dragRef.current;
            if (!active) return;
            setDraft(current =>
                current?.entryId === active.entryId && current.start === active.start && current.end === active.end
                    ? current
                    : { entryId: active.entryId, start: active.start, end: active.end }
            );
        });
    };
    const finishDrag = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.stopPropagation();
        if (commit) updateDrag(drag, event.clientX);
        releaseDrag();
        setDraft(undefined);
        if (commit && (Math.abs(drag.start - drag.originStart) > 1e-6 || Math.abs(drag.end - drag.originEnd) > 1e-6))
            onCommit(drag.entryId, drag.start, drag.end);
    };

    return { laneRef, draft, dragRef, handlePointerDown, handlePointerMove, finishDrag };
}
