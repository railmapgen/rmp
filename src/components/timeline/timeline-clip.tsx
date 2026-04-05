import { Badge, Box, CloseButton, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../../constants/constants';
import { TimelineEntry } from '../../constants/timeline';
import { getTimelineEntryAccent, getTimelineEntrySubtitle, getTimelineEntryTitle } from '../../util/timeline';

interface TimelineClipProps {
    entry: TimelineEntry;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

export default function TimelineClip({
    entry,
    graph,
    isSelected,
    onSelect,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
}: TimelineClipProps) {
    const accent = getTimelineEntryAccent(graph, entry);
    const exists = entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId);

    return (
        <Box
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            minW="220px"
            maxW="220px"
            px={4}
            py={3}
            borderWidth="1px"
            borderRadius="lg"
            borderColor={isSelected ? accent : 'chakra-border-color'}
            bg={isSelected ? 'blackAlpha.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
            _hover={{ borderColor: accent }}
        >
            <Box position="absolute" top="0" left="0" bottom="0" width="6px" bg={accent} borderLeftRadius="lg" />
            <CloseButton
                size="sm"
                position="absolute"
                top="8px"
                right="8px"
                onClick={e => {
                    e.stopPropagation();
                    onRemove();
                }}
            />

            <VStack align="start" spacing={2} pl={2} pr={6}>
                <Badge colorScheme={entry.kind === 'node' ? 'blue' : 'green'}>
                    {entry.kind === 'node' ? 'Node' : 'Edge'}
                </Badge>
                <Text fontWeight="bold" noOfLines={2}>
                    {getTimelineEntryTitle(graph, entry)}
                </Text>
                <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {getTimelineEntrySubtitle(graph, entry)}
                </Text>
                {!exists && (
                    <Text fontSize="xs" color="red.500">
                        Missing from current graph
                    </Text>
                )}
            </VStack>
        </Box>
    );
}
