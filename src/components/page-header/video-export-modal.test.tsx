import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { render } from '../../test-utils';
import { TimelineProjectProvider } from '../../timeline/timeline-project-context';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import { createTimelineStore, openProject, setVideoOptions } from '../../timeline/timeline-store';
import { exportVideo } from '../../util/video-export';
import VideoExportModal from './video-export-modal';

vi.mock('../../util/video-export', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/video-export')>()),
    exportVideo: vi.fn().mockResolvedValue(new Blob()),
}));
vi.mock('../../util/download', () => ({ downloadBlobAs: vi.fn() }));

describe('VideoExportModal Timeline settings', () => {
    it('exports saved Timeline settings using independently selected export options', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const record: TimelineProjectRecord = {
            id: 'video-export-test',
            name: 'Video export test',
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
                timeline: {
                    ...createEmptyTimelineDocument(),
                    settings: {
                        cameraZoom: 8,
                        speedMultiplier: 1.7,
                        autoChangeStationType: false,
                        showYear: true,
                        showLineName: true,
                        showLineLength: true,
                        lineLengthUnit: 'mi',
                    },
                },
            },
        };
        const store = createTimelineStore();
        store.dispatch(openProject(record));
        store.dispatch(
            setVideoOptions({
                format: 'webm',
                resolution: '720p',
                fps: 30,
                isTransparent: true,
                isSystemFontsOnly: true,
                hideWatermark: false,
            })
        );
        render(
            <ChakraProvider>
                <Provider store={store}>
                    <MemoryRouter>
                        <TimelineProjectProvider projectId={record.id} graph={graph} revision={record.revision}>
                            <VideoExportModal isOpen={true} onClose={vi.fn()} />
                        </TimelineProjectProvider>
                    </MemoryRouter>
                </Provider>
            </ChakraProvider>
        );

        expect(screen.queryByText('Duration (seconds)')).not.toBeInTheDocument();
        expect(screen.queryByText(/Drawing speed/)).not.toBeInTheDocument();
        expect(screen.queryByText('Automatically switch basic and interchange stations')).not.toBeInTheDocument();
        expect(screen.queryByText('Viewport settings')).not.toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Zoom' })).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getAllByRole('slider')).toHaveLength(1);
        fireEvent.change(screen.getByRole('combobox', { name: 'Frames per second (FPS)' }), {
            target: { value: '60' },
        });
        fireEvent.change(screen.getByRole('combobox', { name: 'Video resolution' }), { target: { value: '1080p' } });
        await waitFor(() =>
            expect(store.getState().runtime.videoOptions).toMatchObject({ fps: 60, resolution: '1080p' })
        );
        const format = screen.getByRole('combobox', { name: 'Video format' });
        expect(format).toHaveValue('webm');
        expect(screen.getByRole('checkbox', { name: 'Transparency' })).toBeChecked();
        fireEvent.change(format, { target: { value: 'mp4' } });
        await waitFor(() =>
            expect(store.getState().runtime.videoOptions).toMatchObject({ format: 'mp4', isTransparent: false })
        );
        fireEvent.click(document.getElementById('agree_terms_video')!);
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        const options = vi.mocked(exportVideo).mock.calls[0][3];
        expect(options.speedMultiplier).toBe(1.7);
        expect(options.autoChangeStationType).toBe(false);
        expect(options.showYear).toBe(true);
        expect(options.showLineName).toBe(true);
        expect(options.showLineLength).toBe(true);
        expect(options.lineLengthUnit).toBe('mi');
        expect(vi.mocked(exportVideo).mock.calls[0][1].settings?.cameraZoom).toBe(8);
        expect(options).not.toHaveProperty('scale');
        expect(options).not.toHaveProperty('fullscreenScale');
        expect(store.getState().runtime.videoOptions).not.toHaveProperty('cameraZoom');
        expect(options.resolution).toBe('1080p');
        expect(options.fps).toBe(60);
        expect(options.isSystemFontsOnly).toBe(true);
        expect(options.format).toBe('mp4');
        expect(options.isTransparent).toBe(false);
        expect(options.hideWatermark).toBe(false);
        expect(options).not.toHaveProperty('duration');
    });
});
