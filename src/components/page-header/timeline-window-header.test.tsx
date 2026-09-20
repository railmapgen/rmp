// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import i18n from '../../i18n/config';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { TimelineProjectProvider } from '../../timeline/timeline-project-context';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import { createTimelineStore, openProject } from '../../timeline/timeline-store';
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
        expect(screen.getByText('Download Timeline project')).toBeInTheDocument();
        expect(screen.getByText('Export video')).toBeInTheDocument();
        expect(screen.queryByText('Project open in painter')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Rename project'));
        const renameDialog = screen.getByRole('dialog', { name: 'Rename project' });
        expect(within(renameDialog).getByRole('textbox', { name: 'Timeline project name' })).toHaveValue(
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
        expect(screen.queryByRole('button', { name: 'Download Timeline project' })).not.toBeInTheDocument();
        const undo = screen.getByRole('button', { name: 'Undo' });
        const redo = screen.getByRole('button', { name: 'Redo' });
        expect(edit.compareDocumentPosition(undo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(undo).toBeDisabled();
        expect(redo).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    });
});
