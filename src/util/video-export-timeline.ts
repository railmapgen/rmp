import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { TimelineDocument, TimelineElementEntry } from '../constants/timeline';

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
    const entries = timeline.track.filter(entry =>
        entry.kind === 'edge' ? graph.hasEdge(entry.refId) : graph.hasNode(entry.refId)
    );
    const overlappingEntrances = new Set<string>();
    let nextElement: TimelineElementEntry | undefined;
    for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index];
        if (entry.kind === 'keyframe') continue;
        if (entry.kind === 'node' && entry.phase === 'enter') {
            if (nextElement?.kind === 'edge' && nextElement.phase === 'enter') overlappingEntrances.add(entry.id);
        } else {
            nextElement = entry;
        }
    }
    let duration = 0;

    for (const entry of entries) {
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

        positions.forEach((anchors, nodeId) => {
            const origin = graph.getNodeAttributes(nodeId);
            let previous: PositionKeyframe = { x: origin.x, y: origin.y, time: 0 };
            for (const next of anchors) {
                if (time < next.time) {
                    const progress = Math.max(0, (time - previous.time) / Math.max(next.time - previous.time, 1e-6));
                    state.positions.set(nodeId, {
                        x: previous.x + (next.x - previous.x) * progress,
                        y: previous.y + (next.y - previous.y) * progress,
                    });
                    return;
                }
                previous = next;
            }
            state.positions.set(nodeId, { x: previous.x, y: previous.y });
        });

        return state;
    };

    return { duration, frameAt };
};
