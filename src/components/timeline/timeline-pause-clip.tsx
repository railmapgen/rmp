import { Box, CloseButton, Flex, Input, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelinePauseEntry } from '../../constants/timeline';
import { TIMELINE_CLIP_WIDTH } from './timeline-track-dimensions';

interface TimelinePauseClipProps {
    entry: TimelinePauseEntry;
    isSelected: boolean;
    onSelect: () => void;
    onDurationChange: (duration: number) => void;
    onRemove: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function TimelinePauseClip({
    entry,
    isSelected,
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
            minW={`${TIMELINE_CLIP_WIDTH}px`}
            maxW={`${TIMELINE_CLIP_WIDTH}px`}
            px={3}
            py={2}
            borderWidth="1px"
            borderRadius="md"
            borderColor={isSelected ? 'purple.500' : 'chakra-border-color'}
            bg={isSelected ? 'purple.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
            sx={{ touchAction: 'pan-y' }}
            userSelect="none"
        >
            <Box position="absolute" top="0" left="0" bottom="0" width="4px" bg="purple.500" borderLeftRadius="md" />
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
            <VStack align="start" spacing={1.5} pl={1}>
                <Text fontSize="13px" fontWeight="bold" lineHeight="1.3" noOfLines={2} pr={5}>
                    {label}
                </Text>
                <Flex align="center" gap={1.5} onClick={e => e.stopPropagation()}>
                    <Input
                        aria-label={t('header.timelinePage.pauseDuration')}
                        type="number"
                        min={0}
                        step={0.1}
                        size="sm"
                        h="28px"
                        w="72px"
                        minW={0}
                        px={2}
                        fontSize="12px"
                        value={entry.duration}
                        onChange={e => onDurationChange(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Text fontSize="11px" color="gray.500">
                        {t('header.timelinePage.seconds')}
                    </Text>
                </Flex>
            </VStack>
        </Box>
    );
}
