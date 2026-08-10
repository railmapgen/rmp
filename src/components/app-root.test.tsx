import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { act, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createStore } from '../redux';
import { setMapOverview } from '../redux/runtime/runtime-slice';
import { render } from '../test-utils';
import AppRoot from './app-root';

vi.mock('./page-header/page-header', () => ({ default: () => <div data-testid="page-header" /> }));
vi.mock('./panels/tools/tools', () => ({ default: () => <div data-testid="tools-panel" /> }));
vi.mock('./svg-wrapper', () => ({ default: () => <div data-testid="svg-wrapper" /> }));
vi.mock('./panels/details/details', () => ({ default: () => <div data-testid="details-panel" /> }));
vi.mock('./panels/rmg-palette-app-clip', () => ({ default: () => null }));

window.graph = new MultiDirectedGraph();

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

describe('AppRoot', () => {
    it('unmounts the tools panel while the map is in overview mode', async () => {
        const store = createStore();
        render(<AppRoot />, { store });

        expect(await screen.findByTestId('tools-panel')).toBeInTheDocument();

        act(() => store.dispatch(setMapOverview(true)));
        expect(screen.queryByTestId('tools-panel')).not.toBeInTheDocument();

        act(() => store.dispatch(setMapOverview(false)));
        expect(await screen.findByTestId('tools-panel')).toBeInTheDocument();
    });
});
