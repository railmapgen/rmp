import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, Id, NodeAttributes } from '../../constants/constants';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { createStore } from '../../redux';
import { setMapEnabled, setMapStyle } from '../../redux/param/param-slice';
import { setSelected } from '../../redux/runtime/runtime-slice';
import { render } from '../../test-utils';
import { convertAARCToRmp } from '../../util/import-from-aarc';
import ImportFromAarc from './import-from-aarc';

vi.mock('../../util/change-types', async importOriginal => {
    const actual = await importOriginal<typeof import('../../util/change-types')>();
    return {
        ...actual,
        autoPopulateTransfer: vi.fn(),
        changeStationsTypeInBatch: vi.fn(),
    };
});

vi.mock('../../util/import-from-aarc', async importOriginal => {
    const actual = await importOriginal<typeof import('../../util/import-from-aarc')>();
    return {
        ...actual,
        convertAARCToRmp: vi.fn(),
    };
});

describe('ImportFromAarc', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        vi.mocked(convertAARCToRmp).mockImplementation((_text, graph) => {
            graph.addNode('stn_a', {} as NodeAttributes);
            graph.addNode('stn_b', {} as NodeAttributes);
            graph.addDirectedEdgeWithKey('line_a', 'stn_a', 'stn_b', {} as EdgeAttributes);
        });
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

    it('preserves map settings and only clears selection when replacing the project', async () => {
        const store = createStore();
        const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
        mapStyle.roads.arterial.color = '#123456';
        store.dispatch(setMapEnabled(true));
        store.dispatch(setMapStyle(mapStyle));
        store.dispatch(setSelected(new Set<Id>(['misc_node_stale'])));
        render(
            <RmgThemeProvider>
                <ImportFromAarc isOpen={true} onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );

        const file = new File(['{}'], 'aarc.json', { type: 'application/json' });
        fireEvent.change(screen.getByLabelText('Upload JSON file'), { target: { files: [file] } });

        const next = screen.getByRole('button', { name: 'Next' });
        await waitFor(() => expect(next).toBeEnabled());
        fireEvent.click(next);
        const overwrite = await screen.findByRole('button', { name: 'Clear current and Overwrite' });

        expect(store.getState().runtime.selected).toEqual(new Set<Id>(['misc_node_stale']));

        fireEvent.click(overwrite);
        expect(store.getState().param.present.mapEnabled).toBe(true);
        expect(store.getState().param.present.mapStyle).toEqual(mapStyle);
        expect(store.getState().runtime.selected.size).toBe(0);
    });
});
