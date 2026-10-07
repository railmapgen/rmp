import {
    Alert,
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertIcon,
    Box,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Container,
    Heading,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Stack,
    Text,
    VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDelete, MdEdit, MdFolderOpen, MdUpload } from 'react-icons/md';
import {
    createTimelineProjectFromParsedRmp,
    getOpenRmpProjectSource,
    importTimelineProjectFile,
    ParsedRmpTimelineSource,
    parseRmpTimelineSource,
} from '../../timeline/timeline-project-io';
import { timelineProjectDB } from '../../timeline/timeline-project-db';
import {
    clearRuntime,
    openProject,
    refreshTimelineProjects,
    setError,
    setLastProjectId,
    useTimelineDispatch,
    useTimelineSelector,
} from '../../timeline/timeline-store';
import TimelineRmpImportModal from '../timeline/timeline-rmp-import-modal';

const readText = (file: File) => file.text();

export default function TimelineProjectHome() {
    const { t, i18n } = useTranslation();
    const dispatch = useTimelineDispatch();
    const projects = useTimelineSelector(state => state.project.projects);
    const lastProjectId = useTimelineSelector(state => state.project.lastProjectId);
    const error = useTimelineSelector(state => state.project.error);
    const timelineInput = React.useRef<HTMLInputElement>(null);
    const renameInput = React.useRef<HTMLInputElement>(null);
    const deleteCancel = React.useRef<HTMLButtonElement>(null);
    const [busy, setBusy] = React.useState(false);
    const [pendingRmp, setPendingRmp] = React.useState<ParsedRmpTimelineSource>();
    const [renameTarget, setRenameTarget] = React.useState<{ id: string; currentName: string }>();
    const [renameName, setRenameName] = React.useState('');
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string }>();
    const resumableProjectId = projects.some(project => project.id === lastProjectId) ? lastProjectId : undefined;

    const runImport = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        dispatch(setError(undefined));
        try {
            const record = await importTimelineProjectFile(await readText(file));
            await refreshTimelineProjects();
            dispatch(clearRuntime());
            dispatch(setLastProjectId(record.id));
            dispatch(openProject(record));
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        } finally {
            setBusy(false);
        }
    };

    const startFromCurrentRmp = async () => {
        setBusy(true);
        dispatch(setError(undefined));
        try {
            setPendingRmp(await parseRmpTimelineSource(await getOpenRmpProjectSource()));
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        } finally {
            setBusy(false);
        }
    };

    const confirmRmpImport = async (applyLineInformation: boolean) => {
        if (!pendingRmp) return;
        setBusy(true);
        dispatch(setError(undefined));
        try {
            const record = await createTimelineProjectFromParsedRmp(
                pendingRmp,
                t('header.timelinePage.newProjectName'),
                {
                    applyLineInformation,
                }
            );
            await refreshTimelineProjects();
            dispatch(clearRuntime());
            dispatch(setLastProjectId(record.id));
            dispatch(openProject(record));
            setPendingRmp(undefined);
        } catch (cause) {
            dispatch(setError(cause instanceof Error ? cause.message : String(cause)));
        } finally {
            setBusy(false);
        }
    };

    const handleOpen = async (id: string) => {
        const record = await timelineProjectDB.getProject(id);
        if (!record) return;
        await timelineProjectDB.setLastProjectId(id);
        dispatch(clearRuntime());
        dispatch(setLastProjectId(id));
        dispatch(openProject(record));
    };

    const openRename = (id: string, currentName: string) => {
        setRenameTarget({ id, currentName });
        setRenameName(currentName);
    };

    const handleRename = async () => {
        const name = renameName.trim();
        if (!renameTarget || !name || name === renameTarget.currentName) {
            setRenameTarget(undefined);
            return;
        }
        await timelineProjectDB.renameProject(renameTarget.id, name);
        await refreshTimelineProjects();
        setRenameTarget(undefined);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await timelineProjectDB.deleteProject(deleteTarget.id);
        await refreshTimelineProjects();
        setDeleteTarget(undefined);
    };

    return (
        <Box height="100%" overflow="auto" py={10}>
            <Container maxW="6xl">
                <VStack align="stretch" spacing={6}>
                    <Box>
                        <Heading size="lg">{t('Rail Map Chronicle')}</Heading>
                        <Text color="gray.500" mt={2}>
                            {t('header.timelinePage.homeDescription')}
                        </Text>
                    </Box>
                    {error && (
                        <Alert status="error">
                            <AlertIcon />
                            {error}
                        </Alert>
                    )}
                    <input
                        ref={timelineInput}
                        type="file"
                        accept=".json,application/json"
                        hidden
                        onChange={event => {
                            void runImport(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                    <Stack
                        data-testid="timeline-home-actions"
                        direction={{ base: 'column', md: 'row' }}
                        spacing={3}
                        align={{ base: 'stretch', md: 'center' }}
                    >
                        {resumableProjectId && (
                            <Button
                                leftIcon={<MdEdit />}
                                colorScheme="teal"
                                isLoading={busy}
                                onClick={() => void handleOpen(resumableProjectId)}
                            >
                                {t('header.timelinePage.continueEditing')}
                            </Button>
                        )}
                        <Button
                            leftIcon={<MdAdd />}
                            colorScheme={resumableProjectId ? undefined : 'teal'}
                            isLoading={busy}
                            onClick={() => void startFromCurrentRmp()}
                        >
                            {t('header.timelinePage.startFromCurrentRmp')}
                        </Button>
                        <Button leftIcon={<MdUpload />} isLoading={busy} onClick={() => timelineInput.current?.click()}>
                            {t('header.timelinePage.importTimelineProject')}
                        </Button>
                    </Stack>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {projects.map(project => (
                            <Card key={project.id} variant="outline">
                                <CardBody>
                                    <VStack align="stretch">
                                        <Heading size="sm" noOfLines={1}>
                                            {project.name}
                                        </Heading>
                                        {project.id === lastProjectId && (
                                            <Text fontSize="xs" color="teal.500">
                                                {t('header.timelinePage.recentProject')}
                                            </Text>
                                        )}
                                        <Text fontSize="xs" color="gray.500">
                                            {t('header.timelinePage.updatedAt')}{' '}
                                            {new Date(project.updatedAt).toLocaleString(i18n.resolvedLanguage)}
                                        </Text>
                                        <ButtonGroup size="sm" mt={2}>
                                            <Button
                                                leftIcon={<MdFolderOpen />}
                                                onClick={() => void handleOpen(project.id)}
                                            >
                                                {t('header.timelinePage.openProject')}
                                            </Button>
                                            <Button
                                                aria-label={t('header.timelinePage.renameProject')}
                                                leftIcon={<MdEdit />}
                                                onClick={() => openRename(project.id, project.name)}
                                            >
                                                {t('header.timelinePage.renameProject')}
                                            </Button>
                                            <Button
                                                aria-label={t('header.timelinePage.deleteProject')}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                                            >
                                                <MdDelete />
                                            </Button>
                                        </ButtonGroup>
                                    </VStack>
                                </CardBody>
                            </Card>
                        ))}
                    </SimpleGrid>
                </VStack>
            </Container>
            <TimelineRmpImportModal
                revision={pendingRmp?.revision}
                isLoading={busy}
                onClose={() => setPendingRmp(undefined)}
                onImport={applyLineInformation => void confirmRmpImport(applyLineInformation)}
            />
            <Modal
                isOpen={renameTarget !== undefined}
                onClose={() => setRenameTarget(undefined)}
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
                        <Button onClick={() => setRenameTarget(undefined)}>{t('cancel')}</Button>
                        <Button colorScheme="teal" ml={3} isDisabled={!renameName.trim()} onClick={handleRename}>
                            {t('header.timelinePage.renameProject')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <AlertDialog
                isOpen={deleteTarget !== undefined}
                leastDestructiveRef={deleteCancel}
                onClose={() => setDeleteTarget(undefined)}
                isCentered
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader>{t('header.timelinePage.deleteProject')}</AlertDialogHeader>
                        <AlertDialogBody>
                            {t('header.timelinePage.deleteProjectConfirm', { name: deleteTarget?.name })}
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={deleteCancel} onClick={() => setDeleteTarget(undefined)}>
                                {t('cancel')}
                            </Button>
                            <Button colorScheme="red" ml={3} onClick={handleDelete}>
                                {t('header.timelinePage.deleteProject')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}
