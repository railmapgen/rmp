import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../constants/constants';
import { StationType } from '../constants/stations';
import { TimelineElementEntry, TimelineEntry } from '../constants/timeline';
import { createVideoTimelinePlayback } from './video-export-timeline';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', { x: 0, y: 0, visible: true, zIndex: 0, type: StationType.LondonTubeBasic });
    graph.addNode('stn_b', { x: 200, y: 0, visible: true, zIndex: 0, type: StationType.LondonTubeBasic });
    graph.addDirectedEdgeWithKey('line_ab', 'stn_a', 'stn_b', {} as EdgeAttributes);
    graph.addNode('stn_c', { x: 400, y: 0, visible: true, zIndex: 0, type: StationType.LondonTubeBasic });
    graph.addDirectedEdgeWithKey('line_bc', 'stn_b', 'stn_c', {} as EdgeAttributes);
    return graph;
};

const node: TimelineElementEntry = {
    id: 'node',
    kind: 'node',
    refId: 'stn_a',
    phase: 'enter',
    showAnimation: true,
};
const edge: TimelineElementEntry = {
    id: 'edge',
    kind: 'edge',
    refId: 'line_ab',
    phase: 'enter',
    showAnimation: true,
};
const keyframe = (id: string, x: number, y: number): TimelineEntry => ({
    id,
    kind: 'keyframe',
    refId: 'stn_a',
    x,
    y,
});
const playback = (track: TimelineEntry[], speed = 1) =>
    createVideoTimelinePlayback(
        makeGraph(),
        { version: 1, mode: 'pro', track },
        new Map<LineId, number>([
            ['line_ab', 200],
            ['line_bc', 200],
        ]),
        new Map<LineId, boolean>([['line_ab', true]]),
        { fps: 30, drawingSpeed: 100 * speed, nodeSeconds: 0.2 / speed }
    );

describe('authored video timeline playback', () => {
    it('does not add duration or change focus when keyframes are inserted', () => {
        const without = playback([node, edge]);
        const withKeyframes = playback([
            node,
            keyframe('first', 0, 0),
            edge,
            keyframe('second', 100, 0),
            keyframe('third', 200, 0),
        ]);
        expect(withKeyframes.duration).toBe(without.duration);
        expect(withKeyframes.frameAt(0.5).focus).toEqual(without.frameAt(0.5).focus);
        // Same-time markers use the last authored position throughout interpolation, without a final jump.
        expect(withKeyframes.frameAt(1).positions.get('stn_a')).toEqual({ x: 100, y: 0 });
        expect(withKeyframes.frameAt(without.duration).focus).toEqual(without.frameAt(without.duration).focus);
        expect(withKeyframes.frameAt(without.duration).positions.get('stn_a')).toEqual({ x: 200, y: 0 });
    });

    it('overlaps intermediate station entrances with the next line instead of stopping the camera', () => {
        const animation = playback([
            node,
            edge,
            { ...node, id: 'node_b', refId: 'stn_b' },
            keyframe('marker', 0, 0),
            { ...edge, id: 'edge_bc', refId: 'line_bc' },
        ]);
        expect(animation.duration).toBe(4);
        const atJoin = animation.frameAt(2.1);
        expect(atJoin.focus).toEqual({ kind: 'edge', id: 'line_bc', progress: expect.closeTo(0.05), reverse: false });
        expect(atJoin.nodeProgress.get('stn_b')).toBeCloseTo(0.5);
    });

    it('interpolates across existing playback time and holds the final keyframe', () => {
        const animation = playback([node, keyframe('first', 0, 0), edge, keyframe('second', 100, 100)]);
        expect(animation.frameAt(0).positions.get('stn_a')).toEqual({ x: 0, y: 0 });
        expect(animation.frameAt(1).positions.get('stn_a')).toEqual({ x: 50, y: 50 });
        expect(animation.frameAt(2).positions.get('stn_a')).toEqual({ x: 100, y: 100 });
        expect(animation.frameAt(10).positions.get('stn_a')).toEqual({ x: 100, y: 100 });
        expect(animation.frameAt(1).focus).toMatchObject({ kind: 'edge', id: 'line_ab' });
    });

    it('moves continuously across intervening clips between keyframe anchors', () => {
        const animation = playback([node, keyframe('first', 100, 0), edge, keyframe('second', 400, 0)]);
        // The keyframes mark the beginning and end of the existing two-second line animation.
        expect(animation.frameAt(0.5).positions.get('stn_a')?.x).toBeCloseTo(175);
        expect(animation.frameAt(1).positions.get('stn_a')?.x).toBeCloseTo(250);
    });

    it('applies consecutive keyframes at the same time without creating a camera focus or animation', () => {
        const animation = playback([keyframe('first', 100, 0), keyframe('last', 200, 100)]);
        expect(animation.duration).toBe(0);
        expect(animation.frameAt(0).focus).toEqual({ kind: 'none' });
        expect(animation.frameAt(0).positions.get('stn_a')).toEqual({ x: 200, y: 100 });
    });

    it('fades a node out and keeps it absent after the timeline ends', () => {
        const animation = playback([node, { ...node, id: 'exit', phase: 'exit' }]);
        expect(animation.frameAt(0.3).visibleNodes.has('stn_a')).toBe(true);
        expect(animation.frameAt(0.3).nodeProgress.get('stn_a')).toBeCloseTo(0.5);
        expect(animation.frameAt(0.4).visibleNodes.has('stn_a')).toBe(false);
        expect(animation.frameAt(10).visibleNodes.size).toBe(0);
    });

    it('retracts a line along its entrance direction without revealing its nodes', () => {
        const animation = playback([edge, { ...edge, id: 'exit', phase: 'exit' }]);
        const halfway = animation.frameAt(3);
        expect(halfway.visibleEdges.has('line_ab')).toBe(true);
        expect(halfway.edgeProgress.get('line_ab')).toBeCloseTo(0.5);
        expect(halfway.edgeDirections.get('line_ab')).toBe(true);
        expect(halfway.visibleNodes.size).toBe(0);
        expect(animation.frameAt(4).visibleEdges.size).toBe(0);
    });

    it('applies animation-disabled cards instantly while retaining their ordering', () => {
        const animation = playback([
            { ...node, showAnimation: false },
            { ...node, id: 'exit', phase: 'exit', showAnimation: false },
            { ...edge, showAnimation: false },
            { ...edge, id: 'edge_exit', phase: 'exit', showAnimation: false },
        ]);
        expect(animation.frameAt(0).nodeProgress.get('stn_a')).toBe(1);
        expect(animation.frameAt(0).disabledNodeAnimations.has('stn_a')).toBe(true);
        expect(animation.frameAt(1 / 30).visibleNodes.size).toBe(0);
        expect(animation.frameAt(2 / 30).edgeProgress.get('line_ab')).toBe(1);
        expect(animation.frameAt(3 / 30).visibleEdges.size).toBe(0);
    });

    it('scales movement and exit timing with export speed', () => {
        const track = [node, edge, keyframe('move', 100, 0), { ...node, id: 'exit', phase: 'exit' as const }];
        const normal = playback(track);
        const fast = playback(track, 2);
        expect(fast.duration).toBeCloseTo(normal.duration / 2);
        expect(fast.frameAt(0.5).positions.get('stn_a')?.x).toBeCloseTo(normal.frameAt(1).positions.get('stn_a')!.x);
        expect(fast.frameAt(1.05).nodeProgress.get('stn_a')).toBeCloseTo(0.5);
    });

    it('ignores missing references and does not make an absent element visible on exit', () => {
        const animation = playback([
            { ...node, refId: 'stn_missing' },
            { ...edge, refId: 'line_missing' },
            { ...keyframe('missing', 100, 0), refId: 'stn_missing' } as TimelineEntry,
            { ...node, phase: 'exit' },
        ]);
        expect(animation.frameAt(0.1).visibleNodes.size).toBe(0);
        expect(animation.frameAt(10).visibleEdges.size).toBe(0);
    });
});
