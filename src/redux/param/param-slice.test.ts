import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';
import store from '../index';
import appReducer, { saveGraph, MAX_UNDO_SIZE } from './param-slice';

const realStore = store.getState();

describe('ParamSlice', () => {
    it('Can save graph as expected', () => {
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        expect(nextState.present).toEqual({
            options: { type: 'directed', multi: true, allowSelfLoops: true },
            attributes: {},
            nodes: [],
            edges: [],
        });
    });

    it('Can preserve past stack upon save', () => {
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        expect(nextState.past).toEqual([
            {
                options: { type: 'directed', multi: true, allowSelfLoops: true },
                attributes: {},
                nodes: [],
                edges: [],
            },
        ]);
    });

    it('Can discard old graph if past.length > MAX_UNDO_SIZE', () => {
        // const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        // const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        // for (let i = 0; i <= MAX_UNDO_SIZE; i = i + 1) {
        //     appReducer(nextState, saveGraph(graph.export()));
        // }
        // expect(nextState.past.length).toEqual(MAX_UNDO_SIZE);
    });
});
