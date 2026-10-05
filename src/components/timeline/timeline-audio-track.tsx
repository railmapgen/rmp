import {
    Alert,
    AlertIcon,
    Box,
    CloseButton,
    FormControl,
    FormLabel,
    HStack,
    IconButton,
    NumberInput,
    NumberInputField,
    Popover,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Portal,
    Text,
    Tooltip,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdTune } from 'react-icons/md';
import { nanoid } from 'nanoid';
import { TimelineAudioEntry, TimelineDocument } from '../../constants/timeline';
import { useOptionalTimelineProjectContext } from '../../timeline/timeline-project-context';
import { formatTimelineTime, getTimelineAudioRange, TimelinePlaybackTiming } from '../../util/timeline-playback';
import { TimelineTrackTimeScale } from './timeline-track-layout';
import { useTimelineClipDrag } from './use-timeline-clip-drag';

interface TimelineAudioTrackProps {
    document: TimelineDocument;
    totalWidth: number;
    timing?: TimelinePlaybackTiming;
    timeScale?: TimelineTrackTimeScale;
    onChange: (document: TimelineDocument) => void;
}

const AUDIO_ROW_HEIGHT = 28;
const AUDIO_HANDLE_WIDTH = 9;
const getMissingAudio = async () => undefined;
const ignoreAudioSave = async () => undefined;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function TimelineAudioTrack({
    document,
    totalWidth,
    timing,
    timeScale,
    onChange,
}: TimelineAudioTrackProps) {
    const { t } = useTranslation();
    const projectContext = useOptionalTimelineProjectContext();
    const getAudio = projectContext?.getAudio ?? getMissingAudio;
    const saveAudio = projectContext?.saveAudio ?? ignoreAudioSave;
    const entries = document.audioTrack ?? [];
    const [missing, setMissing] = React.useState<Set<string>>(new Set());
    const [durations, setDurations] = React.useState<Record<string, number>>({});
    const inputRef = React.useRef<HTMLInputElement>(null);
    const restoreRef = React.useRef<TimelineAudioEntry | undefined>(undefined);
    const duration = timing?.duration ?? 0;
    const cursorTimes = timing?.cursorTimes ?? [0];
    const resourceKey = JSON.stringify(entries.map(entry => [entry.id, entry.blobId]));

    React.useEffect(() => {
        if (entries.length === 0) return;
        let active = true;
        const urls: string[] = [];
        const players: HTMLAudioElement[] = [];
        void Promise.allSettled(
            entries.map(async entry => {
                const blob = await getAudio(entry.blobId);
                if (!active) return;
                if (!blob) return entry.id;
                const url = URL.createObjectURL(blob);
                urls.push(url);
                const audio = new Audio(url);
                players.push(audio);
                audio.preload = 'metadata';
                audio.onloadedmetadata = () => {
                    if (active && Number.isFinite(audio.duration))
                        setDurations(current => ({ ...current, [entry.id]: audio.duration }));
                };
            })
        )
            .then(result => {
                if (!active) return;
                setMissing(
                    new Set(
                        result.flatMap((item, index) =>
                            item.status === 'rejected' ? [entries[index].id] : item.value ? [item.value] : []
                        )
                    )
                );
            })
            .catch(() => {});
        return () => {
            active = false;
            players.forEach(audio => {
                audio.removeAttribute('src');
                audio.load();
            });
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [resourceKey, getAudio]);

    const updateEntry = (entryId: string, start: number, end: number, precision = 2) => {
        const factor = 10 ** precision;
        const startTime = clamp(Math.round(start * factor) / factor, 0, duration);
        const endTime = clamp(Math.round(end * factor) / factor, startTime, duration);
        const entry = entries.find(item => item.id === entryId);
        if (!entry) return;
        const current = getTimelineAudioRange(entry, cursorTimes, duration);
        if (current.start === startTime && current.end === endTime) return;
        onChange({
            ...document,
            audioTrack: entries.map(item => (item.id === entryId ? { ...item, startTime, endTime } : item)),
        });
    };
    const { laneRef, draft, dragRef, handlePointerDown, handlePointerMove, finishDrag } = useTimelineClipDrag({
        document,
        totalWidth,
        timing,
        timeScale,
        onCommit: (entryId, start, end) => updateEntry(entryId, start, end, 6),
    });
    const restore = (entry: TimelineAudioEntry) => {
        restoreRef.current = entry;
        inputRef.current?.click();
    };
    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        const entry = restoreRef.current;
        if (!file || !entry) return;
        const blobId = `audio_${nanoid(12)}`;
        await saveAudio(blobId, file, file.name);
        onChange({
            ...document,
            audioTrack: entries.map(item => (item.id === entry.id ? { ...item, blobId, name: file.name } : item)),
        });
        setMissing(current => new Set([...current].filter(id => id !== entry.id)));
    };

    return (
        <Box
            ref={laneRef}
            position="relative"
            width={`${totalWidth}px`}
            minW="100%"
            minH={`${entries.length * AUDIO_ROW_HEIGHT + 28}px`}
            mt={2}
            borderTopWidth="1px"
            borderColor="chakra-border-color"
            data-audio-track
            onPointerDown={event => event.stopPropagation()}
            onPointerMove={handlePointerMove}
            onPointerUp={event => finishDrag(event, true)}
            onPointerCancel={event => finishDrag(event, false)}
            onLostPointerCapture={event => finishDrag(event, false)}
        >
            <Text fontSize="10px" color="gray.500" height="24px" px={2} pt={1}>
                {t('header.timelinePage.audioTrack')}
            </Text>
            {entries.map((entry, index) => {
                const { start, end } =
                    draft?.entryId === entry.id ? draft : getTimelineAudioRange(entry, cursorTimes, duration);
                const isMissing = missing.has(entry.id);
                const startPosition = timeScale?.timeToPosition(start);
                const endPosition = timeScale?.timeToPosition(end);
                const isCompact =
                    duration > 0 &&
                    (endPosition !== undefined && startPosition !== undefined
                        ? endPosition - startPosition
                        : ((end - start) / duration) * totalWidth) < 80;
                return (
                    <Tooltip
                        key={entry.id}
                        label={`${entry.name} · ${formatTimelineTime(start)} – ${formatTimelineTime(end)}`}
                        isDisabled={draft !== undefined}
                    >
                        <Box
                            position="absolute"
                            left={
                                startPosition !== undefined
                                    ? `${startPosition}px`
                                    : `${duration ? (start / duration) * 100 : 0}%`
                            }
                            top={`${24 + index * AUDIO_ROW_HEIGHT}px`}
                            width={
                                endPosition !== undefined && startPosition !== undefined
                                    ? `${endPosition - startPosition}px`
                                    : `${duration ? ((end - start) / duration) * 100 : 100}%`
                            }
                            minW={0}
                            height="24px"
                            bg={isMissing ? 'gray.400' : 'blue.500'}
                            borderRadius="md"
                            cursor={
                                draft?.entryId === entry.id && dragRef.current?.mode === 'move' ? 'grabbing' : 'grab'
                            }
                            userSelect="none"
                            style={{ touchAction: 'none' }}
                            data-audio-clip={entry.id}
                            title={entry.name}
                            role="group"
                            onPointerDown={event => handlePointerDown(event, entry, 'move')}
                            onClick={() => isMissing && restore(entry)}
                        >
                            <Box
                                position="absolute"
                                left={0}
                                top={0}
                                bottom={0}
                                width={`min(${AUDIO_HANDLE_WIDTH}px, 50%)`}
                                cursor="ew-resize"
                                bg="whiteAlpha.400"
                                borderLeftRadius="md"
                                data-audio-handle="start"
                                onPointerDown={event => handlePointerDown(event, entry, 'start')}
                            />
                            <Box width="100%" height="100%" overflow="hidden">
                                <Text
                                    fontSize="11px"
                                    color="white"
                                    height="100%"
                                    lineHeight="24px"
                                    px={3}
                                    pr={isCompact ? 3 : '60px'}
                                    overflow="hidden"
                                    whiteSpace="nowrap"
                                    textOverflow="ellipsis"
                                >
                                    {entry.name}
                                </Text>
                            </Box>
                            <HStack
                                spacing={0}
                                position="absolute"
                                right={isCompact ? 0 : `${AUDIO_HANDLE_WIDTH}px`}
                                top={isCompact ? '-22px' : 0}
                                height="22px"
                                borderRadius="sm"
                                bg={isCompact ? 'blue.500' : undefined}
                                opacity={isCompact ? 0 : 1}
                                _groupHover={{ opacity: 1 }}
                                _groupFocusWithin={{ opacity: 1 }}
                            >
                                <Popover placement="top">
                                    <PopoverTrigger>
                                        <IconButton
                                            size="xs"
                                            variant="ghost"
                                            color="white"
                                            minW="22px"
                                            height="22px"
                                            icon={<MdTune />}
                                            aria-label={`${t('header.timelinePage.audioTiming')}: ${entry.name}`}
                                            onClick={event => event.stopPropagation()}
                                        />
                                    </PopoverTrigger>
                                    <Portal>
                                        <PopoverContent
                                            width="280px"
                                            onPointerDown={event => event.stopPropagation()}
                                            onClick={event => event.stopPropagation()}
                                        >
                                            <PopoverBody>
                                                <Text fontSize="sm" fontWeight="semibold" mb={2} noOfLines={1}>
                                                    {entry.name}
                                                </Text>
                                                <FormControl mb={2}>
                                                    <FormLabel fontSize="xs">
                                                        {t('header.timelinePage.audioStart')}
                                                    </FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={start}
                                                        min={0}
                                                        max={end}
                                                        step={0.1}
                                                        precision={2}
                                                        onChange={(_value, number) =>
                                                            Number.isFinite(number) &&
                                                            updateEntry(entry.id, number, end)
                                                        }
                                                    >
                                                        <NumberInputField
                                                            aria-label={`${t('header.timelinePage.audioStart')}: ${entry.name}`}
                                                        />
                                                    </NumberInput>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="xs">
                                                        {t('header.timelinePage.audioEnd')}
                                                    </FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={end}
                                                        min={start}
                                                        max={duration}
                                                        step={0.1}
                                                        precision={2}
                                                        onChange={(_value, number) =>
                                                            Number.isFinite(number) &&
                                                            updateEntry(entry.id, start, number)
                                                        }
                                                    >
                                                        <NumberInputField
                                                            aria-label={`${t('header.timelinePage.audioEnd')}: ${entry.name}`}
                                                        />
                                                    </NumberInput>
                                                </FormControl>
                                                {durations[entry.id] !== undefined && (
                                                    <Text fontSize="xs" color="gray.500" mt={2}>
                                                        {t('header.timelinePage.audioDuration', {
                                                            duration: durations[entry.id].toFixed(2),
                                                        })}
                                                    </Text>
                                                )}
                                            </PopoverBody>
                                        </PopoverContent>
                                    </Portal>
                                </Popover>
                                <CloseButton
                                    size="xs"
                                    color="white"
                                    aria-label={`${t('header.timelinePage.deleteEntry')}: ${entry.name}`}
                                    onClick={event => {
                                        event.stopPropagation();
                                        onChange({
                                            ...document,
                                            audioTrack: entries.filter(item => item.id !== entry.id),
                                        });
                                    }}
                                />
                            </HStack>
                            <Box
                                position="absolute"
                                right={0}
                                top={0}
                                bottom={0}
                                width={`min(${AUDIO_HANDLE_WIDTH}px, 50%)`}
                                cursor="ew-resize"
                                bg="whiteAlpha.400"
                                borderRightRadius="md"
                                data-audio-handle="end"
                                onPointerDown={event => handlePointerDown(event, entry, 'end')}
                            />
                        </Box>
                    </Tooltip>
                );
            })}
            {entries.some(entry => missing.has(entry.id)) && (
                <Alert status="error" mt={`${24 + entries.length * AUDIO_ROW_HEIGHT}px`}>
                    <AlertIcon />
                    {t('header.timelinePage.audioMissing')}
                </Alert>
            )}
            <input ref={inputRef} type="file" accept="audio/*" hidden onChange={handleRestore} />
        </Box>
    );
}
