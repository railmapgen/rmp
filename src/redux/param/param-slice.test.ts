import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';
import store from '../index';
import appReducer, { saveGraph } from './param-slice';

const realStore = store.getState();

describe('ParamSlice', () => {
    it('Can save graph as expected', () => {
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        const nextState = appReducer(realStore.param, saveGraph(graph.export()));
        expect(nextState.present).toEqual(
            '{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]}'
        );
    });
});
