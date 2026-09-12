import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { TimelineDocument } from '../constants/timeline';
import { LinePathType, LineStyleType } from '../constants/lines';
import {
    appendTimelineEntry,
    createKeyframeEntry,
    getTimelineCoverage,
    getTimelineElementCenter,
    getTimelineEntryTitle,
    getTimelinePreviewState,
    insertTimelineEntries,
    insertTimelineEntry,
    insertTimelineExitEntry,
    insertKeyframeEntry,
    moveTimelineEntry,
    normalizeTimelineDocument,
    removeTimelineEntry,
    updateKeyframePosition,
} from './timeline';

const makeGraph = () => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.addNode('stn_a', {
        visible: true,
        zIndex: 0,
        x: 10,
        y: 20,
        type: 'shmetro-basic',
        'shmetro-basic': { names: ['Alpha'], nameOffsetX: 'right', nameOffsetY: 'top' },
    } as unknown as NodeAttributes);
    graph.addNode('stn_b', {
        visible: true,
        zIndex: 0,
        x: 110,
        y: 220,
        type: 'shmetro-basic',
        'shmetro-basic': { names: ['Beta'], nameOffsetX: 'right', nameOffsetY: 'top' },
    } as unknown as NodeAttributes);
    graph.addDirectedEdgeWithKey('line_ab', 'stn_a', 'stn_b', {
        visible: true,
        zIndex: 0,
        type: LinePathType.Simple,
        style: LineStyleType.SingleColor,
        [LinePathType.Simple]: { offset: 0 },
        [LineStyleType.SingleColor]: { color: ['shanghai', 'sh1', '#E3002B', MonoColour.white] },
        reconcileId: '',
        parallelIndex: -1,
    } as unknown as EdgeAttributes);
    return graph;
};

const emptyDocument = (): TimelineDocument => ({ version: 1, mode: 'quick', track: [] });

describe('timeline utilities', () => {
    it('appendTimelineEntry should keep unique refs', () => {
        const initial = emptyDocument();
        const next = appendTimelineEntry(initial, 'stn_a');
        const deduped = appendTimelineEntry(next, 'stn_a');

        expect(next.track).toHaveLength(1);
        expect(deduped.track).toHaveLength(1);
        expect(deduped.track[0].refId).toBe('stn_a');
        expect(deduped.track[0]).toMatchObject({ phase: 'enter', showAnimation: true });
    });

    it('insertTimelineEntry should insert at the requested cursor position', () => {
        const initial = appendTimelineEntry(appendTimelineEntry(emptyDocument(), 'stn_a'), 'stn_c');
        const next = insertTimelineEntry(initial, 'stn_b', 1);

        expect(next.track.map(entry => entry.refId)).toEqual(['stn_a', 'stn_b', 'stn_c']);
    });

    it('insertTimelineEntry should ignore keyframes of the same ref', () => {
        const initial: TimelineDocument = {
            ...emptyDocument(),
            track: [{ id: 'key_1', kind: 'keyframe', refId: 'stn_a', x: 1, y: 2 }],
        };
        const next = insertTimelineEntry(initial, 'stn_a', 1);

        expect(next.track.map(entry => entry.kind)).toEqual(['keyframe', 'node']);
    });

    it('insertTimelineEntries should preserve order and skip duplicate refs', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_c');
        const next = insertTimelineEntries(initial, ['stn_a', 'stn_b', 'stn_a', 'stn_c'], 0);

        expect(next.track.map(entry => entry.refId)).toEqual(['stn_a', 'stn_b', 'stn_c']);
    });

    it('moveTimelineEntry should reorder clips', () => {
        const initial = appendTimelineEntry(appendTimelineEntry(emptyDocument(), 'stn_a'), 'line_ab');
        const moved = moveTimelineEntry(initial, 0, 1);

        expect(moved.track.map(entry => entry.refId)).toEqual(['line_ab', 'stn_a']);
    });

    it('removeTimelineEntry should remove by clip id', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const removed = removeTimelineEntry(initial, initial.track[0].id);

        expect(removed.track).toEqual([]);
    });

    it('should create and update keyframe entries', () => {
        const graph = makeGraph();
        const keyframe = createKeyframeEntry(graph, 'stn_a');

        expect(keyframe).toMatchObject({ kind: 'keyframe', refId: 'stn_a', x: 10, y: 20 });

        const next = updateKeyframePosition({ ...emptyDocument(), track: [keyframe] }, keyframe.id, 33, 44);
        expect(next.track[0]).toMatchObject({ x: 33, y: 44 });
    });

    it('insertKeyframeEntry should add the enter entry before the keyframe when missing', () => {
        const graph = makeGraph();
        const { document, cursor } = insertKeyframeEntry(emptyDocument(), graph, 'stn_a', 0);

        expect(document.track.map(entry => entry.kind)).toEqual(['node', 'keyframe']);
        expect(cursor).toBe(1);
        expect(document.track[1]).toMatchObject({ kind: 'keyframe', x: 10, y: 20 });
    });

    it('insertKeyframeEntry should not duplicate an existing enter entry', () => {
        const graph = makeGraph();
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const { document, cursor } = insertKeyframeEntry(initial, graph, 'stn_a', 1);

        expect(document.track.map(entry => entry.kind)).toEqual(['node', 'keyframe']);
        expect(cursor).toBe(1);
    });

    it('inserts a keyframe after the selected enter card, keeping its station visible', () => {
        const graph = makeGraph();
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const { document, cursor } = insertKeyframeEntry(initial, graph, 'stn_a', 0);

        expect(document.track.map(entry => entry.kind)).toEqual(['node', 'keyframe']);
        expect(getTimelinePreviewState(graph, document, cursor).visibleIds.has('stn_a')).toBe(true);
    });

    it('keeps keyframes before exit and exits after existing keyframes', () => {
        const graph = makeGraph();
        const initial = insertKeyframeEntry(emptyDocument(), graph, 'stn_a', 0).document;
        const withExit = insertTimelineExitEntry(initial, 'stn_a', 0).document;
        const { document, cursor } = insertKeyframeEntry(withExit, graph, 'stn_a', withExit.track.length);

        expect(document.track.map(entry => (entry.kind === 'keyframe' ? 'keyframe' : entry.phase))).toEqual([
            'enter',
            'keyframe',
            'keyframe',
            'exit',
        ]);
        expect(getTimelinePreviewState(graph, document, cursor).visibleIds.has('stn_a')).toBe(true);
    });

    it('rejects moving a keyframe outside its station lifetime or moving its enter past it', () => {
        const initial = insertKeyframeEntry(emptyDocument(), makeGraph(), 'stn_a', 0).document;
        const document = insertTimelineExitEntry(initial, 'stn_a', initial.track.length).document;

        expect(moveTimelineEntry(document, 1, 0)).toBe(document);
        expect(moveTimelineEntry(document, 1, 2)).toBe(document);
        expect(moveTimelineEntry(document, 0, 1)).toBe(document);
        expect(moveTimelineEntry(document, 2, 1)).toBe(document);
    });

    it.each(['stn_a', 'line_ab'] as const)('removes the exit and dependent keyframes with enter %s', refId => {
        let document = appendTimelineEntry(emptyDocument(), refId);
        if (refId === 'stn_a') document = insertKeyframeEntry(document, makeGraph(), refId, 1).document;
        document = insertTimelineExitEntry(document, refId, document.track.length).document;
        document = appendTimelineEntry(appendTimelineEntry(document, 'stn_b'), 'stn_c');

        const removed = removeTimelineEntry(document, document.track[0].id);
        expect(removed.track.map(entry => entry.refId)).toEqual(['stn_b', 'stn_c']);
        expect(moveTimelineEntry(removed, 0, 1).track.map(entry => entry.refId)).toEqual(['stn_c', 'stn_b']);
        expect(appendTimelineEntry(removed, refId).track).toHaveLength(3);
    });

    it('removes only the selected exit or keyframe and preserves the enter card', () => {
        const initial = insertKeyframeEntry(emptyDocument(), makeGraph(), 'stn_a', 0).document;
        const document = insertTimelineExitEntry(initial, 'stn_a', 2).document;
        expect(removeTimelineEntry(document, document.track[2].id)).toEqual(initial);
        expect(removeTimelineEntry(document, document.track[1].id).track.map(entry => entry.kind)).toEqual([
            'node',
            'node',
        ]);
        expect(removeTimelineEntry(document, 'missing')).toBe(document);
    });

    it('should insert one exit entry after its enter entry', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const inserted = insertTimelineExitEntry(initial, 'stn_a', 0);

        expect(
            inserted.document.track
                .filter(entry => entry.kind === 'node' || entry.kind === 'edge')
                .map(entry => entry.phase)
        ).toEqual(['enter', 'exit']);
        expect(inserted.cursor).toBe(2);
        expect(insertTimelineExitEntry(inserted.document, 'stn_a', 0).document).toBe(inserted.document);
    });

    it('should reject moving an exit entry before its enter entry', () => {
        const initial = appendTimelineEntry(emptyDocument(), 'stn_a');
        const withExit = insertTimelineExitEntry(initial, 'stn_a', 1).document;

        expect(moveTimelineEntry(withExit, 1, 0)).toBe(withExit);
    });

    it('normalizeTimelineDocument should fallback to an empty document', () => {
        expect(normalizeTimelineDocument(undefined)).toEqual({ version: 1, mode: 'quick', track: [] });
        expect(normalizeTimelineDocument({ version: 1, track: [{} as never] })).toEqual({
            version: 1,
            mode: 'quick',
            track: [],
        });
    });

    it('normalizeTimelineDocument should fill professional defaults', () => {
        const normalized = normalizeTimelineDocument({
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a' },
                { id: 'key_1', kind: 'keyframe', refId: 'stn_a', x: 1, y: 2 },
            ],
        } as never);

        expect(normalized.mode).toBe('pro');
        expect(normalized.track[0]).toMatchObject({ phase: 'enter', showAnimation: true });
        expect(normalized.track[1]).toMatchObject({ kind: 'keyframe', x: 1, y: 2 });
    });

    it('should derive labels and centers from graph refs', () => {
        const graph = makeGraph();

        expect(getTimelineEntryTitle(graph, { id: '1', kind: 'node', refId: 'stn_a' } as never)).toBe('Alpha');
        expect(getTimelineEntryTitle(graph, { id: '2', kind: 'edge', refId: 'line_ab' } as never)).toBe(
            'Alpha -> Beta'
        );
        expect(getTimelineElementCenter(graph, 'stn_a')).toEqual({ x: 10, y: 20 });
        expect(getTimelineElementCenter(graph, 'line_ab')).toEqual({ x: 60, y: 120 });
    });

    it('should report all graph entries as missing for an empty timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, emptyDocument());

        expect(coverage.missingNodeIds).toEqual(['stn_a', 'stn_b']);
        expect(coverage.missingEdgeIds).toEqual(['line_ab']);
        expect(coverage.missingIds).toEqual(['stn_a', 'stn_b', 'line_ab']);
        expect(coverage.missingNodeCount).toBe(2);
        expect(coverage.missingEdgeCount).toBe(1);
        expect(coverage.isComplete).toBe(false);
    });

    it('should report only graph entries that are not already on the timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, {
            version: 1,
            mode: 'quick',
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'clip_deleted', kind: 'edge', refId: 'line_deleted', phase: 'enter', showAnimation: true },
                { id: 'key_1', kind: 'keyframe', refId: 'stn_b', x: 0, y: 0 },
            ],
        });

        expect(coverage.missingNodeIds).toEqual(['stn_b']);
        expect(coverage.missingEdgeIds).toEqual(['line_ab']);
        expect(coverage.missingIds).toEqual(['stn_b', 'line_ab']);
        expect(coverage.isComplete).toBe(false);
    });

    it('should mark coverage complete when every current graph entry is on the timeline', () => {
        const graph = makeGraph();
        const coverage = getTimelineCoverage(graph, {
            version: 1,
            mode: 'quick',
            track: [
                { id: 'clip_1', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'clip_2', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'clip_3', kind: 'edge', refId: 'line_ab', phase: 'enter', showAnimation: true },
                { id: 'clip_deleted', kind: 'node', refId: 'stn_deleted', phase: 'enter', showAnimation: true },
            ],
        });

        expect(coverage.missingNodeIds).toEqual([]);
        expect(coverage.missingEdgeIds).toEqual([]);
        expect(coverage.missingIds).toEqual([]);
        expect(coverage.isComplete).toBe(true);
    });

    it('should compute visibility and keyframe positions at the cursor', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [
                { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'key_a1', kind: 'keyframe', refId: 'stn_a', x: 30, y: 40 },
                { id: 'clip_b', kind: 'node', refId: 'stn_b', phase: 'enter', showAnimation: true },
                { id: 'key_a2', kind: 'keyframe', refId: 'stn_a', x: 50, y: 60 },
                { id: 'clip_b_exit', kind: 'node', refId: 'stn_b', phase: 'exit', showAnimation: true },
            ],
        };

        const atStart = getTimelinePreviewState(graph, document, 0);
        expect(atStart.visibleIds.has('stn_a')).toBe(true);
        expect(atStart.visibleIds.has('stn_b')).toBe(false);
        expect(atStart.positions.get('stn_a')).toEqual({ x: 10, y: 20 });

        const atMiddle = getTimelinePreviewState(graph, document, 2);
        expect(atMiddle.visibleIds.has('stn_a')).toBe(true);
        expect(atMiddle.visibleIds.has('stn_b')).toBe(true);
        expect(atMiddle.positions.get('stn_a')).toEqual({ x: 40, y: 50 });

        const atExit = getTimelinePreviewState(graph, document, 4);
        expect(atExit.visibleIds.has('stn_b')).toBe(true);

        const atEnd = getTimelinePreviewState(graph, document, 5);
        expect(atEnd.visibleIds.has('stn_b')).toBe(false);
        expect(atEnd.positions.get('stn_a')).toEqual({ x: 50, y: 60 });
    });

    it.each(['stn_a', 'line_ab'] as const)('keeps %s visible on its exit card and hides it after the card', refId => {
        const graph = makeGraph();
        const entered = appendTimelineEntry(emptyDocument(), refId);
        const document = insertTimelineExitEntry(entered, refId, 1).document;

        expect(getTimelinePreviewState(graph, document, 0).visibleIds.has(refId)).toBe(true);
        expect(getTimelinePreviewState(graph, document, 1).visibleIds.has(refId)).toBe(true);
        expect(getTimelinePreviewState(graph, document, 2).visibleIds.has(refId)).toBe(false);
    });

    it('should keep a visible line when its stations are not visible', () => {
        const graph = makeGraph();
        const document: TimelineDocument = {
            version: 1,
            mode: 'pro',
            track: [{ id: 'line_ab', kind: 'edge', refId: 'line_ab', phase: 'enter', showAnimation: true }],
        };

        const preview = getTimelinePreviewState(graph, document, 0);

        expect(preview.visibleIds.has('line_ab')).toBe(true);
        expect(preview.visibleIds.has('stn_a')).toBe(false);
        expect(preview.visibleIds.has('stn_b')).toBe(false);
    });
});
