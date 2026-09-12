import { Box, CloseButton, Flex, HStack, Tooltip } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes, NodeId } from '../../constants/constants';
import { TimelineDocument, TimelineEntry, TimelineKeyframeEntry } from '../../constants/timeline';
import { getTimelineEntryTitle } from '../../util/timeline';
import TimelineClip from './timeline-clip';

interface TimelineTrackProps {
    document: TimelineDocument;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    selectedId?: Id;
    selectedEntryId?: string;
    insertionIndex: number;
    onSelectEntry: (entry: TimelineEntry) => void;
    onToggleAnimation: (entryId: string) => void;
    onInsertionIndexChange: (index: number) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string) => void;
    onDragOver: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

const CURSOR_WIDTH = 32;
const CLIP_WIDTH = 220;
const KEYFRAME_SLOT_WIDTH = 24;
export const KEYFRAME_ROW_HEIGHT = 22;
const KEYFRAME_COLOR = '#805AD5';

interface TrackEntryLayout {
    entry: TimelineEntry;
    index: number;
    start: number;
    width: number;
    center: number;
}

interface KeyframeLane {
    stationId: NodeId;
    nodeCenter?: number;
    frames: { entry: TimelineKeyframeEntry; center: number }[];
}

const getEntryWidth = (entry: TimelineEntry) => (entry.kind === 'keyframe' ? KEYFRAME_SLOT_WIDTH : CLIP_WIDTH);

const getEntryLayout = (document: TimelineDocument): { entries: TrackEntryLayout[]; totalWidth: number } => {
    let x = 0;
    const entries = document.track.map((entry, index) => {
        const width = getEntryWidth(entry);
        const start = x + CURSOR_WIDTH;
        x = start + width;
        return { entry, index, start, width, center: start + width / 2 };
    });
    return { entries, totalWidth: x + CURSOR_WIDTH };
};

export default function TimelineTrack({
    document,
    graph,
    selectedId,
    selectedEntryId,
    insertionIndex,
    onSelectEntry,
    onToggleAnimation,
    onInsertionIndexChange,
    onRemoveEntry,
    onDragStart,
    onDragOver,
    onDragEnd,
}: TimelineTrackProps) {
    const { t } = useTranslation();

    const { entries: entryLayout, totalWidth } = React.useMemo(() => getEntryLayout(document), [document]);

    // Keyframes are grouped by their referenced station so all of them share a single row.
    const lanes = React.useMemo(() => {
        const nodeCenters = new Map<NodeId, number>();
        entryLayout.forEach(({ entry, center }) => {
            if (entry.kind === 'node' && entry.phase === 'enter') nodeCenters.set(entry.refId, center);
        });

        const laneMap = new Map<NodeId, KeyframeLane>();
        const order: NodeId[] = [];
        entryLayout.forEach(({ entry, center }) => {
            if (entry.kind !== 'keyframe') return;

            const existing = laneMap.get(entry.refId);
            if (existing) {
                existing.frames.push({ entry, center });
            } else {
                laneMap.set(entry.refId, {
                    stationId: entry.refId,
                    nodeCenter: nodeCenters.get(entry.refId),
                    frames: [{ entry, center }],
                });
                order.push(entry.refId);
            }
        });

        return order.map(stationId => laneMap.get(stationId)!);
    }, [entryLayout]);

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
                    flex={`0 0 ${CURSOR_WIDTH}px`}
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
        <Box height="100%" overflow="auto" pb={2}>
            <Flex direction="column" minHeight="100%" width={`${totalWidth}px`} minW="100%">
                <HStack align="stretch" spacing={0} flex="1" minH="140px">
                    {document.track.map((entry, index) => (
                        <React.Fragment key={entry.id}>
                            {renderInsertionCursor(index)}
                            {entry.kind === 'keyframe' ? (
                                <KeyframeSlot
                                    label={`${t('header.timelinePage.keyframe')} · ${getTimelineEntryTitle(
                                        graph,
                                        entry
                                    )}`}
                                    isSelected={selectedEntryId === entry.id}
                                    onSelect={() => onSelectEntry(entry)}
                                    onDragStart={() => onDragStart(entry.id)}
                                    onDragOver={e => onDragOver(index, e)}
                                    onDragEnd={onDragEnd}
                                />
                            ) : (
                                <TimelineClip
                                    entry={entry}
                                    graph={graph}
                                    isPro={document.mode === 'pro'}
                                    isSelected={
                                        selectedEntryId ? selectedEntryId === entry.id : selectedId === entry.refId
                                    }
                                    onSelect={() => onSelectEntry(entry)}
                                    onToggleAnimation={() => onToggleAnimation(entry.id)}
                                    onRemove={() => onRemoveEntry(entry.id)}
                                    onDragStart={() => onDragStart(entry.id)}
                                    onDragOver={e => onDragOver(index, e)}
                                    onDragEnd={onDragEnd}
                                />
                            )}
                        </React.Fragment>
                    ))}
                    {renderInsertionCursor(document.track.length)}
                </HStack>

                {lanes.length > 0 && (
                    <Box
                        position="relative"
                        width={`${totalWidth}px`}
                        height={`${lanes.length * KEYFRAME_ROW_HEIGHT}px`}
                        flexShrink={0}
                    >
                        <svg
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                overflow: 'visible',
                            }}
                        >
                            {lanes.map((lane, rowIndex) => {
                                const rowY = rowIndex * KEYFRAME_ROW_HEIGHT + KEYFRAME_ROW_HEIGHT / 2;
                                const xs = lane.frames.map(frame => frame.center);
                                const allX = lane.nodeCenter !== undefined ? [...xs, lane.nodeCenter] : xs;
                                const minX = Math.min(...allX);
                                const maxX = Math.max(...allX);

                                return (
                                    <React.Fragment key={lane.stationId}>
                                        {lane.nodeCenter !== undefined && (
                                            <path
                                                d={`M ${lane.nodeCenter} 0 L ${lane.nodeCenter} ${rowY}`}
                                                stroke={KEYFRAME_COLOR}
                                                strokeWidth="1"
                                                strokeDasharray="3 3"
                                                fill="none"
                                                opacity={0.65}
                                            />
                                        )}
                                        <line
                                            x1={minX}
                                            y1={rowY}
                                            x2={maxX}
                                            y2={rowY}
                                            stroke={KEYFRAME_COLOR}
                                            strokeWidth="1"
                                            opacity={0.65}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </svg>

                        {lanes.map((lane, rowIndex) =>
                            lane.frames.map(({ entry, center }) => {
                                const rowY = rowIndex * KEYFRAME_ROW_HEIGHT + KEYFRAME_ROW_HEIGHT / 2;
                                const isSelected = selectedEntryId === entry.id;
                                const label = `${t('header.timelinePage.keyframe')} · ${getTimelineEntryTitle(
                                    graph,
                                    entry
                                )}`;

                                return (
                                    <Box
                                        key={entry.id}
                                        role="group"
                                        position="absolute"
                                        left={`${center}px`}
                                        top={`${rowY}px`}
                                        transform="translate(-50%, -50%)"
                                        zIndex={1}
                                    >
                                        <Tooltip label={label} placement="bottom" openDelay={300}>
                                            <Box
                                                as="button"
                                                type="button"
                                                aria-label={label}
                                                aria-pressed={isSelected}
                                                width="12px"
                                                height="12px"
                                                transform="rotate(45deg)"
                                                borderRadius="2px"
                                                borderWidth="1px"
                                                borderColor="purple.600"
                                                bg={isSelected ? 'purple.500' : 'purple.200'}
                                                cursor="pointer"
                                                onClick={() => onSelectEntry(entry)}
                                                _hover={{ bg: 'purple.400' }}
                                            />
                                        </Tooltip>
                                        <CloseButton
                                            size="xs"
                                            position="absolute"
                                            top="-18px"
                                            left="50%"
                                            transform="translateX(-50%)"
                                            opacity={0}
                                            _groupHover={{ opacity: 1 }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                onRemoveEntry(entry.id);
                                            }}
                                        />
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                )}
            </Flex>
        </Box>
    );
}

interface KeyframeSlotProps {
    label: string;
    isSelected: boolean;
    onSelect: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
}

function KeyframeSlot({ label, isSelected, onSelect, onDragStart, onDragOver, onDragEnd }: KeyframeSlotProps) {
    return (
        <Tooltip label={label} placement="top" openDelay={300}>
            <Flex
                as="button"
                type="button"
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onClick={onSelect}
                flex={`0 0 ${KEYFRAME_SLOT_WIDTH}px`}
                align="center"
                justify="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor={isSelected ? 'purple.500' : 'purple.200'}
                borderRadius="md"
                bg={isSelected ? 'purple.50' : 'transparent'}
                cursor="pointer"
                _hover={{ borderColor: 'purple.400' }}
                aria-label={label}
                aria-pressed={isSelected}
            >
                <Box
                    width="8px"
                    height="8px"
                    transform="rotate(45deg)"
                    borderRadius="1px"
                    bg={isSelected ? 'purple.500' : 'purple.300'}
                />
            </Flex>
        </Tooltip>
    );
}
