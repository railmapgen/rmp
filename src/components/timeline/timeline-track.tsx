import { Box, HStack, Tooltip } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../../constants/constants';
import { TimelineDocument } from '../../constants/timeline';
import TimelineClip from './timeline-clip';

interface TimelineTrackProps {
    document: TimelineDocument;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    selectedId?: Id;
    insertionIndex: number;
    onSelectEntry: (refId: Id) => void;
    onInsertionIndexChange: (index: number) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string) => void;
    onDragOver: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

export default function TimelineTrack({
    document,
    graph,
    selectedId,
    insertionIndex,
    onSelectEntry,
    onInsertionIndexChange,
    onRemoveEntry,
    onDragStart,
    onDragOver,
    onDragEnd,
}: TimelineTrackProps) {
    const { t } = useTranslation();

    const renderInsertionCursor = (index: number) => {
        const isActive = insertionIndex === index;
        const label =
            index === document.track.length
                ? t('header.timelinePage.cursorEnd')
                : t('header.timelinePage.cursorBefore', { position: index + 1 });

        return (
            <Tooltip key={`cursor-${index}`} label={label} placement="top" openDelay={300}>
                <Box
                    as="button"
                    type="button"
                    aria-label={label}
                    aria-pressed={isActive}
                    flex="0 0 32px"
                    alignSelf="stretch"
                    position="relative"
                    color={isActive ? 'blue.500' : 'gray.400'}
                    opacity={isActive ? 1 : 0.22}
                    cursor="text"
                    transition="opacity 0.15s ease"
                    _hover={{ opacity: 1 }}
                    _focusVisible={{ opacity: 1, outline: '2px solid', outlineColor: 'blue.300' }}
                    onClick={() => onInsertionIndexChange(index)}
                >
                    <Box
                        position="absolute"
                        top="6px"
                        bottom="6px"
                        left="50%"
                        width={isActive ? '3px' : '2px'}
                        bg="currentColor"
                        transform="translateX(-50%)"
                        borderRadius="full"
                    />
                    <Box
                        position="absolute"
                        top="6px"
                        left="50%"
                        width="12px"
                        height="3px"
                        bg="currentColor"
                        transform="translateX(-50%)"
                        borderRadius="full"
                    />
                    <Box
                        position="absolute"
                        bottom="6px"
                        left="50%"
                        width="12px"
                        height="3px"
                        bg="currentColor"
                        transform="translateX(-50%)"
                        borderRadius="full"
                    />
                </Box>
            </Tooltip>
        );
    };

    return (
        <HStack align="stretch" spacing={0} height="100%" overflowX="auto" overflowY="hidden" pb={2}>
            {document.track.map((entry, index) => (
                <React.Fragment key={entry.id}>
                    {renderInsertionCursor(index)}
                    <TimelineClip
                        entry={entry}
                        graph={graph}
                        isSelected={selectedId === entry.refId}
                        onSelect={() => onSelectEntry(entry.refId)}
                        onRemove={() => onRemoveEntry(entry.id)}
                        onDragStart={() => onDragStart(entry.id)}
                        onDragOver={e => onDragOver(index, e)}
                        onDragEnd={onDragEnd}
                    />
                </React.Fragment>
            ))}
            {renderInsertionCursor(document.track.length)}
        </HStack>
    );
}
