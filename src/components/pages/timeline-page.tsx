import { Badge, Box, Divider, Flex, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id } from '../../constants/constants';
import { isKeyframeEntry, TimelineEntry, TimelineKeyframeEntry } from '../../constants/timeline';
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
const TRACK_PANEL_MAX_HEIGHT_RATIO = 0.4;

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

    // The track panel grows with the keyframe lanes and is capped at 40% of the viewport,
    // beyond which the track itself scrolls.
    const keyframeLaneCount = React.useMemo(
        () => new Set(timeline.track.filter(isKeyframeEntry).map(entry => entry.refId)).size,
        [timeline.track]
    );
    const trackPanelHeight = React.useMemo(() => {
        const viewportHeight = windowHeight ?? window.innerHeight;
        return Math.min(
            TRACK_PANEL_BASE_HEIGHT + keyframeLaneCount * KEYFRAME_ROW_HEIGHT,
            viewportHeight * TRACK_PANEL_MAX_HEIGHT_RATIO
        );
    }, [keyframeLaneCount, windowHeight]);

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
            dispatch(setSelected(new Set<Id>([entry.refId])));
            svgHandleRef.current?.focusElement(entry.refId);
        },
        [dispatch, handleCursorChange, timeline.track]
    );

    const handleCanvasSelect = React.useCallback(
        (id: Id | undefined) => {
            if (id) {
                const index = timeline.track.findIndex(entry => entry.refId === id);
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
        <Flex direction="column" height="100%" overflow="hidden">
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
            <Divider borderColor={borderColor} />
            <Box height={`${trackPanelHeight}px`} minH={`${trackPanelHeight}px`} maxH={`${trackPanelHeight}px`}>
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
    );
}
