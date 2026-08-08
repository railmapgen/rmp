import { ActionReducerMapBuilder, createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { Draft } from 'immer';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';

export const MAX_UNDO_SIZE = 49;
export type ParamGraph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export interface ProjectSnapshot {
    graph: ParamGraph;
    svgViewBoxZoom: number;
    svgViewBoxMin: { x: number; y: number };
}

export type HistoryScope = 'graph' | 'project';

export interface HistoryEntry extends ProjectSnapshot {
    scope: HistoryScope;
}

/**
 * ParamState wraps the current project snapshot with its undo and redo stacks.
 *
 * `past` and `future` contain the undo and redo stacks.
 * It is similar to redux-undo but due to window.graph, we are implementing it again.
 * https://redux.js.org/usage/implementing-undo-history
 * https://redux-toolkit.js.org/usage/immer-reducers
 *
 * https://stackoverflow.com/questions/72807148/how-to-access-state-of-one-slice-in-reducer-of-another-slice-using-redux-toolkit
 * https://stackoverflow.com/questions/61138775/redux-toolkit-have-two-slices-reference-each-others-actions-in-extrareducers
 * https://redux-toolkit.js.org/api/createSlice#extrareducers
 * https://redux.js.org/usage/structuring-reducers/beyond-combinereducers
 *
 * https://stackoverflow.com/questions/63516716/redux-toolkit-is-it-possible-to-dispatch-other-actions-from-the-same-slice-in-o
 * https://stackoverflow.com/questions/61704805/getting-an-error-a-non-serializable-value-was-detected-in-the-state-when-using
 */
export interface ParamState {
    present: ProjectSnapshot;
    past: HistoryEntry[];
    future: HistoryEntry[];
}

const initialState: ParamState = {
    present: {
        graph: new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export(),
        svgViewBoxZoom: 100,
        svgViewBoxMin: { x: 0, y: 0 },
    },
    past: [],
    future: [],
};

export const applyUndoAction = createAction<HistoryScope>('undo');
export const applyRedoAction = createAction<HistoryScope>('redo');

const pushPast = (state: Draft<ParamState>, entry: Draft<HistoryEntry>) => {
    state.past.push(entry);
    if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
};

const restoreHistoryEntry = (state: Draft<ParamState>, entry: Draft<HistoryEntry>): Draft<HistoryEntry> => {
    const current = { scope: entry.scope, ...state.present };
    const { scope, ...snapshot } = entry;
    state.present =
        scope === 'project'
            ? snapshot
            : {
                  ...state.present,
                  graph: snapshot.graph,
              };
    return current;
};

const paramSlice = createSlice({
    name: 'param',
    initialState,
    reducers: {
        /**
         * Initializes the project without creating a history entry.
         */
        initializeProject: (state, action: PayloadAction<ProjectSnapshot>) => {
            state.present = structuredClone(action.payload);
            state.past = [];
            state.future = [];
        },
        saveGraph: (state, action: PayloadAction<ParamGraph>) => {
            state.future = [];
            pushPast(state, { scope: 'graph', ...state.present });
            state.present = {
                ...state.present,
                graph: structuredClone(action.payload),
            };
        },
        replaceProjectState: (state, action: PayloadAction<ProjectSnapshot>) => {
            state.future = [];
            pushPast(state, { scope: 'project', ...state.present });
            state.present = structuredClone(action.payload);
        },
        setSvgViewport: (state, action: PayloadAction<{ zoom: number; min: { x: number; y: number } }>) => {
            state.present.svgViewBoxZoom = action.payload.zoom;
            state.present.svgViewBoxMin = action.payload.min;
        },
        setSvgViewBoxZoom: (state, action: PayloadAction<number>) => {
            state.present.svgViewBoxZoom = action.payload;
        },
        setSvgViewBoxMin: (state, action: PayloadAction<{ x: number; y: number }>) => {
            state.present.svgViewBoxMin = action.payload;
        },
    },
    extraReducers: (builder: ActionReducerMapBuilder<ParamState>) => {
        builder
            .addCase(applyUndoAction, (state, action) => {
                if (state.past.length === 0) return;
                const previous = state.past[state.past.length - 1]!;
                if (previous.scope !== action.payload) return;
                state.past.pop();
                state.future.unshift(restoreHistoryEntry(state, previous));
            })
            .addCase(applyRedoAction, (state, action) => {
                if (state.future.length === 0) return;
                const next = state.future[0]!;
                if (next.scope !== action.payload) return;
                state.future.shift();
                pushPast(state, restoreHistoryEntry(state, next));
            });
    },
});

export const {
    initializeProject,
    saveGraph,
    replaceProjectState,
    setSvgViewport,
    setSvgViewBoxZoom,
    setSvgViewBoxMin,
} = paramSlice.actions;
export default paramSlice.reducer;
