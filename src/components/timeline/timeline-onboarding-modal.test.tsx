// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom';
import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageKey } from '../../constants/constants';
import i18n from '../../i18n/config';
import TimelineOnboardingModal from './timeline-onboarding-modal';

const renderModal = (projectId = 'timeline-project') =>
    render(
        <I18nextProvider i18n={i18n}>
            <RmgThemeProvider>
                <TimelineOnboardingModal projectId={projectId} />
            </RmgThemeProvider>
        </I18nextProvider>
    );

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

describe('TimelineOnboardingModal', () => {
    beforeEach(async () => {
        window.localStorage.clear();
        await i18n.changeLanguage('en');
    });

    it('shows both tutorial pages when entering a Timeline project', async () => {
        renderModal();

        const dialog = await screen.findByRole('dialog', { name: /Rail Map Chronicle quick start/ });
        expect(within(dialog).getByText('Insert a complete line section')).toBeInTheDocument();
        expect(within(dialog).getByText('Step 1 of 2')).toBeInTheDocument();
        expect(
            within(dialog).getByAltText(
                'Three-step illustration: select a starting station, choose a line color, then select the destination station to add the route to the timeline'
            )
        ).toHaveAttribute('src', expect.stringContaining('images/timeline-tutorial/add-line.webp'));

        fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));

        expect(within(dialog).getByText('Export your Chronicle video')).toBeInTheDocument();
        expect(within(dialog).getByText('Step 2 of 2')).toBeInTheDocument();
        expect(within(dialog).getByText('Choose “Export video”.')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Previous' }));
        expect(within(dialog).getByText('Insert a complete line section')).toBeInTheDocument();
    });

    it('persists the opt-out choice after the tutorial is completed', async () => {
        const firstRender = renderModal('first-project');
        const dialog = await screen.findByRole('dialog', { name: /Rail Map Chronicle quick start/ });

        fireEvent.click(within(dialog).getByRole('checkbox', { name: "Don't show me again" }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));

        expect(window.localStorage.getItem(LocalStorageKey.TIMELINE_ONBOARDING_DISMISSED)).toBe('true');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /Rail Map Chronicle quick start/ })).not.toBeInTheDocument()
        );

        firstRender.unmount();
        renderModal('second-project');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: /Rail Map Chronicle quick start/ })).not.toBeInTheDocument()
        );
    });

    it('shows the tutorial again on the next project entry when opt-out is not selected', async () => {
        const firstRender = renderModal('first-project');
        const dialog = await screen.findByRole('dialog', { name: /Rail Map Chronicle quick start/ });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

        expect(window.localStorage.getItem(LocalStorageKey.TIMELINE_ONBOARDING_DISMISSED)).toBeNull();
        firstRender.unmount();
        renderModal('second-project');

        expect(await screen.findByRole('dialog', { name: /Rail Map Chronicle quick start/ })).toBeInTheDocument();
    });
});
