import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { TimelineDocument } from '../constants/timeline';
import { LinePathType, LineStyleType } from '../constants/lines';
import {
    appendTimelineEntry,
    getTimelineElementCenter,
    getTimelineEntryTitle,
    moveTimelineEntry,
    normalizeTimelineDocument,
    removeTimelineEntry,
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

describe('timeline utilities', () => {
    it('appendTimelineEntry should keep unique refs', () => {
        const initial: TimelineDocument = { version: 1, track: [] };
        const next = appendTimelineEntry(initial, 'stn_a');
        const deduped = appendTimelineEntry(next, 'stn_a');

        expect(next.track).toHaveLength(1);
        expect(deduped.track).toHaveLength(1);
        expect(deduped.track[0].refId).toBe('stn_a');
    });

    it('moveTimelineEntry should reorder clips', () => {
        const initial = appendTimelineEntry(appendTimelineEntry({ version: 1, track: [] }, 'stn_a'), 'line_ab');
        const moved = moveTimelineEntry(initial, 0, 1);

        expect(moved.track.map(entry => entry.refId)).toEqual(['line_ab', 'stn_a']);
    });

    it('removeTimelineEntry should remove by clip id', () => {
        const initial = appendTimelineEntry({ version: 1, track: [] }, 'stn_a');
        const removed = removeTimelineEntry(initial, initial.track[0].id);

        expect(removed.track).toEqual([]);
    });

    it('normalizeTimelineDocument should fallback to an empty document', () => {
        expect(normalizeTimelineDocument(undefined)).toEqual({ version: 1, track: [] });
        expect(normalizeTimelineDocument({ version: 1, track: [{} as never] })).toEqual({ version: 1, track: [] });
    });

    it('should derive labels and centers from graph refs', () => {
        const graph = makeGraph();

        expect(getTimelineEntryTitle(graph, { id: '1', kind: 'node', refId: 'stn_a' })).toBe('Alpha');
        expect(getTimelineEntryTitle(graph, { id: '2', kind: 'edge', refId: 'line_ab' })).toBe('Alpha -> Beta');
        expect(getTimelineElementCenter(graph, 'stn_a')).toEqual({ x: 10, y: 20 });
        expect(getTimelineElementCenter(graph, 'line_ab')).toEqual({ x: 60, y: 120 });
    });
});
