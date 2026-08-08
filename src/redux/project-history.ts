import { MultiDirectedGraph } from 'graphology';
import type { RootDispatch, RootState } from '.';
import {
    applyRedoAction,
    applyUndoAction,
    ParamGraph,
    ProjectSnapshot,
    replaceProjectState,
} from './param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from './runtime/runtime-slice';

const replaceWindowGraph = (graph: ParamGraph) => {
    // Validate and clone the target before clearing the live graph. A malformed
    // project or history entry must not destroy the project that is currently open.
    const replacement = MultiDirectedGraph.from(structuredClone(graph));
    window.graph.clear();
    window.graph.import(replacement);
};

const refreshGraphState = (dispatch: RootDispatch) => {
    return Promise.all([dispatch(refreshNodesThunk()), dispatch(refreshEdgesThunk())]);
};

export const replaceProject = (project: ProjectSnapshot) => (dispatch: RootDispatch) => {
    replaceWindowGraph(project.graph);
    dispatch(replaceProjectState(project));
    return refreshGraphState(dispatch);
};

export const undoAction = () => (dispatch: RootDispatch, getState: () => RootState) => {
    const entry = getState().param.past.at(-1);
    if (!entry) return;

    replaceWindowGraph(entry.graph);
    dispatch(applyUndoAction(entry.scope));
    return refreshGraphState(dispatch);
};

export const redoAction = () => (dispatch: RootDispatch, getState: () => RootState) => {
    const entry = getState().param.future[0];
    if (!entry) return;

    replaceWindowGraph(entry.graph);
    dispatch(applyRedoAction(entry.scope));
    return refreshGraphState(dispatch);
};
