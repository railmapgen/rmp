import { Alert, AlertIcon, Box, Button, Flex, Spinner, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineDocument, TimelineKeyframeEntry, TimelineLabelEntry } from '../../constants/timeline';
import {
    getTimelineOverlayModules,
    TimelineOverlayModule,
    TimelineOverlayRegion,
} from '../../constants/timeline-overlays';
import { MapStyle } from '../../map/map-style';
import { TimelineGraph } from '../../timeline/timeline-project-context';
import { TextLanguage } from '../../util/fonts';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { createVideoPreviewRenderer, VideoExportOptions } from '../../util/video-export/video-export';
import {
    getEmptyTimelineOverlayLayout,
    type TimelineOverlayLayoutItem,
} from '../../util/video-export/video-overlay-modules';
import { fitVideoPreviewFrame } from './timeline-preview-layout';
import TimelineOverlayCanvasControls from './timeline-overlay-canvas-controls';

interface TimelinePreviewProps {
    document: TimelineDocument;
    graph: TimelineGraph;
    languages: TextLanguage[];
    time: number;
    options: VideoExportOptions;
    mapEnabled: boolean;
    isSubscriber: boolean;
    mapStyle: MapStyle;
    svgViewBoxMin: { x: number; y: number };
    svgViewBoxZoom: number;
    onTimingChange: (timing: TimelinePlaybackTiming | undefined) => void;
    getImage?: (id: string) => Promise<string | undefined>;
    editableKeyframe?: TimelineKeyframeEntry;
    onKeyframeMove: (entryId: string, x: number, y: number) => void;
    overlayEditing?: boolean;
    selectedOverlayModuleId?: string;
    onSelectOverlayModule?: (id: string) => void;
    onAddOverlayModule?: (region: TimelineOverlayRegion) => void;
    onMoveOverlayModule?: (id: string, region: TimelineOverlayRegion, index: number) => void;
    previewOverlayModules?: readonly TimelineOverlayModule[];
    onPreviewOverlayModuleMove?: (id: string, region: TimelineOverlayRegion, index: number) => void;
    onCancelOverlayModuleMove?: () => void;
}

/** Display the same prepared SVG frames that the video encoder consumes. */
export default function TimelinePreview({
    document: timeline,
    graph,
    languages,
    time,
    options,
    mapEnabled,
    isSubscriber,
    mapStyle,
    svgViewBoxMin,
    svgViewBoxZoom,
    onTimingChange,
    getImage,
    editableKeyframe,
    onKeyframeMove,
    overlayEditing = false,
    selectedOverlayModuleId,
    onSelectOverlayModule,
    onAddOverlayModule,
    onMoveOverlayModule,
    previewOverlayModules,
    onPreviewOverlayModuleMove,
    onCancelOverlayModuleMove,
}: TimelinePreviewProps) {
    const { t } = useTranslation();
    const hasVisualResources = timeline.track.length > 0 || (timeline.fixedResources?.length ?? 0) > 0;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const latestTime = React.useRef(time);
    latestTime.current = time;
    const latestKeyframe = React.useRef(editableKeyframe);
    latestKeyframe.current = editableKeyframe;
    const editableKeyframeKey = JSON.stringify(editableKeyframe);
    const requestRenderRef = React.useRef<(force?: boolean) => void>(() => {});
    const latestLabels = React.useRef(timeline.labelTrack);
    latestLabels.current = timeline.labelTrack;
    const updateLabelsRef = React.useRef<(labels: readonly TimelineLabelEntry[]) => void>(() => {});
    const overlayKey = JSON.stringify(previewOverlayModules ?? getTimelineOverlayModules(timeline));
    const modules = React.useMemo(
        () => [...(previewOverlayModules ?? getTimelineOverlayModules(timeline))],
        [overlayKey]
    );
    const latestModules = React.useRef(modules);
    latestModules.current = modules;
    const latestEditing = React.useRef(overlayEditing);
    latestEditing.current = overlayEditing;
    const updateModulesRef = React.useRef<(modules: readonly TimelineOverlayModule[]) => void>(() => {});
    const updateEditingRef = React.useRef<(editing: boolean) => void>(() => {});
    const [overlayLayout, setOverlayLayout] = React.useState<TimelineOverlayLayoutItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string>();
    const [reload, setReload] = React.useState(0);
    const dragRef = React.useRef<
        | {
              pointerId: number;
              origin: { x: number; y: number };
              entry: TimelineKeyframeEntry;
              group: SVGElement;
              transform: string;
              delta: { x: number; y: number };
          }
        | undefined
    >(undefined);
    const areaRef = React.useRef<HTMLDivElement>(null);
    const [frameSize, setFrameSize] = React.useState<ReturnType<typeof fitVideoPreviewFrame>>();
    React.useEffect(() => {
        if (!areaRef.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const next = fitVideoPreviewFrame(entry.contentRect.width, entry.contentRect.height);
            setFrameSize(current => (current?.width === next.width && current.height === next.height ? current : next));
        });
        observer.observe(areaRef.current);
        return () => observer.disconnect();
    }, []);
    // Audio edits do not rebuild the visual schedule or its geometry.
    const visualKey = React.useMemo(
        () =>
            JSON.stringify({
                version: timeline.version,
                track: timeline.track,
                fixedResources: timeline.fixedResources,
                settings: timeline.settings,
            }),
        [timeline.version, timeline.track, timeline.fixedResources, timeline.settings]
    );
    const visualDocument = React.useMemo(
        () => ({
            version: timeline.version,
            track: timeline.track,
            fixedResources: timeline.fixedResources,
            settings: timeline.settings,
        }),
        [visualKey]
    );

    React.useEffect(() => {
        const preparationController = new AbortController();
        let cancelled = false;
        let pending = false;
        let forcePending = false;
        let rendering = false;
        let renderedFrame: number | undefined;
        let renderedKeyframe: string | undefined;
        let renderer: Awaited<ReturnType<typeof createVideoPreviewRenderer>> | undefined;
        let unsubscribeLayout: (() => void) | undefined;
        setLoading(true);
        setError(undefined);
        onTimingChange(undefined);
        const frameIndex = (time: number) =>
            Math.max(
                0,
                Math.min(
                    Math.max(0, Math.round((renderer?.duration ?? 0) * options.fps) - 1),
                    Math.floor((Number.isFinite(time) ? time : 0) * options.fps + 1e-6)
                )
            );
        const keyframeOverrideAt = (time: number) => {
            const keyframe = latestKeyframe.current;
            if (!keyframe || latestEditing.current || !renderer) return undefined;
            const index = visualDocument.track.findIndex(entry => entry.id === keyframe.id);
            const anchor = renderer.cursorTimes[index];
            return anchor !== undefined && Math.abs(time - anchor) < 1e-6 ? keyframe : undefined;
        };
        const renderLatest = async (force = false) => {
            pending = true;
            forcePending ||= force;
            if (rendering || !renderer || dragRef.current) return;
            rendering = true;
            try {
                while (pending && !cancelled) {
                    pending = false;
                    const requestedTime = latestTime.current;
                    const requestedFrame = frameIndex(requestedTime);
                    const keyframeOverride = keyframeOverrideAt(requestedTime);
                    const requestedKeyframe = JSON.stringify(keyframeOverride);
                    const forceFrame = forcePending;
                    forcePending = false;
                    if (!forceFrame && requestedFrame === renderedFrame && requestedKeyframe === renderedKeyframe)
                        continue;
                    let frame: SVGSVGElement;
                    try {
                        frame = await renderer.renderPreviewFrame(
                            requestedTime,
                            keyframeOverride
                                ? { ...(forceFrame ? { force: true } : {}), keyframeOverride }
                                : forceFrame
                                  ? { force: true }
                                  : undefined
                        );
                    } catch (cause) {
                        if (requestedFrame !== frameIndex(latestTime.current)) {
                            renderedFrame = undefined;
                            forcePending = true;
                            pending = true;
                            continue;
                        }
                        throw cause;
                    }
                    if (cancelled) break;
                    // The renderer may have updated an already mounted scene before resolving.
                    // Track that frame even when a newer seek makes this result obsolete.
                    renderedFrame = requestedFrame;
                    renderedKeyframe = requestedKeyframe;
                    if (dragRef.current) {
                        pending = true;
                        forcePending = true;
                        break;
                    }
                    if (
                        requestedFrame !== frameIndex(latestTime.current) ||
                        requestedKeyframe !== JSON.stringify(keyframeOverrideAt(latestTime.current)) ||
                        forcePending
                    ) {
                        pending = true;
                        continue;
                    }
                    const nextLayout = renderer.getOverlayLayout?.() ?? [];
                    setOverlayLayout(current =>
                        JSON.stringify(current) === JSON.stringify(nextLayout) ? current : nextLayout
                    );
                    const container = containerRef.current;
                    if (container && frame.parentNode !== container) {
                        frame.removeAttribute('id');
                        frame.style.width = '100%';
                        frame.style.height = '100%';
                        frame.style.display = 'block';
                        frame.style.userSelect = 'none';
                        frame.style.touchAction = 'none';
                        container.replaceChildren(frame);
                    }
                    setLoading(false);
                }
            } catch (cause) {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : String(cause));
                    setLoading(false);
                    onTimingChange(undefined);
                }
            } finally {
                rendering = false;
            }
        };
        requestRenderRef.current = force => void renderLatest(force);
        updateLabelsRef.current = labels => {
            renderer?.setLabelTrack(labels);
            void renderLatest(true);
        };
        updateModulesRef.current = nextModules => {
            renderer?.setOverlayModules?.(nextModules);
            void renderLatest(true);
        };
        updateEditingRef.current = editing => {
            renderer?.setOverlayEditing?.(editing);
            void renderLatest(true);
        };
        if (visualDocument.track.length === 0 && !visualDocument.fixedResources?.length) {
            containerRef.current?.replaceChildren();
            setLoading(false);
            onTimingChange({ duration: 0, cursorTimes: [0] });
            return () => {
                cancelled = true;
            };
        }
        void createVideoPreviewRenderer(
            graph,
            visualDocument,
            languages,
            options,
            {
                mapEnabled,
                mapStyle,
                svgViewBoxMin,
                svgViewBoxZoom,
                isSubscriber,
                getImage,
            },
            preparationController.signal
        )
            .then(prepared => {
                renderer = prepared;
                if (cancelled) {
                    prepared.dispose();
                    return;
                }
                onTimingChange({ duration: prepared.duration, cursorTimes: prepared.cursorTimes });
                unsubscribeLayout = prepared.subscribeLayoutInvalidation?.(() => void renderLatest(true));
                prepared.setLabelTrack(latestLabels.current ?? []);
                prepared.setOverlayModules?.(latestModules.current);
                prepared.setOverlayEditing?.(latestEditing.current);
                void renderLatest();
            })
            .catch(cause => {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : String(cause));
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
            preparationController.abort();
            unsubscribeLayout?.();
            dragRef.current = undefined;
            renderer?.dispose();
            requestRenderRef.current = () => {};
            updateLabelsRef.current = () => {};
            updateModulesRef.current = () => {};
            updateEditingRef.current = () => {};
        };
    }, [
        graph,
        visualDocument,
        languages,
        options,
        mapEnabled,
        isSubscriber,
        mapStyle,
        svgViewBoxMin,
        svgViewBoxZoom,
        onTimingChange,
        getImage,
        reload,
    ]);

    React.useEffect(() => updateModulesRef.current(modules), [modules]);
    React.useEffect(() => updateEditingRef.current(overlayEditing), [overlayEditing]);
    React.useEffect(() => {
        const drag = dragRef.current;
        if (!drag || (!overlayEditing && editableKeyframe?.id === drag.entry.id)) return;
        dragRef.current = undefined;
        drag.group.setAttribute('transform', drag.transform);
        const container = containerRef.current;
        if (container?.hasPointerCapture?.(drag.pointerId)) container.releasePointerCapture(drag.pointerId);
        requestRenderRef.current(true);
    }, [overlayEditing, editableKeyframe?.id]);

    React.useEffect(() => requestRenderRef.current(), [time]);
    React.useEffect(() => requestRenderRef.current(true), [editableKeyframeKey]);
    React.useEffect(() => updateLabelsRef.current(timeline.labelTrack ?? []), [timeline.labelTrack]);

    const getPosition = (event: React.PointerEvent) => {
        const svg = containerRef.current?.querySelector('svg');
        const matrix = svg?.getScreenCTM();
        if (!svg || !matrix) return undefined;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(matrix.inverse());
    };
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!editableKeyframe || event.button !== 0) return;
        const target = event.target as Element;
        const group = target.closest<SVGElement>(`[id="${editableKeyframe.refId}"]`);
        const origin = getPosition(event);
        if (!group || !origin) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            origin,
            entry: editableKeyframe,
            group,
            transform: group.getAttribute('transform') ?? '',
            delta: { x: 0, y: 0 },
        };
    };
    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const position = getPosition(event);
        if (!drag || drag.pointerId !== event.pointerId || !position) return;
        drag.delta = { x: position.x - drag.origin.x, y: position.y - drag.origin.y };
        drag.group.setAttribute('transform', `translate(${drag.delta.x},${drag.delta.y}) ${drag.transform}`);
    };
    const finishDrag = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = undefined;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        if (commit) onKeyframeMove(drag.entry.id, drag.entry.x + drag.delta.x, drag.entry.y + drag.delta.y);
        else {
            drag.group.setAttribute('transform', drag.transform);
            requestRenderRef.current(true);
        }
    };

    return (
        <Flex ref={areaRef} width="100%" height="100%" align="center" justify="center" bg="gray.900" overflow="hidden">
            <Box
                position="relative"
                width={frameSize === undefined ? '100%' : `${frameSize.width}px`}
                height={frameSize === undefined ? undefined : `${frameSize.height}px`}
                flexShrink={0}
                aspectRatio={16 / 9}
                overflow="hidden"
                bg="white"
                data-video-preview
            >
                <Box
                    ref={containerRef}
                    position="absolute"
                    inset={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={event => finishDrag(event, true)}
                    onPointerCancel={event => finishDrag(event, false)}
                    onLostPointerCapture={event => finishDrag(event, false)}
                />
                <TimelineOverlayCanvasControls
                    modules={modules}
                    layout={
                        !hasVisualResources && overlayEditing ? getEmptyTimelineOverlayLayout(modules) : overlayLayout
                    }
                    editing={overlayEditing}
                    isSubscriber={isSubscriber}
                    selectedId={selectedOverlayModuleId}
                    onSelect={onSelectOverlayModule}
                    onAdd={onAddOverlayModule}
                    onMove={onMoveOverlayModule}
                    onPreviewMove={onPreviewOverlayModuleMove}
                    onCancelMove={onCancelOverlayModuleMove}
                />
                {loading && (
                    <Flex position="absolute" inset={0} align="center" justify="center" gap={3} bg="whiteAlpha.800">
                        <Spinner color="purple.500" size="sm" />
                        <Text fontSize="sm" color="gray.700">
                            {t('header.timelinePage.preparingPreview')}
                        </Text>
                    </Flex>
                )}
                {error && (
                    <Flex position="absolute" inset={0} align="center" justify="center" p={4}>
                        <Alert status="error" borderRadius="md" flexDirection="column" gap={2}>
                            <AlertIcon />
                            <Text fontWeight="semibold">{t('header.timelinePage.previewFailed')}</Text>
                            <Text fontSize="xs">{error}</Text>
                            <Button size="sm" onClick={() => setReload(value => value + 1)}>
                                {t('header.timelinePage.retryPreview')}
                            </Button>
                        </Alert>
                    </Flex>
                )}
                {!loading && !error && !hasVisualResources && (
                    <Flex position="absolute" inset={0} align="center" justify="center" color="gray.500" p={8}>
                        <Text fontSize="sm" textAlign="center">
                            {t('header.timelinePage.empty')}
                        </Text>
                    </Flex>
                )}
            </Box>
        </Flex>
    );
}
