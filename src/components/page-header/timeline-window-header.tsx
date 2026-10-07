import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Input,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Popover,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Portal,
    Text,
    useDisclosure,
    VStack,
} from '@chakra-ui/react';
import { RmgWindowHeader } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { LANGUAGE_NAMES, LanguageCode } from '@railmapgen/rmg-translate';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    MdChevronRight,
    MdDownload,
    MdEdit,
    MdFolder,
    MdHelp,
    MdInsertDriveFile,
    MdRedo,
    MdSync,
    MdTranslate,
    MdUndo,
    MdUpload,
    MdVideoLibrary,
    MdZoomIn,
    MdZoomOut,
} from 'react-icons/md';
import { downloadAs } from '../../util/download';
import { yieldLineCalculation } from '../../util/line-export';
import { populateTimelineFromLineInformation } from '../../util/timeline-line-import';
import {
    exportTimelineProjectFile,
    getTimelineRevisionAssetIds,
    getOpenRmpProjectSource,
    prepareTimelineProjectSync,
} from '../../timeline/timeline-project-io';
import { timelineProjectDB } from '../../timeline/timeline-project-db';
import {
    clearRuntime,
    closeProject,
    commitRevision,
    refreshTimelineProjects,
    redo,
    setError,
    setProjectName,
    setViewport,
    undo,
    useTimelineDispatch,
    useTimelineSelector,
} from '../../timeline/timeline-store';
import { useWindowSize } from '../../util/hooks';
import TimelineRmpImportModal from '../timeline/timeline-rmp-import-modal';
import AboutModal from './about-modal';
import TimelineActions from './timeline-actions';
import VideoExportModal from './video-export-modal';

type PendingTimelineSync = Awaited<ReturnType<typeof prepareTimelineProjectSync>>;
const COMPACT_HEADER_TEXT_WIDTH = 1150;
const STACKED_HEADER_WIDTH = 900;

export default function TimelineWindowHeader() {
    const { t } = useTranslation();
    const dispatch = useTimelineDispatch();
    const active = useTimelineSelector(state => state.project.active);
    const canUndo = useTimelineSelector(state => state.project.past.length > 0);
    const canRedo = useTimelineSelector(state => state.project.future.length > 0);
    const runtimeViewport = useTimelineSelector(state => state.runtime.viewport);
    const { width: windowWidth } = useWindowSize();
    const syncInput = React.useRef<HTMLInputElement>(null);
    const renameInput = React.useRef<HTMLInputElement>(null);
    const filesMenu = useDisclosure();
    const [filesMenuPage, setFilesMenuPage] = React.useState<'root' | 'importRmp'>('root');
    const [isVideoOpen, setIsVideoOpen] = React.useState(false);
    const [isAboutOpen, setIsAboutOpen] = React.useState(false);
    const [isRenameOpen, setIsRenameOpen] = React.useState(false);
    const [renameName, setRenameName] = React.useState('');
    const [pendingSync, setPendingSync] = React.useState<PendingTimelineSync>();
    const [syncBusy, setSyncBusy] = React.useState(false);
    const syncBusyRef = React.useRef(false);
    const viewportWidth = windowWidth ?? Number.POSITIVE_INFINITY;
    const isCompactHeaderText = viewportWidth < COMPACT_HEADER_TEXT_WIDTH;
    const shouldStackHeader = viewportWidth < STACKED_HEADER_WIDTH;

    const closeFilesMenu = () => {
        setFilesMenuPage('root');
        filesMenu.onClose();
    };

    const goHome = async () => {
        if (active) {
            await timelineProjectDB.garbageCollectAssets(active.id, getTimelineRevisionAssetIds(active.revision));
        }
        dispatch(closeProject());
        dispatch(clearRuntime());
        await refreshTimelineProjects();
    };

    const handleDownload = async () => {
        if (!active) return;
        const source = await exportTimelineProjectFile(active);
        downloadAs(`Timeline_${Date.now()}.json`, 'application/json', source);
    };

    const openRename = () => {
        if (!active) return;
        setRenameName(active.name);
        setIsRenameOpen(true);
    };

    const handleRename = async () => {
        if (!active) return;
        const name = renameName.trim();
        if (!name) return;
        if (name === active.name) {
            setIsRenameOpen(false);
            return;
        }
        try {
            const renamed = await timelineProjectDB.renameProject(active.id, name);
            dispatch(setProjectName(renamed.name));
            await refreshTimelineProjects();
            setIsRenameOpen(false);
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        }
    };

    const changeZoom = (factor: number) => {
        if (!active) return;
        const viewport = runtimeViewport ?? {
            x: active.revision.svgViewBoxMin.x,
            y: active.revision.svgViewBoxMin.y,
            zoom: active.revision.svgViewBoxZoom,
        };
        dispatch(setViewport({ ...viewport, zoom: Math.max(10, Math.min(400, viewport.zoom * factor)) }));
    };

    const handleSync = async (source: () => Promise<string>) => {
        if (!active || syncBusyRef.current) return;
        syncBusyRef.current = true;
        setSyncBusy(true);
        dispatch(setError(undefined));
        try {
            const prepared = await prepareTimelineProjectSync(await source(), active.revision);
            setPendingSync(prepared);
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        } finally {
            syncBusyRef.current = false;
            setSyncBusy(false);
        }
    };

    const confirmSync = async (applyLineInformation: boolean) => {
        if (!active || !pendingSync || syncBusyRef.current) return;
        syncBusyRef.current = true;
        setSyncBusy(true);
        try {
            if (applyLineInformation) await yieldLineCalculation();
            const revision = {
                ...pendingSync.revision,
                timeline: applyLineInformation
                    ? populateTimelineFromLineInformation(pendingSync.revision.graph, pendingSync.revision.timeline)
                    : pendingSync.revision.timeline,
            };
            const next = { ...active, revision, updatedAt: Date.now() };
            await timelineProjectDB.saveProjectWithAssets(next, pendingSync.assets);
            dispatch(commitRevision(revision));
            dispatch(
                setViewport({
                    x: pendingSync.revision.svgViewBoxMin.x,
                    y: pendingSync.revision.svgViewBoxMin.y,
                    zoom: pendingSync.revision.svgViewBoxZoom,
                })
            );
            setPendingSync(undefined);
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        } finally {
            syncBusyRef.current = false;
            setSyncBusy(false);
        }
    };

    return (
        <RmgWindowHeader>
            <Flex
                data-testid="timeline-header-layout"
                direction={shouldStackHeader ? 'column' : 'row'}
                width="100%"
                align={shouldStackHeader ? 'stretch' : 'center'}
                gap={1}
            >
                <HStack minW={0} overflowX="auto" maxW="100%">
                    <Heading as="h4" size="md" whiteSpace="nowrap">
                        {t('Rail Map Chronicle')}
                    </Heading>
                    {active && (
                        <>
                            <Text maxW="32vw" noOfLines={1} color="gray.500">
                                {active.name}
                            </Text>
                            <Popover
                                isOpen={filesMenu.isOpen}
                                onOpen={() => {
                                    setFilesMenuPage('root');
                                    filesMenu.onOpen();
                                }}
                                onClose={closeFilesMenu}
                                placement="bottom-start"
                            >
                                <PopoverTrigger>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        leftIcon={<MdFolder />}
                                        aria-label={t('header.timelinePage.files')}
                                        title={t('header.timelinePage.files')}
                                        isLoading={syncBusy}
                                    >
                                        {isCompactHeaderText ? null : t('header.timelinePage.files')}
                                    </Button>
                                </PopoverTrigger>
                                <Portal>
                                    <PopoverContent width="auto">
                                        <PopoverBody p={1}>
                                            <Flex align="stretch">
                                                <VStack align="stretch" spacing={0} minW="240px">
                                                    <Button
                                                        size="sm"
                                                        justifyContent="flex-start"
                                                        variant="ghost"
                                                        fontWeight="normal"
                                                        leftIcon={<MdFolder />}
                                                        onClick={() => {
                                                            closeFilesMenu();
                                                            void goHome();
                                                        }}
                                                    >
                                                        {t('header.timelinePage.backToMainMenu')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        justifyContent="flex-start"
                                                        variant="ghost"
                                                        fontWeight="normal"
                                                        leftIcon={<MdSync />}
                                                        rightIcon={<MdChevronRight />}
                                                        onClick={() => setFilesMenuPage('importRmp')}
                                                    >
                                                        <Text flex="1" textAlign="left">
                                                            {t('header.timelinePage.importRmpData')}
                                                        </Text>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        justifyContent="flex-start"
                                                        variant="ghost"
                                                        fontWeight="normal"
                                                        leftIcon={<MdEdit />}
                                                        onClick={() => {
                                                            closeFilesMenu();
                                                            openRename();
                                                        }}
                                                    >
                                                        {t('header.timelinePage.renameProject')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        justifyContent="flex-start"
                                                        variant="ghost"
                                                        fontWeight="normal"
                                                        leftIcon={<MdDownload />}
                                                        onClick={() => {
                                                            closeFilesMenu();
                                                            void handleDownload();
                                                        }}
                                                    >
                                                        {t('header.timelinePage.downloadProject')}
                                                    </Button>
                                                </VStack>
                                                {filesMenuPage === 'importRmp' && (
                                                    <Box borderLeftWidth="1px" ml={1} pl={1} minW="240px">
                                                        <Text px={3} py={2} fontSize="sm" fontWeight="semibold">
                                                            {t('header.timelinePage.importRmpData')}
                                                        </Text>
                                                        <VStack align="stretch" spacing={0}>
                                                            <Button
                                                                size="sm"
                                                                justifyContent="flex-start"
                                                                variant="ghost"
                                                                fontWeight="normal"
                                                                leftIcon={<MdInsertDriveFile />}
                                                                onClick={() => {
                                                                    closeFilesMenu();
                                                                    void handleSync(getOpenRmpProjectSource);
                                                                }}
                                                            >
                                                                {t('header.timelinePage.importOpenPainterProject')}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                justifyContent="flex-start"
                                                                variant="ghost"
                                                                fontWeight="normal"
                                                                leftIcon={<MdUpload />}
                                                                onClick={() => {
                                                                    closeFilesMenu();
                                                                    syncInput.current?.click();
                                                                }}
                                                            >
                                                                {t('header.timelinePage.importLocalConfig')}
                                                            </Button>
                                                        </VStack>
                                                    </Box>
                                                )}
                                            </Flex>
                                        </PopoverBody>
                                    </PopoverContent>
                                </Portal>
                            </Popover>
                            <input
                                ref={syncInput}
                                type="file"
                                accept=".json,application/json"
                                hidden
                                disabled={syncBusy}
                                onChange={event => {
                                    const file = event.target.files?.[0];
                                    if (file) void handleSync(() => file.text());
                                    event.target.value = '';
                                }}
                            />
                        </>
                    )}
                    {active && (
                        <>
                            <TimelineActions compact={isCompactHeaderText} />
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<MdVideoLibrary />}
                                aria-label={t('header.timelinePage.exportVideo')}
                                title={t('header.timelinePage.exportVideo')}
                                onClick={() => setIsVideoOpen(true)}
                            >
                                {isCompactHeaderText ? null : t('header.timelinePage.exportVideo')}
                            </Button>
                        </>
                    )}
                </HStack>
                <HStack
                    ml={shouldStackHeader ? 0 : 'auto'}
                    overflowX="auto"
                    maxW="100%"
                    justifyContent={shouldStackHeader ? 'flex-end' : 'flex-start'}
                >
                    {active && (
                        <>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t('header.undo')}
                                icon={<MdUndo />}
                                isDisabled={!canUndo}
                                onClick={() => dispatch(undo())}
                            />
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t('header.redo')}
                                icon={<MdRedo />}
                                isDisabled={!canRedo}
                                onClick={() => dispatch(redo())}
                            />
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label="Zoom out"
                                icon={<MdZoomOut />}
                                onClick={() => changeZoom(1.25)}
                            />
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label="Zoom in"
                                icon={<MdZoomIn />}
                                onClick={() => changeZoom(0.8)}
                            />
                        </>
                    )}
                    {rmgRuntime.isStandaloneWindow() && (
                        <Menu>
                            <MenuButton
                                as={IconButton}
                                icon={<MdTranslate />}
                                variant="ghost"
                                size="sm"
                                aria-label="Language"
                            />
                            <MenuList>
                                {(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'] as LanguageCode[]).map(language => (
                                    <MenuItem
                                        key={language}
                                        onClick={() => void rmgRuntime.getI18nInstance().changeLanguage(language)}
                                    >
                                        {LANGUAGE_NAMES[language][language]}
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                    )}
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Help"
                        icon={<MdHelp />}
                        onClick={() => setIsAboutOpen(true)}
                    />
                </HStack>
            </Flex>
            {active && <VideoExportModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />}
            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <Modal
                isOpen={isRenameOpen}
                onClose={() => setIsRenameOpen(false)}
                initialFocusRef={renameInput}
                isCentered
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.timelinePage.renameProject')}</ModalHeader>
                    <ModalBody>
                        <Input
                            ref={renameInput}
                            aria-label={t('header.timelinePage.renameProjectPrompt')}
                            value={renameName}
                            onChange={event => setRenameName(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') void handleRename();
                            }}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={() => setIsRenameOpen(false)}>{t('cancel')}</Button>
                        <Button colorScheme="teal" ml={3} isDisabled={!renameName.trim()} onClick={handleRename}>
                            {t('header.timelinePage.renameProject')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <TimelineRmpImportModal
                revision={pendingSync?.revision}
                summary={
                    pendingSync
                        ? t('header.timelinePage.rmpImport.syncSummary', {
                              ...pendingSync.changes,
                              removedEntries: pendingSync.removedEntries,
                          })
                        : undefined
                }
                replacesTrack={!!active?.revision.timeline.track.length}
                isLoading={syncBusy}
                onClose={() => setPendingSync(undefined)}
                onImport={applyLineInformation => void confirmSync(applyLineInformation)}
            />
        </RmgWindowHeader>
    );
}
