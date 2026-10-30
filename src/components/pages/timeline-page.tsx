import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Icon,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Tooltip,
    useColorModeValue,
    useDisclosure,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdPushPin } from 'react-icons/md';
import { Id } from '../../constants/constants';
import {
    getTimelineSettings,
    isElementEntry,
    isKeyframeEntry,
    TimelineEntry,
    TimelineKeyframeEntry,
} from '../../constants/timeline';
import {
    getTimelineOverlayModules,
    TimelineOverlayModule,
    TimelineOverlayRegion,
} from '../../constants/timeline-overlays';
import { useTimelineProjectContext } from '../../timeline/timeline-project-context';
import {
    replaceTimeline,
    setCursor,
    setSelected,
    setViewport,
    setAnnotationEditing,
    setFixedResourceEditing,
    useTimelineDispatch,
    useTimelineSelector,
} from '../../timeline/timeline-store';
import { useWindowSize } from '../../util/hooks';
import {
    getTimelineCoverage,
    moveTimelineOverlayModule,
    setTimelineFixedResources,
    updateKeyframePosition,
} from '../../util/timeline';
import TimelinePreview from '../timeline/timeline-preview';
import TimelineTrackPanel from '../timeline/timeline-track-panel';
import { KEYFRAME_ROW_HEIGHT } from '../timeline/timeline-track';
import TimelineSvgWrapper, { TimelineSvgHandle } from '../timeline/timeline-svg-wrapper';
import { TimelinePlaybackTiming } from '../../util/timeline-playback';
import { useTimelineAudioPlayback } from '../timeline/use-timeline-audio-playback';
import { useSvgRenderContext } from '../svg-render-context';
import { useTimelinePlaybackClock } from '../timeline/use-timeline-playback-clock';
import { createTimelinePreviewOptions } from '../timeline/timeline-preview-options';
import TimelineOverlayPanel from '../timeline/timeline-overlay-panel';
import TimelineFixedResourcesPreview from '../timeline/timeline-fixed-resources-preview';

const TRACK_PANEL_BASE_HEIGHT = 324;
const TRACK_PANEL_MIN_HEIGHT_RATIO = 0.3;
const TRACK_PANEL_AUTO_MAX_HEIGHT_RATIO = 0.48;
const MemoTimelineSvgWrapper = React.memo(TimelineSvgWrapper);

export default function TimelinePage() {
    const { t } = useTranslation();
    const dispatch = useTimelineDispatch();
    const active = useTimelineSelector(state => state.project.active)!;
    const isSubscriber = useTimelineSelector(state => state.account.activeSubscriptions.RMP_CLOUD);
    const hasExportSubscription = useTimelineSelector(state => state.account.activeSubscriptions.RMP_EXPORT);
    const timeline = active.revision.timeline;
    const timelineCursor = useTimelineSelector(state => state.runtime.cursor);
    const selected = useTimelineSelector(state => state.runtime.selected);
    const annotationEditing = useTimelineSelector(state => state.runtime.annotationEditing);
    const fixedResourceEditing = useTimelineSelector(state => state.runtime.fixedResourceEditing);
    const editingLocked = annotationEditing || fixedResourceEditing;
    const { graph, languages, getAudio } = useTimelineProjectContext();
    const { getImage } = useSvgRenderContext();
    const { svgViewBoxMin, svgViewBoxZoom, mapEnabled, mapStyle } = active.revision;
    const { height: windowHeight } = useWindowSize();
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const pickerBackground = useColorModeValue('white', 'gray.800');
    const pickerBorder = useColorModeValue('purple.100', 'whiteAlpha.200');
    const pickerMuted = useColorModeValue('gray.600', 'gray.400');
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
    const [selectedOverlayModuleId, setSelectedOverlayModuleId] = React.useState<string>();
    const [addOverlayRegion, setAddOverlayRegion] = React.useState<TimelineOverlayRegion>();
    const [previewOverlayModules, setPreviewOverlayModules] = React.useState<TimelineOverlayModule[]>();
    const [fixedResourceSelection, setFixedResourceSelection] = React.useState<Set<Id>>(new Set());
    const fixedResourceNotice = useDisclosure();
    const overlayModules = React.useMemo(() => getTimelineOverlayModules(timeline), [timeline]);
    const playbackTimeRef = React.useRef(0);
    playbackTimeRef.current = playbackTime;
    const pendingCursorRef = React.useRef(timelineCursor);
    pendingCursorRef.current = timelineCursor;
    const settings = getTimelineSettings(timeline);
    const previewOptions = React.useMemo(
        () => createTimelinePreviewOptions(settings),
        [settings.cameraZoom, settings.speedMultiplier, settings.autoChangeStationType]
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
            if (editingLocked) return;

            setSelectedEntryId(entry.id);
            if (isElementEntry(entry)) {
                dispatch(setSelected(new Set<Id>([entry.refId])));
                svgHandleRef.current?.focusElement(entry.refId);
            }
        },
        [dispatch, handleCursorChange, timeline.track, editingLocked]
    );

    const handleCanvasSelect = React.useCallback(
        (id: Id | undefined) => {
            if (fixedResourceEditing) {
                if (id) {
                    setFixedResourceSelection(current => {
                        const next = new Set(current);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                    });
                }
                return;
            }
            if (id) {
                const index = timeline.track.findIndex(entry => isElementEntry(entry) && entry.refId === id);
                if (index >= 0) handleCursorChange(index);
            }
            setSelectedEntryId(undefined);
            if (id) dispatch(setSelected(new Set<Id>([id])));
            else dispatch(setSelected(new Set()));
        },
        [dispatch, handleCursorChange, timeline.track, fixedResourceEditing]
    );

    const handleKeyframeMove = React.useCallback(
        (entryId: string, x: number, y: number) => {
            if (editingLocked) return;
            handleTimelineChange(updateKeyframePosition(timeline, entryId, x, y));
        },
        [handleTimelineChange, timeline, editingLocked]
    );

    const handleOverlayModulesChange = (modules: TimelineOverlayModule[]) =>
        handleTimelineChange({ ...timeline, overlayModules: modules });
    const startOverlayEditing = () => {
        setPreviewOverlayModules(undefined);
        setIsPlaying(false);
        setSelectedEntryId(undefined);
        setSelectedOverlayModuleId(undefined);
        setAddOverlayRegion(undefined);
        dispatch(setSelected(new Set()));
        dispatch(setAnnotationEditing(true));
    };
    const finishOverlayEditing = () => {
        setPreviewOverlayModules(undefined);
        setAddOverlayRegion(undefined);
        setSelectedOverlayModuleId(undefined);
        dispatch(setAnnotationEditing(false));
    };
    const startFixedResourceEditing = () => {
        setIsPlaying(false);
        setSelectedEntryId(undefined);
        setShowMissingHighlight(false);
        setFixedResourceSelection(new Set(timeline.fixedResources ?? []));
        dispatch(setSelected(new Set()));
        dispatch(setFixedResourceEditing(true));
    };
    const finishFixedResourceEditing = () => {
        const next = setTimelineFixedResources(timeline, [...fixedResourceSelection]);
        dispatch(setFixedResourceEditing(false));
        handleTimelineChange(next);
        handleCursorChange(0);
        setPlaybackTime(0);
        fixedResourceNotice.onOpen();
    };

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
                <Flex flex="1" minW="0" minH="0" position="relative" direction="column">
                    <Badge {...paneLabelProps}>{t('header.timelinePage.editorPane')}</Badge>
                    {fixedResourceEditing && (
                        <Flex
                            mt={8}
                            mx={3}
                            p={3}
                            gap={2}
                            direction="column"
                            flexShrink={0}
                            borderRadius="xl"
                            bg={pickerBackground}
                            borderWidth="1px"
                            borderColor={pickerBorder}
                            boxShadow="0 2px 8px rgba(0, 0, 0, 0.04)"
                        >
                            <Flex align="center" gap={2} minW={0}>
                                <Flex
                                    boxSize={7}
                                    flexShrink={0}
                                    align="center"
                                    justify="center"
                                    borderRadius="lg"
                                    bg="purple.50"
                                    color="purple.600"
                                    _dark={{ bg: 'whiteAlpha.100', color: 'purple.200' }}
                                    aria-hidden
                                >
                                    <Icon as={MdPushPin} boxSize={4} />
                                </Flex>
                                <Flex align="center" gap={2} flex={1} minW={0}>
                                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1} minW={0}>
                                        {t('header.timelinePage.fixedResources.title')}
                                    </Text>
                                    <Tooltip
                                        label={t('header.timelinePage.fixedResources.selectedCount', {
                                            count: fixedResourceSelection.size,
                                        })}
                                    >
                                        <Badge
                                            px={1.5}
                                            minW={6}
                                            borderRadius="full"
                                            fontSize="xs"
                                            lineHeight="20px"
                                            textAlign="center"
                                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                                            colorScheme="purple"
                                            flexShrink={0}
                                            aria-label={t('header.timelinePage.fixedResources.selectedCount', {
                                                count: fixedResourceSelection.size,
                                            })}
                                            aria-live="polite"
                                        >
                                            {fixedResourceSelection.size}
                                        </Badge>
                                    </Tooltip>
                                </Flex>
                                <Button
                                    size="sm"
                                    height={7}
                                    px={2.5}
                                    fontSize="xs"
                                    borderRadius="md"
                                    colorScheme="purple"
                                    leftIcon={<MdCheck aria-hidden />}
                                    flexShrink={0}
                                    onClick={finishFixedResourceEditing}
                                >
                                    {t('header.timelinePage.fixedResources.done')}
                                </Button>
                            </Flex>
                            <Text fontSize="xs" lineHeight="tall" color={pickerMuted}>
                                {t('header.timelinePage.fixedResources.hint')}
                            </Text>
                        </Flex>
                    )}
                    <Box flex="1" minH="0">
                        <MemoTimelineSvgWrapper
                            ref={svgHandleRef}
                            selectedId={selectedId}
                            selectedIds={fixedResourceEditing ? fixedResourceSelection : undefined}
                            highlightedIds={highlightedIds}
                            onSelect={handleCanvasSelect}
                            viewport={viewport}
                            onViewportChange={handleViewportChange}
                            graph={graph}
                            mapEnabled={mapEnabled}
                            mapStyle={mapStyle}
                            isSubscriber={isSubscriber}
                            fitToGraph={fixedResourceEditing}
                        />
                    </Box>
                    {annotationEditing && (
                        <TimelineOverlayPanel
                            modules={overlayModules}
                            selectedId={selectedOverlayModuleId}
                            addRegion={addOverlayRegion}
                            hasExportSubscription={hasExportSubscription}
                            mapEnabled={mapEnabled}
                            onChange={handleOverlayModulesChange}
                            onSelect={id => {
                                setSelectedOverlayModuleId(id);
                                setAddOverlayRegion(undefined);
                            }}
                            onCloseCatalog={() => setAddOverlayRegion(undefined)}
                            onDone={finishOverlayEditing}
                        />
                    )}
                </Flex>
                <Divider orientation="vertical" borderColor={borderColor} />
                <Box flex="1" minW="0" position="relative">
                    <Badge {...paneLabelProps}>
                        {t(
                            fixedResourceEditing
                                ? 'header.timelinePage.fixedResources.previewLabel'
                                : 'header.timelinePage.previewPane'
                        )}
                    </Badge>
                    {fixedResourceEditing ? (
                        <TimelineFixedResourcesPreview
                            graph={graph}
                            selectedIds={fixedResourceSelection}
                            mapEnabled={mapEnabled}
                            mapStyle={mapStyle}
                            isSubscriber={isSubscriber}
                        />
                    ) : (
                        <TimelinePreview
                            document={timeline}
                            time={playbackTime}
                            options={previewOptions}
                            languages={languages}
                            svgViewBoxMin={svgViewBoxMin}
                            svgViewBoxZoom={svgViewBoxZoom}
                            onTimingChange={handleTimingChange}
                            getImage={getImage}
                            editableKeyframe={editingLocked ? undefined : editableKeyframe}
                            onKeyframeMove={handleKeyframeMove}
                            graph={graph}
                            mapEnabled={mapEnabled}
                            mapStyle={mapStyle}
                            isSubscriber={isSubscriber}
                            hasExportSubscription={hasExportSubscription}
                            overlayEditing={annotationEditing}
                            selectedOverlayModuleId={selectedOverlayModuleId}
                            onSelectOverlayModule={id => {
                                setSelectedOverlayModuleId(id);
                                setAddOverlayRegion(undefined);
                            }}
                            onAddOverlayModule={region => {
                                setSelectedOverlayModuleId(undefined);
                                setAddOverlayRegion(region);
                            }}
                            onMoveOverlayModule={(id, region, index) =>
                                handleOverlayModulesChange(
                                    moveTimelineOverlayModule(overlayModules, id, region, index, hasExportSubscription)
                                )
                            }
                            previewOverlayModules={previewOverlayModules}
                            onPreviewOverlayModuleMove={(id, region, index) => {
                                const next = moveTimelineOverlayModule(
                                    overlayModules,
                                    id,
                                    region,
                                    index,
                                    hasExportSubscription
                                );
                                setPreviewOverlayModules(current =>
                                    JSON.stringify(current) === JSON.stringify(next) ? current : next
                                );
                            }}
                            onCancelOverlayModuleMove={() => setPreviewOverlayModules(undefined)}
                        />
                    )}
                    {editableKeyframe && !editingLocked && (
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
                        readOnly={editingLocked}
                        onEditOverlayModules={startOverlayEditing}
                        onEditFixedResources={startFixedResourceEditing}
                    />
                </Box>
            </Flex>
            <Modal isOpen={fixedResourceNotice.isOpen} onClose={fixedResourceNotice.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.timelinePage.fixedResources.doneNoticeTitle')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>{t('header.timelinePage.fixedResources.doneNotice')}</ModalBody>
                    <ModalFooter>
                        <Button colorScheme="purple" onClick={fixedResourceNotice.onClose}>
                            {t('header.timelinePage.fixedResources.done')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Flex>
    );
}
