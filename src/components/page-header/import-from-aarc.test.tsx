import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { logger } from '@railmapgen/rmg-runtime';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, Id, NodeAttributes } from '../../constants/constants';
import { LineDefinition } from '../../constants/line-definitions';
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

const importedLine: LineDefinition = {
    id: 'aarc_section_a',
    edgeIds: ['line_a'],
    name: ['测试线一期', 'Test line phase 1'],
    lineNumber: '1',
    openingDate: '2026-10-08',
    operator: '',
    status: 'construction',
    notes: 'AARC timing metadata',
    exportStartStationId: 'stn_a',
};

const uploadAndPreview = async () => {
    const file = new File(['{}'], 'aarc.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Upload JSON file'), { target: { files: [file] } });
    const next = screen.getByRole('button', { name: 'Next' });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
};

describe('ImportFromAarc', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        vi.mocked(convertAARCToRmp)
            .mockReset()
            .mockImplementation((_text, graph) => {
                graph.addNode('stn_a', {} as NodeAttributes);
                graph.addNode('stn_b', {} as NodeAttributes);
                graph.addNode('misc_node_text', {} as NodeAttributes);
                graph.addDirectedEdgeWithKey('line_a', 'stn_a', 'stn_b', {} as EdgeAttributes);
                graph.setAttribute('lineDefinitions', [structuredClone(importedLine)]);
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

        await uploadAndPreview();
        const overwrite = await screen.findByRole('button', { name: 'Clear current and Overwrite' });

        expect(store.getState().runtime.selected).toEqual(new Set<Id>(['misc_node_stale']));
        expect(screen.getByText('Save file from AARC detected. Drawing nodes: 3; connections: 1.')).toBeInTheDocument();
        expect(screen.getByText('Railway lines/sections: 1; sections with opening dates: 1.')).toBeInTheDocument();

        fireEvent.click(overwrite);
        expect(store.getState().param.present.mapEnabled).toBe(true);
        expect(store.getState().param.present.mapStyle).toEqual(mapStyle);
        expect(store.getState().runtime.selected.size).toBe(0);
        expect(window.graph.getAttribute('lineDefinitions')).toEqual([importedLine]);
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toEqual([importedLine]);
    });

    it('starts each preview with a fresh graph without previous imported attributes', async () => {
        const store = createStore();
        render(
            <RmgThemeProvider>
                <ImportFromAarc isOpen={true} onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        await uploadAndPreview();
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

        vi.mocked(convertAARCToRmp).mockImplementationOnce((_text, graph) => {
            graph.addNode('misc_node_new_text', {} as NodeAttributes);
        });
        await uploadAndPreview();
        expect(screen.getByText('Railway lines/sections: 0; sections with opening dates: 0.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Clear current and Overwrite' }));

        expect(window.graph.nodes()).toEqual(['misc_node_new_text']);
        expect(window.graph.getAttribute('lineDefinitions')).toBeUndefined();
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toBeUndefined();
    });

    it('keeps the current project when conversion fails after a successful preview', async () => {
        const store = createStore();
        window.graph.addNode('stn_existing', {} as NodeAttributes);
        window.graph.setAttribute('lineDefinitions', [structuredClone(importedLine)]);
        const existingGraph = window.graph.export();
        const existingParam = store.getState().param;
        const onClose = vi.fn();
        render(
            <RmgThemeProvider>
                <ImportFromAarc isOpen={true} onClose={onClose} />
            </RmgThemeProvider>,
            { store }
        );
        await uploadAndPreview();
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

        vi.spyOn(logger, 'error').mockImplementation(() => undefined);
        vi.mocked(convertAARCToRmp).mockImplementationOnce((_text, graph) => {
            graph.addNode('stn_partial', {} as NodeAttributes);
            graph.setAttribute('lineDefinitions', [structuredClone(importedLine)]);
            throw new Error('Invalid AARC save');
        });
        await uploadAndPreview();
        expect(screen.getByText('The save file you submitted is not supported.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Clear current and Overwrite' })).not.toBeInTheDocument();
        expect(window.graph.export()).toEqual(existingGraph);
        expect(store.getState().param).toBe(existingParam);
        expect(onClose).not.toHaveBeenCalled();
    });

    it.each(['stn_isolated', 'misc_node_text'])('imports a valid map with only %s and no connections', async nodeId => {
        vi.mocked(convertAARCToRmp).mockImplementationOnce((_text, graph) => {
            graph.addNode(nodeId, {} as NodeAttributes);
        });
        const store = createStore();
        const onClose = vi.fn();
        render(
            <RmgThemeProvider>
                <ImportFromAarc isOpen={true} onClose={onClose} />
            </RmgThemeProvider>,
            { store }
        );
        await uploadAndPreview();
        fireEvent.click(screen.getByRole('button', { name: 'Clear current and Overwrite' }));

        expect(window.graph.nodes()).toEqual([nodeId]);
        expect(window.graph.size).toBe(0);
        expect(store.getState().param.present.graph.nodes.map(node => node.key)).toEqual([nodeId]);
        expect(onClose).toHaveBeenCalledOnce();
    });
});
