import { RootState } from './redux';
import createMockStore from 'redux-mock-store';
import { getDefaultMiddleware, ThunkDispatch } from '@reduxjs/toolkit';

// FIXME: any -> AnyAction?
type DispatchExts = ThunkDispatch<RootState, void, any>;
export const createMockRootStore = createMockStore<RootState, DispatchExts>(getDefaultMiddleware());
