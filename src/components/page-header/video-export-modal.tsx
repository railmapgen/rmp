import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Checkbox,
    Divider,
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
    Progress,
    Stack,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew, MdTimeline } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import stations from '../svgs/stations/stations';
import { Events } from '../../constants/constants';
import { GlobalAlertId } from '../../constants/global-alerts';
import { StationType } from '../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadBlobAs } from '../../util/download';
import {
    BasicToIntStationTypeMap,
    exportVideo,
    VideoExportOptions,
    VideoExportResolution,
} from '../../util/video-export';
import TermsAndConditionsModal from './terms-and-conditions';

interface VideoExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VideoExportModal({ isOpen, onClose }: VideoExportModalProps) {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const sectionHeadingColor = useColorModeValue('gray.600', 'gray.300');
    const dispatch = useRootDispatch();
    const {
        telemetry: { project: isAllowProjectTelemetry },
    } = useRootSelector(state => state.app);
    const { languages } = useRootSelector(state => state.fonts);
    const timeline = useRootSelector(state => state.timeline.present);
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const graph = React.useRef(window.graph);
    const supportedInterchangeStations = new Intl.ListFormat(i18n.language, {
        style: 'long',
        type: 'conjunction',
    }).format(
        (Object.keys(BasicToIntStationTypeMap) as StationType[]).map(stationType =>
            t(stations[stationType].metadata.displayName)
        )
    );

    const [scale, setScale] = React.useState(200);
    const [fullscreenScale, setFullscreenScale] = React.useState(100);
    const [isTransparent, setIsTransparent] = React.useState(false);
    const [autoChangeStationType, setAutoChangeStationType] = React.useState(true);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(false);

    const [videoFps, setVideoFps] = React.useState<30 | 60>(30);
    const [videoDuration, setVideoDuration] = React.useState(10);
    const [videoQuality, setVideoQuality] = React.useState(95);
    const [videoFormat, setVideoFormat] = React.useState<'webm' | 'mp4'>('mp4');
    const [videoResolution, setVideoResolution] = React.useState<VideoExportResolution>('720p');
    const [videoProgress, setVideoProgress] = React.useState(0);
    const [isVideoGenerating, setIsVideoGenerating] = React.useState(false);
    const [isVideoTranscoding, setIsVideoTranscoding] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);

    const validateAndSetDuration = (value: string) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 300) {
            setVideoDuration(num);
        }
    };

    const validateAndSetScale = (value: string, setter: React.Dispatch<React.SetStateAction<number>>) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 2000) {
            setter(num);
        }
    };

    const handleEditTimeline = () => {
        onClose();
        navigate('/timeline');
    };

    const handleClose = () => {
        if (!isVideoGenerating) {
            onClose();
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
                resolution: videoResolution,
                isTransparent,
                autoChangeStationType,
                scale,
                fullscreenScale,
                isSystemFontsOnly,
                quality: videoQuality,
                hideWatermark: isAttachSelected,
            };

            const renderingProgressWeight = videoFormat === 'mp4' ? 0.8 : 1;
            let blob = await exportVideo(graph.current, timeline, languages, options, bgColor, progress =>
                setVideoProgress(Math.floor(progress * renderingProgressWeight * 100))
            );

            if (videoFormat === 'mp4') {
                setIsVideoTranscoding(true);
                const { transcodeWebMToMP4 } = await import('../../util/video-transcode');
                blob = await transcodeWebMToMP4(blob, progress =>
                    setVideoProgress(Math.floor((renderingProgressWeight + progress * 0.2) * 100))
                );
            }

            downloadBlobAs(`RMP_${new Date().valueOf()}.${videoFormat}`, blob);
        } catch (error) {
            console.error('Video export failed:', error);
            dispatch(
                setGlobalAlert({
                    id: GlobalAlertId.VideoExportFailed,
                    status: 'error',
                    message: t('header.download.videoExport.error'),
                })
            );
        } finally {
            setIsVideoGenerating(false);
            setIsVideoTranscoding(false);
            setVideoProgress(0);
        }
    };

    const outputFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('header.download.videoExport.format'),
            value: videoFormat,
            options: {
                webm: t('header.download.videoExport.formats.webm'),
                mp4: t('header.download.videoExport.formats.mp4'),
            },
            onChange: value => {
                const nextFormat = value === 'mp4' ? 'mp4' : 'webm';
                setVideoFormat(nextFormat);
                if (nextFormat === 'mp4') setIsTransparent(false);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('header.download.videoExport.fps'),
            value: videoFps,
            options: {
                30: '30 FPS',
                60: '60 FPS',
            },
            onChange: value => setVideoFps(value === 60 ? 60 : 30),
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
            type: 'select',
            label: t('header.download.videoExport.resolution'),
            value: videoResolution,
            options: {
                '720p': t('header.download.videoExport.resolutions.720p'),
                '1080p': t('header.download.videoExport.resolutions.1080p'),
                '2k': t('header.download.videoExport.resolutions.2k'),
                '4k': t('header.download.videoExport.resolutions.4k'),
            },
            onChange: value => setVideoResolution(value as VideoExportResolution),
            minW: 'full',
        },
        {
            type: 'slider',
            label: `${t('header.download.videoExport.quality')} (${videoQuality}%)`,
            value: videoQuality,
            min: 1,
            max: 100,
            step: 1,
            onChange: setVideoQuality,
            minW: 'full',
        },
    ];

    const viewportFields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.download.videoExport.currentScale'),
            value: scale.toString(),
            onChange: value => validateAndSetScale(value, setScale),
            debouncedDelay: 0,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.download.videoExport.fullscreenScale'),
            value: fullscreenScale.toString(),
            onChange: value => validateAndSetScale(value, setFullscreenScale),
            debouncedDelay: 0,
            minW: 'full',
        },
    ];

    const renderingField1: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('header.download.transparent'),
            isChecked: isTransparent,
            isDisabled: videoFormat === 'mp4',
            minW: 'full',
            oneLine: true,
            onChange: setIsTransparent,
        },
    ];
    const renderingField2: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('header.download.videoExport.autoChangeStationType'),
            isChecked: autoChangeStationType,
            minW: 'full',
            oneLine: true,
            onChange: setAutoChangeStationType,
        },
    ];

    return (
        <Modal
            size="2xl"
            isOpen={isOpen}
            closeOnEsc={!isVideoGenerating}
            closeOnOverlayClick={!isVideoGenerating}
            onClose={handleClose}
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.download.videoExport.title')}</ModalHeader>
                <ModalCloseButton isDisabled={isVideoGenerating} />

                <ModalBody>
                    <Text mb={4}>{t('header.download.videoExport.description')}</Text>
                    <Alert status="info" variant="subtle" mb={4} alignItems="center" hidden={isVideoGenerating}>
                        <AlertIcon />
                        <AlertDescription flex="1">{t('header.download.videoExport.timelineGuide')}</AlertDescription>
                        <Button
                            ml={3}
                            size="sm"
                            flexShrink={0}
                            leftIcon={<MdTimeline />}
                            isDisabled={isVideoGenerating}
                            onClick={handleEditTimeline}
                        >
                            {t('header.download.videoExport.editTimeline')}
                        </Button>
                    </Alert>

                    {!isVideoGenerating ? (
                        <Stack spacing={5} divider={<Divider />}>
                            <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={sectionHeadingColor} mb={2}>
                                    {t('header.download.videoExport.groups.output')}
                                </Text>
                                <RmgFields fields={outputFields} />
                            </Box>

                            <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={sectionHeadingColor} mb={2}>
                                    {t('header.download.videoExport.groups.viewport')}
                                </Text>
                                <RmgFields fields={viewportFields} />
                            </Box>

                            <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={sectionHeadingColor} mb={2}>
                                    {t('header.download.videoExport.groups.rendering')}
                                </Text>
                                <RmgFields fields={renderingField1} />
                                {videoFormat === 'mp4' && (
                                    <Alert status="warning" mb="3">
                                        <AlertIcon />
                                        <AlertDescription>
                                            {t('header.download.videoExport.mp4Transparency')}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <RmgFields fields={renderingField2} />
                                {autoChangeStationType && (
                                    <Alert status="info" mb="3" py="2">
                                        <AlertIcon />
                                        <AlertDescription fontSize="sm">
                                            <Text>
                                                {t('header.download.videoExport.autoChangeStationTypeHint', {
                                                    stations: supportedInterchangeStations,
                                                })}
                                            </Text>
                                            <Text mt="1" fontWeight="bold">
                                                {t('header.download.videoExport.autoChangeStationTypeWarning')}
                                            </Text>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Checkbox
                                    mt={3}
                                    size="sm"
                                    isChecked={isSystemFontsOnly}
                                    onChange={e => setIsSystemFontsOnly(e.target.checked)}
                                >
                                    <Text>{t('header.download.isSystemFontsOnly')}</Text>
                                </Checkbox>
                            </Box>

                            <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={sectionHeadingColor} mb={2}>
                                    {t('header.download.videoExport.groups.sharing')}
                                </Text>
                                <Stack spacing={2}>
                                    <Checkbox
                                        id="share_info_video"
                                        isChecked={isAttachSelected}
                                        size="sm"
                                        onChange={e => setIsAttachSelected(e.target.checked)}
                                    >
                                        <Text>
                                            {t('header.download.videoExport.shareInfo1')}
                                            <Link color="teal.500" href="https://railmapgen.org/rmp">
                                                {t('header.about.rmp')} <Icon as={MdOpenInNew} />
                                            </Link>
                                            {t('header.download.videoExport.shareInfo2')}
                                        </Text>
                                    </Checkbox>
                                    <Checkbox
                                        id="agree_terms_video"
                                        isChecked={isTermsAndConditionsSelected}
                                        size="sm"
                                        onChange={e => setIsTermsAndConditionsSelected(e.target.checked)}
                                    >
                                        <Text>
                                            {t('header.download.termsAndConditionsInfo')}
                                            <Link
                                                color="teal.500"
                                                onClick={() => setIsTermsAndConditionsModalOpen(true)}
                                            >
                                                {t('header.download.termsAndConditions')} <Icon as={MdOpenInNew} />
                                            </Link>
                                            {t('header.download.period')}
                                        </Text>
                                    </Checkbox>
                                </Stack>
                            </Box>
                        </Stack>
                    ) : (
                        <Alert status="info" mt="4">
                            <AlertIcon />
                            <Box flex="1">
                                <AlertTitle>
                                    {t(
                                        isVideoTranscoding
                                            ? 'header.download.videoExport.transcoding'
                                            : 'header.download.videoExport.generating'
                                    )}
                                </AlertTitle>
                                <AlertDescription>
                                    {t('header.download.videoExport.progress', { progress: videoProgress })}
                                </AlertDescription>
                                <Progress
                                    value={videoProgress}
                                    min={0}
                                    max={100}
                                    size="sm"
                                    colorScheme="teal"
                                    borderRadius="full"
                                    mt={2}
                                    hasStripe
                                    isAnimated
                                />
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
