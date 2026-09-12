import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdAnimation, MdEdit, MdExitToApp, MdKey, MdRedo, MdUndo } from 'react-icons/md';
import { Id, NodeId } from '../../constants/constants';
import { isElementEntry } from '../../constants/timeline';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setTimelineCursor } from '../../redux/runtime/runtime-slice';
import { redoTimeline, setTimelineDocument, undoTimeline } from '../../redux/timeline/timeline-slice';
import { insertKeyframeEntry, insertTimelineExitEntry } from '../../util/timeline';

export default function TimelineProActions() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const timelineHistory = useRootSelector(state => state.timeline);
    const timeline = timelineHistory.present;
    const selected = useRootSelector(state => state.runtime.selected);
    const timelineCursor = useRootSelector(state => state.runtime.timelineCursor);
    const graph = React.useRef(window.graph);

    const selectedElementId = React.useMemo(() => {
        if (selected.size !== 1) return undefined;
        const [id] = selected;
        return (graph.current.hasNode(id) || graph.current.hasEdge(id) ? id : undefined) as Id | undefined;
    }, [selected]);
    const selectedNodeId =
        selectedElementId && graph.current.hasNode(selectedElementId) ? (selectedElementId as NodeId) : undefined;
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

    const handleTimelineUndo = () => {
        dispatch(undoTimeline());
    };
    const handleTimelineRedo = () => {
        dispatch(redoTimeline());
    };
    const handleInsertKeyframe = () => {
        if (!selectedNodeId) return;

        const { document, cursor } = insertKeyframeEntry(timeline, graph.current, selectedNodeId, timelineCursor);
        dispatch(setTimelineDocument(document));
        dispatch(setTimelineCursor(cursor));
    };
    const handleInsertExit = () => {
        if (!selectedElementId) return;

        const { document, cursor } = insertTimelineExitEntry(timeline, selectedElementId, timelineCursor);
        if (document === timeline) return;
        dispatch(setTimelineDocument(document));
        dispatch(setTimelineCursor(cursor));
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
        dispatch(setTimelineDocument(document));
    };

    return (
        <>
            <Menu>
                <MenuButton as={Button} size="sm" variant="ghost" leftIcon={<MdAdd />}>
                    {t('header.timelinePage.insert')}
                </MenuButton>
                <MenuList>
                    <MenuItem icon={<MdKey />} isDisabled={!selectedNodeId} onClick={handleInsertKeyframe}>
                        {t('header.timelinePage.insertKeyframe')}
                    </MenuItem>
                    <MenuItem icon={<MdExitToApp />} isDisabled={!canInsertExit} onClick={handleInsertExit}>
                        {t('header.timelinePage.insertExitAnimation')}
                    </MenuItem>
                </MenuList>
            </Menu>
            <Menu>
                <MenuButton as={Button} size="sm" variant="ghost" leftIcon={<MdEdit />}>
                    {t('header.edit')}
                </MenuButton>
                <MenuList>
                    <MenuItem
                        icon={<MdUndo />}
                        isDisabled={timelineHistory.past.length === 0}
                        onClick={handleTimelineUndo}
                    >
                        {t('header.undo')}
                    </MenuItem>
                    <MenuItem
                        icon={<MdRedo />}
                        isDisabled={timelineHistory.future.length === 0}
                        onClick={handleTimelineRedo}
                    >
                        {t('header.redo')}
                    </MenuItem>
                    <MenuItem
                        icon={<MdAnimation />}
                        isDisabled={!canAdjustAnimation}
                        onClick={handleToggleSelectedNodeAnimation}
                    >
                        {t('header.timelinePage.showAnimation')}
                    </MenuItem>
                </MenuList>
            </Menu>
        </>
    );
}
