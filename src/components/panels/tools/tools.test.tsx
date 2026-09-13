import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import ToolsPanel from './tools';

vi.mock('./localized-order', () => ({
    localizedLineStyles: new Proxy({}, { get: () => ['single-color'] }),
    localizedMiscNodes: {},
    localizedStations: {},
}));

beforeAll(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
            matches: false,
            media: '',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })
    );
});

afterAll(() => vi.unstubAllGlobals());

const renderToolsPanel = (mapEnabled: boolean, isSubscriber = true) => {
    const testStore = createStore({
        account: {
            ...store.getState().account,
            activeSubscriptions: {
                ...store.getState().account.activeSubscriptions,
                RMP_CLOUD: isSubscriber,
            },
        },
        param: {
            ...store.getState().param,
            present: {
                ...store.getState().param.present,
                mapEnabled,
            },
        },
    });

    render(
        <RmgThemeProvider>
            <ToolsPanel />
        </RmgThemeProvider>,
        { store: testStore }
    );

    return testStore;
};

describe('ToolsPanel contextual line access', () => {
    it('shows every known path to subscribers with or without the map', () => {
        renderToolsPanel(false);

        for (const type of Object.values(LinePathType)) {
            expect(screen.getByRole('button', { name: type, hidden: true })).toBeEnabled();
        }
    });

    it('disables map-native and static Pro paths for free users while the map is hidden', () => {
        renderToolsPanel(false, false);

        expect(screen.getByRole('button', { name: LinePathType.Diagonal, hidden: true })).toBeEnabled();
        expect(screen.getByRole('button', { name: LinePathType.Bezier, hidden: true })).toBeDisabled();
        expect(screen.getByRole('button', { name: LinePathType.Freeform, hidden: true })).toBeDisabled();
        expect(screen.getByRole('button', { name: LinePathType.RayGuided, hidden: true })).toBeDisabled();
        expect(screen.getByRole('button', { name: LinePathType.Simple, hidden: true })).toBeDisabled();
    });

    it('disables diagram-native and static Pro paths for free users while the map is shown', () => {
        renderToolsPanel(true, false);

        expect(screen.getByRole('button', { name: LinePathType.Diagonal, hidden: true })).toBeDisabled();
        expect(screen.getByRole('button', { name: LinePathType.Bezier, hidden: true })).toBeEnabled();
        expect(screen.getByRole('button', { name: LinePathType.Freeform, hidden: true })).toBeEnabled();
        expect(screen.getByRole('button', { name: LinePathType.RayGuided, hidden: true })).toBeDisabled();
        expect(screen.getByRole('button', { name: LinePathType.Simple, hidden: true })).toBeDisabled();
    });

    it('uses an allowed map-native fallback for a free user selecting a style', () => {
        const testStore = renderToolsPanel(true, false);

        fireEvent.click(screen.getByRole('button', { name: LineStyleType.SingleColor, hidden: true }));

        expect(testStore.getState().runtime.mode).toBe(`line-${LinePathType.Bezier}/${LineStyleType.SingleColor}`);
    });
});
