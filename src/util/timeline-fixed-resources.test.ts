import { describe, expect, it } from 'vitest';
import { createEmptyTimelineDocument, TimelineDocument } from '../constants/timeline';
import { createTestLineGraph } from '../test-utils';
import {
    appendTimelineEntries,
    appendTimelineEntry,
    getTimelineCoverage,
    getTimelinePreviewState,
    insertKeyframeEntry,
    insertTimelineEntries,
    insertTimelineEntry,
    insertTimelineExitEntry,
    moveTimelineEntries,
    moveTimelineEntry,
    normalizeTimelineDocument,
    normalizeTimelineFixedResources,
    setTimelineFixedResources,
} from './timeline';
import { populateTimelineFromLineInformation } from './timeline-line-import';

const graph = () => createTestLineGraph([['A', 'B']]);

describe('Timeline fixed resources', () => {
    it('normalizes portable resource references without changing the document version', () => {
        expect(
            normalizeTimelineFixedResources(['stn_A', 'line_0', 'stn_A', null, 1, '', 'invalid', 'misc_node_image'])
        ).toEqual(['stn_A', 'line_0', 'misc_node_image']);
        expect(normalizeTimelineFixedResources(null)).toEqual([]);
        expect(createEmptyTimelineDocument().fixedResources).toEqual([]);
        const document = normalizeTimelineDocument({
            version: 2,
            track: [],
            fixedResources: ['stn_A', 'stn_A', 'line_0'],
        });
        expect(document.version).toBe(2);
        expect(document.fixedResources).toEqual(['stn_A', 'line_0']);
        expect(normalizeTimelineDocument(document)).toEqual(document);
    });

    it('removes only fixed enter/exit clips, retains keyframes, and rebases media slots without changing absolute times', () => {
        const original: TimelineDocument = {
            ...createEmptyTimelineDocument(),
            track: [
                { id: 'a-enter', kind: 'node', refId: 'stn_A', phase: 'enter', showAnimation: true },
                { id: 'line-enter', kind: 'edge', refId: 'line_0', phase: 'enter', showAnimation: true },
                { id: 'a-key', kind: 'keyframe', refId: 'stn_A', x: 10, y: 20 },
                { id: 'b-enter', kind: 'node', refId: 'stn_B', phase: 'enter', showAnimation: true },
                { id: 'a-exit', kind: 'node', refId: 'stn_A', phase: 'exit', showAnimation: true },
                { id: 'line-exit', kind: 'edge', refId: 'line_0', phase: 'exit', showAnimation: true },
                { id: 'pause', kind: 'pause', position: 'after', duration: 2 },
                { id: 'b-key', kind: 'keyframe', refId: 'stn_B', x: 30, y: 40 },
            ],
            audioTrack: [
                {
                    id: 'audio',
                    kind: 'audio',
                    blobId: 'sound',
                    name: 'Sound',
                    startSlot: 1,
                    endSlot: 7,
                    startTime: 0.125,
                    endTime: 8.75,
                },
            ],
            labelTrack: [{ id: 'label', kind: 'label', text: 'Caption', startSlot: 3, endSlot: 8, duration: 15 }],
        };
        const document = setTimelineFixedResources(original, new Set(['stn_A', 'line_0']));
        expect(document.fixedResources).toEqual(['stn_A', 'line_0']);
        expect(document.track.map(entry => entry.id)).toEqual(['a-key', 'b-enter', 'pause', 'b-key']);
        expect(document.audioTrack![0]).toEqual({ ...original.audioTrack![0], startSlot: 0, endSlot: 3 });
        expect(document.labelTrack![0]).toEqual({ ...original.labelTrack![0], startSlot: 1, endSlot: 4 });
        expect(original.track).toHaveLength(8);
        const unfixed = setTimelineFixedResources(document, []);
        expect(unfixed.fixedResources).toEqual([]);
        expect(unfixed.track).toEqual(document.track);
        expect(appendTimelineEntry(unfixed, 'stn_A').track).toHaveLength(5);
        expect(normalizeTimelineDocument({ ...original, fixedResources: ['stn_A', 'line_0'] })).toEqual(document);
    });

    it('rejects fixed enter/exit insertions while allowing fixed nodes to receive and move keyframes', () => {
        const document = setTimelineFixedResources(createEmptyTimelineDocument(), ['stn_A', 'line_0']);
        expect(insertTimelineEntry(document, 'stn_A', 0)).toBe(document);
        expect(appendTimelineEntry(document, 'line_0')).toBe(document);
        expect(insertTimelineEntries(document, ['stn_A', 'line_0'], 0)).toBe(document);
        expect(insertTimelineExitEntry(document, 'stn_A', 0)).toEqual({ document, cursor: 0 });
        expect(appendTimelineEntries(document, ['stn_A', 'line_0', 'stn_B']).track.map(entry => entry.refId)).toEqual([
            'stn_B',
        ]);
        const keyed = insertKeyframeEntry(document, graph(), 'stn_A', 0).document;
        expect(keyed.track.map(entry => entry.kind)).toEqual(['keyframe']);
        const withSecond = insertKeyframeEntry(keyed, graph(), 'stn_A', 1).document;
        expect(moveTimelineEntry(withSecond, 0, 1).track[1]).toEqual(withSecond.track[0]);
        expect(moveTimelineEntries(withSecond, [withSecond.track[0].id], 1).track[1]).toEqual(withSecond.track[0]);
    });

    it('counts fixed references toward coverage and shows them before the first frame', () => {
        const document = appendTimelineEntry(
            setTimelineFixedResources(createEmptyTimelineDocument(), ['stn_A', 'line_0']),
            'stn_B'
        );
        expect(getTimelineCoverage(graph(), document).isComplete).toBe(true);
        expect(getTimelinePreviewState(graph(), document, 0).visibleIds).toEqual(new Set(['stn_A', 'line_0']));
    });

    it('keeps fixed resources out of automatic line-information population', () => {
        const document = setTimelineFixedResources(createEmptyTimelineDocument(), ['stn_A', 'line_0']);
        const populated = populateTimelineFromLineInformation(graph().export(), document);
        expect(populated.fixedResources).toEqual(document.fixedResources);
        expect(populated.track.map(entry => entry.refId)).toEqual(['stn_B']);
        expect(getTimelineCoverage(graph(), populated).isComplete).toBe(true);
    });
});
