import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { isElementEntry, TimelineDocument, TimelineElementEntry, TimelineEntry } from '../constants/timeline';

type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Position = { x: number; y: number };

export type VideoCameraFocus =
    | { kind: 'none' }
    | { kind: 'node'; id: NodeId }
    | { kind: 'edge'; id: LineId; progress: number; reverse: boolean };

interface PlaybackClip {
    entry: TimelineElementEntry;
    start: number;
    end: number;
}

interface PositionKeyframe extends Position {
    time: number;
}

export interface VideoTimelineFrame {
    visibleNodes: Set<NodeId>;
    visibleEdges: Set<LineId>;
    nodeProgress: Map<NodeId, number>;
    edgeProgress: Map<LineId, number>;
    edgeDirections: Map<LineId, boolean>;
    positions: Map<NodeId, Position>;
    disabledNodeAnimations: Set<NodeId>;
    focus: VideoCameraFocus;
}

/** Schedule authored clips in seconds; keyframes interpolate across the elapsed time between their anchors. */
export const createVideoTimelinePlayback = (
    graph: TimelineGraph,
    timeline: TimelineDocument,
    edgeLengths: Map<LineId, number>,
    directions: Map<LineId, boolean>,
    { fps, drawingSpeed, nodeSeconds }: { fps: number; drawingSpeed: number; nodeSeconds: number }
) => {
    const clips: PlaybackClip[] = [];
    const positions = new Map<NodeId, PositionKeyframe[]>();
    const entries: { entry: TimelineEntry; trackIndex: number }[] = [];
    timeline.track.forEach((entry, trackIndex) => {
        if (entry.kind === 'pause') {
            entries.push({ entry, trackIndex });
            return;
        }
        if (!isElementEntry(entry) && entry.kind !== 'keyframe') return;
        const isValid = entry.kind === 'edge' ? graph.hasEdge(entry.refId) : graph.hasNode(entry.refId);
        if (isValid) entries.push({ entry, trackIndex });
    });
    const overlappingEntrances = new Set<string>();
    let nextElement: TimelineElementEntry | undefined;
    for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index].entry;
        if (entry.kind === 'pause') continue;
        if (entry.kind === 'keyframe') continue;
        if (entry.kind === 'node' && entry.phase === 'enter') {
            if (nextElement?.kind === 'edge' && nextElement.phase === 'enter') overlappingEntrances.add(entry.id);
        } else {
            nextElement = entry;
        }
    }
    let duration = 0;
    // Seconds at each insertion cursor (index i = time just before track entry i).
    const cursorTimes = new Array<number>(timeline.track.length + 1).fill(0);
    let cursor = 0;

    for (const { entry, trackIndex } of entries) {
        while (cursor <= trackIndex) {
            cursorTimes[cursor] = duration;
            cursor++;
        }
        if (entry.kind === 'pause') {
            duration += entry.duration;
            positions.forEach(anchors => {
                const last = anchors[anchors.length - 1];
                if (last && last.time < duration) anchors.push({ ...last, time: duration });
            });
            continue;
        }
        if (entry.kind === 'keyframe') {
            const origin = graph.getNodeAttributes(entry.refId);
            const anchors = positions.get(entry.refId) ?? [{ x: origin.x, y: origin.y, time: 0 }];
            // A keyframe is a position marker at the current time, not a playback or camera clip.
            const anchor = { x: entry.x, y: entry.y, time: duration };
            if (anchors[anchors.length - 1]?.time === duration) anchors[anchors.length - 1] = anchor;
            else anchors.push(anchor);
            positions.set(entry.refId, anchors);
            continue;
        }
        let seconds = entry.showAnimation
            ? entry.kind === 'edge'
                ? (edgeLengths.get(entry.refId) ?? 0) / drawingSpeed
                : nodeSeconds
            : 0;
        // Preserve enter/exit ordering, but let station entrances animate while the next line is drawing.
        seconds = Math.max(seconds, 1 / fps);
        const overlapsLine = overlappingEntrances.has(entry.id);
        if (entry.kind === 'node' && entry.phase === 'enter') {
            const origin = graph.getNodeAttributes(entry.refId);
            const anchors = positions.get(entry.refId) ?? [];
            anchors.push({ x: origin.x, y: origin.y, time: overlapsLine ? duration : duration + seconds });
            positions.set(entry.refId, anchors);
        }
        clips.push({ entry, start: duration, end: duration + seconds });
        if (!overlapsLine) duration += seconds;
    }
    // A short final line must not truncate an overlapping station fade.
    for (const clip of clips) duration = Math.max(duration, clip.end);
    while (cursor <= timeline.track.length) {
        cursorTimes[cursor] = duration;
        cursor++;
    }

    const origins = new Map<NodeId, Position>();
    graph.forEachNode((id, attrs) => origins.set(id as NodeId, { x: attrs.x, y: attrs.y }));
    const focusClips: PlaybackClip[] = [];
    const entered = new Set<string>();
    for (const clip of clips) {
        const key = `${clip.entry.kind}:${clip.entry.refId}`;
        if (clip.entry.phase === 'enter') {
            entered.add(key);
            focusClips.push(clip);
        } else if (entered.has(key)) {
            // Exit clips consume time, and retain camera focus after completion.
            // A following exit without another entrance is skipped by frameAt.
            entered.delete(key);
            focusClips.push(clip);
        }
    }
    const focusForClip = ({ entry, start, end }: PlaybackClip, time: number): VideoCameraFocus => {
        if (entry.kind === 'node') return { kind: 'node', id: entry.refId };
        const progress = entry.showAnimation ? Math.min(1, Math.max(0, (time - start) / (end - start))) : 1;
        return {
            kind: 'edge',
            id: entry.refId,
            progress: entry.phase === 'enter' ? progress : 1 - progress,
            reverse: directions.get(entry.refId) ?? false,
        };
    };

    /** Query camera focus without constructing visibility sets or a frame graph. */
    const cameraFocusAt = (time: number): VideoCameraFocus => {
        if (Number.isNaN(time)) {
            // Match frameAt's comparison semantics for non-finite caller input.
            const visible = new Set<string>();
            let focus: VideoCameraFocus = { kind: 'none' };
            for (const clip of clips) {
                const key = `${clip.entry.kind}:${clip.entry.refId}`;
                if (clip.entry.phase === 'enter') visible.add(key);
                if (!visible.has(key)) continue;
                focus = focusForClip(clip, time);
                if (clip.entry.phase === 'exit' && !clip.entry.showAnimation) visible.delete(key);
            }
            return focus;
        }
        let low = 0,
            high = focusClips.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (focusClips[middle].start <= time) low = middle + 1;
            else high = middle;
        }
        return low > 0 ? focusForClip(focusClips[low - 1], time) : { kind: 'none' };
    };

    /** Query one node's position by binary-searching its authored anchors. */
    const positionAt = (nodeId: NodeId, time: number): Position => {
        const origin = origins.get(nodeId) ?? graph.getNodeAttributes(nodeId);
        const anchors = positions.get(nodeId);
        if (!anchors?.length) return { x: origin.x, y: origin.y };
        let low = 0,
            high = anchors.length;
        const queryTime = Number.isNaN(time) ? Infinity : time;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (anchors[middle].time <= queryTime) low = middle + 1;
            else high = middle;
        }
        const previous = low > 0 ? anchors[low - 1] : { ...origin, time: 0 };
        const next = anchors[low];
        if (!next) return { x: previous.x, y: previous.y };
        const progress = Math.max(0, (time - previous.time) / Math.max(next.time - previous.time, 1e-6));
        return {
            x: previous.x + (next.x - previous.x) * progress,
            y: previous.y + (next.y - previous.y) * progress,
        };
    };

    const frameAt = (time: number): VideoTimelineFrame => {
        const state: VideoTimelineFrame = {
            visibleNodes: new Set(),
            visibleEdges: new Set(),
            nodeProgress: new Map(),
            edgeProgress: new Map(),
            edgeDirections: new Map(directions),
            positions: new Map(),
            disabledNodeAnimations: new Set(),
            focus: { kind: 'none' },
        };

        for (const { entry, start, end } of clips) {
            if (time < start) break;
            const progress = entry.showAnimation ? Math.min(1, Math.max(0, (time - start) / (end - start))) : 1;
            const entering = entry.phase === 'enter';
            const reveal = entering ? progress : 1 - progress;

            if (entry.kind === 'node') {
                if (entering) state.visibleNodes.add(entry.refId);
                if (!state.visibleNodes.has(entry.refId)) continue;
                state.nodeProgress.set(entry.refId, reveal);
                if (entry.showAnimation) state.disabledNodeAnimations.delete(entry.refId);
                else state.disabledNodeAnimations.add(entry.refId);
                if (!entering && progress === 1) state.visibleNodes.delete(entry.refId);
                state.focus = { kind: 'node', id: entry.refId };
            } else {
                if (entering) state.visibleEdges.add(entry.refId);
                if (!state.visibleEdges.has(entry.refId)) continue;
                state.edgeProgress.set(entry.refId, reveal);
                if (!entering && progress === 1) state.visibleEdges.delete(entry.refId);
                state.focus = {
                    kind: 'edge',
                    id: entry.refId,
                    progress: reveal,
                    reverse: directions.get(entry.refId) ?? false,
                };
            }
        }

        positions.forEach((_anchors, nodeId) => state.positions.set(nodeId, positionAt(nodeId, time)));

        return state;
    };

    return { duration, frameAt, cameraFocusAt, positionAt, cursorTimes };
};
