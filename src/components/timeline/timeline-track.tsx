import { Box, Button, CloseButton, Flex, HStack, Portal, Text, Tooltip } from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import useEvent from 'react-use-event-hook';
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
import { formatTimelineTime, TimelinePlaybackTiming } from '../../util/timeline-playback';
import TimelineClip from './timeline-clip';
import TimelinePauseClip from './timeline-pause-clip';
import TimelineAudioTrack from './timeline-audio-track';
import TimelineLabelTrack from './timeline-label-track';
import {
    TIMELINE_CLIP_WIDTH,
    TIMELINE_CURSOR_WIDTH as CURSOR_WIDTH,
    TIMELINE_KEYFRAME_SLOT_WIDTH as KEYFRAME_SLOT_WIDTH,
    TIMELINE_KEYFRAME_ROW_HEIGHT as KEYFRAME_ROW_HEIGHT,
} from './timeline-track-dimensions';
import { createTimelineTrackTimeScale, getTimelineTrackLayout } from './timeline-track-layout';

interface TimelineTrackProps {
    document: TimelineDocument;
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    graphRefresh?: unknown;
    selectedEntryIds: Set<string>;
    insertionIndex: number;
    cardWidth?: number;
    onSelectEntry: (entry: TimelineEntry) => void;
    onToggleAnimation: (entryId: string) => void;
    onPauseDurationChange: (entryId: string, duration: number) => void;
    onInsertionIndexChange: (index: number) => void;
    onRemoveEntry: (entryId: string) => void;
    onDragStart: (entryId: string, entryIds?: string[]) => void;
    onDragOver: (contentX: number) => void;
    onDragEnd: () => void;
    onSelectionChange: (entryIds: string[]) => void;
    onToggleSelectedAnimation: (entryId: string) => void;
    onRemoveSelectedEntries: (entryId: string) => void;
    onReverseSelectedEntries: () => void;
    onDocumentChange: (document: TimelineDocument) => void;
    timing?: TimelinePlaybackTiming;
    playbackTime?: number;
    onSeek?: (time: number) => void;
}

// Keep the insertion target compact so the remaining track gaps can start a range selection.
export { KEYFRAME_ROW_HEIGHT };
const KEYFRAME_COLOR = '#805AD5';

interface KeyframeLane {
    stationId: NodeId;
    nodeCenter?: number;
    frames: { entry: TimelineKeyframeEntry; center: number }[];
}

interface InsertionCursorStore {
    isActive: (index: number) => boolean;
    subscribe: (index: number, listener: () => void) => () => void;
    setIndex: (index: number) => void;
}

const createInsertionCursorStore = (initialIndex: number): InsertionCursorStore => {
    let currentIndex = initialIndex;
    const listeners = new Map<number, Set<() => void>>();
    return {
        isActive: index => index === currentIndex,
        subscribe: (index, listener) => {
            const indexedListeners = listeners.get(index) ?? new Set<() => void>();
            indexedListeners.add(listener);
            listeners.set(index, indexedListeners);
            return () => {
                indexedListeners.delete(listener);
                if (!indexedListeners.size) listeners.delete(index);
            };
        },
        setIndex: index => {
            if (index === currentIndex) return;
            const changed = new Set([...(listeners.get(currentIndex) ?? []), ...(listeners.get(index) ?? [])]);
            currentIndex = index;
            changed.forEach(listener => listener());
        },
    };
};

export default function TimelineTrack({
    document,
    graph,
    graphRefresh,
    selectedEntryIds = new Set<string>(),
    insertionIndex,
    cardWidth = TIMELINE_CLIP_WIDTH,
    onSelectEntry: onSelectEntryProp,
    onToggleAnimation: onToggleAnimationProp,
    onPauseDurationChange: onPauseDurationChangeProp,
    onInsertionIndexChange: onInsertionIndexChangeProp,
    onRemoveEntry: onRemoveEntryProp,
    onDragStart: onDragStartProp,
    onDragOver: onDragOverProp,
    onDragEnd: onDragEndProp,
    onSelectionChange: onSelectionChangeProp,
    onToggleSelectedAnimation: onToggleSelectedAnimationProp,
    onRemoveSelectedEntries: onRemoveSelectedEntriesProp,
    onReverseSelectedEntries: onReverseSelectedEntriesProp,
    onDocumentChange: onDocumentChangeProp,
    timing,
    playbackTime,
    onSeek,
}: TimelineTrackProps) {
    const { t } = useTranslation();
    const onSelectEntry = useEvent(onSelectEntryProp);
    const onToggleAnimation = useEvent(onToggleAnimationProp);
    const onPauseDurationChange = useEvent(onPauseDurationChangeProp);
    const onInsertionIndexChange = useEvent(onInsertionIndexChangeProp);
    const onRemoveEntry = useEvent(onRemoveEntryProp);
    const onDragStart = useEvent(onDragStartProp);
    const onDragOver = useEvent(onDragOverProp);
    const onDragEnd = useEvent(onDragEndProp);
    const onSelectionChange = useEvent(onSelectionChangeProp);
    const onToggleSelectedAnimation = useEvent(onToggleSelectedAnimationProp);
    const onRemoveSelectedEntries = useEvent(onRemoveSelectedEntriesProp);
    const onReverseSelectedEntries = useEvent(onReverseSelectedEntriesProp);
    const onDocumentChange = useEvent(onDocumentChangeProp);
    const [cursorStore] = React.useState(() => createInsertionCursorStore(insertionIndex));
    React.useLayoutEffect(() => cursorStore.setIndex(insertionIndex), [cursorStore, insertionIndex]);
    const trackRef = React.useRef<HTMLDivElement>(null);
    const cardDragRef = React.useRef<
        | {
              pointerId: number;
              startX: number;
              startY: number;
              active: boolean;
              target: HTMLElement;
          }
        | undefined
    >(undefined);
    const suppressNextClickRef = React.useRef(false);
    const [selection, setSelection] = React.useState<{ start: number; current: number } | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; entry: TimelineEntry } | null>(null);

    const { entries: entryLayout, totalWidth } = React.useMemo(
        () => getTimelineTrackLayout(document.track, cardWidth),
        [document.track, cardWidth]
    );
    const duration = timing?.duration ?? 0;
    const timeScale = React.useMemo(
        () => createTimelineTrackTimeScale(entryLayout, totalWidth, timing),
        [entryLayout, totalWidth, timing]
    );
    const playheadPosition = timeScale.timeToPosition(playbackTime ?? 0);
    const seekFromRuler = useEvent((event: React.PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (duration && bounds.width) {
            onSeek?.(timeScale.positionToTime(event.clientX - bounds.left));
        }
    });
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
            target.closest('[data-timeline-cursor="true"]') ||
            target.closest('[data-timeline-ruler]')
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
    const handleCardPointerDown = useEvent((event: React.PointerEvent<HTMLElement>, entry: TimelineEntry) => {
        if (event.button !== 0 || cardDragRef.current) return;
        suppressNextClickRef.current = false;
        const target = event.target as Element;
        const interactiveButton = target.closest('button');
        if (
            target.closest('input, textarea, select, [contenteditable="true"]') ||
            (interactiveButton && interactiveButton !== event.currentTarget)
        )
            return;
        event.stopPropagation();
        const entryIds = selectedEntryIds.has(entry.id) ? [...selectedEntryIds] : [entry.id];
        if (!selectedEntryIds.has(entry.id)) onSelectionChange([entry.id]);
        cardDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            active: false,
            target: event.currentTarget,
        };
        onDragStart(entry.id, entryIds);
    });
    const handleCardPointerMove = useEvent((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = cardDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (!drag.active) {
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            // Ignore vertical intent so the panel can still scroll on touch.
            if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy)) return;
            drag.active = true;
            // Capture only once a horizontal drag is confirmed, leaving touch scrolling intact.
            drag.target.setPointerCapture(event.pointerId);
        }
        event.stopPropagation();
        onDragOver(getContentX(event.clientX));
    });
    const finishCardDrag = useEvent((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = cardDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        cardDragRef.current = undefined;
        if (drag.target.hasPointerCapture(event.pointerId)) drag.target.releasePointerCapture(event.pointerId);
        if (drag.active) suppressNextClickRef.current = true;
        onDragEnd();
    });
    const handleContextMenu = useEvent((e: React.MouseEvent, entry: TimelineEntry) => {
        e.preventDefault();
        if (!selectedEntryIds.has(entry.id)) {
            onSelectionChange([entry.id]);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    });
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
        const label =
            index === document.track.length
                ? t('header.timelinePage.cursorEnd')
                : t('header.timelinePage.cursorBefore', { position: index + 1 });

        return <InsertionCursor index={index} label={label} store={cursorStore} onChange={onInsertionIndexChange} />;
    };

    // Playback moves only the playhead. Keep the card, ruler and audio element trees stable.
    const ruler = React.useMemo(
        () => (
            <Box
                data-timeline-ruler
                position="sticky"
                top={0}
                height="28px"
                flexShrink={0}
                mb={2}
                bg="chakra-body-bg"
                borderBottomWidth="1px"
                zIndex={4}
                cursor={duration ? 'ew-resize' : 'default'}
                onPointerDown={event => {
                    event.stopPropagation();
                    if (event.button !== 0 || !duration) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekFromRuler(event);
                }}
                onPointerMove={event => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromRuler(event);
                }}
                onPointerUp={event => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                        event.currentTarget.releasePointerCapture(event.pointerId);
                }}
            >
                {timeScale.ticks.map(({ position, time }, index) => (
                    <Box
                        key={index}
                        data-timeline-tick={index}
                        position="absolute"
                        left={`${position}px`}
                        top={0}
                        bottom={0}
                        borderLeftWidth="1px"
                        borderColor="chakra-border-color"
                        pointerEvents="none"
                    >
                        <Text
                            fontSize="10px"
                            color="gray.500"
                            whiteSpace="nowrap"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                            transform={
                                index === timeScale.ticks.length - 1 && index > 0 ? 'translateX(-100%)' : undefined
                            }
                            ml={index === timeScale.ticks.length - 1 && index > 0 ? -1 : 1}
                        >
                            {formatTimelineTime(time)}
                        </Text>
                    </Box>
                ))}
            </Box>
        ),
        [duration, timeScale, seekFromRuler]
    );
    const cards = React.useMemo(
        () => (
            <>
                {document.track.map((entry, index) => (
                    <React.Fragment key={entry.id}>
                        {renderInsertionCursor(index)}
                        <TrackCard
                            entry={entry}
                            graph={graph}
                            graphRefresh={graphRefresh}
                            isSelected={selectedEntryIds.has(entry.id)}
                            cardWidth={cardWidth}
                            onSelectEntry={onSelectEntry}
                            onContextMenu={handleContextMenu}
                            onCardPointerDown={handleCardPointerDown}
                            onPauseDurationChange={onPauseDurationChange}
                            onRemoveEntry={onRemoveEntry}
                            onToggleAnimation={onToggleAnimation}
                        />
                    </React.Fragment>
                ))}
                {renderInsertionCursor(document.track.length)}
            </>
        ),
        [
            document.track,
            graph,
            graphRefresh,
            selectedEntryIds,
            cursorStore,
            cardWidth,
            t,
            onSelectEntry,
            handleContextMenu,
            handleCardPointerDown,
            onPauseDurationChange,
            onRemoveEntry,
            onToggleAnimation,
            onInsertionIndexChange,
        ]
    );
    const keyframeLanes = React.useMemo(
        () =>
            lanes.length > 0 && (
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
            ),
        [lanes, totalWidth, graph, graphRefresh, selectedEntryIds, t, onSelectEntry, onRemoveEntry]
    );
    const audioTrack = React.useMemo(
        () => (
            <TimelineAudioTrack
                document={document}
                totalWidth={totalWidth}
                onChange={onDocumentChange}
                timing={timing}
                timeScale={timeScale}
            />
        ),
        [document, totalWidth, onDocumentChange, timing, timeScale]
    );
    const labelTrack = React.useMemo(
        () => (
            <TimelineLabelTrack
                document={document}
                totalWidth={totalWidth}
                onChange={onDocumentChange}
                timing={timing}
                timeScale={timeScale}
            />
        ),
        [document, totalWidth, onDocumentChange, timing, timeScale]
    );

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
            onClickCapture={e => {
                if (suppressNextClickRef.current && (e.target as Element).closest('[data-timeline-card="true"]')) {
                    suppressNextClickRef.current = false;
                    e.stopPropagation();
                    e.preventDefault();
                }
            }}
            onClick={() => setContextMenu(null)}
        >
            <Flex
                direction="column"
                position="relative"
                minHeight="100%"
                width={`${totalWidth}px`}
                minW="100%"
                overflowX="clip"
                data-timeline-track-content
                onPointerMove={handleCardPointerMove}
                onPointerUp={finishCardDrag}
                onPointerCancel={finishCardDrag}
                onLostPointerCapture={finishCardDrag}
            >
                {ruler}
                {duration > 0 && (
                    <>
                        <Box
                            data-timeline-playhead
                            position="absolute"
                            left={`${playheadPosition}px`}
                            top={0}
                            bottom={0}
                            width="2px"
                            transform="translateX(-50%)"
                            bg="purple.500"
                            pointerEvents="none"
                            zIndex={5}
                        />
                        <Box
                            position="absolute"
                            left={`${playheadPosition}px`}
                            transform="translateX(-50%)"
                            top="19px"
                            width="10px"
                            height="9px"
                            bg="purple.500"
                            clipPath="polygon(0 0, 100% 0, 50% 100%)"
                            pointerEvents="none"
                            zIndex={5}
                        />
                    </>
                )}
                <HStack align="stretch" spacing={0} flex="1" minH="96px" position="relative">
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
                    {cards}
                </HStack>

                {keyframeLanes}
                {labelTrack}
                {audioTrack}
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

interface TrackCardProps
    extends Pick<
        TimelineTrackProps,
        'graph' | 'graphRefresh' | 'onSelectEntry' | 'onPauseDurationChange' | 'onRemoveEntry' | 'onToggleAnimation'
    > {
    entry: TimelineEntry;
    isSelected: boolean;
    cardWidth?: number;
    onContextMenu: (event: React.MouseEvent, entry: TimelineEntry) => void;
    onCardPointerDown: (event: React.PointerEvent<HTMLElement>, entry: TimelineEntry) => void;
}

// Card content changes independently of playback and insertion cursor subscriptions.
const TrackCard = React.memo(function TrackCard({
    entry,
    graph,
    isSelected,
    cardWidth = TIMELINE_CLIP_WIDTH,
    onSelectEntry,
    onContextMenu,
    onCardPointerDown,
    onPauseDurationChange,
    onRemoveEntry,
    onToggleAnimation,
}: TrackCardProps) {
    const { t } = useTranslation();
    const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => onCardPointerDown(event, entry);
    return entry.kind === 'keyframe' ? (
        <KeyframeSlot
            label={`${t('header.timelinePage.keyframe')} · ${getTimelineEntryTitle(graph, entry)}`}
            isSelected={isSelected}
            onSelect={() => onSelectEntry(entry)}
            onContextMenu={e => onContextMenu(e, entry)}
            onPointerDown={handlePointerDown}
        />
    ) : isPauseEntry(entry) ? (
        <TimelinePauseClip
            entry={entry}
            isSelected={isSelected}
            cardWidth={cardWidth}
            onSelect={() => onSelectEntry(entry)}
            onContextMenu={e => onContextMenu(e, entry)}
            onDurationChange={duration => onPauseDurationChange(entry.id, duration)}
            onRemove={() => onRemoveEntry(entry.id)}
            onPointerDown={handlePointerDown}
        />
    ) : (
        <TimelineClip
            entry={entry}
            graph={graph}
            isSelected={isSelected}
            cardWidth={cardWidth}
            onSelect={() => onSelectEntry(entry)}
            onContextMenu={e => onContextMenu(e, entry)}
            onToggleAnimation={() => onToggleAnimation(entry.id)}
            onRemove={() => onRemoveEntry(entry.id)}
            onPointerDown={handlePointerDown}
        />
    );
});

interface InsertionCursorProps {
    index: number;
    label: string;
    store: InsertionCursorStore;
    onChange: (index: number) => void;
}

const InsertionCursor = React.memo(function InsertionCursor({ index, label, store, onChange }: InsertionCursorProps) {
    const subscribe = React.useCallback((listener: () => void) => store.subscribe(index, listener), [store, index]);
    const getSnapshot = React.useCallback(() => store.isActive(index), [store, index]);
    const isActive = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return (
        <Tooltip label={label} placement="top" openDelay={300}>
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
                    onClick={() => onChange(index)}
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
});

interface KeyframeSlotProps {
    label: string;
    isSelected: boolean;
    onSelect: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

function KeyframeSlot({ label, isSelected, onSelect, onPointerDown, onContextMenu }: KeyframeSlotProps) {
    return (
        <Tooltip label={label} placement="top" openDelay={300}>
            <Flex
                data-timeline-card="true"
                as="button"
                type="button"
                onPointerDown={onPointerDown}
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
                sx={{ touchAction: 'pan-y' }}
                userSelect="none"
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
