import { Box, Button, CloseButton, Flex, HStack, Portal, Tooltip } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EdgeAttributes, GraphAttributes, NodeAttributes, NodeId } from '../../constants/constants';
import {
    isElementEntry,
    isPauseEntry,
    TimelineDocument,
    TimelineEntry,
    TimelineKeyframeEntry,
} from '../../constants/timeline';
import { getTimelineEntryTitle } from '../../util/timeline';
import TimelineClip from './timeline-clip';
import TimelinePauseClip from './timeline-pause-clip';
import TimelineAudioTrack from './timeline-audio-track';

interface TimelineTrackProps {
    document: TimelineDocument;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    selectedEntryIds: Set<string>;
    insertionIndex: number;
    onSelectEntry: (entry: TimelineEntry) => void;
    onToggleAnimation: (entryId: string) => void;
    onPauseDurationChange: (entryId: string, duration: number) => void;
    onInsertionIndexChange: (index: number) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string) => void;
    onDragOver: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
    onSelectionChange: (entryIds: string[]) => void;
    onToggleSelectedAnimation: (entryId: string) => void;
    onRemoveSelectedEntries: (entryId: string) => void;
    onReverseSelectedEntries: () => void;
    onDocumentChange: (document: TimelineDocument) => void;
}

// Keep the insertion target compact so the remaining track gaps can start a range selection.
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
    selectedEntryIds = new Set<string>(),
    insertionIndex,
    onSelectEntry,
    onToggleAnimation,
    onPauseDurationChange,
    onInsertionIndexChange,
    onRemoveEntry,
    onDragStart,
    onDragOver,
    onDragEnd,
    onSelectionChange,
    onToggleSelectedAnimation,
    onRemoveSelectedEntries,
    onReverseSelectedEntries,
    onDocumentChange,
}: TimelineTrackProps) {
    const { t } = useTranslation();
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [selection, setSelection] = React.useState<{ start: number; current: number } | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; entry: TimelineEntry } | null>(null);

    const { entries: entryLayout, totalWidth } = React.useMemo(() => getEntryLayout(document), [document]);
    const getContentX = (clientX: number) => {
        const element = trackRef.current;
        if (!element) return clientX;
        return clientX - element.getBoundingClientRect().left + element.scrollLeft;
    };
    const handleSelectionStart = (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (
            e.button !== 0 ||
            target.closest('[data-timeline-card="true"]') ||
            target.closest('[data-timeline-cursor="true"]')
        )
            return;
        const start = getContentX(e.clientX);
        e.currentTarget.setPointerCapture(e.pointerId);
        setSelection({ start, current: start });
        e.preventDefault();
    };
    const handleSelectionMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!selection) return;
        setSelection(current => (current ? { ...current, current: getContentX(e.clientX) } : current));
    };
    const handleSelectionEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!selection) return;
        const end = getContentX(e.clientX);
        const left = Math.min(selection.start, end);
        const right = Math.max(selection.start, end);
        const ids = entryLayout
            .filter(layout => layout.start < right && layout.start + layout.width > left)
            .map(layout => layout.entry.id);
        if (Math.abs(end - selection.start) >= 4) {
            onSelectionChange(ids);
        }
        setSelection(null);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };
    const handleContextMenu = (e: React.MouseEvent, entry: TimelineEntry) => {
        e.preventDefault();
        if (!selectedEntryIds.has(entry.id)) {
            onSelectionChange([entry.id]);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    };
    const handleReverseSelection = () => {
        onReverseSelectedEntries();
        setContextMenu(null);
    };

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
                <Box flex={`0 0 ${CURSOR_WIDTH}px`} alignSelf="stretch" position="relative">
                    <Box
                        as="button"
                        type="button"
                        data-timeline-cursor="true"
                        aria-label={label}
                        aria-pressed={isActive}
                        position="absolute"
                        top="0"
                        bottom="0"
                        left="50%"
                        width="8px"
                        color={isActive ? 'blue.500' : 'gray.400'}
                        opacity={isActive ? 1 : 0.22}
                        cursor="text"
                        transform="translateX(-50%)"
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
                </Box>
            </Tooltip>
        );
    };

    return (
        <Box
            ref={trackRef}
            height="100%"
            overflow="auto"
            pb={2}
            onPointerDown={handleSelectionStart}
            onPointerMove={handleSelectionMove}
            onPointerUp={handleSelectionEnd}
            onContextMenu={e => e.preventDefault()}
            onClick={() => setContextMenu(null)}
        >
            <Flex direction="column" minHeight="100%" width={`${totalWidth}px`} minW="100%">
                <HStack align="stretch" spacing={0} flex="1" minH="140px" position="relative">
                    {selection && (
                        <Box
                            position="absolute"
                            top={0}
                            bottom={0}
                            left={`${Math.min(selection.start, selection.current)}px`}
                            width={`${Math.abs(selection.current - selection.start)}px`}
                            bg="blue.200"
                            opacity={0.35}
                            borderWidth="1px"
                            borderColor="blue.500"
                            pointerEvents="none"
                            zIndex={3}
                        />
                    )}
                    {document.track.map((entry, index) => (
                        <React.Fragment key={entry.id}>
                            {renderInsertionCursor(index)}
                            {entry.kind === 'keyframe' ? (
                                <KeyframeSlot
                                    label={`${t('header.timelinePage.keyframe')} · ${getTimelineEntryTitle(
                                        graph,
                                        entry
                                    )}`}
                                    isSelected={selectedEntryIds.has(entry.id)}
                                    onSelect={() => onSelectEntry(entry)}
                                    onContextMenu={e => handleContextMenu(e, entry)}
                                    onDragStart={() => onDragStart(entry.id)}
                                    onDragOver={e => onDragOver(index, e)}
                                    onDragEnd={onDragEnd}
                                />
                            ) : isPauseEntry(entry) ? (
                                <TimelinePauseClip
                                    entry={entry}
                                    isSelected={selectedEntryIds.has(entry.id)}
                                    onSelect={() => onSelectEntry(entry)}
                                    onContextMenu={e => handleContextMenu(e, entry)}
                                    onDurationChange={duration => onPauseDurationChange(entry.id, duration)}
                                    onRemove={() => onRemoveEntry(entry.id)}
                                    onDragStart={() => onDragStart(entry.id)}
                                    onDragOver={onDragOver.bind(null, index)}
                                    onDragEnd={onDragEnd}
                                />
                            ) : (
                                <TimelineClip
                                    entry={entry}
                                    graph={graph}
                                    isPro={document.mode === 'pro'}
                                    isSelected={selectedEntryIds.has(entry.id)}
                                    onSelect={() => onSelectEntry(entry)}
                                    onContextMenu={e => handleContextMenu(e, entry)}
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
                                const isSelected = selectedEntryIds.has(entry.id);
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
                <TimelineAudioTrack document={document} totalWidth={totalWidth} onChange={onDocumentChange} />
            </Flex>
            {contextMenu && (
                <Portal>
                    <Box
                        position="fixed"
                        left={`${contextMenu.x}px`}
                        top={`${contextMenu.y}px`}
                        zIndex={1400}
                        minW="180px"
                        bg="chakra-body-bg"
                        borderWidth="1px"
                        borderRadius="md"
                        boxShadow="lg"
                        p={1}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <Button
                            width="100%"
                            justifyContent="flex-start"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                onToggleSelectedAnimation(contextMenu.entry.id);
                                setContextMenu(null);
                            }}
                            isDisabled={
                                !isElementEntry(contextMenu.entry) &&
                                !document.track.some(entry => selectedEntryIds.has(entry.id) && isElementEntry(entry))
                            }
                        >
                            {t('header.timelinePage.toggleAnimation')}
                        </Button>
                        <Button
                            width="100%"
                            justifyContent="flex-start"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                onRemoveSelectedEntries(contextMenu.entry.id);
                                setContextMenu(null);
                            }}
                        >
                            {t('header.timelinePage.deleteEntry')}
                        </Button>
                        {selectedEntryIds.size > 1 && (
                            <Button
                                width="100%"
                                justifyContent="flex-start"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    handleReverseSelection();
                                }}
                            >
                                {t('header.timelinePage.invertSelection')}
                            </Button>
                        )}
                    </Box>
                </Portal>
            )}
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
    onContextMenu?: (e: React.MouseEvent) => void;
}

function KeyframeSlot({
    label,
    isSelected,
    onSelect,
    onDragStart,
    onDragOver,
    onDragEnd,
    onContextMenu,
}: KeyframeSlotProps) {
    return (
        <Tooltip label={label} placement="top" openDelay={300}>
            <Flex
                data-timeline-card="true"
                as="button"
                type="button"
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onContextMenu={onContextMenu}
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
