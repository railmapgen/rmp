import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { MultiDirectedGraph } from 'graphology';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import { makeRenderReadySVGElement } from '../../util/download';
import { testExportCanvasSize } from '../../util/export-canvas';
import DownloadActions from './download-actions';

vi.mock('../../util/download', async importOriginal => {
    const actual = await importOriginal<typeof import('../../util/download')>();
    return {
        ...actual,
        makeRenderReadySVGElement: vi.fn(),
    };
});

vi.mock('../../util/export-canvas', async importOriginal => {
    const actual = await importOriginal<typeof import('../../util/export-canvas')>();
    return {
        ...actual,
        testExportCanvasSize: vi.fn(),
    };
});

describe('DownloadActions', () => {
    beforeEach(() => {
        window.graph = new MultiDirectedGraph();
        HTMLElement.prototype.scrollTo = vi.fn();
        vi.mocked(testExportCanvasSize).mockResolvedValue(true);
        vi.mocked(makeRenderReadySVGElement).mockReset();
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

    it.each([
        [false, '200'],
        [true, '400'],
    ])('uses the mapEnabled=%s image scale default of %s%%', async (mapEnabled, expectedScale) => {
        const initialParam = createStore().getState().param;
        const testStore = createStore({
            param: {
                ...initialParam,
                present: { ...initialParam.present, mapEnabled },
            },
        });

        render(
            <RmgThemeProvider>
                <MemoryRouter>
                    <DownloadActions />
                </MemoryRouter>
            </RmgThemeProvider>,
            { store: testStore }
        );

        fireEvent.click(document.querySelector<HTMLButtonElement>('#menu-button-download')!);
        fireEvent.click(await screen.findByText('Export image'));
        await waitFor(() => expect(testExportCanvasSize).toHaveBeenCalledOnce());

        const scaleField = screen.getByRole('group', { name: 'Scale' });
        expect(within(scaleField).getByRole('combobox')).toHaveValue(expectedScale);
    });

    it('clears the running state when preparing the SVG fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.mocked(makeRenderReadySVGElement).mockRejectedValue(new Error('Map export failed'));

        render(
            <RmgThemeProvider>
                <MemoryRouter>
                    <DownloadActions />
                </MemoryRouter>
            </RmgThemeProvider>,
            { store: createStore() }
        );

        fireEvent.click(document.querySelector<HTMLButtonElement>('#menu-button-download')!);
        fireEvent.click(await screen.findByText('Export image'));
        await waitFor(() => expect(testExportCanvasSize).toHaveBeenCalledOnce());

        const agreeTerms = document.querySelector<HTMLInputElement>('#agree_terms');
        expect(agreeTerms).not.toBeNull();
        fireEvent.click(agreeTerms!);

        const downloadButton = document.querySelector<HTMLButtonElement>('#download_button');
        expect(downloadButton).not.toBeNull();
        await waitFor(() => expect(downloadButton).toBeEnabled());

        fireEvent.click(downloadButton!);

        await waitFor(() => expect(makeRenderReadySVGElement).toHaveBeenCalledOnce());
        await waitFor(() => expect(downloadButton).toBeEnabled());
        expect(consoleError).toHaveBeenCalledWith('Failed to export image', expect.any(Error));
    }, 10_000);

    it('sizes the PNG canvas from prepared SVG geometry after fonts have loaded', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        vi.mocked(makeRenderReadySVGElement).mockResolvedValue({ elem, width: 123.25, height: 78.5 });

        render(
            <RmgThemeProvider>
                <MemoryRouter>
                    <DownloadActions />
                </MemoryRouter>
            </RmgThemeProvider>,
            { store: createStore() }
        );

        fireEvent.click(document.querySelector<HTMLButtonElement>('#menu-button-download')!);
        fireEvent.click(await screen.findByText('Export image'));
        await waitFor(() => expect(testExportCanvasSize).toHaveBeenCalledOnce());
        fireEvent.click(document.querySelector<HTMLInputElement>('#agree_terms')!);
        const downloadButton = document.querySelector<HTMLButtonElement>('#download_button')!;
        await waitFor(() => expect(downloadButton).toBeEnabled());
        fireEvent.click(downloadButton);

        await waitFor(() => expect(getContext).toHaveBeenCalledOnce());
        const canvas = getContext.mock.contexts[0] as HTMLCanvasElement;
        expect(canvas.width).toBe(247);
        expect(canvas.height).toBe(157);
        await waitFor(() => expect(downloadButton).toBeEnabled());
    }, 10_000);
});
