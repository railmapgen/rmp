import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { screen } from '@testing-library/react';
import React from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LinePathType } from '../../../constants/lines';
import store, { createStore } from '../../../redux';
import { render } from '../../../test-utils';
import ToolsPanel from './tools';

vi.mock('./localized-order', () => ({
    localizedLineStyles: {},
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

const renderToolsPanel = (type: 'diagram' | 'map', isSubscriber = true) => {
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
            type,
        },
    });

    render(
        <RmgThemeProvider>
            <ToolsPanel />
        </RmgThemeProvider>,
        { store: testStore }
    );
};

describe('ToolsPanel line paths by project type', () => {
    it('shows the original paths and Simple but hides Bezier and Freeform in diagram projects', () => {
        renderToolsPanel('diagram');

        expect(screen.getByRole('button', { name: LinePathType.Diagonal, hidden: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.RayGuided, hidden: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.Simple, hidden: true })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LinePathType.Freeform, hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LinePathType.Bezier, hidden: true })).not.toBeInTheDocument();
    });

    it('only shows Simple, Bezier and Freeform paths in map projects', () => {
        renderToolsPanel('map');

        expect(screen.queryByRole('button', { name: LinePathType.Diagonal, hidden: true })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: LinePathType.RayGuided, hidden: true })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.Simple, hidden: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.Freeform, hidden: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.Bezier, hidden: true })).toBeInTheDocument();
    });

    it('disables Ray Guided and hides Simple from free users in diagram projects', () => {
        renderToolsPanel('diagram', false);

        expect(screen.getByRole('button', { name: LinePathType.Diagonal, hidden: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: LinePathType.RayGuided, hidden: true })).toBeDisabled();
        expect(screen.queryByRole('button', { name: LinePathType.Simple, hidden: true })).not.toBeInTheDocument();
    });
});
