import { Alert, AlertIcon, Box, CloseButton, Text, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineAudioEntry, TimelineDocument } from '../../constants/timeline';
import { audioStoreIndexedDB } from '../../util/audio-store-indexed-db';

interface TimelineAudioTrackProps {
    document: TimelineDocument;
    totalWidth: number;
    onChange: (document: TimelineDocument) => void;
}

const AUDIO_ROW_HEIGHT = 24;
const AUDIO_HANDLE_WIDTH = 7;
const AUDIO_COLOR = '#3182CE';
const CURSOR_WIDTH = 32;
const CLIP_WIDTH = 220;
const KEYFRAME_SLOT_WIDTH = 24;

const getEntryWidth = (entry: TimelineDocument['track'][number]) =>
    entry.kind === 'keyframe' ? KEYFRAME_SLOT_WIDTH : CLIP_WIDTH;

/**
 * Centre of every insertion cursor in the shared timeline coordinate space.
 * Card edges snap to these points so an audio clip always starts/ends exactly
 * where a visual entry is about to enter the frame.
 */
const getCursorCenters = (document: TimelineDocument) => {
    const centers: number[] = [];
    let left = 0;
    for (let index = 0; index <= document.track.length; index++) {
        centers.push(left + CURSOR_WIDTH / 2);
        if (index < document.track.length) {
            left += CURSOR_WIDTH + getEntryWidth(document.track[index]);
        }
    }
    return centers;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function TimelineAudioTrack({ document, totalWidth, onChange }: TimelineAudioTrackProps) {
    const { t } = useTranslation();
    const entries = document.audioTrack ?? [];
    const [missing, setMissing] = React.useState<Set<string>>(new Set());
    const inputRef = React.useRef<HTMLInputElement>(null);
    const restoreRef = React.useRef<TimelineAudioEntry | undefined>(undefined);
    const dragRef = React.useRef<
        | {
              entryId: string;
              mode: 'move' | 'start' | 'end';
              pointerId: number;
              originSlot: number;
              originStart: number;
              originEnd: number;
          }
        | undefined
    >(undefined);
    const laneRef = React.useRef<HTMLDivElement>(null);
    const cursorCenters = React.useMemo(() => getCursorCenters(document), [document.track]);
    const maxSlot = Math.max(0, cursorCenters.length - 1);

    React.useEffect(() => {
        let active = true;
        Promise.all(
            entries.map(async entry => [entry.id, !(await audioStoreIndexedDB.get(entry.blobId))] as const)
        ).then(result => active && setMissing(new Set(result.filter(([, value]) => value).map(([id]) => id))));
        return () => {
            active = false;
        };
    }, [document.audioTrack]);

    const updateEntry = (entryId: string, startSlot: number, endSlot: number) => {
        onChange({
            ...document,
            audioTrack: entries.map(item => (item.id === entryId ? { ...item, startSlot, endSlot } : item)),
        });
    };

    const getSlot = (clientX: number) => {
        const bounds = laneRef.current?.getBoundingClientRect();
        if (!bounds) return 0;
        const x = clientX - bounds.left;
        let closestSlot = 0;
        let closestDistance = Math.abs(cursorCenters[0] - x);
        cursorCenters.forEach((center, index) => {
            const distance = Math.abs(center - x);
            if (distance < closestDistance) {
                closestSlot = index;
                closestDistance = distance;
            }
        });
        return closestSlot;
    };

    const handlePointerDown = (
        e: React.PointerEvent<HTMLDivElement>,
        entry: TimelineAudioEntry,
        mode: 'move' | 'start' | 'end'
    ) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
            entryId: entry.id,
            mode,
            pointerId: e.pointerId,
            originSlot: getSlot(e.clientX),
            originStart: clamp(Math.round(entry.startSlot), 0, maxSlot),
            originEnd: clamp(Math.round(entry.endSlot), 0, maxSlot),
        };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const delta = getSlot(e.clientX) - drag.originSlot;
        if (delta === 0) return;

        if (drag.mode === 'move') {
            const span = Math.max(1, drag.originEnd - drag.originStart);
            const start = clamp(drag.originStart + delta, 0, maxSlot - span);
            updateEntry(drag.entryId, start, start + span);
            return;
        }
        if (drag.mode === 'start') {
            const start = clamp(drag.originStart + delta, 0, drag.originEnd - 1);
            updateEntry(drag.entryId, start, drag.originEnd);
            return;
        }
        const end = clamp(drag.originEnd + delta, drag.originStart + 1, maxSlot);
        updateEntry(drag.entryId, drag.originStart, end);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== e.pointerId) return;
        dragRef.current = undefined;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const remove = async (entry: TimelineAudioEntry) => {
        await audioStoreIndexedDB.delete(entry.blobId);
        onChange({ ...document, audioTrack: entries.filter(item => item.id !== entry.id) });
    };

    const restore = (entry: TimelineAudioEntry) => {
        restoreRef.current = entry;
        inputRef.current?.click();
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        const entry = restoreRef.current;
        if (!file || !entry) return;
        await audioStoreIndexedDB.save(entry.blobId, file);
        setMissing(current => new Set([...current].filter(id => id !== entry.id)));
    };

    return (
        <Box
            ref={laneRef}
            position="relative"
            width={`${totalWidth}px`}
            minW="100%"
            minH={entries.length ? `${entries.length * AUDIO_ROW_HEIGHT + 28}px` : undefined}
            mt={2}
            borderTopWidth="1px"
            borderColor="gray.200"
            data-audio-track
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <Text fontSize="xs" color="gray.500" height="22px" px={2} pt={1}>
                {t('header.timelinePage.audioTrack')}
            </Text>
            {cursorCenters.map((center, index) => (
                <Box
                    key={`slot-guide-${index}`}
                    position="absolute"
                    left={`${center}px`}
                    top="22px"
                    bottom="0"
                    width="1px"
                    bg="gray.300"
                    opacity={0.5}
                    pointerEvents="none"
                />
            ))}
            {entries.map((entry, index) => {
                const startSlot = clamp(Math.round(entry.startSlot), 0, maxSlot);
                const endSlot = clamp(Math.round(entry.endSlot), startSlot, maxSlot);
                const left = cursorCenters[startSlot] ?? CURSOR_WIDTH / 2;
                const right = cursorCenters[endSlot] ?? left;
                const width = Math.max(AUDIO_HANDLE_WIDTH * 2, right - left);
                const isMissing = missing.has(entry.id);
                return (
                    <Tooltip key={entry.id} label={isMissing ? t('header.timelinePage.audioMissing') : entry.name}>
                        <Box
                            position="absolute"
                            left={`${left}px`}
                            top={`${22 + index * AUDIO_ROW_HEIGHT}px`}
                            width={`${width}px`}
                            height={`${AUDIO_ROW_HEIGHT - 4}px`}
                            bg={isMissing ? 'gray.400' : AUDIO_COLOR}
                            opacity={0.9}
                            borderRadius="sm"
                            cursor="grab"
                            onPointerDown={e => handlePointerDown(e, entry, 'move')}
                            onClick={() => isMissing && restore(entry)}
                            title={entry.name}
                        >
                            <Box
                                position="absolute"
                                left={0}
                                top={0}
                                bottom={0}
                                width={`${AUDIO_HANDLE_WIDTH}px`}
                                cursor="ew-resize"
                                onPointerDown={e => handlePointerDown(e, entry, 'start')}
                            />
                            <Text
                                fontSize="xs"
                                color="white"
                                px={2}
                                noOfLines={1}
                                lineHeight={`${AUDIO_ROW_HEIGHT - 4}px`}
                            >
                                {entry.name}
                            </Text>
                            <CloseButton
                                position="absolute"
                                right={0}
                                top={0}
                                size="xs"
                                color="white"
                                onClick={e => {
                                    e.stopPropagation();
                                    void remove(entry);
                                }}
                            />
                            <Box
                                position="absolute"
                                right={0}
                                top={0}
                                bottom={0}
                                width={`${AUDIO_HANDLE_WIDTH}px`}
                                cursor="ew-resize"
                                onPointerDown={e => handlePointerDown(e, entry, 'end')}
                            />
                        </Box>
                    </Tooltip>
                );
            })}
            {entries.some(entry => missing.has(entry.id)) && (
                <Alert
                    status="error"
                    size="sm"
                    position="absolute"
                    left="16px"
                    top={`${22 + entries.length * AUDIO_ROW_HEIGHT}px`}
                >
                    <AlertIcon />
                    {t('header.timelinePage.audioMissing')}
                </Alert>
            )}
            <input ref={inputRef} type="file" accept="audio/*" hidden onChange={handleRestore} />
        </Box>
    );
}
