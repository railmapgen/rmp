import { ActionReducerMapBuilder, createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { Draft } from 'immer';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';

export const MAX_UNDO_SIZE = 49;
export type ParamGraph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

/**
 * The persistable part of the currently open project.
 * Runtime interaction state and undo/redo stacks are deliberately kept outside it.
 */
export interface ProjectSnapshot {
    graph: ParamGraph;
    svgViewBoxZoom: number;
    svgViewBoxMin: { x: number; y: number };
}

/**
 * Controls how a history snapshot is restored. Every entry stores a complete
 * project snapshot, but graph entries restore only the graph while project
 * entries also restore the saved viewport.
 */
export type HistoryScope = 'graph' | 'project';

/** A project snapshot together with the policy used to restore it. */
export interface HistoryEntry extends ProjectSnapshot {
    scope: HistoryScope;
}

/**
 * Wraps the current project with its runtime-only undo and redo stacks.
 * The newest past entry is at the end of `past`; the next redo entry is at the
 * beginning of `future`. Only `present` is serialized into a project save.
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

// The scope is read from the stack head by the history thunk. Keeping it on the
// action lets other slices follow the same restore policy, while this reducer
// verifies that it still matches the stack head before changing either stack.
export const applyUndoAction = createAction<HistoryScope>('undo');
export const applyRedoAction = createAction<HistoryScope>('redo');

const pushPast = (state: Draft<ParamState>, entry: Draft<HistoryEntry>) => {
    state.past.push(entry);
    if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
};

/**
 * Restores an entry and returns the inverse entry for the opposite stack.
 * Graph history replaces only the graph so undo/redo preserves the viewport
 * from the current project; project history replaces the entire snapshot.
 */
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
         * Initializes the project without creating a history entry. This is the
         * bootstrap path for a loaded save, so both history stacks start empty.
         */
        initializeProject: (state, action: PayloadAction<ProjectSnapshot>) => {
            state.present = structuredClone(action.payload);
            state.past = [];
            state.future = [];
        },
        /**
         * Records an ordinary graph mutation. The common history representation
         * stores the full snapshot, while its graph scope limits later restoration.
         */
        saveGraph: (state, action: PayloadAction<ParamGraph>) => {
            state.future = [];
            pushPast(state, { scope: 'graph', ...state.present });
            state.present = {
                ...state.present,
                graph: structuredClone(action.payload),
            };
        },
        /** Records a whole-project replacement, including its persisted viewport. */
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
