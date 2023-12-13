import { configureStore, ThunkAction, AnyAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { LocalStorageKey } from '../constants/constants';
import { stringifyParam } from '../util/save';
import appReducer from './app/app-slice';
import paramReducer from './param/param-slice';
import runtimeReducer from './runtime/runtime-slice';

import { enableMapSet } from 'immer';
enableMapSet();

const store = configureStore({
    reducer: {
        app: appReducer,
        param: paramReducer,
        runtime: runtimeReducer,
    },
    // undo slice contains MultiDirectedGraph instance, it is not meant to be serialized nor persisted
    middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
});

store.subscribe(() => {
    localStorage.setItem(LocalStorageKey.PARAM, stringifyParam(store.getState().param));
    localStorage.setItem(LocalStorageKey.APP, JSON.stringify(store.getState().app));
});

export type RootState = ReturnType<typeof store.getState>;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, AnyAction>;

export default store;
