import { Badge, Box, Button, Flex, HStack, Text, VStack, useToast } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id, NodeId } from '../../constants/constants';
import { TimelineDocument } from '../../constants/timeline';
import { useRootSelector } from '../../redux';
import {
    appendTimelineEntry,
    appendTimelineEntries,
    findShortestPathByLine,
    getAdjacentLineColors,
    getTimelineEntrySubtitle,
    getTimelineEntryTitle,
    moveTimelineEntry,
    removeTimelineEntry,
} from '../../util/timeline';
import TimelineTrack from './timeline-track';

interface TimelineTrackPanelProps {
    document: TimelineDocument;
    selectedId?: Id;
    onSelectEntry: (refId: Id) => void;
    onDocumentChange: (document: TimelineDocument) => void;
}

export default function TimelineTrackPanel({
    document,
    selectedId,
    onSelectEntry,
    onDocumentChange,
}: TimelineTrackPanelProps) {
    const { t } = useTranslation();
    const toast = useToast();
    const graph = React.useRef(window.graph);
    const [draftDocument, setDraftDocument] = React.useState(document);
    const dragEntryIdRef = React.useRef<string | null>(null);
    const dragDocumentRef = React.useRef(document);

    const [pathMode, setPathMode] = React.useState<{
        startNode: NodeId;
        step: 'select_color' | 'select_dest';
        themeStr?: string;
    } | null>(null);

    const {
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);

    React.useEffect(() => {
        setDraftDocument(document);
        dragDocumentRef.current = document;
    }, [document]);

    React.useEffect(() => {
        if (
            pathMode?.step === 'select_dest' &&
            selectedId &&
            !selectedId.startsWith('line_') &&
            selectedId !== pathMode.startNode
        ) {
            const destNode = selectedId as NodeId;
            const path = findShortestPathByLine(graph.current, pathMode.startNode, destNode, pathMode.themeStr!);
            if (path) {
                const nextDocument = appendTimelineEntries(draftDocument, path);
                const addedCount = nextDocument.track.length - draftDocument.track.length;
                if (addedCount > 0) {
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
    }, [selectedId, pathMode, draftDocument, onDocumentChange, t, toast]);

    const selectedEntry = React.useMemo(() => {
        if (!selectedId) return undefined;
        if (selectedId.startsWith('line_')) {
            return {
                id: 'selected',
                kind: 'edge' as const,
                refId: selectedId as `line_${string}`,
            };
        }
        return {
            id: 'selected',
            kind: 'node' as const,
            refId: selectedId as NodeId,
        };
    }, [selectedId]);

    const hasSelectedEntry = !!selectedEntry;
    const isDuplicate = !!selectedId && draftDocument.track.some(entry => entry.refId === selectedId);

    const adjacentLineColors = React.useMemo(() => {
        if (selectedEntry?.kind === 'node') {
            return getAdjacentLineColors(graph.current, selectedEntry.refId as NodeId);
        }
        return [];
    }, [selectedEntry, refreshEdges]);

    const handleAddSelected = () => {
        if (!selectedId) return;
        const nextDocument = appendTimelineEntry(draftDocument, selectedId);
        setDraftDocument(nextDocument);
        onDocumentChange(nextDocument);
    };

    const handleRemoveEntry = (entryId: string) => {
        const nextDocument = removeTimelineEntry(draftDocument, entryId);
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
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                    <VStack align="start" spacing={1} flex={1} minW={0}>
                        <HStack spacing={2}>
                            <Text fontWeight="bold">{t('header.timelinePage.trackTitle')}</Text>
                            <Badge>{draftDocument.track.length}</Badge>
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
                    </VStack>

                    <HStack flexShrink={0} spacing={3} wrap="wrap" justify="flex-end">
                        {selectedEntry?.kind === 'node' && adjacentLineColors.length > 0 && (
                            <>
                                <Text fontSize="sm" color="gray.500">
                                    {t('header.timelinePage.addPathByColor')}
                                </Text>
                                <HStack spacing={2} wrap="wrap">
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
                                                        step: 'select_dest',
                                                        themeStr: info.themeStr,
                                                    })
                                                }
                                            >
                                                {info.label || '\u00A0\u00A0\u00A0\u00A0'}
                                            </Button>
                                        );
                                    })}
                                </HStack>
                                <Box w="1px" h="20px" bg="gray.300" />
                            </>
                        )}
                        <Button onClick={handleAddSelected} isDisabled={!hasSelectedEntry || isDuplicate}>
                            {isDuplicate ? t('header.timelinePage.alreadyAdded') : t('header.timelinePage.addSelected')}
                        </Button>
                    </HStack>
                </Flex>
            )}

            <Box flex="1" borderWidth="1px" borderRadius="xl" px={4} py={4} overflow="hidden" bg="blackAlpha.50">
                {draftDocument.track.length > 0 ? (
                    <TimelineTrack
                        key={`${refreshNodes}-${refreshEdges}`}
                        document={draftDocument}
                        graph={graph.current}
                        selectedId={selectedId}
                        onSelectEntry={onSelectEntry}
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
