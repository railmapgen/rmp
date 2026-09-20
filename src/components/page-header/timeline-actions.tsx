import {
    Button,
    Popover,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Portal,
    useDisclosure,
    VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdAnimation, MdEdit, MdExitToApp, MdKey, MdPause, MdAudiotrack } from 'react-icons/md';
import { nanoid } from 'nanoid';
import { Id, NodeId } from '../../constants/constants';
import { isElementEntry } from '../../constants/timeline';
import { useTimelineProjectContext } from '../../timeline/timeline-project-context';
import { replaceTimeline, setCursor, useTimelineDispatch, useTimelineSelector } from '../../timeline/timeline-store';
import { insertKeyframeEntry, insertTimelineExitEntry, insertTimelinePause } from '../../util/timeline';

export default function TimelineActions() {
    const { t } = useTranslation();
    const dispatch = useTimelineDispatch();
    const timeline = useTimelineSelector(state => state.project.active!.revision.timeline);
    const selected = useTimelineSelector(state => state.runtime.selected);
    const timelineCursor = useTimelineSelector(state => state.runtime.cursor);
    const { graph, saveAudio } = useTimelineProjectContext();
    const audioInputRef = React.useRef<HTMLInputElement>(null);
    const insertMenu = useDisclosure();
    const editMenu = useDisclosure();

    const selectedElementId = React.useMemo(() => {
        if (selected.size !== 1) return undefined;
        const [id] = selected;
        return (graph.hasNode(id) || graph.hasEdge(id) ? id : undefined) as Id | undefined;
    }, [graph, selected]);
    const selectedNodeId =
        selectedElementId && graph.hasNode(selectedElementId) ? (selectedElementId as NodeId) : undefined;
    const canInsertExit = React.useMemo(
        () =>
            selectedElementId !== undefined &&
            timeline.track.some(
                entry => isElementEntry(entry) && entry.refId === selectedElementId && entry.phase === 'enter'
            ) &&
            !timeline.track.some(
                entry => isElementEntry(entry) && entry.refId === selectedElementId && entry.phase === 'exit'
            ),
        [selectedElementId, timeline.track]
    );
    const selectedNodeEntries = React.useMemo(
        () =>
            selectedNodeId
                ? timeline.track.filter(entry => isElementEntry(entry) && entry.refId === selectedNodeId)
                : [],
        [selectedNodeId, timeline.track]
    );
    const canAdjustAnimation = selectedNodeEntries.length > 0;
    const areSelectedNodeAnimationsShown = selectedNodeEntries.every(
        entry => isElementEntry(entry) && entry.showAnimation
    );

    const handleInsertKeyframe = () => {
        if (!selectedNodeId) return;

        const { document, cursor } = insertKeyframeEntry(timeline, graph, selectedNodeId, timelineCursor);
        dispatch(replaceTimeline(document));
        dispatch(setCursor(cursor));
    };
    const handleInsertExit = () => {
        if (!selectedElementId) return;

        const { document, cursor } = insertTimelineExitEntry(timeline, selectedElementId, timelineCursor);
        if (document === timeline) return;
        dispatch(replaceTimeline(document));
        dispatch(setCursor(cursor));
    };
    const handleInsertPause = (position: 'before' | 'after') => {
        const { document, cursor } = insertTimelinePause(timeline, position, timelineCursor);
        dispatch(replaceTimeline(document));
        dispatch(setCursor(cursor));
    };
    const handleToggleSelectedNodeAnimation = () => {
        if (!canAdjustAnimation) return;
        const showAnimation = !areSelectedNodeAnimationsShown;
        const document = {
            ...timeline,
            track: timeline.track.map(entry =>
                isElementEntry(entry) && entry.refId === selectedNodeId ? { ...entry, showAnimation } : entry
            ),
        };
        dispatch(replaceTimeline(document));
    };
    const handleAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const id = `audio_${nanoid(12)}`;
        await saveAudio(id, file, file.name);
        dispatch(
            replaceTimeline({
                ...timeline,
                audioTrack: [
                    ...(timeline.audioTrack ?? []),
                    {
                        id: `timeline_${nanoid(10)}`,
                        kind: 'audio',
                        blobId: id,
                        name: file.name,
                        startSlot: 0,
                        endSlot: Math.max(1, timeline.track.length),
                    },
                ],
            })
        );
    };

    return (
        <>
            <Popover
                isOpen={insertMenu.isOpen}
                onOpen={insertMenu.onOpen}
                onClose={insertMenu.onClose}
                placement="bottom-start"
            >
                <PopoverTrigger>
                    <Button size="sm" variant="ghost" leftIcon={<MdAdd />}>
                        {t('header.timelinePage.insert')}
                    </Button>
                </PopoverTrigger>
                <Portal>
                    <PopoverContent width="auto">
                        <PopoverBody p={1}>
                            <VStack align="stretch" spacing={0} minW="240px">
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdAudiotrack />}
                                    onClick={() => {
                                        insertMenu.onClose();
                                        audioInputRef.current?.click();
                                    }}
                                >
                                    {t('header.timelinePage.insertAudio')}
                                </Button>
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdKey />}
                                    isDisabled={!selectedNodeId}
                                    onClick={() => {
                                        insertMenu.onClose();
                                        handleInsertKeyframe();
                                    }}
                                >
                                    {t('header.timelinePage.insertKeyframe')}
                                </Button>
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdExitToApp />}
                                    isDisabled={!canInsertExit}
                                    onClick={() => {
                                        insertMenu.onClose();
                                        handleInsertExit();
                                    }}
                                >
                                    {t('header.timelinePage.insertExitAnimation')}
                                </Button>
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdPause />}
                                    onClick={() => {
                                        insertMenu.onClose();
                                        handleInsertPause('before');
                                    }}
                                >
                                    {t('header.timelinePage.insertFramePauseBefore')}
                                </Button>
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdPause />}
                                    onClick={() => {
                                        insertMenu.onClose();
                                        handleInsertPause('after');
                                    }}
                                >
                                    {t('header.timelinePage.insertFramePauseAfter')}
                                </Button>
                            </VStack>
                        </PopoverBody>
                    </PopoverContent>
                </Portal>
            </Popover>
            <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudio} />
            <Popover
                isOpen={editMenu.isOpen}
                onOpen={editMenu.onOpen}
                onClose={editMenu.onClose}
                placement="bottom-start"
            >
                <PopoverTrigger>
                    <Button size="sm" variant="ghost" leftIcon={<MdEdit />}>
                        {t('header.edit')}
                    </Button>
                </PopoverTrigger>
                <Portal>
                    <PopoverContent width="auto">
                        <PopoverBody p={1}>
                            <VStack align="stretch" spacing={0} minW="240px">
                                <Button
                                    size="sm"
                                    justifyContent="flex-start"
                                    variant="ghost"
                                    fontWeight="normal"
                                    leftIcon={<MdAnimation />}
                                    isDisabled={!canAdjustAnimation}
                                    onClick={() => {
                                        editMenu.onClose();
                                        handleToggleSelectedNodeAnimation();
                                    }}
                                >
                                    {t('header.timelinePage.showAnimation')}
                                </Button>
                            </VStack>
                        </PopoverBody>
                    </PopoverContent>
                </Portal>
            </Popover>
        </>
    );
}
