import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import store from '../index';
import appReducer, { applyRedoAction, applyUndoAction, MAX_UNDO_SIZE, saveGraph } from './param-slice';

const realStore = store.getState();
const emptySerializedGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export();

describe('ParamSlice', () => {
    it('Can save graph as expected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        expect(nextState.present.graph).toEqual(emptySerializedGraph);
    });

    it('Can preserve past stack upon save', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        expect(nextState.past.map(entry => entry.graph)).toEqual([emptySerializedGraph]);
    });

    it('Can reset future stack upon save', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const nextState = appReducer(
            { ...realStore.param, future: Array(MAX_UNDO_SIZE).fill(graph.export()).flat() },
            saveGraph(graph.export())
        );
        expect(nextState.future.length).toEqual(0);
    });

    it('Can pop from past upon undo', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        window.graph = graph;
        const newGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        newGraph.addNode('1', { visible: false, zIndex: 0, x: 0, y: 0, type: MiscNodeType.Virtual });
        const nextState = appReducer(
            {
                ...realStore.param,
                past: Array(MAX_UNDO_SIZE).fill({
                    ...realStore.param.present,
                    scope: 'graph' as const,
                    graph: graph.export(),
                }),
                present: {
                    ...realStore.param.present,
                    graph: newGraph.export(),
                },
            },
            applyUndoAction('graph')
        );
        expect(nextState.past.length).toEqual(MAX_UNDO_SIZE - 1);
        expect(nextState.future.length).toEqual(1);
        expect(nextState.present.graph).toEqual(emptySerializedGraph);
    });

    it('Can pop from future upon redo', () => {
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        window.graph = graph;
        const oldGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        oldGraph.addNode('1', { visible: false, zIndex: 0, x: 0, y: 0, type: MiscNodeType.Virtual });
        const nextState = appReducer(
            {
                ...realStore.param,
                future: Array(MAX_UNDO_SIZE).fill({
                    ...realStore.param.present,
                    scope: 'graph' as const,
                    graph: graph.export(),
                }),
                present: { ...realStore.param.present, graph: oldGraph.export() },
            },
            applyRedoAction('graph')
        );
        expect(nextState.past.length).toEqual(1);
        expect(nextState.future.length).toEqual(MAX_UNDO_SIZE - 1);
        expect(nextState.present.graph).toEqual(graph.export());
    });

    it('Can discard old graph if past.length > MAX_UNDO_SIZE', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const nextState = appReducer(
            {
                ...realStore.param,
                past: Array(MAX_UNDO_SIZE).fill({
                    ...realStore.param.present,
                    scope: 'graph' as const,
                    graph: graph.export(),
                }),
            },
            saveGraph(graph.export())
        );
        expect(nextState.past.length).toEqual(MAX_UNDO_SIZE);
    });
});
