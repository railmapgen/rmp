import { createSlice, current, isDraft, PayloadAction } from '@reduxjs/toolkit';
import { createEmptyTimelineDocument, TimelineDocument } from '../../constants/timeline';
import { applyRedoAction, applyUndoAction, MAX_UNDO_SIZE, replaceProjectState, saveGraph } from '../param/param-slice';

export interface TimelineState {
    present: TimelineDocument;
    past: TimelineDocument[];
    future: TimelineDocument[];
}

const initialState: TimelineState = {
    present: createEmptyTimelineDocument(),
    past: [],
    future: [],
};

const cloneDocument = (document: TimelineDocument) => structuredClone(isDraft(document) ? current(document) : document);

const pushPast = (state: TimelineState, document: TimelineDocument) => {
    state.past.push(cloneDocument(document));
    if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
};

const timelineSlice = createSlice({
    name: 'timeline',
    initialState,
    reducers: {
        setFullState: (_state, action: PayloadAction<Pick<TimelineState, 'present'>>) => {
            return { present: structuredClone(action.payload.present), past: [], future: [] };
        },
        setTimelineDocument: (state, action: PayloadAction<TimelineDocument>) => {
            state.present = structuredClone(action.payload);
        },
        resetTimeline: state => {
            state.present = createEmptyTimelineDocument();
        },
    },
    extraReducers: builder => {
        builder
            .addCase(replaceProjectState, (state, action) => {
                state.future = [];
                pushPast(state, state.present);
                state.present = cloneDocument(action.payload.timeline ?? createEmptyTimelineDocument());
            })
            .addCase(saveGraph, state => {
                state.future = [];
            })
            .addCase(applyUndoAction, (state, action) => {
                if (action.payload !== 'project') return;
                const previous = state.past.pop();
                if (!previous) return;
                state.future.unshift(cloneDocument(state.present));
                state.present = previous;
            })
            .addCase(applyRedoAction, (state, action) => {
                if (action.payload !== 'project') return;
                const next = state.future.shift();
                if (!next) return;
                pushPast(state, state.present);
                state.present = next;
            });
    },
});

export const { setFullState, setTimelineDocument, resetTimeline } = timelineSlice.actions;
export default timelineSlice.reducer;
