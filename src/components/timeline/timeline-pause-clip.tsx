import { Box, CloseButton, Flex, Input, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelinePauseEntry } from '../../constants/timeline';
import { TIMELINE_CLIP_WIDTH } from './timeline-track-dimensions';

interface TimelinePauseClipProps {
    entry: TimelinePauseEntry;
    isSelected: boolean;
    cardWidth?: number;
    onSelect: () => void;
    onDurationChange: (duration: number) => void;
    onRemove: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function TimelinePauseClip({
    entry,
    isSelected,
    cardWidth = TIMELINE_CLIP_WIDTH,
    onSelect,
    onDurationChange,
    onRemove,
    onPointerDown,
    onContextMenu,
}: TimelinePauseClipProps) {
    const { t } = useTranslation();
    const label =
        entry.position === 'before'
            ? t('header.timelinePage.framePauseBefore')
            : t('header.timelinePage.framePauseAfter');

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
            borderColor={isSelected ? 'purple.500' : 'chakra-border-color'}
            bg={isSelected ? 'purple.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
            overflow="hidden"
            sx={{ touchAction: 'pan-y' }}
            userSelect="none"
        >
            <Box
                position="absolute"
                top="0"
                left="0"
                bottom="0"
                width={cardWidth < 80 ? '3px' : '4px'}
                bg="purple.500"
                borderLeftRadius="md"
            />
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
                spacing={cardWidth < 80 ? 1 : 1.5}
                pl={cardWidth < 80 ? 0.5 : 1}
                w="full"
                minW={0}
                overflow="hidden"
            >
                <Text
                    fontSize={cardWidth < 90 ? '11px' : cardWidth < 120 ? '12px' : '13px'}
                    fontWeight="bold"
                    lineHeight="1.25"
                    noOfLines={2}
                    pr={cardWidth < 90 ? 3 : 5}
                    w="full"
                    wordBreak="break-word"
                    overflowWrap="anywhere"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    title={label}
                >
                    {label}
                </Text>
                <Flex align="center" gap={1} onClick={e => e.stopPropagation()} w="full" minW={0}>
                    <Input
                        aria-label={t('header.timelinePage.pauseDuration')}
                        type="number"
                        min={0}
                        step={0.1}
                        size={cardWidth < 100 ? 'xs' : 'sm'}
                        h={cardWidth < 100 ? '22px' : '28px'}
                        w="full"
                        maxW={cardWidth < 90 ? '42px' : cardWidth < 120 ? '54px' : '72px'}
                        minW="30px"
                        px={1}
                        fontSize={cardWidth < 100 ? '11px' : '12px'}
                        value={entry.duration}
                        onChange={e => onDurationChange(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Text
                        fontSize={cardWidth < 90 ? '10px' : '11px'}
                        color="gray.500"
                        flexShrink={0}
                        noOfLines={1}
                        isTruncated
                    >
                        {cardWidth < 70 ? 's' : t('header.timelinePage.seconds')}
                    </Text>
                </Flex>
            </VStack>
        </Box>
    );
}
