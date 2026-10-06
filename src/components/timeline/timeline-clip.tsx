import { Badge, Box, CloseButton, Flex, IconButton, Text, Tooltip, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MultiDirectedGraph } from 'graphology';
import { MdAnimation } from 'react-icons/md';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { TimelineElementEntry } from '../../constants/timeline';
import { getTimelineEntryAccent, getTimelineEntrySubtitle, getTimelineEntryTitle } from '../../util/timeline';
import { TIMELINE_CLIP_WIDTH } from './timeline-track-dimensions';

interface TimelineClipProps {
    entry: TimelineElementEntry;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    isSelected: boolean;
    onSelect: () => void;
    onToggleAnimation: () => void;
    onRemove: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function TimelineClip({
    entry,
    graph,
    isSelected,
    onSelect,
    onToggleAnimation,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
    onContextMenu,
}: TimelineClipProps) {
    const { t } = useTranslation();
    const accent = getTimelineEntryAccent(graph, entry);
    const exists = entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId);

    const isMultiColor = accent.length > 1;
    const borderColor = accent[0];

    return (
        <Box
            data-timeline-card="true"
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            onContextMenu={onContextMenu}
            minW={`${TIMELINE_CLIP_WIDTH}px`}
            maxW={`${TIMELINE_CLIP_WIDTH}px`}
            px={3}
            py={2}
            borderWidth="1px"
            borderRadius="md"
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
                    width="4px"
                    overflow="hidden"
                    borderLeftRadius="md"
                >
                    {accent.map((color, index) => (
                        <Box key={index} h={`${100 / accent.length}%`} bg={color} />
                    ))}
                </Box>
            ) : (
                <Box position="absolute" top="0" left="0" bottom="0" width="4px" bg={accent[0]} borderLeftRadius="md" />
            )}
            <CloseButton
                size="sm"
                position="absolute"
                top="4px"
                right="4px"
                onClick={e => {
                    e.stopPropagation();
                    onRemove();
                }}
            />

            <VStack align="start" spacing={1} pl={1}>
                <Flex align="center" gap={0.5} wrap="wrap" pr={5}>
                    <Badge
                        colorScheme={entry.kind === 'node' ? 'blue' : 'green'}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        fontSize="10px"
                        lineHeight="16px"
                        px={1}
                    >
                        {entry.kind === 'node' ? 'Node' : 'Edge'}
                    </Badge>
                    <Badge
                        colorScheme={entry.phase === 'exit' ? 'orange' : 'teal'}
                        variant="subtle"
                        fontSize="10px"
                        lineHeight="16px"
                        px={1}
                    >
                        {entry.phase === 'exit'
                            ? t('header.timelinePage.exitPhase')
                            : t('header.timelinePage.enterPhase')}
                    </Badge>
                    <Tooltip label={t('header.timelinePage.showAnimation')} hasArrow>
                        <IconButton
                            aria-label={t('header.timelinePage.showAnimation')}
                            aria-pressed={entry.showAnimation}
                            icon={<MdAnimation />}
                            size="xs"
                            fontSize="14px"
                            variant="ghost"
                            color={entry.showAnimation ? 'gray.500' : 'gray.300'}
                            opacity={entry.showAnimation ? 1 : 0.55}
                            onClick={e => {
                                e.stopPropagation();
                                onToggleAnimation();
                            }}
                        />
                    </Tooltip>
                </Flex>
                <Text fontSize="13px" fontWeight="bold" lineHeight="1.3" noOfLines={2}>
                    {getTimelineEntryTitle(graph, entry)}
                </Text>
                <Text fontSize="11px" lineHeight="1.35" color="gray.500" noOfLines={2}>
                    {getTimelineEntrySubtitle(graph, entry)}
                </Text>
                {!exists && (
                    <Text fontSize="11px" lineHeight="1.35" color="red.500">
                        Missing from current graph
                    </Text>
                )}
            </VStack>
        </Box>
    );
}
