import { Badge, Box, Button, Flex, HStack, IconButton, Text, Tooltip, VStack, useToast } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdAltRoute, MdPause, MdPlayArrow, MdSkipNext, MdSkipPrevious, MdSwapHoriz } from 'react-icons/md';
import { Id, NodeId } from '../../constants/constants';
import { isElementEntry, TimelineDocument, TimelineEntry } from '../../constants/timeline';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setTimelineCursor } from '../../redux/runtime/runtime-slice';
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
import TimelineTrack from './timeline-track';

interface TimelineTrackPanelProps {
    document: TimelineDocument;
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
}

export default function TimelineTrackPanel({
    document,
    selectedId,
    selectedEntryId,
    missingNodeCount,
    missingEdgeCount,
    isCoverageComplete,
    isMissingHighlightShown,
    onToggleMissingHighlight,
    onSelectEntry,
    onCursorChange,
    onDocumentChange,
}: TimelineTrackPanelProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const [draftDocument, setDraftDocument] = React.useState(document);
    const dragEntryIdRef = React.useRef<string | null>(null);
    const dragDocumentRef = React.useRef(document);

    const [pathMode, setPathMode] = React.useState<{
        startNode: NodeId;
        themeStr: string;
    } | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    const {
        timelineCursor: insertionIndex,
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);
    const isPro = draftDocument.mode === 'pro';

    React.useEffect(() => {
        if (!isPlaying || !isPro) return;

        const timer = window.setInterval(() => {
            const next = insertionIndex + 1;
            if (next > draftDocument.track.length) {
                setIsPlaying(false);
                return;
            }
            onCursorChange(next);
        }, 300);

        return () => window.clearInterval(timer);
    }, [draftDocument.track.length, insertionIndex, isPlaying, isPro, onCursorChange]);

    React.useEffect(() => {
        setDraftDocument(document);
        dragDocumentRef.current = document;
    }, [document]);

    React.useEffect(() => {
        if (document.track.length < insertionIndex) dispatch(setTimelineCursor(document.track.length));
    }, [document.track.length, dispatch, insertionIndex]);

    React.useEffect(() => {
        if (!isPro) setIsPlaying(false);
    }, [isPro]);

    React.useEffect(() => {
        if (pathMode && selectedId && !selectedId.startsWith('line_') && selectedId !== pathMode.startNode) {
            const destNode = selectedId as NodeId;
            const path = findShortestPathByLine(graph.current, pathMode.startNode, destNode, pathMode.themeStr);
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
    }, [selectedId, pathMode, draftDocument, insertionIndex, onDocumentChange, t, toast]);

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
    const handleToggleMode = () => {
        const nextDocument: TimelineDocument = { ...draftDocument, mode: isPro ? 'quick' : 'pro' };
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    };
    const insertionLabel =
        insertionIndex === draftDocument.track.length
            ? t('header.timelinePage.cursorEnd')
            : t('header.timelinePage.cursorBefore', { position: insertionIndex + 1 });

    const adjacentLineColors = React.useMemo(() => {
        if (selectedEntry?.kind === 'node') {
            return getAdjacentLineColors(graph.current, selectedEntry.refId as NodeId);
        }
        return [];
    }, [selectedEntry, refreshEdges]);

    const handleAddSelected = () => {
        if (!selectedId) return;
        const nextDocument = insertTimelineEntry(draftDocument, selectedId, insertionIndex);
        if (nextDocument === draftDocument) return;

        onCursorChange(Math.min(insertionIndex, draftDocument.track.length) + 1);
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    };

    const handleRemoveEntry = (entryId: string) => {
        const nextDocument = removeTimelineEntry(draftDocument, entryId);
        if (nextDocument === draftDocument) return;

        const remainingIds = new Set(nextDocument.track.map(entry => entry.id));
        const nextCursor = draftDocument.track
            .slice(0, insertionIndex)
            .filter(entry => remainingIds.has(entry.id)).length;
        onCursorChange(nextCursor);
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    };
    const handleToggleAnimation = (entryId: string) => {
        const nextDocument: TimelineDocument = {
            ...draftDocument,
            track: draftDocument.track.map(entry =>
                entry.id === entryId && isElementEntry(entry)
                    ? { ...entry, showAnimation: !entry.showAnimation }
                    : entry
            ),
        };
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    };

    const handleDragStart = (entryId: string) => {
        dragEntryIdRef.current = entryId;
        dragDocumentRef.current = draftDocument;
    };

    const handleDragOver = (index: number, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const dragEntryId = dragEntryIdRef.current;
        if (!dragEntryId) return;

        const fromIndex = dragDocumentRef.current.track.findIndex(entry => entry.id === dragEntryId);
        if (fromIndex === -1 || fromIndex === index) return;

        const nextDocument = moveTimelineEntry(dragDocumentRef.current, fromIndex, index);
        dragDocumentRef.current = nextDocument;
        setDraftDocument(nextDocument);
    };

    const handleDragEnd = () => {
        dragEntryIdRef.current = null;
        if (dragDocumentRef.current !== document) {
            onDocumentChange(dragDocumentRef.current);
        }
    };

    return (
        <Flex direction="column" height="100%" p={4} gap={4}>
            {pathMode ? (
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
                <Flex justify="space-between" align="center" wrap="wrap" gap={3} position="relative">
                    <VStack align="start" spacing={1} flex={1} minW={0}>
                        <HStack spacing={2}>
                            <Text fontWeight="bold">{t('header.timelinePage.trackTitle')}</Text>
                            <Badge>{draftDocument.track.length}</Badge>
                            <Text fontSize="xs" color="blue.600" noOfLines={1}>
                                {insertionLabel}
                            </Text>
                            <Tooltip
                                label={
                                    isPro
                                        ? t('header.timelinePage.switchToQuick')
                                        : t('header.timelinePage.switchToPro')
                                }
                                hasArrow
                            >
                                <Badge
                                    as="button"
                                    type="button"
                                    aria-label={
                                        isPro
                                            ? t('header.timelinePage.switchToQuick')
                                            : t('header.timelinePage.switchToPro')
                                    }
                                    colorScheme={isPro ? 'purple' : 'blue'}
                                    variant="subtle"
                                    borderRadius="md"
                                    px={2}
                                    py={1}
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1}
                                    textTransform="none"
                                    cursor="pointer"
                                    onClick={handleToggleMode}
                                >
                                    <MdSwapHoriz />
                                    {isPro ? t('header.timelinePage.quickMode') : t('header.timelinePage.proMode')}
                                </Badge>
                            </Tooltip>
                        </HStack>
                        {hasSelectedEntry ? (
                            <Text fontSize="sm" color="gray.500" noOfLines={1} w="full">
                                {getTimelineEntryTitle(graph.current, selectedEntry)}
                                {' · '}
                                {getTimelineEntrySubtitle(graph.current, selectedEntry)}
                            </Text>
                        ) : (
                            <Text fontSize="sm" color="gray.500" noOfLines={1} w="full">
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
                    {isPro && (
                        <HStack
                            spacing={1}
                            position="absolute"
                            left="50%"
                            transform="translateX(-50%)"
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
                                    isPlaying
                                        ? t('header.timelinePage.pausePreview')
                                        : t('header.timelinePage.playPreview')
                                }
                                icon={isPlaying ? <MdPause size="1.5em" /> : <MdPlayArrow size="1.5em" />}
                                onClick={() => setIsPlaying(value => !value)}
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
                    )}

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
                                    {t('header.timelinePage.addPathFromHere')}
                                </Badge>
                                <Text fontSize="xs" color="blue.700" fontWeight="medium">
                                    {t('header.timelinePage.addPathByColor')}
                                </Text>
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
            )}

            <Box
                flex="1"
                minH={0}
                borderWidth="1px"
                borderRadius="xl"
                px={4}
                py={4}
                overflow="hidden"
                bg="blackAlpha.50"
            >
                {draftDocument.track.length > 0 ? (
                    <TimelineTrack
                        key={`${refreshNodes}-${refreshEdges}`}
                        document={draftDocument}
                        graph={graph.current}
                        selectedId={selectedId}
                        selectedEntryId={selectedEntryId}
                        insertionIndex={insertionIndex}
                        onSelectEntry={onSelectEntry}
                        onToggleAnimation={handleToggleAnimation}
                        onInsertionIndexChange={onCursorChange}
                        onRemoveEntry={handleRemoveEntry}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    />
                ) : (
                    <Flex height="100%" align="center" justify="center" color="gray.500">
                        {t('header.timelinePage.empty')}
                    </Flex>
                )}
            </Box>
        </Flex>
    );
}
