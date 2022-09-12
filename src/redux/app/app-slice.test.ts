import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';
import store from '../index';
import appReducer, { saveGraph } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    it('Can save graph as expected', () => {
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        const nextState = appReducer(realStore.app, saveGraph(graph.export()));
        expect(nextState.graph).toEqual(
            '{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]}'
        );
    });
});
