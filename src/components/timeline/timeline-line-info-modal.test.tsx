// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import i18n from '../../i18n/config';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { createStore } from '../../redux';
import { initializeProject } from '../../redux/param/param-slice';
import { createTestLineGraph } from '../../test-utils';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import { timelineProjectDB } from '../../timeline/timeline-project-db';
import { exportTimelineProjectFile, importTimelineProjectFile } from '../../timeline/timeline-project-io';
import { closeProject, initTimelineStore, openProject, redo, timelineStore, undo } from '../../timeline/timeline-store';
import { getVideoLineAnnotation } from '../../util/video-overlay';
import TimelineLineInfoModal from './timeline-line-info-modal';

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
const previousPainterGraph = window.graph;
let previousPainterSource: string | null;
const projectIds: string[] = [];

const makeProject = (graph: Graph): TimelineProjectRecord => ({
    id: `timeline-label-test-${Date.now()}-${Math.random()}`,
    name: 'Video labels',
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    revision: {
        rmpVersion: 80,
        graph: graph.export(),
        mapEnabled: false,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: 100,
        svgViewBoxMin: { x: 0, y: 0 },
        timeline: createEmptyTimelineDocument(),
    },
});

const setup = async (withoutLines = false) => {
    window.graph = createTestLineGraph([['A', 'B']]);
    const line = window.graph.getAttribute('lineDefinitions')![0];
    line.name = ['导入线路', 'Imported Line'];
    line.openingDate = '1990-01-01';
    line.lineNumber = '1';
    const painterStore = createStore();
    painterStore.dispatch(
        initializeProject({ ...painterStore.getState().param.present, graph: window.graph.export() })
    );
    const painterSnapshot = window.graph.export();
    localStorage.setItem(LocalStorageKey.PARAM, JSON.stringify(painterSnapshot));
    const project = makeProject(window.graph);
    if (withoutLines) delete project.revision.graph.attributes.lineDefinitions;
    projectIds.push(project.id);
    await timelineProjectDB.createProject(project, []);
    await initTimelineStore();
    timelineStore.dispatch(openProject(project));
    const onClose = vi.fn();
    render(
        <I18nextProvider i18n={i18n}>
            <Provider store={timelineStore}>
                <RmgThemeProvider>
                    <TimelineLineInfoModal isOpen onClose={onClose} />
                </RmgThemeProvider>
            </Provider>
        </I18nextProvider>
    );
    return { project, painterStore, painterSnapshot, onClose };
};

const saveField = (name: string, value: string) => {
    const input = screen.getByRole('textbox', { name });
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
};
const currentLine = () => timelineStore.getState().project.active!.revision.graph.attributes.lineDefinitions![0];

beforeEach(async () => {
    await i18n.changeLanguage('en');
    previousPainterSource = localStorage.getItem(LocalStorageKey.PARAM);
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

afterEach(async () => {
    cleanup();
    timelineStore.dispatch(closeProject());
    for (const id of projectIds.splice(0)) await timelineProjectDB.deleteProject(id);
    window.graph = previousPainterGraph;
    if (previousPainterSource === null) localStorage.removeItem(LocalStorageKey.PARAM);
    else localStorage.setItem(LocalStorageKey.PARAM, previousPainterSource);
    vi.unstubAllGlobals();
});

describe('Timeline video label information', () => {
    it('autosaves isolated label metadata, persists it, and leaves both painter and imported map data intact', async () => {
        const { project, painterStore, painterSnapshot } = await setup();
        const painterState = structuredClone(painterStore.getState().param.present);
        saveField('Chinese name', '视频线路');
        saveField('English name', 'Video Line');
        saveField('Opening date', '2024-02-29');
        saveField('Line number', 'V1');
        saveField('Label color', '#0088cc');
        expect(currentLine().videoLabel).toEqual({
            name: ['视频线路', 'Video Line'],
            openingDate: '2024-02-29',
            lineNumber: 'V1',
            color: '#0088cc',
        });
        expect(currentLine()).toMatchObject({
            name: ['导入线路', 'Imported Line'],
            openingDate: '1990-01-01',
            lineNumber: '1',
        });
        const active = timelineStore.getState().project.active!;
        expect(active.revision.graph.edges).toEqual(painterSnapshot.edges);
        expect(getVideoLineAnnotation(MultiDirectedGraph.from(active.revision.graph) as Graph, 'line_0')).toEqual({
            name: ['视频线路', 'Video Line'],
            year: '2024',
            monthDay: '02-29',
            color: '#0088cc',
        });
        expect(window.graph.export()).toEqual(painterSnapshot);
        expect(painterStore.getState().param.present).toEqual(painterState);
        expect(localStorage.getItem(LocalStorageKey.PARAM)).toBe(JSON.stringify(painterSnapshot));
        await waitFor(async () =>
            expect((await timelineProjectDB.getProject(project.id))?.revision.graph).toEqual(active.revision.graph)
        );
        const imported = await importTimelineProjectFile(await exportTimelineProjectFile(active));
        projectIds.push(imported.id);
        expect(imported.revision.graph.attributes.lineDefinitions![0].videoLabel).toEqual(currentLine().videoLabel);
    });

    it('supports undo, redo and restoring imported labels without changing the global label switches', async () => {
        await setup();
        const settings = structuredClone(timelineStore.getState().project.active!.revision.timeline.settings);
        saveField('Chinese name', 'Temporary video name');
        expect(currentLine().videoLabel?.name[0]).toBe('Temporary video name');
        act(() => timelineStore.dispatch(undo()));
        expect(screen.getByRole('textbox', { name: 'Chinese name' })).toHaveValue('导入线路');
        expect(currentLine().videoLabel).toBeUndefined();
        act(() => timelineStore.dispatch(redo()));
        expect(screen.getByRole('textbox', { name: 'Chinese name' })).toHaveValue('Temporary video name');
        fireEvent.click(
            screen.getByRole('button', { name: 'Use imported line information: 导入线路 / Imported Line' })
        );
        expect(currentLine().videoLabel).toBeUndefined();
        expect(screen.getByRole('textbox', { name: 'Opening date' })).toHaveValue('1990-01-01');
        expect(timelineStore.getState().project.active!.revision.timeline.settings).toEqual(settings);
        act(() => timelineStore.dispatch(undo()));
        expect(currentLine().videoLabel?.name[0]).toBe('Temporary video name');
    });

    it('rejects invalid dates and colors and saves a focused draft when closing', async () => {
        const { onClose } = await setup();
        saveField('Opening date', '2025-02-29');
        expect(currentLine().videoLabel).toBeUndefined();
        expect(screen.getByText('Enter a valid date in YYYY-MM-DD format.')).toBeInTheDocument();
        saveField('Label color', 'blue');
        expect(currentLine().videoLabel).toBeUndefined();
        expect(screen.getByText('Enter a valid hexadecimal color, such as #1677ff.')).toBeInTheDocument();
        const name = screen.getByRole('textbox', { name: 'Chinese name' });
        act(() => name.focus());
        fireEvent.change(name, { target: { value: 'Saved on close' } });
        fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
        expect(currentLine().videoLabel?.name[0]).toBe('Saved on close');
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('explains the empty state without generating or changing imported line definitions', async () => {
        await setup(true);
        expect(
            screen.getByText(
                'No line information is available. Import an RMP project with line definitions to customize its video labels.'
            )
        ).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(timelineStore.getState().project.active!.revision.graph.attributes.lineDefinitions).toBeUndefined();
    });
});
