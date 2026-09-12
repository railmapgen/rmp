import { Badge, Box, CloseButton, Flex, IconButton, Text, Tooltip, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MultiDirectedGraph } from 'graphology';
import { MdAnimation } from 'react-icons/md';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { TimelineElementEntry } from '../../constants/timeline';
import { getTimelineEntryAccent, getTimelineEntrySubtitle, getTimelineEntryTitle } from '../../util/timeline';

interface TimelineClipProps {
    entry: TimelineElementEntry;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    isPro: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onToggleAnimation: () => void;
    onRemove: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

export default function TimelineClip({
    entry,
    graph,
    isPro,
    isSelected,
    onSelect,
    onToggleAnimation,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
}: TimelineClipProps) {
    const { t } = useTranslation();
    const accent = getTimelineEntryAccent(graph, entry);
    const exists = entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId);

    const isMultiColor = accent.length > 1;
    const borderColor = accent[0];

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
            borderColor={isSelected ? borderColor : 'chakra-border-color'}
            bg={isSelected ? 'blackAlpha.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
            _hover={{ borderColor: borderColor }}
            overflow="hidden"
        >
            {isMultiColor ? (
                <Box
                    position="absolute"
                    top="0"
                    left="0"
                    bottom="0"
                    width="6px"
                    overflow="hidden"
                    borderLeftRadius="lg"
                >
                    {accent.map((color, index) => (
                        <Box key={index} h={`${100 / accent.length}%`} bg={color} />
                    ))}
                </Box>
            ) : (
                <Box position="absolute" top="0" left="0" bottom="0" width="6px" bg={accent[0]} borderLeftRadius="lg" />
            )}
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
                <Flex align="center" gap={1} wrap="wrap">
                    <Badge
                        colorScheme={entry.kind === 'node' ? 'blue' : 'green'}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                    >
                        {entry.kind === 'node' ? 'Node' : 'Edge'}
                    </Badge>
                    {isPro && (
                        <Badge colorScheme={entry.phase === 'exit' ? 'orange' : 'teal'} variant="subtle">
                            {entry.phase === 'exit'
                                ? t('header.timelinePage.exitPhase')
                                : t('header.timelinePage.enterPhase')}
                        </Badge>
                    )}
                    {isPro && (
                        <Tooltip label={t('header.timelinePage.showAnimation')} hasArrow>
                            <IconButton
                                aria-label={t('header.timelinePage.showAnimation')}
                                aria-pressed={entry.showAnimation}
                                icon={<MdAnimation />}
                                size="xs"
                                variant="ghost"
                                color={entry.showAnimation ? 'gray.500' : 'gray.300'}
                                opacity={entry.showAnimation ? 1 : 0.55}
                                onClick={e => {
                                    e.stopPropagation();
                                    onToggleAnimation();
                                }}
                            />
                        </Tooltip>
                    )}
                </Flex>
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
