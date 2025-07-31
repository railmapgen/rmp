import { combineReducers, configureStore, createListenerMiddleware, TypedStartListening } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import accountReducer from './account/account-slice';
import appReducer from './app/app-slice';
import fontsReducer from './fonts/fonts-slice';
import paramReducer from './param/param-slice';
import runtimeReducer from './runtime/runtime-slice';

enableMapSet();

const rootReducer = combineReducers({
    account: accountReducer,
    app: appReducer,
    param: paramReducer,
    runtime: runtimeReducer,
    fonts: fontsReducer,
});
export type RootState = ReturnType<typeof rootReducer>;

const listenerMiddleware = createListenerMiddleware();

export const createStore = (preloadedState: Partial<RootState> = {}) =>
    configureStore({
        reducer: rootReducer,
        middleware: getDefaultMiddleware =>
            // undo slice contains MultiDirectedGraph instance, it is not meant to be serialized nor persisted
            getDefaultMiddleware({ serializableCheck: false }).prepend(listenerMiddleware.middleware),
        preloadedState,
    });
const store = createStore();
export type RootStore = typeof store;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

type RootStartListening = TypedStartListening<RootState, RootDispatch>;
export const startRootListening = listenerMiddleware.startListening as RootStartListening;

export default store;
