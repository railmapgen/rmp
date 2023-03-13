import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MultiDirectedGraph } from 'graphology';
import { SerializedGraph } from 'graphology-types';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';

const MAX_UNDO_SIZE = 49;

/**
 * ParamState contains all the data that a save has, except for the `version` key.
 * Should be persisted and updated as soon as possible when there is a change in the project.
 *
 * `past` and `future` contains the undo and redo stack.
 * It is similar to redux-undo but due to window.graph, we are implementing it again.
 * https://stackoverflow.com/questions/72807148/how-to-access-state-of-one-slice-in-reducer-of-another-slice-using-redux-toolkit
 * https://stackoverflow.com/questions/61138775/redux-toolkit-have-two-slices-reference-each-others-actions-in-extrareducers
 * https://redux-toolkit.js.org/api/createSlice#extrareducers
 * https://redux.js.org/usage/implementing-undo-history
 * https://redux.js.org/usage/structuring-reducers/beyond-combinereducers
 *
 * https://stackoverflow.com/questions/63516716/redux-toolkit-is-it-possible-to-dispatch-other-actions-from-the-same-slice-in-o
 * https://stackoverflow.com/questions/61704805/getting-an-error-a-non-serializable-value-was-detected-in-the-state-when-using
 */
export interface ParamState {
    /**
     * Graph generated by `graph.export()`.
     */
    present: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    past: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>[];
    future: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>[];
    /**
     * Controls the zoom of the svg.
     * NOTE IT IS SUPER IMPORTANT TO TAKE THIS FACTOR INTO CONSIDERATION
     * IF YOU WANT TO USE THE CORRECT MOUSE POSITION!
     */
    svgViewBoxZoom: number;
    /**
     * The left and top most coordinate.
     */
    svgViewBoxMin: { x: number; y: number };
}

const initialState: ParamState = {
    present: new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export(),
    past: [],
    future: [],
    svgViewBoxZoom: 100,
    svgViewBoxMin: { x: 0, y: 0 },
};

export const undoAction = createAction('undo');
export const redoAction = createAction('redo');

const paramSlice = createSlice({
    name: 'param',
    initialState,
    reducers: {
        setFullState: (state, action: PayloadAction<ParamState>) => {
            // https://stackoverflow.com/questions/60002846/how-can-you-replace-entire-state-in-redux-toolkit-reducer
            return { ...action.payload };
        },
        saveGraph: (state, action: PayloadAction<SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>>) => {
            state.future = [];
            state.past.push(state.present);
            // limit the maximum undo stack size to prevent insane memory usage
            if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
            state.present = action.payload;
        },
        setSvgViewBoxZoom: (state, action: PayloadAction<number>) => {
            state.svgViewBoxZoom = action.payload;
        },
        setSvgViewBoxMin: (state, action: PayloadAction<{ x: number; y: number }>) => {
            state.svgViewBoxMin = action.payload;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(undoAction, state => {
                if (state.past.length === 0) return;
                const previous = state.past.pop()!;
                state.future.unshift(state.present);
                state.present = previous;
                // window.graph = previous;
                window.graph.clear();
                // window.graph.import(previous);
                window.graph.import(JSON.parse(JSON.stringify(previous)));
                // window.graph.import(MultiDirectedGraph.from(previous).export());
            })
            .addCase(redoAction, state => {
                if (state.future.length === 0) return;
                const next = state.future.shift()!;
                state.past.push(state.present);
                state.present = next;
                // window.graph = next;
                window.graph.clear();
                // window.graph.import(next);
                window.graph.import(JSON.parse(JSON.stringify(next)));
                // window.graph.import(MultiDirectedGraph.from(next).export());
            });
    },
});

export const { setFullState, saveGraph, setSvgViewBoxZoom, setSvgViewBoxMin } = paramSlice.actions;
export default paramSlice.reducer;
