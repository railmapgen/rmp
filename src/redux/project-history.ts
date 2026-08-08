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
    // Cloning also prevents the graph from sharing attributes with frozen Redux snapshots.
    const replacement = MultiDirectedGraph.from(structuredClone(graph));
    // Preserve object identity because existing canvas refs keep pointing to window.graph.
    window.graph.clear();
    window.graph.import(replacement);
};

const refreshGraphState = (dispatch: RootDispatch) => {
    // TODO(graph-mutation-pipeline): Replace these split refresh thunks with one
    // explicit graph refresh request. History should coordinate reconciliation,
    // not know how node and edge derived state is refreshed internally.
    // See docs/graph-mutation-pipeline-design.md, "Initialization, undo, and redo".
    return Promise.all([dispatch(refreshNodesThunk()), dispatch(refreshEdgesThunk())]);
};

/**
 * Replaces the live graph before committing project history so a malformed
 * graph cannot leave Redux pointing at a project that failed to open.
 */
export const replaceProject = (project: ProjectSnapshot) => (dispatch: RootDispatch) => {
    replaceWindowGraph(project.graph);
    dispatch(replaceProjectState(project));
    return refreshGraphState(dispatch);
};

/** Restores the latest undo entry across the live graph, Redux, and derived runtime state. */
export const undoAction = () => (dispatch: RootDispatch, getState: () => RootState) => {
    const entry = getState().param.past.at(-1);
    if (!entry) return;

    replaceWindowGraph(entry.graph);
    dispatch(applyUndoAction(entry.scope));
    return refreshGraphState(dispatch);
};

/** Restores the next redo entry across the live graph, Redux, and derived runtime state. */
export const redoAction = () => (dispatch: RootDispatch, getState: () => RootState) => {
    const entry = getState().param.future[0];
    if (!entry) return;

    replaceWindowGraph(entry.graph);
    dispatch(applyRedoAction(entry.scope));
    return refreshGraphState(dispatch);
};
