import store from '../index';
import appReducer, { bumpCounter, saveGraph } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    it('Can bump counter as expected', () => {
        const nextState = appReducer(realStore.app, bumpCounter());
        expect(nextState.counter).toEqual(1);
    });
    it('Can save graph as expected', () => {
        const nextState = appReducer(realStore.app, saveGraph('hello rmp'));
        expect(nextState.graph).toEqual('hello rmp');
    });
});
