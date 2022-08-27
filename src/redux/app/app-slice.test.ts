import store from '../index';
import appReducer, { saveGraph } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    it('Can save graph as expected', () => {
        const nextState = appReducer(realStore.app, saveGraph('hello rmp'));
        expect(nextState.graph).toEqual('hello rmp');
    });
});
