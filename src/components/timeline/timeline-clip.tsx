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
    cardWidth?: number;
    onSelect: () => void;
    onToggleAnimation: () => void;
    onRemove: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function TimelineClip({
    entry,
    graph,
    isSelected,
    cardWidth = TIMELINE_CLIP_WIDTH,
    onSelect,
    onToggleAnimation,
    onRemove,
    onPointerDown,
    onContextMenu,
}: TimelineClipProps) {
    const { t } = useTranslation();
    const accent = getTimelineEntryAccent(graph, entry);
    const exists = entry.kind === 'node' ? graph.hasNode(entry.refId) : graph.hasEdge(entry.refId);

    const isMultiColor = accent.length > 1;
    const borderColor = accent[0];
    const title = getTimelineEntryTitle(graph, entry);
    const subtitle = getTimelineEntrySubtitle(graph, entry);

    return (
        <Box
            data-timeline-card="true"
            onPointerDown={onPointerDown}
            onClick={onSelect}
            onContextMenu={onContextMenu}
            minW={`${cardWidth}px`}
            maxW={`${cardWidth}px`}
            w={`${cardWidth}px`}
            flexShrink={0}
            px={cardWidth < 80 ? 1.5 : cardWidth < 100 ? 2 : 3}
            py={cardWidth < 80 ? 1 : cardWidth < 100 ? 1.5 : 2}
            borderWidth="1px"
            borderRadius="md"
            borderColor={isSelected ? borderColor : 'chakra-border-color'}
            bg={isSelected ? 'blackAlpha.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
            _hover={{ borderColor: borderColor }}
            overflow="hidden"
            sx={{ touchAction: 'pan-y' }}
            userSelect="none"
        >
            {isMultiColor ? (
                <Box
                    position="absolute"
                    top="0"
                    left="0"
                    bottom="0"
                    width={cardWidth < 80 ? '3px' : '4px'}
                    overflow="hidden"
                    borderLeftRadius="md"
                >
                    {accent.map((color, index) => (
                        <Box key={index} h={`${100 / accent.length}%`} bg={color} />
                    ))}
                </Box>
            ) : (
                <Box
                    position="absolute"
                    top="0"
                    left="0"
                    bottom="0"
                    width={cardWidth < 80 ? '3px' : '4px'}
                    bg={accent[0]}
                    borderLeftRadius="md"
                />
            )}
            <CloseButton
                size="sm"
                w={cardWidth < 90 ? '18px' : '24px'}
                h={cardWidth < 90 ? '18px' : '24px'}
                fontSize={cardWidth < 90 ? '9px' : '2xs'}
                position="absolute"
                top={cardWidth < 90 ? '2px' : '4px'}
                right={cardWidth < 90 ? '2px' : '4px'}
                onClick={e => {
                    e.stopPropagation();
                    onRemove();
                }}
            />

            <VStack
                align="start"
                spacing={cardWidth < 80 ? 0.5 : 1}
                pl={cardWidth < 80 ? 0.5 : 1}
                w="full"
                minW={0}
                overflow="hidden"
            >
                <Flex align="center" gap={0.5} wrap="wrap" pr={cardWidth < 90 ? 4 : 5} maxW="full">
                    <Badge
                        colorScheme={entry.kind === 'node' ? 'blue' : 'green'}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        fontSize={cardWidth < 100 ? '9px' : '10px'}
                        lineHeight={cardWidth < 100 ? '14px' : '16px'}
                        px={cardWidth < 80 ? 0.5 : 1}
                        maxW="full"
                        isTruncated
                    >
                        {entry.kind === 'node' ? 'Node' : 'Edge'}
                    </Badge>
                    <Badge
                        colorScheme={entry.phase === 'exit' ? 'orange' : 'teal'}
                        variant="subtle"
                        fontSize={cardWidth < 100 ? '9px' : '10px'}
                        lineHeight={cardWidth < 100 ? '14px' : '16px'}
                        px={cardWidth < 80 ? 0.5 : 1}
                        maxW="full"
                        isTruncated
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
                            minW="auto"
                            h={cardWidth < 100 ? '16px' : '20px'}
                            w={cardWidth < 100 ? '16px' : '20px'}
                            fontSize={cardWidth < 100 ? '11px' : '14px'}
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
                <Text
                    fontSize={cardWidth < 90 ? '11px' : cardWidth < 120 ? '12px' : '13px'}
                    fontWeight="bold"
                    lineHeight="1.25"
                    noOfLines={2}
                    w="full"
                    wordBreak="break-word"
                    overflowWrap="anywhere"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    title={title}
                >
                    {title}
                </Text>
                <Text
                    fontSize={cardWidth < 90 ? '10px' : '11px'}
                    lineHeight="1.25"
                    color="gray.500"
                    noOfLines={cardWidth < 80 ? 1 : 2}
                    w="full"
                    wordBreak="break-word"
                    overflowWrap="anywhere"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    title={subtitle}
                >
                    {subtitle}
                </Text>
                {!exists && (
                    <Text
                        fontSize="10px"
                        lineHeight="1.25"
                        color="red.500"
                        noOfLines={1}
                        isTruncated
                        w="full"
                        title="Missing from current graph"
                    >
                        Missing from current graph
                    </Text>
                )}
            </VStack>
        </Box>
    );
}
