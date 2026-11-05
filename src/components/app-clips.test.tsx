import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { MultiDirectedGraph } from 'graphology';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../redux';
import { render } from '../test-utils';
import RmgParamAppClip from './page-header/rmg-param-app-clip';
import RmgPaletteAppClip from './panels/rmg-palette-app-clip';

vi.mock('@railmapgen/rmg-components', async importOriginal => {
    const actual = await importOriginal<typeof import('@railmapgen/rmg-components')>();
    return {
        ...actual,
        RmgAppClip: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

const getRandomValues = crypto.getRandomValues.bind(crypto);

const getParentId = (container: HTMLElement) => {
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const query = new URL(iframe!.src).hash.split('?')[1];
    return new URLSearchParams(query).get('parentId');
};

describe.each([
    {
        name: 'RMG import',
        createClip: (isOpen: boolean) => <RmgParamAppClip isOpen={isOpen} onClose={vi.fn()} />,
    },
    {
        name: 'palette',
        createClip: (isOpen: boolean) => <RmgPaletteAppClip isOpen={isOpen} onClose={vi.fn()} onSelect={vi.fn()} />,
    },
])('$name app clip over local-network HTTP', ({ createClip }) => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        // HTTP LAN origins expose getRandomValues but do not expose randomUUID.
        vi.stubGlobal('crypto', { getRandomValues });
        vi.stubGlobal(
            'BroadcastChannel',
            class {
                onmessage = null;
                close = vi.fn();
                postMessage = vi.fn();
            }
        );
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

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('mounts closed without randomUUID and keeps a distinct bridge ID for each instance', () => {
        const clip = (isOpen: boolean) => <RmgThemeProvider>{createClip(isOpen)}</RmgThemeProvider>;
        const { container, rerender, unmount } = render(clip(false), { store: createStore() });
        const firstId = getParentId(container);
        expect(firstId).toBeTruthy();

        rerender(clip(true));
        expect(getParentId(container)).toBe(firstId);
        unmount();

        const second = render(clip(false), { store: createStore() });
        const secondId = getParentId(second.container);
        expect(secondId).toBeTruthy();
        expect(secondId).not.toBe(firstId);
    });
});
