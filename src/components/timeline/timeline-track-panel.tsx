import {
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    IconButton,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Text,
    Tooltip,
    VStack,
    useToast,
} from '@chakra-ui/react';
import React from 'react';
import useEvent from 'react-use-event-hook';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdAltRoute, MdPause, MdPlayArrow, MdSettings, MdSkipNext, MdSkipPrevious } from 'react-icons/md';
import { Id, NodeId } from '../../constants/constants';
import { isElementEntry, isPauseEntry, TimelineDocument, TimelineEntry } from '../../constants/timeline';
import type { TimelineGraph } from '../../timeline/timeline-project-context';
import { useSvgRenderContext } from '../svg-render-context';
import {
    findShortestPathByLine,
    getAdjacentLineColors,
    getTimelineEntrySubtitle,
    getTimelineEntryTitle,
    insertTimelineEntries,
    insertTimelineEntry,
    moveTimelineEntry,
    removeTimelineEntry,
} from '../../util/timeline';
import { formatTimelineTime, TimelinePlaybackTiming } from '../../util/timeline-playback';
import TimelineTrack from './timeline-track';
import TimelineSettingsModal from './timeline-settings-modal';
import TimelineLineInfoModal from './timeline-line-info-modal';

const NARROW_SCREEN_QUERY = '@media (width < 600px)';

interface TimelineTrackPanelProps {
    document: TimelineDocument;
    mapEnabled?: boolean;
    selectedId?: Id;
    selectedEntryId?: string;
    missingNodeCount: number;
    missingEdgeCount: number;
    isCoverageComplete: boolean;
    isMissingHighlightShown: boolean;
    onToggleMissingHighlight: () => void;
    onSelectEntry: (entry: TimelineEntry) => void;
    onCursorChange: (index: number) => void;
    onDocumentChange: (document: TimelineDocument) => void;
    graph?: TimelineGraph;
    insertionIndex?: number;
    timing?: TimelinePlaybackTiming;
    playbackTime?: number;
    isPlaying?: boolean;
    onSeek?: (time: number) => void;
    onTogglePlayback?: () => void;
}

export default function TimelineTrackPanel({
    document,
    mapEnabled = false,
    selectedId,
    selectedEntryId,
    missingNodeCount,
    missingEdgeCount,
    isCoverageComplete,
    isMissingHighlightShown,
    onToggleMissingHighlight: onToggleMissingHighlightProp,
    onSelectEntry: onSelectEntryProp,
    onCursorChange: onCursorChangeProp,
    onDocumentChange: onDocumentChangeProp,
    graph: graphProp,
    insertionIndex = 0,
    timing,
    playbackTime = 0,
    isPlaying = false,
    onSeek: onSeekProp,
    onTogglePlayback: onTogglePlaybackProp,
}: TimelineTrackPanelProps) {
    const onToggleMissingHighlight = useEvent(onToggleMissingHighlightProp);
    const onSelectEntry = useEvent(onSelectEntryProp);
    const onCursorChange = useEvent(onCursorChangeProp);
    const onDocumentChange = useEvent(onDocumentChangeProp);
    const onSeek = useEvent((time: number) => onSeekProp?.(time));
    const onTogglePlayback = useEvent(() => onTogglePlaybackProp?.());
    const renderContext = useSvgRenderContext();
    const graph = graphProp ?? renderContext.graph;
    const { t } = useTranslation();
    const toast = useToast();
    const [draftDocument, setDraftDocument] = React.useState(document);
    const dragEntryIdRef = React.useRef<string | null>(null);
    const dragDocumentRef = React.useRef(document);

    const [pathMode, setPathMode] = React.useState<{
        startNode: NodeId;
        themeStr: string;
    } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isLineInformationOpen, setIsLineInformationOpen] = React.useState(false);
    const [selectedEntryIds, setSelectedEntryIds] = React.useState<Set<string>>(() =>
        selectedEntryId ? new Set([selectedEntryId]) : new Set()
    );

    React.useEffect(() => {
        setDraftDocument(document);
        dragDocumentRef.current = document;
        setSelectedEntryIds(
            current => new Set([...current].filter(id => document.track.some(entry => entry.id === id)))
        );
    }, [document]);

    React.useEffect(() => {
        setSelectedEntryIds(selectedEntryId ? new Set([selectedEntryId]) : new Set());
    }, [selectedEntryId]);

    React.useEffect(() => {
        if (document.track.length < insertionIndex) onCursorChange(document.track.length);
    }, [document.track.length, insertionIndex, onCursorChange]);

    React.useEffect(() => {
        if (pathMode && selectedId && !selectedId.startsWith('line_') && selectedId !== pathMode.startNode) {
            const destNode = selectedId as NodeId;
            const path = findShortestPathByLine(graph, pathMode.startNode, destNode, pathMode.themeStr);
            if (path) {
                const nextDocument = insertTimelineEntries(draftDocument, path, insertionIndex);
                const addedCount = nextDocument.track.length - draftDocument.track.length;
                if (addedCount > 0) {
                    onCursorChange(Math.min(insertionIndex, draftDocument.track.length) + addedCount);
                    toast({
                        title: t('header.timelinePage.pathAdded', { count: addedCount }),
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                } else {
                    toast({
                        title: t('header.timelinePage.pathAlreadyAdded'),
                        status: 'info',
                        duration: 3000,
                        isClosable: true,
                    });
                }
                setDraftDocument(nextDocument);
                onDocumentChange(nextDocument);
            } else {
                toast({
                    title: t('header.timelinePage.noPathFound'),
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
            setPathMode(null);
        }
    }, [selectedId, pathMode, draftDocument, graph, insertionIndex, onCursorChange, onDocumentChange, t, toast]);

    const selectedEntry = React.useMemo((): TimelineEntry | undefined => {
        if (!selectedId) return undefined;
        if (selectedId.startsWith('line_')) {
            return {
                id: 'selected',
                kind: 'edge',
                refId: selectedId as `line_${string}`,
                phase: 'enter',
                showAnimation: true,
            };
        }
        return {
            id: 'selected',
            kind: 'node',
            refId: selectedId as NodeId,
            phase: 'enter',
            showAnimation: true,
        };
    }, [selectedId]);

    const hasSelectedEntry = !!selectedEntry;
    const isDuplicate =
        !!selectedId && draftDocument.track.some(entry => isElementEntry(entry) && entry.refId === selectedId);
    const insertionLabel =
        insertionIndex === draftDocument.track.length
            ? t('header.timelinePage.cursorEnd')
            : t('header.timelinePage.cursorBefore', { position: insertionIndex + 1 });

    const adjacentLineColors = React.useMemo(() => {
        if (selectedEntry?.kind === 'node') {
            return getAdjacentLineColors(graph, selectedEntry.refId as NodeId);
        }
        return [];
    }, [graph, renderContext.graphRefresh, selectedEntry]);

    const handleAddSelected = useEvent(() => {
        if (!selectedId) return;
        const nextDocument = insertTimelineEntry(draftDocument, selectedId, insertionIndex);
        if (nextDocument === draftDocument) return;

        onCursorChange(Math.min(insertionIndex, draftDocument.track.length) + 1);
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    });

    const handleRemoveEntries = useEvent((entryId: string) => {
        const entryIds = selectedEntryIds.has(entryId) && selectedEntryIds.size > 1 ? [...selectedEntryIds] : [entryId];
        const nextDocument = entryIds.reduce((current, id) => removeTimelineEntry(current, id), draftDocument);
        if (nextDocument === draftDocument) return;

        const remainingIds = new Set(nextDocument.track.map(entry => entry.id));
        const nextCursor = draftDocument.track
            .slice(0, insertionIndex)
            .filter(entry => remainingIds.has(entry.id)).length;
        onCursorChange(nextCursor);
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
        setSelectedEntryIds(new Set());
    });
    const handleToggleAnimation = useEvent((entryId: string) => {
        const entryIds =
            selectedEntryIds.has(entryId) && selectedEntryIds.size > 1 ? selectedEntryIds : new Set([entryId]);
        const nextDocument: TimelineDocument = {
            ...draftDocument,
            track: draftDocument.track.map(entry =>
                entryIds.has(entry.id) && isElementEntry(entry)
                    ? { ...entry, showAnimation: !entry.showAnimation }
                    : entry
            ),
        };
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    });
    const handlePauseDurationChange = useEvent((entryId: string, duration: number) => {
        const nextDocument: TimelineDocument = {
            ...draftDocument,
            track: draftDocument.track.map(entry =>
                entry.id === entryId && isPauseEntry(entry) ? { ...entry, duration } : entry
            ),
        };
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    });
    const handleReverseSelectedEntries = useEvent(() => {
        if (selectedEntryIds.size < 2) return;
        const selectedIndexes = draftDocument.track
            .map((entry, index) => (selectedEntryIds.has(entry.id) ? index : -1))
            .filter(index => index >= 0);
        if (selectedIndexes.length < 2) return;

        const reversedEntries = selectedIndexes.map(index => draftDocument.track[index]).reverse();
        const track = [...draftDocument.track];
        selectedIndexes.forEach((index, position) => {
            track[index] = reversedEntries[position];
        });
        const nextDocument = { ...draftDocument, track };
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    });

    const handleDragStart = useEvent((entryId: string) => {
        dragEntryIdRef.current = entryId;
        dragDocumentRef.current = draftDocument;
    });

    const handleDragOver = useEvent((index: number, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const dragEntryId = dragEntryIdRef.current;
        if (!dragEntryId) return;

        const fromIndex = dragDocumentRef.current.track.findIndex(entry => entry.id === dragEntryId);
        if (fromIndex === -1 || fromIndex === index) return;

        const nextDocument = moveTimelineEntry(dragDocumentRef.current, fromIndex, index);
        dragDocumentRef.current = nextDocument;
        setDraftDocument(nextDocument);
    });

    const handleDragEnd = useEvent(() => {
        dragEntryIdRef.current = null;
        if (dragDocumentRef.current !== document) {
            onDocumentChange(dragDocumentRef.current);
        }
    });

    const toolbar = React.useMemo(
        () =>
            pathMode ? (
                <Box p={3} bg="blue.50" borderWidth="1px" borderColor="blue.200" borderRadius="md">
                    <Flex justify="space-between" align="center" gap={3}>
                        <Flex align="center" gap={3} flex={1} wrap="wrap">
                            <Text fontWeight="bold" color="blue.800">
                                {t('header.timelinePage.selectDestNode')}
                            </Text>
                        </Flex>
                        <Button size="sm" variant="ghost" onClick={() => setPathMode(null)}>
                            {t('cancel')}
                        </Button>
                    </Flex>
                </Box>
            ) : (
                <Flex justify="space-between" align="center" wrap="wrap" gap={3} position="relative" flexShrink={0}>
                    <VStack
                        align="start"
                        spacing={1}
                        flex={1}
                        minW={0}
                        sx={{ [NARROW_SCREEN_QUERY]: { flexBasis: '100%' } }}
                    >
                        <HStack spacing={2}>
                            <Text fontSize="sm" fontWeight="bold">
                                {t('header.timelinePage.trackTitle')}
                            </Text>
                            <Badge>{draftDocument.track.length}</Badge>
                            <Text fontSize="xs" color="blue.600" noOfLines={1}>
                                {insertionLabel}
                            </Text>
                        </HStack>
                        {hasSelectedEntry ? (
                            <Text fontSize="xs" color="gray.500" noOfLines={1} w="full">
                                {getTimelineEntryTitle(graph, selectedEntry)}
                                {' · '}
                                {getTimelineEntrySubtitle(graph, selectedEntry)}
                            </Text>
                        ) : (
                            <Text fontSize="xs" color="gray.500" noOfLines={1} w="full">
                                {t('header.timelinePage.selectHint')}
                            </Text>
                        )}
                        {isCoverageComplete ? (
                            <Text fontSize="xs" color="green.600" noOfLines={1} w="full">
                                {t('header.timelinePage.coverageComplete')}
                            </Text>
                        ) : (
                            <HStack spacing={2} wrap="wrap" w="full">
                                <Text fontSize="xs" color="orange.600" noOfLines={1}>
                                    {t('header.timelinePage.missingCoverage', {
                                        nodeCount: missingNodeCount,
                                        edgeCount: missingEdgeCount,
                                    })}
                                </Text>
                                <Button
                                    size="xs"
                                    variant="link"
                                    colorScheme="orange"
                                    onClick={onToggleMissingHighlight}
                                >
                                    {isMissingHighlightShown
                                        ? t('header.timelinePage.clearMissingHighlight')
                                        : t('header.timelinePage.highlightMissing')}
                                </Button>
                            </HStack>
                        )}
                    </VStack>
                    <HStack
                        spacing={1}
                        position="absolute"
                        left="50%"
                        transform="translateX(-50%)"
                        sx={{
                            [NARROW_SCREEN_QUERY]: {
                                position: 'static',
                                transform: 'none',
                                flex: 1,
                                justifyContent: 'center',
                            },
                        }}
                        aria-label={t('header.timelinePage.playbackControls')}
                    >
                        <IconButton
                            size="md"
                            variant="ghost"
                            aria-label={t('header.timelinePage.previousFrame')}
                            icon={<MdSkipPrevious size="1.5em" />}
                            isDisabled={insertionIndex <= 0}
                            onClick={() => onCursorChange(insertionIndex - 1)}
                        />
                        <IconButton
                            size="md"
                            variant="solid"
                            colorScheme="purple"
                            aria-label={
                                isPlaying ? t('header.timelinePage.pausePreview') : t('header.timelinePage.playPreview')
                            }
                            icon={isPlaying ? <MdPause size="1.5em" /> : <MdPlayArrow size="1.5em" />}
                            isDisabled={!timing?.duration}
                            onClick={onTogglePlayback}
                        />
                        <IconButton
                            size="md"
                            variant="ghost"
                            aria-label={t('header.timelinePage.settings.title')}
                            icon={<MdSettings size="1.3em" />}
                            onClick={() => setIsSettingsOpen(true)}
                        />
                        <IconButton
                            size="md"
                            variant="ghost"
                            aria-label={t('header.timelinePage.nextFrame')}
                            icon={<MdSkipNext size="1.5em" />}
                            isDisabled={insertionIndex >= draftDocument.track.length}
                            onClick={() => onCursorChange(insertionIndex + 1)}
                        />
                    </HStack>

                    <HStack flexShrink={0} spacing={3} wrap="wrap" justify="flex-end">
                        {selectedEntry?.kind === 'node' && adjacentLineColors.length > 0 && (
                            <HStack
                                spacing={2}
                                wrap="wrap"
                                align="center"
                                px={3}
                                py={2}
                                bg="blue.50"
                                borderWidth="1px"
                                borderColor="blue.200"
                                borderRadius="md"
                            >
                                <Badge
                                    colorScheme="blue"
                                    variant="solid"
                                    borderRadius="md"
                                    px={2}
                                    py={1}
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1}
                                    textTransform="none"
                                >
                                    <MdAltRoute />
                                    {t('header.timelinePage.addPathByColor')}
                                </Badge>
                                {adjacentLineColors.map(info => {
                                    const isMultiColor = info.color.length > 1;
                                    const bg = isMultiColor
                                        ? `linear-gradient(135deg, ${info.color
                                              .map(
                                                  (c, i, arr) =>
                                                      `${c} ${(i * 100) / arr.length}%, ${c} ${((i + 1) * 100) / arr.length}%`
                                              )
                                              .join(', ')})`
                                        : info.color[0];
                                    const textColor = isMultiColor
                                        ? 'white'
                                        : info.color[0] === '#ffffff'
                                          ? 'black'
                                          : 'white';
                                    const borderWidth = !isMultiColor && info.color[0] === '#ffffff' ? '1px' : '0';

                                    return (
                                        <Button
                                            key={info.themeStr}
                                            size="sm"
                                            bg={bg}
                                            color={textColor}
                                            borderWidth={borderWidth}
                                            borderColor="gray.300"
                                            _hover={{ bg, filter: 'brightness(0.9)' }}
                                            onClick={() =>
                                                setPathMode({
                                                    startNode: selectedEntry.refId as NodeId,
                                                    themeStr: info.themeStr,
                                                })
                                            }
                                        >
                                            {info.label || '\u00A0\u00A0\u00A0\u00A0'}
                                        </Button>
                                    );
                                })}
                            </HStack>
                        )}
                        <Tooltip
                            label={
                                isDuplicate
                                    ? t('header.timelinePage.alreadyAdded')
                                    : t('header.timelinePage.addSelected')
                            }
                            hasArrow
                        >
                            <IconButton
                                aria-label={
                                    isDuplicate
                                        ? t('header.timelinePage.alreadyAdded')
                                        : t('header.timelinePage.addSelected')
                                }
                                variant="outline"
                                size="lg"
                                icon={<MdAdd />}
                                colorScheme="blue"
                                onClick={handleAddSelected}
                                isDisabled={!hasSelectedEntry || isDuplicate}
                            />
                        </Tooltip>
                    </HStack>
                </Flex>
            ),
        [
            pathMode,
            draftDocument.track.length,
            insertionLabel,
            hasSelectedEntry,
            selectedEntry,
            graph,
            renderContext.graphRefresh,
            isCoverageComplete,
            missingNodeCount,
            missingEdgeCount,
            isMissingHighlightShown,
            isPlaying,
            timing?.duration,
            insertionIndex,
            adjacentLineColors,
            isDuplicate,
            t,
            onToggleMissingHighlight,
            onCursorChange,
            onTogglePlayback,
            handleAddSelected,
        ]
    );

    return (
        <Flex direction="column" height="100%" p={3} gap={3}>
            {toolbar}

            <HStack spacing={4} flexShrink={0} px={2}>
                <Text fontSize="xs" color="gray.500" sx={{ fontVariantNumeric: 'tabular-nums' }} minW="58px">
                    {formatTimelineTime(playbackTime)}
                </Text>
                <Slider
                    aria-label={t('header.timelinePage.playbackPosition')}
                    value={playbackTime}
                    min={0}
                    max={timing?.duration || 1}
                    step={0.01}
                    isDisabled={!timing?.duration}
                    onChange={onSeek}
                    colorScheme="purple"
                >
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={3} />
                </Slider>
                <Text
                    fontSize="xs"
                    color="gray.500"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                    minW="58px"
                    textAlign="right"
                >
                    {formatTimelineTime(timing?.duration ?? 0)}
                </Text>
            </HStack>

            <Box
                flex="1"
                minH={0}
                borderWidth="1px"
                borderRadius="xl"
                px={2}
                py={2}
                overflow="hidden"
                bg="blackAlpha.50"
            >
                {draftDocument.track.length > 0 ||
                (draftDocument.audioTrack?.length ?? 0) > 0 ||
                (draftDocument.labelTrack?.length ?? 0) > 0 ? (
                    <TimelineTrack
                        document={draftDocument}
                        graph={graph}
                        graphRefresh={renderContext.graphRefresh}
                        insertionIndex={insertionIndex}
                        onSelectEntry={entry => {
                            setSelectedEntryIds(new Set([entry.id]));
                            onSelectEntry(entry);
                        }}
                        selectedEntryIds={selectedEntryIds}
                        onSelectionChange={ids => setSelectedEntryIds(new Set(ids))}
                        onToggleAnimation={handleToggleAnimation}
                        onPauseDurationChange={handlePauseDurationChange}
                        onInsertionIndexChange={onCursorChange}
                        onRemoveEntry={handleRemoveEntries}
                        onRemoveSelectedEntries={handleRemoveEntries}
                        onReverseSelectedEntries={handleReverseSelectedEntries}
                        onToggleSelectedAnimation={handleToggleAnimation}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDocumentChange={next => {
                            setDraftDocument(next);
                            onDocumentChange(next);
                        }}
                        timing={timing}
                        playbackTime={playbackTime}
                        onSeek={onSeek}
                    />
                ) : (
                    <Flex height="100%" align="center" justify="center" color="gray.500">
                        {t('header.timelinePage.empty')}
                    </Flex>
                )}
            </Box>
            {isSettingsOpen && (
                <TimelineSettingsModal
                    document={document}
                    mapEnabled={mapEnabled}
                    onDocumentChange={onDocumentChange}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onOpenLineInformation={() => setIsLineInformationOpen(true)}
                />
            )}
            {isLineInformationOpen && <TimelineLineInfoModal isOpen onClose={() => setIsLineInformationOpen(false)} />}
        </Flex>
    );
}
