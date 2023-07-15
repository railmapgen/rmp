import { getDefaultMiddleware, ThunkDispatch } from '@reduxjs/toolkit';
import createMockStore from 'redux-mock-store';
import { vi } from 'vitest';
import infoJson from '../info.json';
import { MockBroadcastChannel } from './mock-broadcast-channel';
import { RootState } from './redux';

// FIXME: any -> AnyAction?
type DispatchExts = ThunkDispatch<RootState, void, any>;
export const createMockRootStore = createMockStore<RootState, DispatchExts>(getDefaultMiddleware());

class BroadcastChannel {
    postMessage() {
        // mocked
    }
    onmessage() {
        // mocked
    }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

const originalFetch = global.fetch;
global.fetch = (...args) => {
    if (args[0].toString().includes('/info.json')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(infoJson),
        }) as any;
    } else {
        return originalFetch(...args);
    }
};
