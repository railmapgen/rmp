import { describe, expect, it } from 'vitest';
import { createTestLineGraph } from '../test-utils';
import {
    getLineRoutes,
    getUnassignedLineSections,
    assignLineSection,
    splitLineDefinition,
    unassignLineDefinition,
} from '../util/line-definitions';
import { stringifyParam } from '../util/save';
import { createStore } from '.';
import { initializeProject, saveGraph } from './param/param-slice';
import { redoAction, replaceProject, undoAction } from './project-history';

describe('line definition commit boundary', () => {
    it.each(['', undefined])('loads legacy status %s as operating without losing line information', status => {
        window.graph = createTestLineGraph([['A', 'B']]);
        const saved = JSON.parse(JSON.stringify(window.graph.export()));
        saved.attributes.lineDefinitions[0].status = status;
        saved.attributes.lineDefinitions[0].name = ['旧线路', 'Existing line'];
        saved.attributes.lineDefinitions[0].openingDate = '2026-10-03';
        const graph = JSON.parse(JSON.stringify(saved));
        const store = createStore();
        store.dispatch(initializeProject({ ...store.getState().param.present, graph }));
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0]).toEqual({
            ...graph.attributes.lineDefinitions[0],
            status: 'operating',
        });
        expect(window.graph.export()).toEqual(store.getState().param.present.graph);
        expect(JSON.parse(stringifyParam(store.getState().param)).graph.attributes.lineDefinitions[0].status).toBe(
            'operating'
        );
    });

    it('persists unassigned sections and records each remove/reassign operation as one reversible commit', async () => {
        window.graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
        ]);
        const store = createStore();
        const before = window.graph.export();
        store.dispatch(initializeProject({ ...store.getState().param.present, graph: before }));
        const line = before.attributes.lineDefinitions![0];
        const removed = unassignLineDefinition(before, line.id);
        window.graph.replaceAttributes(removed.attributes);
        store.dispatch(saveGraph(window.graph.export()));
        expect(store.getState().param.past).toHaveLength(1);
        expect(JSON.parse(stringifyParam(store.getState().param)).graph.attributes.unassignedLineEdgeIds).toEqual([
            'line_0',
            'line_1',
            'line_2',
        ]);
        const pending = getUnassignedLineSections(removed)[0];
        const assigned = assignLineSection(removed, pending.id);
        window.graph.replaceAttributes(assigned.attributes);
        store.dispatch(saveGraph(window.graph.export()));
        expect(store.getState().param.past).toHaveLength(2);
        expect(window.graph.export()).toEqual(store.getState().param.present.graph);
        await store.dispatch(undoAction());
        expect(window.graph.export()).toEqual(removed);
        await store.dispatch(undoAction());
        expect(window.graph.export()).toEqual(before);
        await store.dispatch(redoAction());
        expect(window.graph.export()).toEqual(removed);
        await store.dispatch(redoAction());
        expect(window.graph.export()).toEqual(assigned);
    });

    it('commits separation once and restores geometry, metadata and ownership through undo/redo', async () => {
        window.graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'E'],
        ]);
        const store = createStore();
        const before = window.graph.export();
        store.dispatch(initializeProject({ ...store.getState().param.present, graph: before }));
        const line = before.attributes.lineDefinitions![0];
        const separated = splitLineDefinition(before, line.id, getLineRoutes(before, line, 'stn_A', 'stn_E')[0], 1, 3);
        window.graph.replaceAttributes(separated.attributes);
        store.dispatch(saveGraph(window.graph.export()));
        expect(store.getState().param.past).toHaveLength(1);
        expect(window.graph.export()).toEqual(store.getState().param.present.graph);
        expect(JSON.parse(stringifyParam(store.getState().param)).graph.attributes.lineDefinitions).toHaveLength(3);
        await store.dispatch(undoAction());
        expect(window.graph.export()).toEqual(before);
        await store.dispatch(redoAction());
        expect(window.graph.export()).toEqual(separated);
    });

    it('repairs loaded ownership and preserves it across project replacement', async () => {
        window.graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        const store = createStore();
        const original = window.graph.export();
        store.dispatch(initializeProject({ ...store.getState().param.present, graph: original }));
        window.graph.dropEdge('line_0');
        store.dispatch(saveGraph(window.graph.export()));
        const line = store.getState().param.present.graph.attributes.lineDefinitions![0];
        expect(line.edgeIds).toEqual(['line_1']);
        expect(line.exportStartStationId).toBe('stn_B');
        const replacement = createTestLineGraph([['X', 'Y']]).export();
        await store.dispatch(replaceProject({ ...store.getState().param.present, graph: replacement }));
        expect(window.graph.export()).toEqual(replacement);
        await store.dispatch(undoAction());
        expect(window.graph.getAttribute('lineDefinitions')).toEqual([line]);
    });
});
