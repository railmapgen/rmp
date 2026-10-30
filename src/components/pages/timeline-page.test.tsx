import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../../constants/constants';
import {
    createEmptyTimelineDocument,
    TimelineDocument,
    TimelineEntry,
    TimelineKeyframeEntry,
} from '../../constants/timeline';
import { TimelineOverlayModule, TimelineOverlayRegion } from '../../constants/timeline-overlays';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import { setActiveSubscriptions } from '../../redux/account/account-slice';
import { TimelineProjectRecord } from '../../timeline/timeline-project';
import {
    createTimelineStore,
    openProject,
    replaceTimeline,
    setCursor,
    setVideoOptions,
    undo,
} from '../../timeline/timeline-store';
import type { VideoExportOptions } from '../../util/video-export/video-export';
import TimelinePage from './timeline-page';

const { previewRender, previewPrepare, playbackClock, projectContext, svgContext } = vi.hoisted(() => ({
    previewRender: vi.fn(),
    previewPrepare: vi.fn(),
    playbackClock: vi.fn(),
    projectContext: {
        current: undefined as unknown as ReturnType<
            typeof import('../../timeline/timeline-project-context').useTimelineProjectContext
        >,
    },
    svgContext: {
        current: undefined as unknown as ReturnType<typeof import('../svg-render-context').useSvgRenderContext>,
    },
}));

vi.mock('../../timeline/timeline-project-context', () => ({ useTimelineProjectContext: () => projectContext.current }));
vi.mock('../svg-render-context', () => ({ useSvgRenderContext: () => svgContext.current }));
vi.mock('../../util/hooks', () => ({ useWindowSize: () => ({ width: 1600, height: 900 }) }));
vi.mock('react-i18next', async importOriginal => ({
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../timeline/timeline-track', () => ({ KEYFRAME_ROW_HEIGHT: 20 }));
vi.mock('../timeline/use-timeline-audio-playback', () => ({ useTimelineAudioPlayback: () => undefined }));
vi.mock('../timeline/use-timeline-playback-clock', () => ({ useTimelinePlaybackClock: playbackClock }));
vi.mock('../timeline/timeline-svg-wrapper', () => ({
    default: ({
        isSubscriber,
        onSelect,
        selectedIds,
        visibleIds,
        canvasId,
    }: {
        isSubscriber: boolean;
        onSelect: (id: Id) => void;
        selectedIds?: Set<Id>;
        visibleIds?: Set<Id>;
        canvasId?: string;
    }) => (
        <div
            data-testid={canvasId === 'fixed-resource-preview' ? 'fixed-preview-canvas' : 'timeline-editor'}
            data-subscriber={isSubscriber}
            data-resources={JSON.stringify([...(visibleIds ?? selectedIds ?? [])])}
        >
            {!canvasId && (
                <>
                    <button onClick={() => onSelect('stn_a')}>Select station once</button>
                    <button onClick={() => onSelect('line_a')}>Select line once</button>
                </>
            )}
        </div>
    ),
}));
vi.mock('../timeline/timeline-track-panel', () => ({
    default: ({
        document,
        selectedEntryId,
        playbackTime,
        isPlaying,
        onTogglePlayback,
        onSeek,
        onSelectEntry,
        onEditOverlayModules,
        onEditFixedResources,
        readOnly,
    }: {
        document: TimelineDocument;
        selectedEntryId?: string;
        playbackTime: number;
        isPlaying: boolean;
        onTogglePlayback: () => void;
        onSeek: (time: number) => void;
        onSelectEntry: (entry: TimelineEntry) => void;
        onEditOverlayModules: () => void;
        onEditFixedResources: () => void;
        readOnly: boolean;
    }) => (
        <>
            <button onClick={onTogglePlayback}>{isPlaying ? 'Pause preview' : 'Play preview'}</button>
            <button onClick={onEditOverlayModules}>Edit annotation layout</button>
            <button onClick={onEditFixedResources}>Choose fixed resources</button>
            <span data-testid="track-read-only">{String(readOnly)}</span>
            <button onClick={() => onSeek(17.5)}>Seek preview</button>
            <button onClick={() => onSeek(20)}>Seek to end</button>
            {document.track.map(entry => (
                <button key={entry.id} onClick={() => onSelectEntry(entry)}>
                    {entry.id}
                </button>
            ))}
            <span data-testid="selected-entry">{selectedEntryId}</span>
            <span data-testid="preview-time">{playbackTime}</span>
        </>
    ),
}));
vi.mock('../timeline/timeline-preview', () => ({
    default: ({
        options,
        onTimingChange,
        document,
        editableKeyframe,
        isSubscriber,
        hasExportSubscription,
        previewOverlayModules,
        onPreviewOverlayModuleMove,
        onCancelOverlayModuleMove,
        onMoveOverlayModule,
    }: {
        options: VideoExportOptions;
        onTimingChange: (timing: { duration: number; cursorTimes: number[] }) => void;
        document: TimelineDocument;
        editableKeyframe?: TimelineKeyframeEntry;
        isSubscriber: boolean;
        hasExportSubscription: boolean;
        previewOverlayModules?: TimelineOverlayModule[];
        onPreviewOverlayModuleMove: (id: string, region: TimelineOverlayRegion, index: number) => void;
        onCancelOverlayModuleMove: () => void;
        onMoveOverlayModule: (id: string, region: TimelineOverlayRegion, index: number) => void;
    }) => {
        previewRender(options);
        React.useEffect(() => {
            previewPrepare(options);
            onTimingChange({
                duration: 20,
                cursorTimes: document.track.length
                    ? Array.from(
                          { length: document.track.length + 1 },
                          (_, index) => (index * 20) / document.track.length
                      )
                    : [0, 20],
            });
        }, [options, onTimingChange]);
        return (
            <div
                data-testid="timeline-preview"
                data-editable-keyframe={editableKeyframe?.id}
                data-subscriber={isSubscriber}
                data-export-subscriber={hasExportSubscription}
            >
                <span data-testid="module-preview-region">
                    {previewOverlayModules?.[0]?.region ?? document.overlayModules?.[0]?.region}
                </span>
                <button onClick={() => onPreviewOverlayModuleMove(document.overlayModules![0].id, 'bottom-right', 0)}>
                    Drag module preview
                </button>
                <button onClick={onCancelOverlayModuleMove}>Cancel module drag</button>
                <button onClick={() => onMoveOverlayModule(document.overlayModules![0].id, 'bottom-right', 0)}>
                    Drop module
                </button>
                <button onClick={() => onPreviewOverlayModuleMove(document.overlayModules![0].id, 'top-right', 0)}>
                    Drag module into top right
                </button>
                <button onClick={() => onMoveOverlayModule(document.overlayModules![0].id, 'top-right', 0)}>
                    Drop module into top right
                </button>
            </div>
        );
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
        }
    );
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    projectContext.current = {
        projectId: 'preview-options',
        graph,
        languages: [],
        getAudio: vi.fn().mockResolvedValue(undefined),
        saveAudio: vi.fn().mockResolvedValue(undefined),
    };
    svgContext.current = { graph, getImage: vi.fn().mockResolvedValue(undefined), ensureFont: vi.fn() };
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const renderPage = (track: TimelineEntry[] = []) => {
    const record: TimelineProjectRecord = {
        id: 'preview-options',
        name: 'Preview options',
        version: 2,
        createdAt: 1,
        updatedAt: 1,
        revision: {
            rmpVersion: 80,
            graph: projectContext.current.graph.export(),
            mapEnabled: false,
            mapStyle: structuredClone(DEFAULT_MAP_STYLE),
            svgViewBoxMin: { x: 0, y: 0 },
            svgViewBoxZoom: 100,
            timeline: { ...createEmptyTimelineDocument(), track },
        },
    };
    const store = createTimelineStore();
    store.dispatch(openProject(record));
    store.dispatch(
        setVideoOptions({
            format: 'webm',
            fps: 60,
            resolution: '4k',
            isTransparent: true,
            isSystemFontsOnly: true,
            hideWatermark: false,
        })
    );
    render(
        <ChakraProvider>
            <Provider store={store}>
                <TimelinePage />
            </Provider>
        </ChakraProvider>
    );
    return store;
};

const latestPreviewOptions = () => previewRender.mock.calls.at(-1)![0] as VideoExportOptions;

describe('TimelinePage preview and export isolation', () => {
    it('toggles fixed resources with one click, stages the full-map preview and saves once on Done', () => {
        projectContext.current.graph.addNode('stn_a', { x: 0, y: 0 } as NodeAttributes);
        projectContext.current.graph.addNode('stn_b', { x: 100, y: 0 } as NodeAttributes);
        projectContext.current.graph.addEdgeWithKey('line_a', 'stn_a', 'stn_b', {} as EdgeAttributes);
        const track: TimelineEntry[] = [
            { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
            { id: 'line_a', kind: 'edge', refId: 'line_a', phase: 'enter', showAnimation: true },
            { id: 'key_a', kind: 'keyframe', refId: 'stn_a', x: 50, y: 50 },
        ];
        const store = renderPage(track);
        const original = structuredClone(store.getState().project.active!.revision.timeline);
        const historyLength = store.getState().project.past.length;
        fireEvent.click(screen.getByRole('button', { name: 'Choose fixed resources' }));
        expect(store.getState().runtime.fixedResourceEditing).toBe(true);
        expect(screen.getByTestId('track-read-only').textContent).toBe('true');
        expect(screen.queryByTestId('timeline-preview')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Select station once' }));
        expect(screen.getByTestId('fixed-preview-canvas').getAttribute('data-resources')).toBe('["stn_a"]');
        fireEvent.click(screen.getByRole('button', { name: 'Select station once' }));
        expect(screen.getByTestId('fixed-preview-canvas').getAttribute('data-resources')).toBe('[]');
        fireEvent.click(screen.getByRole('button', { name: 'Select station once' }));
        fireEvent.click(screen.getByRole('button', { name: 'Select line once' }));
        expect(store.getState().project.active!.revision.timeline).toEqual(original);
        expect(store.getState().project.past).toHaveLength(historyLength);
        fireEvent.click(screen.getByRole('button', { name: 'header.timelinePage.fixedResources.done' }));
        const saved = store.getState().project.active!.revision.timeline;
        expect(saved.fixedResources).toEqual(['stn_a', 'line_a']);
        expect(saved.track).toEqual([track[2]]);
        expect(store.getState().project.past).toHaveLength(historyLength + 1);
        expect(store.getState().runtime.fixedResourceEditing).toBe(false);
        expect(screen.getByRole('dialog').textContent).toContain('header.timelinePage.fixedResources.doneNotice');
        expect(screen.getByTestId('track-read-only').textContent).toBe('false');
        expect(screen.getByTestId('timeline-preview')).toBeTruthy();
        act(() => store.dispatch(undo()));
        expect(store.getState().project.active!.revision.timeline).toEqual(original);
    });

    it('previews drag placement without saving, restores cancellation and commits only on drop', () => {
        const store = renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Edit annotation layout' }));
        const original = structuredClone(store.getState().project.active!.revision.timeline);
        const historyLength = store.getState().project.past.length;
        fireEvent.click(screen.getByRole('button', { name: 'Drag module preview' }));
        expect(screen.getByTestId('module-preview-region').textContent).toBe('bottom-right');
        expect(store.getState().project.active!.revision.timeline).toEqual(original);
        expect(store.getState().project.past).toHaveLength(historyLength);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel module drag' }));
        expect(screen.getByTestId('module-preview-region').textContent).toBe('top-left');
        fireEvent.click(screen.getByRole('button', { name: 'Drag module preview' }));
        fireEvent.click(screen.getByRole('button', { name: 'Drop module' }));
        expect(store.getState().project.active!.revision.timeline.overlayModules?.[0].region).toBe('bottom-right');
        expect(store.getState().project.active!.revision.timeline.track).toEqual(original.track);
        expect(store.getState().project.past).toHaveLength(historyLength + 1);
    });

    it('updates both the editor and video preview when Cloud access changes', () => {
        const store = renderPage();
        const expectSubscriber = (subscriber: boolean) => {
            for (const pane of ['timeline-editor', 'timeline-preview']) {
                expect(screen.getByTestId(pane).getAttribute('data-subscriber')).toBe(String(subscriber));
            }
        };

        expectSubscriber(false);
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: true, RMP_EXPORT: false })));
        expectSubscriber(true);
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true })));
        expectSubscriber(false);
        act(() => store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false })));
        expectSubscriber(false);
    });

    it.each([
        { RMP_CLOUD: false, RMP_EXPORT: false },
        { RMP_CLOUD: true, RMP_EXPORT: false },
        { RMP_CLOUD: false, RMP_EXPORT: true },
        { RMP_CLOUD: true, RMP_EXPORT: true },
    ])('keeps line and overlay access independent for %j', subscriptions => {
        const store = renderPage();
        act(() => store.dispatch(setActiveSubscriptions(subscriptions)));
        for (const pane of ['timeline-editor', 'timeline-preview'])
            expect(screen.getByTestId(pane).getAttribute('data-subscriber')).toBe(String(subscriptions.RMP_CLOUD));
        expect(screen.getByTestId('timeline-preview').getAttribute('data-export-subscriber')).toBe(
            String(subscriptions.RMP_EXPORT)
        );

        fireEvent.click(screen.getByRole('button', { name: 'Edit annotation layout' }));
        fireEvent.click(screen.getByRole('button', { name: 'Drag module into top right' }));
        const region = subscriptions.RMP_EXPORT ? 'top-right' : 'top-left';
        expect(screen.getByTestId('module-preview-region').textContent).toBe(region);
        expect(store.getState().project.active!.revision.timeline.overlayModules?.[0].region).toBe('top-left');
        fireEvent.click(screen.getByRole('button', { name: 'Cancel module drag' }));
        fireEvent.click(screen.getByRole('button', { name: 'Drop module into top right' }));
        expect(store.getState().project.active!.revision.timeline.overlayModules?.[0].region).toBe(region);

        fireEvent.click(screen.getByRole('button', { name: 'Choose fixed resources' }));
        expect(screen.getByTestId('fixed-preview-canvas').getAttribute('data-subscriber')).toBe(
            String(subscriptions.RMP_CLOUD)
        );
    });

    it('keeps a fixed 720p/15 FPS preview without a watermark and ignores every export option', () => {
        const store = renderPage();
        const options = latestPreviewOptions();
        expect(options).toMatchObject({ fps: 15, resolution: '720p', hideWatermark: true, isTransparent: false });
        expect(previewPrepare).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));

        act(() =>
            store.dispatch(
                setVideoOptions({
                    format: 'mp4',
                    fps: 30,
                    resolution: '1080p',
                    isTransparent: false,
                    isSystemFontsOnly: false,
                    hideWatermark: true,
                })
            )
        );
        // A runtime cursor update forces the page to render after the export settings changed.
        act(() => store.dispatch(setCursor(1)));
        expect(latestPreviewOptions()).toBe(options);
        expect(previewPrepare).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Pause preview' })).toBeTruthy();

        act(() =>
            store.dispatch(
                setVideoOptions({
                    format: 'webm',
                    fps: 60,
                    resolution: '4k',
                    isTransparent: true,
                    isSystemFontsOnly: true,
                    hideWatermark: false,
                })
            )
        );
        act(() => store.dispatch(setCursor(0)));
        expect(latestPreviewOptions()).toBe(options);
        expect(previewPrepare).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Pause preview' })).toBeTruthy();
    });

    it('applies persisted drawing speed, station behavior and camera zoom to the preview', () => {
        const store = renderPage();
        const initialOptions = latestPreviewOptions();
        const settings = {
            cameraZoom: 8 as const,
            speedMultiplier: 1.8,
            autoChangeStationType: false,
        };
        act(() => store.dispatch(replaceTimeline({ ...store.getState().project.active!.revision.timeline, settings })));
        expect(latestPreviewOptions()).not.toBe(initialOptions);
        expect(latestPreviewOptions()).toMatchObject({ ...settings, fps: 15, resolution: '720p', hideWatermark: true });
        expect(previewPrepare).toHaveBeenCalledTimes(2);
        const previous = latestPreviewOptions();
        act(() =>
            store.dispatch(
                replaceTimeline({
                    ...store.getState().project.active!.revision.timeline,
                    settings: { ...settings, cameraZoom: 16 },
                })
            )
        );
        expect(latestPreviewOptions()).not.toBe(previous);
        expect(latestPreviewOptions()).toMatchObject({
            ...settings,
            cameraZoom: 16,
            fps: 15,
            resolution: '720p',
            hideWatermark: true,
        });
        expect(previewPrepare).toHaveBeenCalledTimes(3);
    });

    it.each(['clip_a', 'key_a'])(
        'preserves %s and the insertion cursor when seeking, playing and restarting',
        selectedEntryId => {
            projectContext.current.graph.addNode('stn_a', {} as NodeAttributes);
            const track: TimelineEntry[] = [
                { id: 'clip_a', kind: 'node', refId: 'stn_a', phase: 'enter', showAnimation: true },
                { id: 'key_a', kind: 'keyframe', refId: 'stn_a', x: 0, y: 0 },
            ];
            const store = renderPage(track);
            // A selected graph element and a selected timeline card both stay untouched.
            fireEvent.click(screen.getByRole('button', { name: 'clip_a' }));
            fireEvent.click(screen.getByRole('button', { name: selectedEntryId }));
            const insertionIndex = store.getState().runtime.cursor;
            const selected = store.getState().runtime.selected;
            const expectSelection = () => {
                expect(screen.getByTestId('selected-entry').textContent).toBe(selectedEntryId);
                expect(store.getState().runtime.cursor).toBe(insertionIndex);
                expect(store.getState().runtime.selected).toBe(selected);
                if (selectedEntryId === 'key_a')
                    expect(screen.getByTestId('timeline-preview').getAttribute('data-editable-keyframe')).toBe('key_a');
            };
            fireEvent.click(screen.getByRole('button', { name: 'Seek preview' }));
            expect(screen.getByTestId('preview-time').textContent).toBe('17.5');
            expectSelection();
            fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
            act(() => playbackClock.mock.calls.at(-1)![0].onTick(18));
            expect(screen.getByTestId('preview-time').textContent).toBe('18');
            expectSelection();
            fireEvent.click(screen.getByRole('button', { name: 'Seek to end' }));
            fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
            expect(screen.getByTestId('preview-time').textContent).toBe('0');
            expectSelection();
        }
    );
});
