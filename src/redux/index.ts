import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { stringifyParam } from '../util/save';
import appReducer from './app/app-slice';
import paramReducer from './param/param-slice';
import runtimeReducer from './runtime/runtime-slice';

const store = configureStore({
    reducer: {
        app: appReducer,
        param: paramReducer,
        runtime: runtimeReducer,
    },
});

store.subscribe(() => {
    localStorage.setItem('rmp__param', stringifyParam(store.getState().param));
    localStorage.setItem('rmp__app', JSON.stringify(store.getState().app));
});

export type RootState = ReturnType<typeof store.getState>;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
