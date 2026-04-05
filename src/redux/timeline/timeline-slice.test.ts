import { describe, expect, it } from 'vitest';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import timelineReducer, { resetTimeline, setFullState, setTimelineDocument, TimelineState } from './timeline-slice';

describe('timeline slice', () => {
    it('should replace state with setFullState', () => {
        const nextState = timelineReducer(
            { present: createEmptyTimelineDocument() },
            setFullState({
                present: {
                    version: 1,
                    track: [{ id: 'clip_1', kind: 'node', refId: 'stn_a' }],
                },
            })
        );

        expect(nextState.present.track).toHaveLength(1);
        expect(nextState.present.track[0].refId).toBe('stn_a');
    });

    it('should set and reset the timeline document', () => {
        const initialState: TimelineState = { present: createEmptyTimelineDocument() };
        const updatedState = timelineReducer(
            initialState,
            setTimelineDocument({
                version: 1,
                track: [{ id: 'clip_1', kind: 'edge', refId: 'line_ab' }],
            })
        );

        expect(updatedState.present.track[0].refId).toBe('line_ab');
        expect(timelineReducer(updatedState, resetTimeline())).toEqual(initialState);
    });
});
