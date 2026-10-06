import { Alert, AlertIcon, Box, Button, Flex, Spinner, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineDocument, TimelineKeyframeEntry, TimelineLabelEntry } from '../../constants/timeline';
import { MapStyle } from '../../map/map-style';
import { TimelineGraph } from '../../timeline/timeline-project-context';
import { TextLanguage } from '../../util/fonts';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { createVideoPreviewRenderer, VideoExportOptions } from '../../util/video-export';
import { fitVideoPreviewFrame } from './timeline-preview-layout';

interface TimelinePreviewProps {
    document: TimelineDocument;
    graph: TimelineGraph;
    languages: TextLanguage[];
    time: number;
    options: VideoExportOptions;
    mapEnabled: boolean;
    mapStyle: MapStyle;
    svgViewBoxMin: { x: number; y: number };
    svgViewBoxZoom: number;
    onTimingChange: (timing: TimelinePlaybackTiming | undefined) => void;
    getImage?: (id: string) => Promise<string | undefined>;
    editableKeyframe?: TimelineKeyframeEntry;
    onKeyframeMove: (entryId: string, x: number, y: number) => void;
}

/** Display the same prepared SVG frames that the video encoder consumes. */
export default function TimelinePreview({
    document: timeline,
    graph,
    languages,
    time,
    options,
    mapEnabled,
    mapStyle,
    svgViewBoxMin,
    svgViewBoxZoom,
    onTimingChange,
    getImage,
    editableKeyframe,
    onKeyframeMove,
}: TimelinePreviewProps) {
    const { t } = useTranslation();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const latestTime = React.useRef(time);
    latestTime.current = time;
    const requestRenderRef = React.useRef<(force?: boolean) => void>(() => {});
    const latestLabels = React.useRef(timeline.labelTrack);
    latestLabels.current = timeline.labelTrack;
    const updateLabelsRef = React.useRef<(labels: readonly TimelineLabelEntry[]) => void>(() => {});
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
        () => JSON.stringify({ version: timeline.version, track: timeline.track, settings: timeline.settings }),
        [timeline.version, timeline.track, timeline.settings]
    );
    const visualDocument = React.useMemo(
        () => ({ version: timeline.version, track: timeline.track, settings: timeline.settings }),
        [visualKey]
    );

    React.useEffect(() => {
        let cancelled = false;
        let pending = false;
        let forcePending = false;
        let rendering = false;
        let renderedFrame: number | undefined;
        let renderer: Awaited<ReturnType<typeof createVideoPreviewRenderer>> | undefined;
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
                    const forceFrame = forcePending;
                    forcePending = false;
                    if (!forceFrame && requestedFrame === renderedFrame) continue;
                    let frame: SVGSVGElement;
                    try {
                        frame = await renderer.renderPreviewFrame(
                            requestedTime,
                            forceFrame ? { force: true } : undefined
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
                    if (dragRef.current) {
                        pending = true;
                        forcePending = true;
                        break;
                    }
                    if (requestedFrame !== frameIndex(latestTime.current) || forcePending) {
                        pending = true;
                        continue;
                    }
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
        if (visualDocument.track.length === 0) {
            containerRef.current?.replaceChildren();
            setLoading(false);
            onTimingChange({ duration: 0, cursorTimes: [0] });
            return () => {
                cancelled = true;
            };
        }
        void createVideoPreviewRenderer(graph, visualDocument, languages, options, {
            mapEnabled,
            mapStyle,
            svgViewBoxMin,
            svgViewBoxZoom,
            isSubscriber: false,
            getImage,
        })
            .then(prepared => {
                renderer = prepared;
                if (cancelled) {
                    prepared.dispose();
                    return;
                }
                onTimingChange({ duration: prepared.duration, cursorTimes: prepared.cursorTimes });
                prepared.setLabelTrack(latestLabels.current ?? []);
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
            dragRef.current = undefined;
            renderer?.dispose();
            requestRenderRef.current = () => {};
            updateLabelsRef.current = () => {};
        };
    }, [
        graph,
        visualDocument,
        languages,
        options,
        mapEnabled,
        mapStyle,
        svgViewBoxMin,
        svgViewBoxZoom,
        onTimingChange,
        getImage,
        reload,
    ]);

    React.useEffect(() => requestRenderRef.current(), [time]);
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
                {!loading && !error && timeline.track.length === 0 && (
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
