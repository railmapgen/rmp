import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import appReducer from './app/app-slice';
import runtimeReducer from './runtime/runtime-slice';

const store = configureStore({
    reducer: {
        app: appReducer,
        runtime: runtimeReducer,
    },
});

store.subscribe(() => {
    localStorage.setItem('AppState', JSON.stringify(store.getState().app));
});

export type RootState = ReturnType<typeof store.getState>;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
