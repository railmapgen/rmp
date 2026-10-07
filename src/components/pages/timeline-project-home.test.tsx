// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LocalStorageKey } from '../../constants/constants';
import { createTestLineGraph } from '../../test-utils';
import { CURRENT_VERSION } from '../../util/save';
import i18n from '../../i18n/config';
import { createTimelineStore, setLastProjectId, setProjects } from '../../timeline/timeline-store';
import TimelineProjectHome from './timeline-project-home';

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

describe('TimelineProjectHome', () => {
    it.each([true, false])('waits for the RMP import choice before opening a project (apply=%s)', async apply => {
        await i18n.changeLanguage('en');
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        graph.getAttribute('lineDefinitions')![0].exportStartStationId = 'stn_C';
        localStorage.setItem(
            LocalStorageKey.PARAM,
            JSON.stringify({ version: CURRENT_VERSION, graph: graph.export() })
        );
        const store = createTimelineStore();
        render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectHome />
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Start from current RMP project' }));
        const dialog = await screen.findByRole('dialog', { name: 'Import RMP data' });
        expect(store.getState().project.active).toBeUndefined();
        const choice = within(dialog).getByRole('checkbox', { name: 'Populate timeline from line information' });
        expect(choice).toBeChecked();
        if (!apply) fireEvent.click(choice);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Import RMP data' }));

        await waitFor(() => expect(store.getState().project.active).toBeDefined());
        expect(store.getState().project.active!.revision.timeline.track.map(entry => entry.refId)).toEqual(
            apply ? ['stn_C', 'line_1', 'stn_B', 'line_0', 'stn_A'] : []
        );
    });

    it('localizes the main actions and uses Chakra dialogs for project rename and deletion', async () => {
        await i18n.changeLanguage('en');
        const store = createTimelineStore();
        store.dispatch(
            setProjects([
                {
                    id: 'project-1',
                    name: 'Test project',
                    version: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            ])
        );
        store.dispatch(setLastProjectId('project-1'));

        render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectHome />
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );

        const continueEditing = screen.getByRole('button', { name: 'Continue editing' });
        const startFromRmp = screen.getByRole('button', { name: 'Start from current RMP project' });
        expect(continueEditing.compareDocumentPosition(startFromRmp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Import Chronicle project' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Import RMP' })).not.toBeInTheDocument();
        const updatedAt = screen.getByText(/^Updated /);
        expect(updatedAt).not.toHaveTextContent('&#x2F;');
        expect(updatedAt).toHaveTextContent('/');

        fireEvent.click(screen.getByRole('button', { name: 'Rename project' }));
        const renameDialog = screen.getByRole('dialog', { name: 'Rename project' });
        expect(within(renameDialog).getByRole('textbox', { name: 'Chronicle project name' })).toHaveValue(
            'Test project'
        );
        fireEvent.click(within(renameDialog).getByRole('button', { name: 'Cancel' }));

        fireEvent.click(screen.getByRole('button', { name: 'Delete Chronicle project' }));
        const deleteDialog = screen.getByRole('alertdialog', { name: 'Delete Chronicle project' });
        expect(within(deleteDialog).getByText('Delete Chronicle project “Test project”?')).toBeInTheDocument();
    });

    it('arranges action buttons in a responsive stack container', async () => {
        await i18n.changeLanguage('en');
        const store = createTimelineStore();
        store.dispatch(
            setProjects([
                {
                    id: 'p1',
                    name: 'Project 1',
                    version: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            ])
        );
        store.dispatch(setLastProjectId('p1'));

        render(
            <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                    <RmgThemeProvider>
                        <TimelineProjectHome />
                    </RmgThemeProvider>
                </Provider>
            </I18nextProvider>
        );

        const actions = screen.getByTestId('timeline-home-actions');
        expect(actions).toBeInTheDocument();
        const buttons = within(actions).getAllByRole('button');
        expect(buttons).toHaveLength(3);
        expect(buttons[0]).toHaveTextContent('Continue editing');
        expect(buttons[1]).toHaveTextContent('Start from current RMP project');
        expect(buttons[2]).toHaveTextContent('Import Chronicle project');
    });
});
