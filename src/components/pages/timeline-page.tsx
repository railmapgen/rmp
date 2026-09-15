import { Badge, Box, Divider, Flex, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id } from '../../constants/constants';
import { isElementEntry, isKeyframeEntry, TimelineEntry, TimelineKeyframeEntry } from '../../constants/timeline';
import { useRootDispatch, useRootSelector } from '../../redux';
import { clearSelected, setSelected, setTimelineCursor } from '../../redux/runtime/runtime-slice';
import { setTimelineDocument } from '../../redux/timeline/timeline-slice';
import { useWindowSize } from '../../util/hooks';
import { getTimelineCoverage, updateKeyframePosition } from '../../util/timeline';
import TimelinePreview from '../timeline/timeline-preview';
import TimelineTrackPanel from '../timeline/timeline-track-panel';
import { KEYFRAME_ROW_HEIGHT } from '../timeline/timeline-track';
import TimelineSvgWrapper, { TimelineSvgHandle } from '../timeline/timeline-svg-wrapper';
import { Viewport } from '../timeline/use-timeline-viewport';

const TRACK_PANEL_BASE_HEIGHT = 300;
const TRACK_PANEL_MIN_HEIGHT_RATIO = 0.3;
const TRACK_PANEL_AUTO_MAX_HEIGHT_RATIO = 0.4;

export default function TimelinePage() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const timeline = useRootSelector(state => state.timeline.present);
    const timelineCursor = useRootSelector(state => state.runtime.timelineCursor);
    const {
        selected,
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);
    const { svgViewBoxMin, svgViewBoxZoom } = useRootSelector(state => state.param.present);
    const { height: windowHeight } = useWindowSize();
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const pageRef = React.useRef<HTMLDivElement>(null);
    const trackPanelId = React.useId();
    const [pageHeight, setPageHeight] = React.useState<number>();
    const [resizedTrackHeight, setResizedTrackHeight] = React.useState<number>();
    const resizeRef = React.useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);
    const svgHandleRef = React.useRef<TimelineSvgHandle>(null);
    const graph = React.useRef(window.graph);
    const selectedId = selected.size === 1 ? [...selected][0] : undefined;
    const [selectedEntryId, setSelectedEntryId] = React.useState<string | undefined>(undefined);
    const [showMissingHighlight, setShowMissingHighlight] = React.useState(false);
    const [viewport, setViewport] = React.useState<Viewport>({
        x: svgViewBoxMin.x,
        y: svgViewBoxMin.y,
        zoom: svgViewBoxZoom,
    });

    React.useEffect(() => {
        setViewport({ x: svgViewBoxMin.x, y: svgViewBoxMin.y, zoom: svgViewBoxZoom });
    }, [svgViewBoxMin.x, svgViewBoxMin.y, svgViewBoxZoom]);

    const coverage = React.useMemo(
        () => getTimelineCoverage(graph.current, timeline),
        [refreshEdges, refreshNodes, timeline]
    );
    const highlightedIds = React.useMemo(
        () => (showMissingHighlight && !coverage.isComplete ? new Set<Id>(coverage.missingIds) : undefined),
        [coverage.isComplete, coverage.missingIds, showMissingHighlight]
    );

    const isPro = timeline.mode === 'pro';

    React.useEffect(() => {
        const page = pageRef.current;
        if (!page) return;

        const observer = new ResizeObserver(([entry]) => setPageHeight(entry.contentRect.height));
        observer.observe(page);
        return () => observer.disconnect();
    }, []);

    // Grow automatically with keyframe lanes until the user chooses a height.
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
                TRACK_PANEL_BASE_HEIGHT + keyframeLaneCount * KEYFRAME_ROW_HEIGHT,
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
            dispatch(setTimelineDocument(nextDocument));
        },
        [dispatch]
    );

    const handleCursorChange = React.useCallback(
        (nextCursor: number) => {
            setSelectedEntryId(undefined);
            dispatch(setTimelineCursor(nextCursor));
        },
        [dispatch]
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
            else dispatch(clearSelected());
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
        if (selectedId && !graph.current.hasNode(selectedId) && !graph.current.hasEdge(selectedId)) {
            dispatch(clearSelected());
        }
        if (selectedEntryId && !timeline.track.some(entry => entry.id === selectedEntryId)) {
            setSelectedEntryId(undefined);
        }
    }, [refreshEdges, refreshNodes, selectedId, selectedEntryId, timeline.track, dispatch]);

    React.useEffect(
        () => () => {
            dispatch(clearSelected());
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
                    {isPro && <Badge {...paneLabelProps}>{t('header.timelinePage.editorPane')}</Badge>}
                    <TimelineSvgWrapper
                        ref={svgHandleRef}
                        selectedId={selectedId}
                        highlightedIds={highlightedIds}
                        onSelect={handleCanvasSelect}
                        viewport={viewport}
                        onViewportChange={setViewport}
                    />
                </Box>
                {isPro && (
                    <>
                        <Divider orientation="vertical" borderColor={borderColor} />
                        <Box flex="1" minW="0" position="relative">
                            <Badge {...paneLabelProps}>{t('header.timelinePage.previewPane')}</Badge>
                            <TimelinePreview
                                document={timeline}
                                cursor={timelineCursor}
                                viewport={viewport}
                                editableKeyframe={editableKeyframe}
                                onKeyframeMove={handleKeyframeMove}
                                onViewportChange={setViewport}
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
                    </>
                )}
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
                    />
                </Box>
            </Flex>
        </Flex>
    );
}
