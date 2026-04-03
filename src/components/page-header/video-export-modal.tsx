import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Checkbox,
    HStack,
    Icon,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadBlobAs } from '../../util/download';
import { exportVideo, VideoExportOptions } from '../../util/video-export';
import TermsAndConditionsModal from './terms-and-conditions';

interface VideoExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VideoExportModal({ isOpen, onClose }: VideoExportModalProps) {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { languages } = useRootSelector(state => state.fonts);
    const { existsNodeTypes } = useRootSelector(state => state.runtime);
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();
    const { t } = useTranslation();

    const graph = React.useRef(window.graph);

    const scales = [25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
    const scaleOptions: { [k: number]: string } = Object.fromEntries(scales.map(v => [v, `${v}%`]));
    const [scale, setScale] = React.useState(200);
    const [isTransparent, setIsTransparent] = React.useState(false);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(false);

    const [videoFps, setVideoFps] = React.useState(30);
    const [videoDuration, setVideoDuration] = React.useState(10);
    const [videoQuality, setVideoQuality] = React.useState(95);
    const [videoProgress, setVideoProgress] = React.useState(0);
    const [isVideoGenerating, setIsVideoGenerating] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);

    const validateAndSetFps = (value: string) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 60) {
            setVideoFps(num);
        }
    };

    const validateAndSetDuration = (value: string) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 300) {
            setVideoDuration(num);
        }
    };

    const validateAndSetQuality = (value: string) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 100) {
            setVideoQuality(num);
        }
    };

    const handleVideoExport = async () => {
        setIsVideoGenerating(true);
        setVideoProgress(0);

        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_IMAGES,
                isAllowProjectTelemetry ? { numberOfNodes: graph.current.order, numberOfEdges: graph.current.size } : {}
            );

        try {
            const options: VideoExportOptions = {
                fps: videoFps,
                duration: videoDuration,
                isTransparent,
                scale,
                isSystemFontsOnly,
                quality: videoQuality,
            };

            const blob = await exportVideo(graph.current, languages, existsNodeTypes, options, bgColor, progress =>
                setVideoProgress(Math.floor(progress * 100))
            );

            downloadBlobAs(`RMP_${new Date().valueOf()}.webm`, blob);
        } catch (error) {
            console.error('Video export failed:', error);
            dispatch(setGlobalAlert({ status: 'error', message: 'Video export failed. Please try again.' }));
        } finally {
            setIsVideoGenerating(false);
            setVideoProgress(0);
        }
    };

    const videoFields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.download.videoExport.fps'),
            value: videoFps.toString(),
            onChange: validateAndSetFps,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.download.videoExport.duration'),
            value: videoDuration.toString(),
            onChange: validateAndSetDuration,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.download.videoExport.quality'),
            value: videoQuality.toString(),
            onChange: validateAndSetQuality,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('header.download.scale'),
            value: scale,
            options: scaleOptions,
            onChange: value => setScale(value as number),
        },
        {
            type: 'switch',
            label: t('header.download.transparent'),
            isChecked: isTransparent,
            onChange: setIsTransparent,
        },
    ];

    return (
        <Modal size="2xl" isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.download.videoExport.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text mb={4}>{t('header.download.videoExport.description')}</Text>
                    <RmgFields fields={videoFields} />
                    <br />
                    <Checkbox isChecked={isSystemFontsOnly} onChange={e => setIsSystemFontsOnly(e.target.checked)}>
                        <Text>{t('header.download.isSystemFontsOnly')}</Text>
                    </Checkbox>
                    <Checkbox
                        id="agree_terms_video"
                        isChecked={isTermsAndConditionsSelected}
                        onChange={e => setIsTermsAndConditionsSelected(e.target.checked)}
                    >
                        <Text>
                            {t('header.download.termsAndConditionsInfo')}
                            <Link color="teal.500" onClick={() => setIsTermsAndConditionsModalOpen(true)}>
                                {t('header.download.termsAndConditions')} <Icon as={MdOpenInNew} />
                            </Link>
                            {t('header.download.period')}
                        </Text>
                    </Checkbox>

                    {isVideoGenerating && (
                        <Alert status="info" mt="4">
                            <AlertIcon />
                            <Box>
                                <AlertTitle>{t('header.download.videoExport.generating')}</AlertTitle>
                                <AlertDescription>
                                    {t('header.download.videoExport.progress', { progress: videoProgress })}
                                </AlertDescription>
                            </Box>
                        </Alert>
                    )}
                </ModalBody>

                <ModalFooter>
                    <HStack>
                        <Button
                            id="video_export_button"
                            colorScheme="teal"
                            variant="outline"
                            size="sm"
                            isDisabled={!isTermsAndConditionsSelected}
                            isLoading={isVideoGenerating}
                            onClick={handleVideoExport}
                        >
                            {t('header.download.confirm')}
                        </Button>
                    </HStack>
                </ModalFooter>

                <TermsAndConditionsModal
                    isOpen={isTermsAndConditionsModalOpen}
                    onClose={() => setIsTermsAndConditionsModalOpen(false)}
                />
            </ModalContent>
        </Modal>
    );
}
