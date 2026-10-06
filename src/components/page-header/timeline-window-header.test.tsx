// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import i18n from '../../i18n/config';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { TimelineProjectProvider } from '../../timeline/timeline-project-context';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import { createTimelineStore, openProject, setCursor } from '../../timeline/timeline-store';
import { createTestLineGraph } from '../../test-utils';
import { CURRENT_VERSION } from '../../util/save';
import TimelineWindowHeader from './timeline-window-header';

vi.mock('./video-export-modal', () => ({ default: () => null }));
vi.mock('./about-modal', () => ({ default: () => null }));

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
afterEach(() => {
    cleanup();
    localStorage.removeItem(LocalStorageKey.PARAM);
});

const makeProject = (): TimelineProjectRecord => ({
    id: 'header-project',
    name: 'Header project',
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    revision: {
        rmpVersion: 79,
        graph: new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export(),
        mapEnabled: false,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: 100,
        svgViewBoxMin: { x: 0, y: 0 },
        timeline: createEmptyTimelineDocument(),
    },
});

describe('TimelineWindowHeader', () => {
    it('inserts Label without a selected station and supports project undo and redo', async () => {
        await i18n.changeLanguage('en');
        const project = makeProject();
        project.revision.timeline.track = [
            { id: 'p1', kind: 'pause', position: 'after', duration: 1 },
            { id: 'p2', kind: 'pause', position: 'after', duration: 2 },
        ];
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const store = createTimelineStore();
        store.dispatch(openProject(project));
        store.dispatch(setCursor(1));
        render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectProvider projectId={project.id} graph={graph} revision={project.revision}>
                            <TimelineWindowHeader />
                        </TimelineProjectProvider>
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );
        fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
        fireEvent.click(await screen.findByText('Label'));
        const timeline = store.getState().project.active!.revision.timeline;
        expect(timeline.track).toEqual(project.revision.timeline.track);
        expect(timeline.labelTrack).toHaveLength(1);
        expect(timeline.labelTrack![0]).toMatchObject({
            kind: 'label',
            text: 'Label',
            startSlot: 1,
            endSlot: 2,
            duration: 15,
        });
        expect(store.getState().runtime.cursor).toBe(1);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(store.getState().project.active!.revision.timeline.labelTrack).toBeUndefined();
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        expect(store.getState().project.active!.revision.timeline.labelTrack).toEqual(timeline.labelTrack);
    });
    it.each([true, false])('applies the import choice for painter and local RMP sources (apply=%s)', async apply => {
        await i18n.changeLanguage('en');
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        graph.getAttribute('lineDefinitions')![0].exportStartStationId = 'stn_C';
        const project = makeProject();
        project.id = `header-sync-${apply}`;
        project.revision.graph = graph.export();
        project.revision.timeline.track = [
            { id: 'manual-entry', kind: 'node', refId: 'stn_A', phase: 'enter', showAnimation: false },
        ];
        const source = JSON.stringify({ version: CURRENT_VERSION, graph: graph.export() });
        localStorage.setItem(LocalStorageKey.PARAM, source);
        const store = createTimelineStore();
        store.dispatch(openProject(project));
        const { container } = render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectProvider projectId={project.id} graph={graph} revision={project.revision}>
                            <TimelineWindowHeader />
                        </TimelineProjectProvider>
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Files' }));
        fireEvent.click(screen.getByText('Import RMP data'));
        if (apply) {
            fireEvent.click(await screen.findByText('Project open in painter'));
        } else {
            fireEvent.click(await screen.findByText('Local configuration file'));
            const file = new File([source], 'rmp.json', { type: 'application/json' });
            Object.defineProperty(file, 'text', { value: async () => source });
            fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
        }
        const dialog = await screen.findByRole('dialog', { name: 'Import RMP data' });
        const choice = within(dialog).getByRole('checkbox', { name: 'Populate timeline from line information' });
        if (!apply) fireEvent.click(choice);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Import RMP data' }));

        await waitFor(() => expect(store.getState().project.past).toHaveLength(1));
        expect(store.getState().project.active!.revision.timeline.track.map(entry => entry.refId)).toEqual(
            apply ? ['stn_C', 'line_1', 'stn_B', 'line_0', 'stn_A'] : ['stn_A']
        );
        if (!apply) expect(store.getState().project.active!.revision.timeline.track[0].id).toBe('manual-entry');
    });

    it('puts project file actions before Insert and keeps undo, redo and zoom controls on the right side', async () => {
        await i18n.changeLanguage('en');
        const store = createTimelineStore();
        const project = makeProject();
        const graph = MultiDirectedGraph.from(project.revision.graph) as MultiDirectedGraph<
            NodeAttributes,
            EdgeAttributes,
            GraphAttributes
        >;
        store.dispatch(openProject(project));

        render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectProvider projectId={project.id} graph={graph} revision={project.revision}>
                            <TimelineWindowHeader />
                        </TimelineProjectProvider>
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );

        const files = screen.getByRole('button', { name: 'Files' });
        const insert = screen.getByRole('button', { name: 'Insert' });
        expect(files.compareDocumentPosition(insert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        fireEvent.click(files);
        expect(screen.getByText('Back to main menu')).toBeInTheDocument();
        expect(screen.getByText('Rename project')).toBeInTheDocument();
        expect(screen.getByText('Download Chronicle project')).toBeInTheDocument();
        expect(screen.getByText('Export video')).toBeInTheDocument();
        expect(screen.queryByText('Project open in painter')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Rename project'));
        const renameDialog = screen.getByRole('dialog', { name: 'Rename project' });
        expect(within(renameDialog).getByRole('textbox', { name: 'Chronicle project name' })).toHaveValue(
            'Header project'
        );
        fireEvent.click(within(renameDialog).getByRole('button', { name: 'Cancel' }));

        fireEvent.click(files);
        fireEvent.click(screen.getByText('Import RMP data'));
        expect(files).toHaveAttribute('aria-expanded', 'true');
        expect(await screen.findByText('Project open in painter')).toBeInTheDocument();
        expect(screen.getByText('Local configuration file')).toBeInTheDocument();
        expect(screen.getByText('Back to main menu')).toBeInTheDocument();

        fireEvent.click(files);
        expect(files).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(insert);
        expect(insert).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Audio')).toBeInTheDocument();
        expect(screen.getByText('Keyframe')).toBeInTheDocument();
        fireEvent.click(insert);

        const edit = screen.getByRole('button', { name: 'Edit' });
        fireEvent.click(edit);
        expect(edit).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Show animation')).toBeInTheDocument();

        expect(screen.queryByRole('button', { name: 'Timeline projects' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sync from RMP' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Download Chronicle project' })).not.toBeInTheDocument();
        const undo = screen.getByRole('button', { name: 'Undo' });
        const redo = screen.getByRole('button', { name: 'Redo' });
        expect(edit.compareDocumentPosition(undo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(undo).toBeDisabled();
        expect(redo).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    });
});
