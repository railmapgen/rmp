import { RmgThemeProvider } from '@railmapgen/rmg-components';
import { MultiDirectedGraph } from 'graphology';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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

    it('clears the running state when preparing the SVG fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.mocked(makeRenderReadySVGElement).mockRejectedValue(new Error('Map export failed'));

        render(
            <RmgThemeProvider>
                <DownloadActions />
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
    });
});
