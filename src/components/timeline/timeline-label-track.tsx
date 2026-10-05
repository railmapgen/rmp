import {
    Box,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Portal,
    Text,
    Textarea,
    Tooltip,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineDocument, TimelineLabelEntry } from '../../constants/timeline';
import { formatTimelineTime, getTimelineClipRange, TimelinePlaybackTiming } from '../../util/timeline-playback';
import { TimelineTrackTimeScale } from './timeline-track-layout';
import { useTimelineClipDrag } from './use-timeline-clip-drag';

interface TimelineLabelTrackProps {
    document: TimelineDocument;
    totalWidth: number;
    timing?: TimelinePlaybackTiming;
    timeScale?: TimelineTrackTimeScale;
    onChange: (document: TimelineDocument) => void;
}

const ROW_HEIGHT = 28;

export default function TimelineLabelTrack({
    document,
    totalWidth,
    timing,
    timeScale,
    onChange,
}: TimelineLabelTrackProps) {
    const { t } = useTranslation();
    const entries = document.labelTrack ?? [];
    const duration = timing?.duration ?? 0;
    const cursorTimes = timing?.cursorTimes ?? [0];
    const [contextMenu, setContextMenu] = React.useState<{ entryId: string; x: number; y: number }>();
    const [editingId, setEditingId] = React.useState<string>();
    const [text, setText] = React.useState('');
    const menuRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const { laneRef, draft, dragRef, handlePointerDown, handlePointerMove, finishDrag } = useTimelineClipDrag({
        document,
        totalWidth,
        timing,
        timeScale,
        onCommit: (entryId, start, end) => {
            const startTime = Math.max(0, Math.min(duration, Math.round(start * 1e6) / 1e6));
            const endTime = Math.max(startTime, Math.min(duration, Math.round(end * 1e6) / 1e6));
            onChange({
                ...document,
                labelTrack: entries.map(entry => (entry.id === entryId ? { ...entry, startTime, endTime } : entry)),
            });
        },
    });
    React.useEffect(() => {
        if (!contextMenu) return;
        const closeOutside = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setContextMenu(undefined);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setContextMenu(undefined);
        };
        window.addEventListener('pointerdown', closeOutside, true);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            window.removeEventListener('pointerdown', closeOutside, true);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [contextMenu]);
    const edit = (entry: TimelineLabelEntry) => {
        setContextMenu(undefined);
        setText(entry.text);
        setEditingId(entry.id);
    };
    const remove = (entryId: string) => {
        setContextMenu(undefined);
        onChange({ ...document, labelTrack: entries.filter(entry => entry.id !== entryId) });
    };
    const save = () => {
        const entry = entries.find(entry => entry.id === editingId);
        if (entry && entry.text !== text)
            onChange({
                ...document,
                labelTrack: entries.map(item => (item.id === entry.id ? { ...item, text } : item)),
            });
        setEditingId(undefined);
    };
    if (!entries.length) return null;
    return (
        <>
            <Box
                ref={laneRef}
                position="relative"
                width={`${totalWidth}px`}
                minW="100%"
                minH={`${entries.length * ROW_HEIGHT + 28}px`}
                mt={2}
                borderTopWidth="1px"
                data-label-track
                onPointerDown={event => event.stopPropagation()}
                onPointerMove={handlePointerMove}
                onPointerUp={event => finishDrag(event, true)}
                onPointerCancel={event => finishDrag(event, false)}
                onLostPointerCapture={event => finishDrag(event, false)}
            >
                <Text fontSize="10px" color="gray.500" height="24px" px={2} pt={1}>
                    Label
                </Text>
                {entries.map((entry, index) => {
                    const { start, end } =
                        draft?.entryId === entry.id ? draft : getTimelineClipRange(entry, cursorTimes, duration);
                    const startPosition = duration ? timeScale?.timeToPosition(start) : undefined;
                    const endPosition = duration ? timeScale?.timeToPosition(end) : undefined;
                    const caption = entry.text.trim() || 'Label';
                    return (
                        <Tooltip
                            key={entry.id}
                            label={`${caption} · ${formatTimelineTime(start)} – ${formatTimelineTime(end)}`}
                            isDisabled={draft !== undefined}
                        >
                            <Box
                                position="absolute"
                                left={
                                    startPosition !== undefined
                                        ? `${startPosition}px`
                                        : `${duration ? (start / duration) * 100 : 0}%`
                                }
                                width={
                                    endPosition !== undefined && startPosition !== undefined
                                        ? `${endPosition - startPosition}px`
                                        : `${duration ? ((end - start) / duration) * 100 : 100}%`
                                }
                                minW={0}
                                top={`${24 + index * ROW_HEIGHT}px`}
                                height="24px"
                                bg="teal.600"
                                color="white"
                                borderRadius="md"
                                cursor={
                                    draft?.entryId === entry.id && dragRef.current?.mode === 'move'
                                        ? 'grabbing'
                                        : 'grab'
                                }
                                userSelect="none"
                                style={{ touchAction: 'none' }}
                                data-label-clip={entry.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Label: ${caption}`}
                                _focusVisible={{ outline: '2px solid', outlineColor: 'teal.300', outlineOffset: '2px' }}
                                onPointerDown={event => handlePointerDown(event, entry, 'move')}
                                onDoubleClick={() => edit(entry)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        edit(entry);
                                    }
                                    if (event.key === 'Delete' || event.key === 'Backspace') {
                                        event.preventDefault();
                                        remove(entry.id);
                                    }
                                }}
                                onContextMenu={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setContextMenu({
                                        entryId: entry.id,
                                        x: Math.max(0, Math.min(event.clientX, window.innerWidth - 180)),
                                        y: Math.max(0, Math.min(event.clientY, window.innerHeight - 88)),
                                    });
                                }}
                            >
                                <Box
                                    position="absolute"
                                    left={0}
                                    top={0}
                                    bottom={0}
                                    width="min(9px, 50%)"
                                    cursor="ew-resize"
                                    bg="whiteAlpha.400"
                                    borderLeftRadius="md"
                                    data-label-handle="start"
                                    onPointerDown={event => handlePointerDown(event, entry, 'start')}
                                />
                                <Text
                                    fontSize="11px"
                                    lineHeight="24px"
                                    px={3}
                                    overflow="hidden"
                                    whiteSpace="nowrap"
                                    textOverflow="ellipsis"
                                >
                                    {caption}
                                </Text>
                                <Box
                                    position="absolute"
                                    right={0}
                                    top={0}
                                    bottom={0}
                                    width="min(9px, 50%)"
                                    cursor="ew-resize"
                                    bg="whiteAlpha.400"
                                    borderRightRadius="md"
                                    data-label-handle="end"
                                    onPointerDown={event => handlePointerDown(event, entry, 'end')}
                                />
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
            {contextMenu && (
                <Portal>
                    <Box
                        ref={menuRef}
                        role="menu"
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
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => event.stopPropagation()}
                    >
                        <Button
                            role="menuitem"
                            width="100%"
                            justifyContent="flex-start"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                const entry = entries.find(entry => entry.id === contextMenu.entryId);
                                if (entry) edit(entry);
                            }}
                        >
                            {t('header.edit')}
                        </Button>
                        <Button
                            role="menuitem"
                            width="100%"
                            justifyContent="flex-start"
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(contextMenu.entryId)}
                        >
                            {t('header.timelinePage.deleteEntry')}
                        </Button>
                    </Box>
                </Portal>
            )}
            <Modal
                isOpen={entries.some(entry => entry.id === editingId)}
                onClose={() => setEditingId(undefined)}
                initialFocusRef={textareaRef}
                size="lg"
            >
                <ModalOverlay onPointerDown={event => event.stopPropagation()} />
                <ModalContent
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => event.stopPropagation()}
                >
                    <ModalHeader>{t('header.timelinePage.editLabel')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Textarea
                            ref={textareaRef}
                            aria-label={t('header.timelinePage.labelText')}
                            placeholder={t('header.timelinePage.labelText')}
                            value={text}
                            onChange={event => setText(event.target.value)}
                            minH="160px"
                            resize="vertical"
                        />
                    </ModalBody>
                    <ModalFooter gap={2}>
                        <Button variant="ghost" onClick={() => setEditingId(undefined)}>
                            {t('cancel')}
                        </Button>
                        <Button colorScheme="teal" onClick={save}>
                            {t('header.timelinePage.saveLabel')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
