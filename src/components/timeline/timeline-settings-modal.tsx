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
import { MdEdit } from 'react-icons/md';
import {
    getTimelineSettings,
    isTimelineCameraZoom,
    TimelineDocument,
    TimelineSettings,
} from '../../constants/timeline';
import { videoExportSpeedRange } from '../../util/video-export';

interface TimelineSettingsModalProps {
    document: TimelineDocument;
    onDocumentChange: (document: TimelineDocument) => void;
    isOpen: boolean;
    onClose: () => void;
    onOpenLineInformation?: () => void;
}

export default function TimelineSettingsModal({
    document,
    onDocumentChange,
    isOpen,
    onClose,
    onOpenLineInformation,
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
    const overlayFields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('header.timelinePage.settings.showYear'),
            isChecked: settings.showYear,
            minW: 'full',
            oneLine: true,
            onChange: showYear => updateSettings({ showYear }),
        },
        {
            type: 'switch',
            label: t('header.timelinePage.settings.showLineName'),
            isChecked: settings.showLineName,
            minW: 'full',
            oneLine: true,
            onChange: showLineName => updateSettings({ showLineName }),
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
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
                                    {t('header.timelinePage.settings.overlays')}
                                </Text>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    colorScheme="teal"
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
                            <RmgFields fields={overlayFields} />
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
