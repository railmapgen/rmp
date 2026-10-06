import { Badge, Box, Divider, Flex, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id } from '../../constants/constants';
import {
    getTimelineSettings,
    isElementEntry,
    isKeyframeEntry,
    TimelineEntry,
    TimelineKeyframeEntry,
} from '../../constants/timeline';
import { useTimelineProjectContext } from '../../timeline/timeline-project-context';
import {
    replaceTimeline,
    setCursor,
    setSelected,
    setViewport,
    useTimelineDispatch,
    useTimelineSelector,
} from '../../timeline/timeline-store';
import { useWindowSize } from '../../util/hooks';
import { getTimelineCoverage, updateKeyframePosition } from '../../util/timeline';
import TimelinePreview from '../timeline/timeline-preview';
import TimelineTrackPanel from '../timeline/timeline-track-panel';
import { KEYFRAME_ROW_HEIGHT } from '../timeline/timeline-track';
import TimelineSvgWrapper, { TimelineSvgHandle } from '../timeline/timeline-svg-wrapper';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { useTimelineAudioPlayback } from '../timeline/use-timeline-audio-playback';
import { useSvgRenderContext } from '../svg-render-context';
import { useTimelinePlaybackClock } from '../timeline/use-timeline-playback-clock';
import { createTimelinePreviewOptions } from '../timeline/timeline-preview-options';

const TRACK_PANEL_BASE_HEIGHT = 324;
const TRACK_PANEL_MIN_HEIGHT_RATIO = 0.3;
const TRACK_PANEL_AUTO_MAX_HEIGHT_RATIO = 0.48;
const MemoTimelineSvgWrapper = React.memo(TimelineSvgWrapper);

export default function TimelinePage() {
    const { t } = useTranslation();
    const dispatch = useTimelineDispatch();
    const active = useTimelineSelector(state => state.project.active)!;
    const timeline = active.revision.timeline;
    const timelineCursor = useTimelineSelector(state => state.runtime.cursor);
    const selected = useTimelineSelector(state => state.runtime.selected);
    const { graph, languages, getAudio } = useTimelineProjectContext();
    const { getImage } = useSvgRenderContext();
    const { svgViewBoxMin, svgViewBoxZoom, mapEnabled, mapStyle } = active.revision;
    const { height: windowHeight } = useWindowSize();
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const pageRef = React.useRef<HTMLDivElement>(null);
    const trackPanelId = React.useId();
    const [pageHeight, setPageHeight] = React.useState<number>();
    const [resizedTrackHeight, setResizedTrackHeight] = React.useState<number>();
    const resizeRef = React.useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);
    const svgHandleRef = React.useRef<TimelineSvgHandle>(null);
    const selectedId = selected.size === 1 ? [...selected][0] : undefined;
    const [selectedEntryId, setSelectedEntryId] = React.useState<string | undefined>(undefined);
    const [showMissingHighlight, setShowMissingHighlight] = React.useState(false);
    const [timing, setTiming] = React.useState<TimelinePlaybackTiming>();
    const [playbackTime, setPlaybackTime] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const playbackTimeRef = React.useRef(0);
    playbackTimeRef.current = playbackTime;
    const pendingCursorRef = React.useRef(timelineCursor);
    pendingCursorRef.current = timelineCursor;
    const settings = getTimelineSettings(timeline);
    const previewOptions = React.useMemo(
        () => createTimelinePreviewOptions(settings),
        [
            settings.cameraZoom,
            settings.speedMultiplier,
            settings.autoChangeStationType,
            settings.showYear,
            settings.showLineName,
            settings.showLineLength,
            settings.lineLengthUnit,
        ]
    );
    const handleTimingChange = React.useCallback((next: TimelinePlaybackTiming | undefined) => {
        setTiming(next);
        setIsPlaying(false);
        if (next) setPlaybackTime(Math.min(next.duration, next.cursorTimes[pendingCursorRef.current] ?? 0));
    }, []);
    useTimelineAudioPlayback(timeline, timing, playbackTime, isPlaying, getAudio);
    useTimelinePlaybackClock({
        playing: isPlaying && !!timing,
        duration: timing?.duration ?? 0,
        startTime: playbackTimeRef.current,
        onTick: setPlaybackTime,
        onComplete: () => setIsPlaying(false),
    });
    const handleSeek = React.useCallback(
        (time: number) => {
            setIsPlaying(false);
            if (!timing) return;
            const next = Math.max(0, Math.min(timing.duration, time));
            setPlaybackTime(next);
        },
        [timing]
    );
    const handleTogglePlayback = React.useCallback(() => {
        if (!timing?.duration) return;
        if (!isPlaying && playbackTimeRef.current >= timing.duration) {
            setPlaybackTime(0);
        }
        setIsPlaying(value => !value);
    }, [timing, isPlaying]);
    const savedViewport = useTimelineSelector(state => state.runtime.viewport);
    const viewport = React.useMemo(
        () =>
            savedViewport ?? {
                x: svgViewBoxMin.x,
                y: svgViewBoxMin.y,
                zoom: svgViewBoxZoom,
            },
        [savedViewport, svgViewBoxMin.x, svgViewBoxMin.y, svgViewBoxZoom]
    );
    const handleViewportChange = React.useCallback(
        (nextViewport: typeof viewport) => dispatch(setViewport(nextViewport)),
        [dispatch]
    );
    const coverage = React.useMemo(() => getTimelineCoverage(graph, timeline), [graph, timeline]);
    const highlightedIds = React.useMemo(
        () => (showMissingHighlight && !coverage.isComplete ? new Set<Id>(coverage.missingIds) : undefined),
        [coverage.isComplete, coverage.missingIds, showMissingHighlight]
    );

    React.useEffect(() => {
        const page = pageRef.current;
        if (!page) return;

        const observer = new ResizeObserver(([entry]) => setPageHeight(entry.contentRect.height));
        observer.observe(page);
        return () => observer.disconnect();
    }, []);

    // Leave room for the time ruler and media lanes until the user chooses a height.
    const keyframeLaneCount = React.useMemo(
        () => new Set(timeline.track.filter(isKeyframeEntry).map(entry => entry.refId)).size,
        [timeline.track]
    );
    const viewportHeight = windowHeight ?? window.innerHeight;
    const minTrackHeight = viewportHeight * TRACK_PANEL_MIN_HEIGHT_RATIO;
    // Keep part of the canvas visible even when the track is fully expanded.
    const maxTrackHeight = Math.max(minTrackHeight, (pageHeight ?? viewportHeight) * 0.8);
    const clampTrackHeight = (height: number) => Math.max(minTrackHeight, Math.min(height, maxTrackHeight));
    const trackPanelHeight = clampTrackHeight(
        resizedTrackHeight ??
            Math.min(
                TRACK_PANEL_BASE_HEIGHT +
                    keyframeLaneCount * KEYFRAME_ROW_HEIGHT +
                    (timeline.audioTrack?.length ?? 0) * 28 +
                    ((timeline.labelTrack?.length ?? 0) > 0 ? 28 + timeline.labelTrack!.length * 28 : 0),
                viewportHeight * TRACK_PANEL_AUTO_MAX_HEIGHT_RATIO
            )
    );

    const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || resizeRef.current) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        resizeRef.current = { pointerId: e.pointerId, startY: e.clientY, startHeight: trackPanelHeight };
    };
    const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const resize = resizeRef.current;
        if (!resize || resize.pointerId !== e.pointerId) return;
        setResizedTrackHeight(clampTrackHeight(resize.startHeight + resize.startY - e.clientY));
    };
    const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        if (resizeRef.current?.pointerId !== e.pointerId) return;
        resizeRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };
    const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        let nextHeight: number;
        switch (e.key) {
            case 'ArrowUp':
                nextHeight = trackPanelHeight + 20;
                break;
            case 'ArrowDown':
                nextHeight = trackPanelHeight - 20;
                break;
            case 'Home':
                nextHeight = minTrackHeight;
                break;
            case 'End':
                nextHeight = maxTrackHeight;
                break;
            default:
                return;
        }
        e.preventDefault();
        setResizedTrackHeight(clampTrackHeight(nextHeight));
    };

    const editableKeyframe = React.useMemo((): TimelineKeyframeEntry | undefined => {
        if (!selectedEntryId) return undefined;
        const entry = timeline.track[timelineCursor];
        return entry?.id === selectedEntryId && isKeyframeEntry(entry) ? entry : undefined;
    }, [selectedEntryId, timeline.track, timelineCursor]);

    const handleTimelineChange = React.useCallback(
        (nextDocument: typeof timeline) => {
            dispatch(replaceTimeline(nextDocument));
        },
        [dispatch]
    );

    const handleCursorChange = React.useCallback(
        (nextCursor: number) => {
            setIsPlaying(false);
            pendingCursorRef.current = nextCursor;
            if (timing) setPlaybackTime(timing.cursorTimes[nextCursor] ?? timing.duration);
            setSelectedEntryId(undefined);
            dispatch(setCursor(nextCursor));
        },
        [dispatch, timing]
    );

    const handleSelectEntry = React.useCallback(
        (entry: TimelineEntry) => {
            const index = timeline.track.findIndex(trackEntry => trackEntry.id === entry.id);
            if (index >= 0) handleCursorChange(index);

            setSelectedEntryId(entry.id);
            if (isElementEntry(entry)) {
                dispatch(setSelected(new Set<Id>([entry.refId])));
                svgHandleRef.current?.focusElement(entry.refId);
            }
        },
        [dispatch, handleCursorChange, timeline.track]
    );

    const handleCanvasSelect = React.useCallback(
        (id: Id | undefined) => {
            if (id) {
                const index = timeline.track.findIndex(entry => isElementEntry(entry) && entry.refId === id);
                if (index >= 0) handleCursorChange(index);
            }
            setSelectedEntryId(undefined);
            if (id) dispatch(setSelected(new Set<Id>([id])));
            else dispatch(setSelected(new Set()));
        },
        [dispatch, handleCursorChange, timeline.track]
    );

    const handleKeyframeMove = React.useCallback(
        (entryId: string, x: number, y: number) => {
            handleTimelineChange(updateKeyframePosition(timeline, entryId, x, y));
        },
        [handleTimelineChange, timeline]
    );

    React.useEffect(() => {
        if (selectedId && !graph.hasNode(selectedId) && !graph.hasEdge(selectedId)) {
            dispatch(setSelected(new Set()));
        }
        if (selectedEntryId && !timeline.track.some(entry => entry.id === selectedEntryId)) {
            setSelectedEntryId(undefined);
        }
    }, [graph, selectedId, selectedEntryId, timeline.track, dispatch]);

    React.useEffect(
        () => () => {
            dispatch(setSelected(new Set()));
        },
        [dispatch]
    );

    React.useEffect(() => {
        if (!coverage.isComplete) return;
        setShowMissingHighlight(false);
    }, [coverage.isComplete]);

    const paneLabelProps = {
        position: 'absolute' as const,
        top: 2,
        left: 2,
        zIndex: 1,
        colorScheme: 'gray',
        variant: 'subtle' as const,
        pointerEvents: 'none' as const,
    };

    return (
        <Flex ref={pageRef} direction="column" height="100%" overflow="hidden">
            <Flex flex="1" minH="0">
                <Box flex="1" minW="0" position="relative">
                    <Badge {...paneLabelProps}>{t('header.timelinePage.editorPane')}</Badge>
                    <MemoTimelineSvgWrapper
                        ref={svgHandleRef}
                        selectedId={selectedId}
                        highlightedIds={highlightedIds}
                        onSelect={handleCanvasSelect}
                        viewport={viewport}
                        onViewportChange={handleViewportChange}
                        graph={graph}
                        mapEnabled={mapEnabled}
                        mapStyle={mapStyle}
                        isSubscriber={false}
                    />
                </Box>
                <Divider orientation="vertical" borderColor={borderColor} />
                <Box flex="1" minW="0" position="relative">
                    <Badge {...paneLabelProps}>{t('header.timelinePage.previewPane')}</Badge>
                    <TimelinePreview
                        document={timeline}
                        time={playbackTime}
                        options={previewOptions}
                        languages={languages}
                        svgViewBoxMin={svgViewBoxMin}
                        svgViewBoxZoom={svgViewBoxZoom}
                        onTimingChange={handleTimingChange}
                        getImage={getImage}
                        editableKeyframe={editableKeyframe}
                        onKeyframeMove={handleKeyframeMove}
                        graph={graph}
                        mapEnabled={mapEnabled}
                        mapStyle={mapStyle}
                    />
                    {editableKeyframe && (
                        <Badge
                            position="absolute"
                            bottom={2}
                            left="50%"
                            transform="translateX(-50%)"
                            zIndex={1}
                            colorScheme="purple"
                            variant="solid"
                            pointerEvents="none"
                            textTransform="none"
                            px={2}
                            py={1}
                        >
                            {t('header.timelinePage.keyframeHint')}
                        </Badge>
                    )}
                </Box>
            </Flex>
            <Flex direction="column" height={`${trackPanelHeight}px`} flexShrink={0} minH="30vh">
                <Flex
                    role="separator"
                    tabIndex={0}
                    aria-label={t('header.timelinePage.resizeTrack')}
                    aria-orientation="horizontal"
                    aria-controls={trackPanelId}
                    aria-valuemin={Math.round(minTrackHeight)}
                    aria-valuemax={Math.round(maxTrackHeight)}
                    aria-valuenow={Math.round(trackPanelHeight)}
                    height="8px"
                    flexShrink={0}
                    align="center"
                    justify="center"
                    borderTopWidth="1px"
                    borderColor={borderColor}
                    cursor="ns-resize"
                    sx={{ touchAction: 'none' }}
                    userSelect="none"
                    _hover={{ bg: 'purple.100' }}
                    _focusVisible={{ outline: '2px solid', outlineColor: 'purple.400', outlineOffset: '-2px' }}
                    onPointerDown={handleResizeStart}
                    onPointerMove={handleResizeMove}
                    onPointerUp={handleResizeEnd}
                    onPointerCancel={handleResizeEnd}
                    onLostPointerCapture={handleResizeEnd}
                    onKeyDown={handleResizeKeyDown}
                >
                    <Box width="32px" height="3px" borderRadius="full" bg={borderColor} />
                </Flex>
                <Box id={trackPanelId} flex="1" minH={0} overflow="auto">
                    <TimelineTrackPanel
                        document={timeline}
                        mapEnabled={mapEnabled}
                        selectedId={selectedId}
                        selectedEntryId={selectedEntryId}
                        missingNodeCount={coverage.missingNodeCount}
                        missingEdgeCount={coverage.missingEdgeCount}
                        isCoverageComplete={coverage.isComplete}
                        isMissingHighlightShown={showMissingHighlight}
                        onToggleMissingHighlight={() => setShowMissingHighlight(value => !value)}
                        onSelectEntry={handleSelectEntry}
                        onCursorChange={handleCursorChange}
                        onDocumentChange={handleTimelineChange}
                        timing={timing}
                        playbackTime={playbackTime}
                        isPlaying={isPlaying}
                        onSeek={handleSeek}
                        onTogglePlayback={handleTogglePlayback}
                        graph={graph}
                        insertionIndex={timelineCursor}
                    />
                </Box>
            </Flex>
        </Flex>
    );
}
