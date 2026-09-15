import { Box, CloseButton, Flex, Input, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelinePauseEntry } from '../../constants/timeline';

interface TimelinePauseClipProps {
    entry: TimelinePauseEntry;
    isSelected: boolean;
    onSelect: () => void;
    onDurationChange: (duration: number) => void;
    onRemove: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function TimelinePauseClip({
    entry,
    isSelected,
    onSelect,
    onDurationChange,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
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
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            onContextMenu={onContextMenu}
            minW="220px"
            maxW="220px"
            px={4}
            py={3}
            borderWidth="1px"
            borderRadius="lg"
            borderColor={isSelected ? 'purple.500' : 'chakra-border-color'}
            bg={isSelected ? 'purple.50' : 'chakra-body-bg'}
            boxShadow={isSelected ? 'md' : 'sm'}
            cursor="pointer"
            position="relative"
        >
            <Box position="absolute" top="0" left="0" bottom="0" width="6px" bg="purple.500" borderLeftRadius="lg" />
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
                <Text fontWeight="bold">{label}</Text>
                <Flex align="center" gap={2} onClick={e => e.stopPropagation()}>
                    <Input
                        aria-label={t('header.timelinePage.pauseDuration')}
                        type="number"
                        min={0}
                        step={0.1}
                        size="sm"
                        value={entry.duration}
                        onChange={e => onDurationChange(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Text fontSize="sm" color="gray.500">
                        {t('header.timelinePage.seconds')}
                    </Text>
                </Flex>
            </VStack>
        </Box>
    );
}
