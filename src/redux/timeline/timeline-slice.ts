import { createSlice, current, isAnyOf, isDraft, PayloadAction } from '@reduxjs/toolkit';
import { createEmptyTimelineDocument, TimelineDocument } from '../../constants/timeline';
import { applyRedoAction, applyUndoAction, MAX_UNDO_SIZE, replaceProjectState } from '../param/param-slice';

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
            if (JSON.stringify(state.present) === JSON.stringify(action.payload)) return;
            state.future = [];
            pushPast(state, state.present);
            state.present = structuredClone(action.payload);
        },
        undoTimeline: state => {
            const previous = state.past.pop();
            if (!previous) return;
            state.future.unshift(cloneDocument(state.present));
            state.present = previous;
        },
        redoTimeline: state => {
            const next = state.future.shift();
            if (!next) return;
            pushPast(state, state.present);
            state.present = next;
        },
        resetTimeline: () => {
            return {
                present: createEmptyTimelineDocument(),
                past: [],
                future: [],
            };
        },
    },
    extraReducers: builder => {
        builder
            .addCase(replaceProjectState, (_state, action) => ({
                present: cloneDocument(action.payload.timeline ?? createEmptyTimelineDocument()),
                past: [],
                future: [],
            }))
            .addMatcher(isAnyOf(applyUndoAction, applyRedoAction), (_state, action) => {
                if (action.payload !== 'project' || !action.meta.timelines) return;
                return { present: cloneDocument(action.meta.timelines.restored), past: [], future: [] };
            });
    },
});

export const { setFullState, setTimelineDocument, undoTimeline, redoTimeline, resetTimeline } = timelineSlice.actions;
export default timelineSlice.reducer;
