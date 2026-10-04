import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { undoAction } from '../../redux/project-history';
import { initializeProject, saveGraph } from '../../redux/param/param-slice';
import { createTestLineGraph, render } from '../../test-utils';
import { exportToRmg } from '../../util/to-rmg';
import { LineInfoModal } from './line-info-modal';
import { LineIntervalModal } from './line-interval-modal';
import { ToRmgModal } from './rmp-to-rmg';

vi.mock('../../util/to-rmg', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/to-rmg')>()),
    exportToRmg: vi.fn(),
}));

const setup = (
    connections: [string, string][] = [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'],
    ],
    virtual: string[] = []
) => {
    window.graph = createTestLineGraph(connections, virtual);
    const store = createStore();
    store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
    return store;
};

describe('line information and export panels', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
        vi.mocked(exportToRmg).mockClear();
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

    it('saves metadata on blur, selections immediately, and the focused field on close', () => {
        const store = setup();
        const close = vi.fn();
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={close} />
            </RmgThemeProvider>,
            { store }
        );
        const name = screen.getByRole('textbox', { name: 'Chinese name' });
        fireEvent.change(name, { target: { value: '一号线' } });
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].name[0]).toBe('');
        fireEvent.blur(name);
        fireEvent.change(screen.getByLabelText('Opening date'), { target: { value: '2026-10-03' } });
        fireEvent.blur(screen.getByLabelText('Opening date'));
        expect(screen.getByRole('combobox', { name: 'Operating status' })).toHaveValue('operating');
        fireEvent.change(screen.getByRole('combobox', { name: 'Operating status' }), {
            target: { value: 'construction' },
        });
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].status).toBe('construction');
        const notes = screen.getByRole('textbox', { name: 'Notes' });
        notes.focus();
        fireEvent.change(notes, { target: { value: 'Saved on close' } });
        fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
        expect(close).toHaveBeenCalledOnce();
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0]).toMatchObject({
            name: ['一号线', ''],
            openingDate: '2026-10-03',
            status: 'construction',
            notes: 'Saved on close',
        });
    });

    it('previews with keyboard rings and commits exactly one history entry', () => {
        const store = setup();
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        expect(screen.queryByRole('button', { name: 'A — E' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Adjust interval: A — E' }));
        expect(screen.getByRole('button', { name: 'Separate' })).toBeDisabled();
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Start' }), { key: 'ArrowRight' });
        fireEvent.keyDown(screen.getByRole('slider', { name: 'End' }), { key: 'ArrowLeft' });
        expect(store.getState().param.past).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Separate' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Separate' }));
        expect(store.getState().param.past).toHaveLength(1);
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toHaveLength(3);
    });

    it('shows the full branch structure and moves a different branch onto the editable path before separating', () => {
        const store = setup([
            ['A', 'B'],
            ['B', 'C'],
            ['B', 'D'],
            ['D', 'E'],
        ]);
        const before = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Adjust interval: A — C / E' }));
        const diagram = screen.getByLabelText('Line interval and branches');
        expect(diagram.querySelectorAll('[data-station-id]')).toHaveLength(5);
        expect(diagram.querySelector('[data-station-id="stn_E"]')).toHaveAttribute('data-on-route', 'false');
        expect(diagram.querySelectorAll('path[data-branch-edges]')).toHaveLength(2);
        fireEvent.change(screen.getByRole('combobox', { name: 'Path end' }), { target: { value: 'stn_E' } });
        expect(diagram.querySelector('[data-station-id="stn_E"]')).toHaveAttribute('data-on-route', 'true');
        expect(diagram.querySelector('[data-station-id="stn_C"]')).toHaveAttribute('data-on-route', 'false');
        fireEvent.keyDown(screen.getByRole('slider', { name: 'End' }), { key: 'ArrowLeft' });
        expect(store.getState().param.present.graph).toEqual(before);
        fireEvent.click(screen.getByRole('button', { name: 'Separate' }));
        const after = store.getState().param.present.graph;
        expect(after.attributes.lineDefinitions![0].edgeIds).toEqual(['line_0', 'line_2']);
        expect(after.nodes).toEqual(before.nodes);
        expect(after.edges).toEqual(before.edges);
        expect(store.getState().param.past).toHaveLength(1);
    });

    it('keeps an unfinished field draft when a sibling field is saved', () => {
        const store = setup();
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        const operator = screen.getByRole('textbox', { name: 'Operator' });
        fireEvent.change(operator, { target: { value: 'Metro operator' } });
        act(() => {
            const lines = structuredClone(window.graph.getAttribute('lineDefinitions')!);
            lines[0].name = ['New name', ''];
            window.graph.setAttribute('lineDefinitions', lines);
            store.dispatch(saveGraph(window.graph.export()));
        });
        expect(operator).toHaveValue('Metro operator');
        fireEvent.blur(operator);
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].operator).toBe('Metro operator');
    });

    it('moves a separated line to unassigned with × and assigns it directly to a connected line', () => {
        const store = setup();
        const before = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Adjust interval: A — E' }));
        expect(screen.queryByRole('combobox', { name: 'Interval action' })).not.toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Start' }), { key: 'ArrowRight' });
        fireEvent.keyDown(screen.getByRole('slider', { name: 'End' }), { key: 'ArrowLeft' });
        fireEvent.click(screen.getByRole('button', { name: 'Separate' }));
        const leftId = store.getState().param.present.graph.attributes.lineDefinitions![1].id;
        fireEvent.click(screen.getByRole('button', { name: 'Move line to unassigned: B — D' }));
        expect(store.getState().param.present.graph.attributes.unassignedLineEdgeIds).toEqual(['line_1', 'line_2']);
        expect(store.getState().param.past).toHaveLength(2);
        expect(screen.queryByRole('dialog', { name: 'Edit line interval' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Adjust interval: B — D' })).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox', { name: 'Assign to: B — D' }), { target: { value: leftId } });
        expect(store.getState().param.present.graph.attributes.unassignedLineEdgeIds).toEqual(['line_1', 'line_2']);
        fireEvent.click(screen.getByRole('button', { name: 'Assign: B — D' }));
        const after = store.getState().param.present.graph;
        expect(after.attributes.unassignedLineEdgeIds).toEqual([]);
        expect(after.attributes.lineDefinitions!.find(item => item.id === leftId)!.edgeIds).toEqual([
            'line_0',
            'line_1',
            'line_2',
        ]);
        expect(screen.queryByText('Unassigned intervals', { exact: true })).not.toBeInTheDocument();
        expect(after.nodes).toEqual(before.nodes);
        expect(after.edges).toEqual(before.edges);
        expect(store.getState().param.past).toHaveLength(3);
    });

    it('hides lines with fewer than two stations and lists unsupported lines without setting fields at the bottom', () => {
        const store = setup(
            [
                ['V', 'A'],
                ['X', 'Y'],
                ['B', 'C'],
                ['C', 'D'],
                ['C', 'E'],
                ['C', 'F'],
                ['P', 'Q'],
            ],
            ['V']
        );
        const [single, normal, branch] = store.getState().param.present.graph.attributes.lineDefinitions!;
        window.graph.getAttribute('lineDefinitions')![0].name = ['补齐线路', ''];
        store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Move line to unassigned: P — Q' }));
        const unavailable = screen.getByRole('region', { name: 'Complex lines' });
        expect(screen.queryByTestId(`line-info-${single.id}`)).not.toBeInTheDocument();
        expect(within(unavailable).getByTestId(`line-info-${branch.id}`)).toBeInTheDocument();
        expect(within(unavailable).queryByTestId(`line-info-${normal.id}`)).not.toBeInTheDocument();
        expect(screen.queryByText('At least two stations are required to export this line.')).not.toBeInTheDocument();
        expect(within(unavailable).getByText(/RMG cannot represent/)).toBeInTheDocument();
        expect(within(unavailable).queryByRole('textbox')).not.toBeInTheDocument();
        expect(within(unavailable).queryByRole('combobox')).not.toBeInTheDocument();
        expect(within(unavailable).getByRole('button', { name: /^Adjust interval:/ })).toBeEnabled();
        expect(within(unavailable).getByRole('button', { name: /^Move line to unassigned:/ })).toBeEnabled();
        expect(screen.getByTestId(`line-info-${normal.id}`).compareDocumentPosition(unavailable)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING
        );
        expect(screen.getByText('Unassigned intervals', { exact: true }).compareDocumentPosition(unavailable)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING
        );
        act(() => {
            const station = structuredClone(window.graph.getNodeAttributes('stn_A'));
            station.x += 200;
            window.graph.addNode('stn_S', station);
            window.graph.addDirectedEdgeWithKey(
                'line_new',
                'misc_node_V',
                'stn_S',
                structuredClone(window.graph.getEdgeAttributes('line_0'))
            );
            store.dispatch(saveGraph(window.graph.export()));
        });
        expect(within(unavailable).queryByTestId(`line-info-${single.id}`)).not.toBeInTheDocument();
        expect(
            within(screen.getByTestId(`line-info-${single.id}`)).getByRole('textbox', { name: 'Chinese name' })
        ).toHaveValue('补齐线路');
        expect(screen.queryByText('At least two stations are required to export this line.')).not.toBeInTheDocument();
    });

    it('assigns an entire removed branch from the parent panel without selecting a path', () => {
        const store = setup([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['C', 'E'],
            ['B', 'F'],
        ]);
        const before = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: /^Move line to unassigned:/ }));
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toEqual([]);
        expect(store.getState().param.present.graph.attributes.unassignedLineEdgeIds).toEqual(
            before.attributes.lineDefinitions![0].edgeIds
        );
        expect(screen.getByRole('combobox', { name: /^Assign to:/ })).toHaveValue('new');
        fireEvent.click(screen.getByRole('button', { name: /^Assign:/ }));
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toHaveLength(1);
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].edgeIds).toEqual(
            before.attributes.lineDefinitions![0].edgeIds
        );
        expect(store.getState().param.present.graph.attributes.unassignedLineEdgeIds).toEqual([]);
        expect(store.getState().param.present.graph.nodes).toEqual(before.nodes);
        expect(store.getState().param.present.graph.edges).toEqual(before.edges);
        expect(store.getState().param.past).toHaveLength(2);
    });

    it('undoes × removal and restores the original line and settings', async () => {
        const store = setup();
        const before = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Move line to unassigned: A — E' }));
        expect(store.getState().param.present.graph.attributes.lineDefinitions).toEqual([]);
        expect(screen.getByRole('button', { name: 'Assign: A — E' })).toBeEnabled();
        await act(() => store.dispatch(undoAction()));
        expect(store.getState().param.present.graph).toEqual(before);
        expect(screen.getByRole('button', { name: 'Adjust interval: A — E' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Assign: A — E' })).not.toBeInTheDocument();
    });

    it('rejects impossible dates and saves a valid leap-day date', () => {
        const store = setup();
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        const date = screen.getByRole('textbox', { name: 'Opening date' });
        fireEvent.change(date, { target: { value: '2026-02-30' } });
        fireEvent.blur(date);
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].openingDate).toBe('');
        expect(screen.getByText('Enter a valid date in YYYY-MM-DD format.')).toBeInTheDocument();
        fireEvent.change(date, { target: { value: '2024-02-29' } });
        fireEvent.blur(date);
        expect(store.getState().param.present.graph.attributes.lineDefinitions![0].openingDate).toBe('2024-02-29');
    });

    it('cancels a dragged preview without changing the project', () => {
        const store = setup();
        const before = store.getState().param.present;
        render(
            <RmgThemeProvider>
                <LineInfoModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.click(screen.getByRole('button', { name: 'Adjust interval: A — E' }));
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Start' }), { key: 'ArrowRight' });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(store.getState().param.present).toEqual(before);
        expect(store.getState().param.past).toHaveLength(0);
    });

    it('snaps touch pointer movement to stations without committing it', () => {
        class TestPointerEvent extends MouseEvent {
            readonly pointerId: number;
            readonly pointerType: string;
            constructor(type: string, options: PointerEventInit = {}) {
                super(type, options);
                this.pointerId = options.pointerId ?? 1;
                this.pointerType = options.pointerType ?? 'touch';
            }
        }
        vi.stubGlobal('PointerEvent', TestPointerEvent);
        const store = setup();
        const graph = store.getState().param.present.graph;
        render(
            <RmgThemeProvider>
                <LineIntervalModal
                    graph={graph}
                    line={graph.attributes.lineDefinitions![0]}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />
            </RmgThemeProvider>,
            { store }
        );
        const handle = screen.getByRole('slider', { name: 'Start' });
        vi.spyOn(handle.closest('svg')!, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 480,
            height: 210,
            right: 480,
            bottom: 210,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });
        fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 40 });
        fireEvent.pointerMove(handle, { pointerId: 1, pointerType: 'touch', clientX: 141 });
        fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'touch' });
        expect(handle).toHaveAttribute('aria-valuenow', '1');
        expect(screen.getByRole('button', { name: 'Separate' })).toBeEnabled();
        expect(store.getState().param.past).toHaveLength(0);
    });

    it('switches to the complementary loop arc for the same endpoint pair', () => {
        const store = setup([
            ['A', 'B'],
            ['B', 'C'],
            ['C', 'D'],
            ['D', 'A'],
        ]);
        const graph = store.getState().param.present.graph;
        const split = vi.fn();
        render(
            <RmgThemeProvider>
                <LineIntervalModal
                    graph={graph}
                    line={graph.attributes.lineDefinitions![0]}
                    onClose={vi.fn()}
                    onApply={split}
                />
            </RmgThemeProvider>,
            { store }
        );
        fireEvent.keyDown(screen.getByRole('slider', { name: 'End' }), { key: 'ArrowLeft' });
        fireEvent.keyDown(screen.getByRole('slider', { name: 'End' }), { key: 'ArrowLeft' });
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Start' }), { key: 'ArrowRight' });
        fireEvent.click(screen.getByRole('button', { name: 'Select the other arc' }));
        fireEvent.click(screen.getByRole('button', { name: 'Separate' }));
        const result = split.mock.calls[0][0];
        expect(result.attributes.lineDefinitions[0].edgeIds).toEqual(['line_0', 'line_2', 'line_3']);
    });

    it('shows a read-only export list and downloads one synced configuration immediately', () => {
        const store = setup();
        const line = window.graph.getAttribute('lineDefinitions')![0];
        line.name = ['一号线', 'Line One'];
        line.lineNumber = '1';
        line.exportStartStationId = 'stn_E';
        store.dispatch(initializeProject({ ...store.getState().param.present, graph: window.graph.export() }));
        render(
            <RmgThemeProvider>
                <ToRmgModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Download line 一号线 / Line One' }));
        expect(exportToRmg).toHaveBeenCalledOnce();
        expect(vi.mocked(exportToRmg).mock.calls[0][0]).toMatchObject({
            line_name: ['一号线', 'Line One'],
            line_num: '1',
            current_stn_idx: 'stn_E',
        });
        expect(screen.queryByText('Please select a starting station and click it.')).not.toBeInTheDocument();
    });

    it('puts unsupported lines last while preserving the order and downloads of exportable lines', () => {
        const store = setup([
            ['A', 'B'],
            ['B', 'C'],
            ['B', 'D'],
            ['B', 'E'],
            ['X', 'Y'],
            ['Y', 'Z'],
            ['M', 'N'],
        ]);
        render(
            <RmgThemeProvider>
                <ToRmgModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        const [first, second, unavailable] = screen.getAllByRole('button', { name: /Download line/ });
        expect(first).toHaveAccessibleName('Download line X — Z');
        expect(second).toHaveAccessibleName('Download line M — N');
        expect(first).toBeEnabled();
        expect(second).toBeEnabled();
        expect(unavailable).toBeDisabled();
        expect(screen.getByText(/RMG cannot represent/)).toBeInTheDocument();
        fireEvent.click(unavailable);
        expect(exportToRmg).not.toHaveBeenCalled();
        fireEvent.click(first);
        expect(vi.mocked(exportToRmg).mock.calls[0][0].current_stn_idx).toBe('stn_X');
    });

    it('updates the export list immediately when persisted metadata changes', () => {
        const store = setup();
        render(
            <RmgThemeProvider>
                <ToRmgModal isOpen onClose={vi.fn()} />
            </RmgThemeProvider>,
            { store }
        );
        act(() => {
            const lines = structuredClone(window.graph.getAttribute('lineDefinitions')!);
            lines[0].name = ['更新线路', 'Updated Line'];
            window.graph.setAttribute('lineDefinitions', lines);
            store.dispatch(saveGraph(window.graph.export()));
        });
        fireEvent.click(screen.getByRole('button', { name: 'Download line 更新线路 / Updated Line' }));
        expect(vi.mocked(exportToRmg).mock.calls[0][0].line_name).toEqual(['更新线路', 'Updated Line']);
    });
});
