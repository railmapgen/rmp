import { ChakraProvider } from '@chakra-ui/react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { createEmptyTimelineDocument } from '../../constants/timeline';
import { createTimelineOverlayModule } from '../../constants/timeline-overlays';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import i18n from '../../i18n/config';
import { ActiveSubscriptions, setActiveSubscriptions } from '../../redux/account/account-slice';
import { createTestLineGraph, render } from '../../test-utils';
import { TimelineProjectProvider } from '../../timeline/timeline-project-context';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import { createTimelineStore, openProject, replaceTimeline, setVideoOptions } from '../../timeline/timeline-store';
import { exportVideo } from '../../util/video-export/video-export';
import {
    downloadVideoExportResult,
    prepareVideoExportDestination,
    VideoExportStorageError,
} from '../../util/video-export/video-export-destination';
import { linePaths, lineStyles } from '../svgs/lines/lines';
import VideoExportModal from './video-export-modal';

vi.mock('../../util/video-export/video-export', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/video-export/video-export')>()),
    exportVideo: vi.fn(),
}));
vi.mock('../../util/video-export/video-export-destination', async importOriginal => ({
    ...(await importOriginal<typeof import('../../util/video-export/video-export-destination')>()),
    prepareVideoExportDestination: vi.fn(),
    downloadVideoExportResult: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exportVideo).mockResolvedValue({ kind: 'memory-blob', blob: new Blob(['video']) });
    vi.mocked(prepareVideoExportDestination).mockResolvedValue(vi.fn());
});

const renderDefaultModal = (
    graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>(),
    mapEnabled = false,
    subscriptions: ActiveSubscriptions = { RMP_CLOUD: false, RMP_EXPORT: false },
    videoOptions?: Parameters<typeof setVideoOptions>[0]
) => {
    const record: TimelineProjectRecord = {
        id: 'video-export-result-test',
        name: 'Video export test',
        version: 2,
        createdAt: 1,
        updatedAt: 1,
        revision: {
            rmpVersion: 80,
            graph: graph.export(),
            mapEnabled,
            mapStyle: structuredClone(DEFAULT_MAP_STYLE),
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
            timeline: createEmptyTimelineDocument(),
        },
    };
    const store = createTimelineStore();
    store.dispatch(openProject(record));
    store.dispatch(setActiveSubscriptions(subscriptions));
    if (videoOptions) store.dispatch(setVideoOptions(videoOptions));
    const view = render(
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
    fireEvent.click(document.getElementById('agree_terms_video')!);
    return { store, ...view };
};

describe('VideoExportModal Timeline settings', () => {
    it('exports saved Timeline settings using independently selected export options', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const record: TimelineProjectRecord = {
            id: 'video-export-test',
            name: 'Video export test',
            version: 2,
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
                    overlayModules: [
                        createTimelineOverlayModule('date', 'top-left', 'date'),
                        createTimelineOverlayModule('line-identity', 'top-left', 'identity'),
                        {
                            ...createTimelineOverlayModule('line-length', 'bottom-left', 'length'),
                            settings: { scope: 'network', unit: 'mi' },
                        },
                    ],
                    settings: {
                        cameraZoom: 8,
                        speedMultiplier: 1.7,
                        autoChangeStationType: false,
                    },
                },
            },
        };
        const store = createTimelineStore();
        store.dispatch(openProject(record));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true }));
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
        expect(vi.mocked(exportVideo).mock.calls[0][1].overlayModules).toEqual(record.revision.timeline.overlayModules);
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
        expect(vi.mocked(exportVideo).mock.calls[0][7]).toMatchObject({
            destinationFactory: expect.any(Function),
            signal: expect.any(AbortSignal),
        });
        expect(downloadVideoExportResult).toHaveBeenCalledExactlyOnceWith(
            expect.stringMatching(/^Timeline_\d+\.mp4$/),
            await vi.mocked(exportVideo).mock.results[0].value
        );
    });
});

describe('VideoExportModal subscription policy', () => {
    it('checks only rendered lines when fixed resources replace whole-project fallback playback', async () => {
        const graph = createTestLineGraph([['A', 'B']]);
        graph.replaceEdgeAttributes('line_0', {
            type: LinePathType.Bezier,
            [LinePathType.Bezier]: structuredClone(linePaths[LinePathType.Bezier].defaultAttrs),
            style: LineStyleType.GzmtrVirtualInt,
            [LineStyleType.GzmtrVirtualInt]: structuredClone(lineStyles[LineStyleType.GzmtrVirtualInt].defaultAttrs),
            visible: true,
            zIndex: 0,
            reconcileId: '',
            parallelIndex: -1,
        });
        const { store } = renderDefaultModal(graph);
        const timeline = store.getState().project.active!.revision.timeline;
        const button = () => document.getElementById('video_export_button')!;
        expect(button()).toBeDisabled();
        act(() => store.dispatch(replaceTimeline({ ...timeline, fixedResources: ['stn_A'] })));
        expect(button()).toBeEnabled();
        act(() => store.dispatch(replaceTimeline({ ...timeline, fixedResources: ['line_0'] })));
        expect(button()).toBeDisabled();
        act(() =>
            store.dispatch(
                replaceTimeline({
                    ...timeline,
                    fixedResources: ['stn_A'],
                    track: [{ id: 'line', kind: 'edge', refId: 'line_0', phase: 'enter', showAnimation: true }],
                })
            )
        );
        expect(button()).toBeDisabled();
        act(() => store.dispatch(replaceTimeline({ ...timeline, fixedResources: ['stn_A'] })));
        expect(button()).toBeEnabled();
        fireEvent.click(button());
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        expect(vi.mocked(exportVideo).mock.calls[0][1].fixedResources).toEqual(['stn_A']);
    });

    it('preserves saved top-right modules, blocks non-subscriber export and unlocks when subscribed or moved', async () => {
        const { store } = renderDefaultModal();
        await waitFor(() => expect(document.getElementById('agree_terms_video')).toBeInTheDocument());
        const module = createTimelineOverlayModule('date', 'top-right', 'subscriber-date');
        const timeline = store.getState().project.active!.revision.timeline;
        act(() => store.dispatch(replaceTimeline({ ...timeline, overlayModules: [module] })));
        expect(document.getElementById('agree_terms_video')).toBeChecked();
        const button = () => document.getElementById('video_export_button')!;
        expect(button()).toBeDisabled();
        fireEvent.click(button());
        expect(exportVideo).not.toHaveBeenCalled();
        expect(prepareVideoExportDestination).not.toHaveBeenCalled();
        expect(store.getState().project.active!.revision.timeline.overlayModules).toEqual([module]);
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true })));
        await waitFor(() => expect(button()).not.toBeDisabled());
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false })));
        expect(button()).toBeDisabled();
        act(() =>
            store.dispatch(replaceTimeline({ ...timeline, overlayModules: [{ ...module, region: 'bottom-right' }] }))
        );
        expect(button()).not.toBeDisabled();
        fireEvent.click(button());
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
    });

    it('shows the line restriction tooltip only while a line is unavailable', async () => {
        const { store, unmount } = renderDefaultModal(createTestLineGraph([['A', 'B']]));
        const exportTrigger = document.getElementById('video_export_button')!.parentElement!;
        fireEvent.pointerOver(exportTrigger);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Some line combinations cannot be displayed in the current map or normal mode.'
        );
        expect(screen.getByRole('tooltip')).toHaveTextContent('Proceed Signal');

        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true })));
        expect(screen.getByRole('tooltip')).toHaveTextContent(
            'Some line combinations cannot be displayed in the current map or normal mode.'
        );
        expect(document.getElementById('video_export_button')).toBeDisabled();

        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: false })));
        await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
        fireEvent.pointerLeave(exportTrigger);
        await act(async () => {
            fireEvent.pointerOver(exportTrigger);
            await new Promise(resolve => setTimeout(resolve, 0));
        });
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        unmount();
        renderDefaultModal();
        const unrestrictedButton = document.getElementById('video_export_button')!;
        for (const acceptsTerms of [true, false]) {
            if (!acceptsTerms) fireEvent.click(document.getElementById('agree_terms_video')!);
            expect(unrestrictedButton).toHaveProperty('disabled', !acceptsTerms);
            await act(async () => {
                fireEvent.pointerOver(unrestrictedButton.parentElement!);
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
            fireEvent.pointerLeave(unrestrictedButton.parentElement!);
        }
    });

    it.each([
        { type: LinePathType.Bezier, style: LineStyleType.GzmtrVirtualInt, mapEnabled: false },
        { type: LinePathType.Diagonal, style: LineStyleType.SingleColor, mapEnabled: true },
    ])('requires Cloud access for $type / $style when mapEnabled=$mapEnabled', async ({ type, style, mapEnabled }) => {
        const graph = createTestLineGraph([['A', 'B']]);
        graph.replaceEdgeAttributes('line_0', {
            type,
            [type]: structuredClone(linePaths[type].defaultAttrs),
            style,
            [style]: structuredClone(lineStyles[style].defaultAttrs),
            visible: true,
            zIndex: 0,
            reconcileId: '',
            parallelIndex: -1,
        });
        const { store } = renderDefaultModal(graph, mapEnabled);
        const warning = i18n.t('header.download.videoExport.unavailableLines');
        const exportButton = document.getElementById('video_export_button')!;

        expect(screen.getByText(warning)).toBeInTheDocument();
        expect(
            within(screen.getByText(warning).closest('[role="alert"]')!).getByText('Proceed Signal')
        ).toBeInTheDocument();
        expect(exportButton).toBeDisabled();
        fireEvent.click(exportButton);
        expect(exportVideo).not.toHaveBeenCalled();

        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true })));

        expect(screen.getByText(warning)).toBeInTheDocument();
        expect(exportButton).toBeDisabled();
        fireEvent.click(exportButton);
        expect(exportVideo).not.toHaveBeenCalled();

        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: false })));

        expect(screen.queryByText(warning)).not.toBeInTheDocument();
        expect(exportButton).toBeEnabled();
        fireEvent.click(exportButton);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        expect(vi.mocked(exportVideo).mock.calls[0][6]).toMatchObject({
            isSubscriber: true,
            hasExportSubscription: false,
            mapEnabled,
        });
        await waitFor(() => expect(downloadVideoExportResult).toHaveBeenCalledOnce());

        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true })));

        expect(screen.getByText(warning)).toBeInTheDocument();
        expect(exportButton).toBeDisabled();
        fireEvent.click(exportButton);
        expect(exportVideo).toHaveBeenCalledOnce();
    });
});

describe('VideoExportModal output limits', () => {
    const fpsSelect = () => screen.getByRole('combobox', { name: 'Frames per second (FPS)' });
    const resolutionSelect = () => screen.getByRole('combobox', { name: 'Video resolution' });
    const shareCheckbox = () => document.getElementById('share_info_video')!;
    const highQualityOptions = {
        format: 'webm' as const,
        resolution: '4k' as const,
        fps: 60,
        hideWatermark: true,
        isTransparent: true,
        isSystemFontsOnly: true,
    };

    it.each([
        { RMP_CLOUD: false, RMP_EXPORT: false },
        { RMP_CLOUD: true, RMP_EXPORT: false },
        { RMP_CLOUD: false, RMP_EXPORT: true },
        { RMP_CLOUD: true, RMP_EXPORT: true },
    ])('applies output access independently with %j', async subscriptions => {
        const { store } = renderDefaultModal(undefined, false, subscriptions, highQualityOptions);
        const hasExportSubscription = subscriptions.RMP_EXPORT;
        const expectedOptions = hasExportSubscription
            ? highQualityOptions
            : { ...highQualityOptions, resolution: '1080p', fps: 30, hideWatermark: false };
        expect(fpsSelect()).toHaveValue(String(expectedOptions.fps));
        expect(resolutionSelect()).toHaveValue(expectedOptions.resolution);
        expect(shareCheckbox()).toHaveProperty('checked', hasExportSubscription);
        expect(shareCheckbox()).toHaveProperty('disabled', !hasExportSubscription);
        expect(within(fpsSelect()).getByRole('option', { name: '60 FPS' })).toHaveProperty(
            'disabled',
            !hasExportSubscription
        );
        for (const name of ['2K (2560×1440)', '4K (3840×2160)']) {
            expect(within(resolutionSelect()).getByRole('option', { name })).toHaveProperty(
                'disabled',
                !hasExportSubscription
            );
        }
        expect(within(resolutionSelect()).getByRole('option', { name: '1080p (1920×1080)' })).toBeEnabled();
        expect(screen.getAllByText('Stop and Proceed')).toHaveLength(3);
        await waitFor(() => expect(store.getState().runtime.videoOptions).toEqual(expectedOptions));
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        expect(vi.mocked(exportVideo).mock.calls[0][3]).toMatchObject(expectedOptions);
        expect(vi.mocked(exportVideo).mock.calls[0][6]).toMatchObject({
            isSubscriber: subscriptions.RMP_CLOUD,
            hasExportSubscription,
        });
    });

    it('immediately downgrades current settings and lets a restored subscriber select them again', async () => {
        const { store } = renderDefaultModal(
            undefined,
            false,
            { RMP_CLOUD: true, RMP_EXPORT: true },
            highQualityOptions
        );
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: false })));
        expect(fpsSelect()).toHaveValue('30');
        expect(resolutionSelect()).toHaveValue('1080p');
        expect(shareCheckbox()).not.toBeChecked();
        expect(shareCheckbox()).toBeDisabled();
        await waitFor(() =>
            expect(store.getState().runtime.videoOptions).toMatchObject({
                fps: 30,
                resolution: '1080p',
                hideWatermark: false,
            })
        );
        fireEvent.change(fpsSelect(), { target: { value: '60' } });
        fireEvent.change(resolutionSelect(), { target: { value: '4k' } });
        expect(fpsSelect()).toHaveValue('30');
        expect(resolutionSelect()).toHaveValue('1080p');
        expect(shareCheckbox()).not.toBeChecked();
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: true })));
        expect(fpsSelect()).toHaveValue('30');
        expect(resolutionSelect()).toHaveValue('1080p');
        fireEvent.change(fpsSelect(), { target: { value: '60' } });
        fireEvent.change(resolutionSelect(), { target: { value: '4k' } });
        fireEvent.click(shareCheckbox());
        await waitFor(() => expect(store.getState().runtime.videoOptions).toEqual(highQualityOptions));
    });

    it.each(['720p', '1080p'] as const)('retains a permitted %s selection', async resolution => {
        const { store } = renderDefaultModal(undefined, false, undefined, {
            ...highQualityOptions,
            resolution,
            fps: 30,
            hideWatermark: false,
        });
        expect(resolutionSelect()).toHaveValue(resolution);
        await waitFor(() => expect(store.getState().runtime.videoOptions?.resolution).toBe(resolution));
    });
});

describe('VideoExportModal save lifecycle', () => {
    it('treats save picker cancellation as cancellation without starting the renderer', async () => {
        vi.mocked(prepareVideoExportDestination).mockRejectedValueOnce(new DOMException('Canceled', 'AbortError'));
        const { store } = renderDefaultModal();
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(document.getElementById('video_export_button')).not.toHaveAttribute('data-loading'));
        expect(exportVideo).not.toHaveBeenCalled();
        expect(store.getState().project.error).toBeUndefined();
    });

    it('cancels the active export through its AbortSignal without reporting a failure', async () => {
        vi.mocked(exportVideo).mockImplementationOnce(
            (...args) =>
                new Promise((_resolve, reject) => {
                    const signal = args[7]?.signal;
                    signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
                })
        );
        const { store } = renderDefaultModal();
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument());
        expect(vi.mocked(exportVideo).mock.calls[0][7]?.signal?.aborted).toBe(true);
        expect(store.getState().project.error).toBeUndefined();
        expect(downloadVideoExportResult).not.toHaveBeenCalled();
    });

    it('includes the actionable storage limit in the export error', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(exportVideo).mockRejectedValueOnce(new VideoExportStorageError('Video exceeds the 64 MiB limit'));
        const { store } = renderDefaultModal();
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(store.getState().project.error).toContain('64 MiB'));
        expect(store.getState().project.error).toContain('Video export failed');
        log.mockRestore();
    });

    it('aborts an export when its modal is unmounted', async () => {
        vi.mocked(exportVideo).mockImplementationOnce(() => new Promise(() => {}));
        const { unmount } = renderDefaultModal();
        fireEvent.click(document.getElementById('video_export_button')!);
        await waitFor(() => expect(exportVideo).toHaveBeenCalledOnce());
        const signal = vi.mocked(exportVideo).mock.calls[0][7]?.signal;
        unmount();
        expect(signal?.aborted).toBe(true);
    });
});
