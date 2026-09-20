// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

describe('TimelineProjectHome', () => {
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
        expect(screen.getByRole('button', { name: 'Import Timeline project' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Import RMP' })).not.toBeInTheDocument();
        const updatedAt = screen.getByText(/^Updated /);
        expect(updatedAt).not.toHaveTextContent('&#x2F;');
        expect(updatedAt).toHaveTextContent('/');

        fireEvent.click(screen.getByRole('button', { name: 'Rename project' }));
        const renameDialog = screen.getByRole('dialog', { name: 'Rename project' });
        expect(within(renameDialog).getByRole('textbox', { name: 'Timeline project name' })).toHaveValue(
            'Test project'
        );
        fireEvent.click(within(renameDialog).getByRole('button', { name: 'Cancel' }));

        fireEvent.click(screen.getByRole('button', { name: 'Delete Timeline project' }));
        const deleteDialog = screen.getByRole('alertdialog', { name: 'Delete Timeline project' });
        expect(within(deleteDialog).getByText('Delete Timeline project “Test project”?')).toBeInTheDocument();
    });
});
