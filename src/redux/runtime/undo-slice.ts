import { AnyAction, createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MultiDirectedGraph } from 'graphology';
import { Reducer } from 'react';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { saveGraph, setFullState, saveGraphNoEffects } from '../param/param-slice';
import { AppThunk, RootState } from '../index';

/**
 * UndoState contains the undo and redo stack.
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
interface UndoState {
    present: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    past: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>[];
    future: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>[];
}

const initialState: UndoState = {
    present: new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    past: [],
    future: [],
};

export const undoAction = createAction('UNDO');
export const redoAction = createAction('REDO');

const undoSlice = createSlice({
    name: 'undo',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(undoAction, state => {
                if (state.past.length === 0) return;
                const previous = state.past.pop()!;
                // const present = MultiDirectedGraph.from(window.graph);
                state.future.unshift(state.present);
                state.present = previous;
                // window.graph = previous;
                window.graph.clear();
                window.graph.import(previous);
            })
            .addCase(redoAction, state => {
                if (state.future.length === 0) return;
                const next = state.future.shift()!;
                // const present = MultiDirectedGraph.from(window.graph);
                state.past.push(state.present);
                state.present = next;
                // window.graph = next;
                window.graph.clear();
                window.graph.import(next);
            })
            .addCase(saveGraph, (state, action) => {
                state.future = [];
                state.past.push(state.present);
                state.present = MultiDirectedGraph.from(action.payload);
            })
            .addCase(setFullState, (state, action) => {
                state.present = MultiDirectedGraph.from(JSON.parse(action.payload.graph));
            });
    },
});

export default undoSlice.reducer;

// export const combinedReducer: Reducer<RootState, AnyAction> = (state, action) => {
//     switch (action.type) {
//         case saveGraph: {
//             return {
//                 app: state.app,
//                 param: { ...state.param, graph: JSON.stringify(action.payload) },
//                 runtime: state.runtime,
//                 undo: { future: [], past: [] },
//             };
//         }
//     }
// };

export const undo = (): AppThunk => (dispatch, getState) => {
    dispatch(undoAction());
    dispatch(saveGraphNoEffects(getState().undo.present.export()));
};
