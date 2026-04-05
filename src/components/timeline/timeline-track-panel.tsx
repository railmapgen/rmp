import { Badge, Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes, NodeId } from '../../constants/constants';
import { TimelineDocument } from '../../constants/timeline';
import { useRootSelector } from '../../redux';
import {
    appendTimelineEntry,
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
    const graph = React.useRef(window.graph);
    const [draftDocument, setDraftDocument] = React.useState(document);
    const dragEntryIdRef = React.useRef<string | null>(null);
    const dragDocumentRef = React.useRef(document);

    const {
        refresh: { nodes: refreshNodes, edges: refreshEdges },
    } = useRootSelector(state => state.runtime);

    React.useEffect(() => {
        setDraftDocument(document);
        dragDocumentRef.current = document;
    }, [document]);

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
            <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <VStack align="start" spacing={1}>
                    <HStack spacing={2}>
                        <Text fontWeight="bold">{t('header.timelinePage.trackTitle')}</Text>
                        <Badge>{draftDocument.track.length}</Badge>
                    </HStack>
                    {hasSelectedEntry ? (
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>
                            {getTimelineEntryTitle(graph.current, selectedEntry)}
                            {' · '}
                            {getTimelineEntrySubtitle(graph.current, selectedEntry)}
                        </Text>
                    ) : (
                        <Text fontSize="sm" color="gray.500">
                            {t('header.timelinePage.selectHint')}
                        </Text>
                    )}
                </VStack>

                <Button onClick={handleAddSelected} isDisabled={!hasSelectedEntry || isDuplicate}>
                    {isDuplicate ? t('header.timelinePage.alreadyAdded') : t('header.timelinePage.addSelected')}
                </Button>
            </Flex>

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
