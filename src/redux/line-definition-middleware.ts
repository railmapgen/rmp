import type { Middleware } from '@reduxjs/toolkit';
import { reconcileLineDefinitions } from '../util/line-definitions';
import { initializeProject, replaceProjectState, saveGraph } from './param/param-slice';

/** Normalize once before history/persistence sees a commit, and keep the mutable graph in sync. */
export const lineDefinitionMiddleware: Middleware = () => next => action => {
    if (saveGraph.match(action)) {
        const graph = reconcileLineDefinitions(action.payload);
        window.graph?.replaceAttributes(structuredClone(graph.attributes ?? {}));
        return next({ ...action, payload: graph });
    }
    if (initializeProject.match(action) || replaceProjectState.match(action)) {
        const graph = reconcileLineDefinitions(action.payload.graph);
        window.graph?.replaceAttributes(structuredClone(graph.attributes ?? {}));
        return next({ ...action, payload: { ...action.payload, graph } });
    }
    return next(action);
};
