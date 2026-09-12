import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../test-utils';
import { exportVideo } from '../../util/video-export';
import VideoExportModal from './video-export-modal';

vi.mock('../../util/video-export', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/video-export')>()),
    exportVideo: vi.fn().mockResolvedValue(new Blob()),
}));
vi.mock('../../util/download', () => ({ downloadBlobAs: vi.fn() }));

describe('VideoExportModal speed setting', () => {
    it('replaces duration with a speed slider and exports using the selected multiplier', async () => {
        window.graph = new MultiDirectedGraph();
        render(
            <ChakraProvider>
                <MemoryRouter>
                    <VideoExportModal isOpen={true} onClose={vi.fn()} />
                </MemoryRouter>
            </ChakraProvider>
        );

        expect(screen.queryByText('Duration (seconds)')).not.toBeInTheDocument();
        expect(screen.getByText('Drawing speed (1.0×)')).toBeInTheDocument();
        const slider = screen.getAllByRole('slider')[0];
        expect(slider).toHaveAttribute('aria-valuemin', '0.5');
        expect(slider).toHaveAttribute('aria-valuemax', '2');
        expect(slider).toHaveAttribute('aria-valuenow', '1');

        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        await waitFor(() => expect(screen.getByText('Drawing speed (1.1×)')).toBeInTheDocument());
        fireEvent.keyDown(slider, { key: 'End' });
        await waitFor(() => expect(screen.getByText('Drawing speed (2.0×)')).toBeInTheDocument());

        fireEvent.click(document.getElementById('agree_terms_video')!);
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        const options = vi.mocked(exportVideo).mock.calls[0][3];
        expect(options.speedMultiplier).toBe(2);
        expect(options.format).toBe('mp4');
        expect(options).not.toHaveProperty('duration');
    });
});
