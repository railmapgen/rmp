import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createEmptyTimelineDocument, TimelineDocument } from '../../constants/timeline';

export interface TimelineState {
    present: TimelineDocument;
}

const initialState: TimelineState = {
    present: createEmptyTimelineDocument(),
};

const timelineSlice = createSlice({
    name: 'timeline',
    initialState,
    reducers: {
        setFullState: (_state, action: PayloadAction<TimelineState>) => {
            return structuredClone(action.payload);
        },
        setTimelineDocument: (state, action: PayloadAction<TimelineDocument>) => {
            state.present = structuredClone(action.payload);
        },
        resetTimeline: state => {
            state.present = createEmptyTimelineDocument();
        },
    },
});

export const { setFullState, setTimelineDocument, resetTimeline } = timelineSlice.actions;
export default timelineSlice.reducer;
