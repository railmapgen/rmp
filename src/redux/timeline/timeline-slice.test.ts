import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { insertKeyframeEntry, insertTimelineExitEntry, removeTimelineEntry } from '../../util/timeline';
import timelineReducer, {
    redoTimeline,
    resetTimeline,
    setFullState,
    setTimelineDocument,
    TimelineState,
    undoTimeline,
} from './timeline-slice';

describe('timeline slice', () => {
    it('should replace state with setFullState', () => {
        const nextState = timelineReducer(
            { present: createEmptyTimelineDocument(), past: [], future: [] },
            setFullState({
                present: {
                    version: 1,
                    mode: 'quick',
                    track: [{ id: 'clip_1', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true }],
                },
            })
        );

        expect(nextState.present.track).toHaveLength(1);
        expect(nextState.present.track[0].refId).toBe('stn_a');
    });

    it('should set and reset the timeline document', () => {
        const initialState: TimelineState = { present: createEmptyTimelineDocument(), past: [], future: [] };
        const updatedState = timelineReducer(
            initialState,
            setTimelineDocument({
                version: 1,
                mode: 'quick',
                track: [{ id: 'clip_1', kind: 'edge', refId: 'line_ab', phase: 'enter', showAnimation: true }],
            })
        );

        expect(updatedState.present.track[0].refId).toBe('line_ab');
        expect(timelineReducer(updatedState, resetTimeline())).toEqual(initialState);
    });

    it('should undo and redo timeline document changes', () => {
        const initialState: TimelineState = { present: createEmptyTimelineDocument(), past: [], future: [] };
        const document = {
            version: 1 as const,
            mode: 'quick' as const,
            track: [
                {
                    id: 'clip_1',
                    kind: 'node' as const,
                    refId: 'stn_a' as const,
                    phase: 'enter' as const,
                    showAnimation: true,
                },
            ],
        };
        const changedState = timelineReducer(initialState, setTimelineDocument(document));
        const undoneState = timelineReducer(changedState, undoTimeline());
        const redoneState = timelineReducer(undoneState, redoTimeline());

        expect(undoneState.present).toEqual(initialState.present);
        expect(redoneState.present).toEqual(document);
    });

    it('undoes removing an enter, its exit and keyframes as a single edit', () => {
        const withKeyframe = insertKeyframeEntry(
            createEmptyTimelineDocument(),
            new MultiDirectedGraph(),
            'stn_a',
            0
        ).document;
        const document = insertTimelineExitEntry(withKeyframe, 'stn_a', 2).document;
        const initial = timelineReducer(undefined, setFullState({ present: document }));
        const removed = timelineReducer(
            initial,
            setTimelineDocument(removeTimelineEntry(document, document.track[0].id))
        );

        expect(removed.present.track).toEqual([]);
        const restored = timelineReducer(removed, undoTimeline());
        expect(restored.present).toEqual(document);
        expect(timelineReducer(restored, redoTimeline()).present.track).toEqual([]);
    });
});
