import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '.';
import { initializeProject, refreshLineDefinitions, replaceProjectState, saveGraph } from './param/param-slice';

/** Keep authored attributes in sync; topology is calculated only when a consumer requests it. */
export const lineDefinitionMiddleware: Middleware<object, RootState> = store => next => action => {
    if (refreshLineDefinitions.match(action)) {
        if (store.getState().param.present.graph !== action.payload.source) return next(action);
        const result = next(action);
        if (store.getState().param.present.graph !== action.payload.source)
            window.graph?.replaceAttributes(structuredClone(store.getState().param.present.graph.attributes ?? {}));
        return result;
    }
    if (saveGraph.match(action)) {
        window.graph?.replaceAttributes(structuredClone(action.payload.attributes ?? {}));
        return next(action);
    }
    if (initializeProject.match(action) || replaceProjectState.match(action)) {
        const source = action.payload.graph;
        const graph = {
            ...source,
            attributes: {
                ...source.attributes,
                ...(source.attributes?.lineDefinitions
                    ? {
                          lineDefinitions: source.attributes.lineDefinitions.map(line => ({
                              ...line,
                              status: line.status || 'operating',
                          })),
                      }
                    : {}),
            },
        };
        window.graph?.replaceAttributes(structuredClone(graph.attributes ?? {}));
        return next({ ...action, payload: { ...action.payload, graph } });
    }
    return next(action);
};
