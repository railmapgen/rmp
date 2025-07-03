import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { LocalStorageKey } from '../constants/constants';
import i18n from '../i18n/config';
import { onRMPSaveUpdate } from '../util/rmt-save';
import { stringifyParam } from '../util/save';
import accountReducer from './account/account-slice';
import appReducer from './app/app-slice';
import paramReducer from './param/param-slice';
import runtimeReducer, { setGlobalAlert } from './runtime/runtime-slice';

enableMapSet();

const rootReducer = combineReducers({
    account: accountReducer,
    app: appReducer,
    param: paramReducer,
    runtime: runtimeReducer,
});
export type RootState = ReturnType<typeof rootReducer>;

export const createStore = (preloadedState: Partial<RootState> = {}) =>
    configureStore({
        reducer: rootReducer,
        // undo slice contains MultiDirectedGraph instance, it is not meant to be serialized nor persisted
        middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
        preloadedState,
    });
const store = createStore();
export type RootStore = typeof store;

store.subscribe(async () => {
    // notify rmt to update the save if there is a change in the param state
    const paramChanged = await onRMPSaveUpdate(store.getState().param.present);

    try {
        localStorage.setItem(LocalStorageKey.APP, JSON.stringify(store.getState().app));
        localStorage.setItem(LocalStorageKey.LOGIN_STATE, JSON.stringify(store.getState().account));
        if (paramChanged) {
            localStorage.setItem(LocalStorageKey.PARAM, stringifyParam(store.getState().param));
        }
    } catch (error) {
        if (error instanceof Error && error.name == 'QuotaExceededError') {
            console.error('Local storage quota exceeded, unable to save state.');
            store.dispatch(
                setGlobalAlert({
                    status: 'error',
                    message: i18n.t('localStorageQuotaExceeded'),
                })
            );
        }
    }
});

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
