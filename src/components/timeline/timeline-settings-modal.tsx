import {
    Box,
    Button,
    Divider,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MdEdit, MdPushPin } from 'react-icons/md';
import {
    getTimelineSettings,
    isTimelineCameraZoom,
    TimelineDocument,
    TimelineSettings,
} from '../../constants/timeline';
import { videoExportSpeedRange } from '../../util/video-export/video-export';

interface TimelineSettingsModalProps {
    document: TimelineDocument;
    mapEnabled?: boolean;
    onDocumentChange: (document: TimelineDocument) => void;
    isOpen: boolean;
    onClose: () => void;
    onOpenLineInformation?: () => void;
    onEditOverlayModules?: () => void;
    onEditFixedResources?: () => void;
}

export default function TimelineSettingsModal({
    document,
    onDocumentChange,
    isOpen,
    onClose,
    onOpenLineInformation,
    onEditOverlayModules,
    onEditFixedResources,
}: TimelineSettingsModalProps) {
    const { t } = useTranslation();
    const settings = getTimelineSettings(document);
    const mutedColor = useColorModeValue('gray.600', 'gray.300');
    const panelBackground = useColorModeValue('gray.50', 'whiteAlpha.50');
    const updateSettings = (changes: Partial<TimelineSettings>) =>
        onDocumentChange({ ...document, settings: { ...settings, ...changes } });

    const playbackFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.timelinePage.settings.cameraZoom'),
            value: String(settings.cameraZoom),
            options: {
                '1': t('header.timelinePage.settings.cameraZoomFull'),
                '2': '2x',
                '4': '4x',
                '8': '8x',
                '16': '16x',
            },
            onChange: value => {
                const cameraZoom = Number(value);
                if (isTimelineCameraZoom(cameraZoom)) updateSettings({ cameraZoom });
            },
            minW: 'full',
        },
        {
            type: 'slider',
            label: `${t('header.download.videoExport.speed')} (${settings.speedMultiplier.toFixed(1)}×)`,
            value: settings.speedMultiplier,
            min: videoExportSpeedRange.min,
            max: videoExportSpeedRange.max,
            step: videoExportSpeedRange.step,
            onChange: speedMultiplier => updateSettings({ speedMultiplier }),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('header.download.videoExport.autoChangeStationType'),
            isChecked: settings.autoChangeStationType,
            minW: 'full',
            oneLine: true,
            onChange: autoChangeStationType => updateSettings({ autoChangeStationType }),
        },
    ];
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
            <ModalOverlay backdropFilter="blur(3px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader fontSize="lg" pb={3}>
                    {t('header.timelinePage.settings.title')}
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody pt={0} pb={4}>
                    <Stack spacing={4} divider={<Divider />}>
                        <Box>
                            <Text fontSize="sm" fontWeight="semibold" color={mutedColor} mb={2}>
                                {t('header.timelinePage.settings.playback')}
                            </Text>
                            <RmgFields fields={playbackFields} />
                        </Box>
                        <Box bg={panelBackground} borderRadius="lg" p={3}>
                            <Text fontSize="sm" fontWeight="semibold" color={mutedColor} mb={3}>
                                {t('header.timelinePage.settings.overlays')}
                            </Text>
                            <Stack spacing={3}>
                                <HStack justify="space-between" spacing={4}>
                                    <Text fontSize="xs" color={mutedColor}>
                                        {t('header.timelinePage.settings.lineInformationHint')}
                                    </Text>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        colorScheme="teal"
                                        flexShrink={0}
                                        leftIcon={<MdEdit />}
                                        isDisabled={!onOpenLineInformation}
                                        onClick={() => {
                                            onClose();
                                            onOpenLineInformation?.();
                                        }}
                                    >
                                        {t('header.timelinePage.settings.lineInformation')}
                                    </Button>
                                </HStack>
                                <HStack justify="space-between" spacing={4}>
                                    <Text fontSize="xs" color={mutedColor}>
                                        {t('header.timelinePage.settings.editPositionsHint')}
                                    </Text>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        colorScheme="teal"
                                        flexShrink={0}
                                        leftIcon={<MdEdit />}
                                        isDisabled={!onEditOverlayModules}
                                        onClick={() => {
                                            onClose();
                                            onEditOverlayModules?.();
                                        }}
                                    >
                                        {t('header.timelinePage.overlayEditor.editPositions')}
                                    </Button>
                                </HStack>
                                <HStack justify="space-between" spacing={4}>
                                    <Text fontSize="xs" color={mutedColor}>
                                        {t('header.timelinePage.settings.fixedResourcesHint')}
                                    </Text>
                                    <Button
                                        size="xs"
                                        colorScheme="teal"
                                        variant="outline"
                                        flexShrink={0}
                                        leftIcon={<MdPushPin />}
                                        isDisabled={!onEditFixedResources}
                                        onClick={() => {
                                            onClose();
                                            onEditFixedResources?.();
                                        }}
                                    >
                                        {t('header.timelinePage.settings.chooseFixedResources')}
                                    </Button>
                                </HStack>
                            </Stack>
                        </Box>
                    </Stack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px" justifyContent="space-between" gap={4}>
                    <Text fontSize="xs" color={mutedColor}>
                        {t('header.timelinePage.settings.savedWithProject')}
                    </Text>
                    <Button size="sm" colorScheme="teal" onClick={onClose}>
                        {t('header.timelinePage.settings.done')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
