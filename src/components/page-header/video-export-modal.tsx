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
    Tooltip,
    useColorModeValue,
    useToken,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { getTimelineSettings } from '../../constants/timeline';
import { useTimelineProjectContext } from '../../timeline/timeline-project-context';
import { setError, setVideoOptions, useTimelineDispatch, useTimelineSelector } from '../../timeline/timeline-store';
import { downloadBlobAs } from '../../util/download';
import { exportVideo, VideoExportOptions, VideoExportResolution } from '../../util/video-export';
import { getUnavailableLineIds } from '../../util/line-path-availability';
import { useSvgRenderContext } from '../svg-render-context';
import TermsAndConditionsModal from './terms-and-conditions';

interface VideoExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VideoExportModal({ isOpen, onClose }: VideoExportModalProps) {
    const [lightBackground, darkBackground] = useToken('colors', ['white', 'gray.800']);
    const bgColor = useColorModeValue(lightBackground, darkBackground);
    const sectionHeadingColor = useColorModeValue('gray.600', 'gray.300');
    const dispatch = useTimelineDispatch();
    const active = useTimelineSelector(state => state.project.active)!;
    const savedVideoOptions = useTimelineSelector(state => state.runtime.videoOptions);
    const timeline = active.revision.timeline;
    const settings = getTimelineSettings(timeline);
    const { graph, languages, getAudio } = useTimelineProjectContext();
    const { getImage } = useSvgRenderContext();
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();
    const { t } = useTranslation();
    const mapEnabled = active.revision.mapEnabled;
    const isSubscriber = false;
    const unavailableLineCount = React.useMemo(
        () => getUnavailableLineIds(graph, mapEnabled, isSubscriber).size,
        [graph, mapEnabled, isSubscriber]
    );
    const [isTransparent, setIsTransparent] = React.useState(savedVideoOptions?.isTransparent ?? false);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(savedVideoOptions?.isSystemFontsOnly ?? false);

    const [videoFps, setVideoFps] = React.useState<30 | 60>(savedVideoOptions?.fps === 60 ? 60 : 30);
    const [videoQuality, setVideoQuality] = React.useState(95);
    const [videoFormat, setVideoFormat] = React.useState<'webm' | 'mp4'>(savedVideoOptions?.format ?? 'mp4');
    const [videoResolution, setVideoResolution] = React.useState<VideoExportResolution>(
        savedVideoOptions?.resolution ?? '720p'
    );
    const [videoProgress, setVideoProgress] = React.useState(0);
    const [isVideoGenerating, setIsVideoGenerating] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(savedVideoOptions?.hideWatermark ?? false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);

    React.useEffect(() => {
        dispatch(
            setVideoOptions({
                format: videoFormat,
                resolution: videoResolution,
                fps: videoFps,
                isTransparent,
                isSystemFontsOnly,
                hideWatermark: isAttachSelected,
            })
        );
    }, [dispatch, videoFormat, videoResolution, videoFps, isTransparent, isSystemFontsOnly, isAttachSelected]);

    const handleClose = () => {
        if (!isVideoGenerating) {
            onClose();
        }
    };

    const handleVideoExport = async () => {
        if (unavailableLineCount > 0) return;
        setIsVideoGenerating(true);
        setVideoProgress(0);

        if (isAllowAppTelemetry)
            rmgRuntime.event(Events.DOWNLOAD_IMAGES, { numberOfNodes: graph.order, numberOfEdges: graph.size });

        try {
            const options: VideoExportOptions = {
                format: videoFormat,
                fps: videoFps,
                speedMultiplier: settings.speedMultiplier,
                resolution: videoResolution,
                isTransparent,
                autoChangeStationType: settings.autoChangeStationType,
                showYear: settings.showYear,
                showLineName: settings.showLineName,
                isSystemFontsOnly,
                quality: videoQuality,
                hideWatermark: isAttachSelected,
            };

            const blob = await exportVideo(
                graph,
                timeline,
                languages,
                options,
                bgColor,
                progress => setVideoProgress(progress * 100),
                {
                    mapEnabled: active.revision.mapEnabled,
                    mapStyle: active.revision.mapStyle,
                    svgViewBoxMin: active.revision.svgViewBoxMin,
                    svgViewBoxZoom: active.revision.svgViewBoxZoom,
                    isSubscriber,
                    getAudio,
                    getImage,
                }
            );

            downloadBlobAs(`Timeline_${new Date().valueOf()}.${videoFormat}`, blob);
        } catch (error) {
            console.error('Video export failed:', error);
            dispatch(setError(t('header.download.videoExport.error')));
        } finally {
            setIsVideoGenerating(false);
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
                    {unavailableLineCount > 0 && (
                        <Alert status="warning" mb={4}>
                            <AlertIcon />
                            <AlertDescription>{t('header.download.videoExport.unavailableLines')}</AlertDescription>
                        </Alert>
                    )}
                    <Text mb={4}>{t('header.download.videoExport.description')}</Text>
                    <Alert status="info" variant="subtle" mb={4} alignItems="center" hidden={isVideoGenerating}>
                        <AlertIcon />
                        <AlertDescription flex="1">{t('header.download.videoExport.timelineGuide')}</AlertDescription>
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
                                <AlertTitle>{t('header.download.videoExport.generating')}</AlertTitle>
                                <AlertDescription sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {t('header.download.videoExport.progress', { progress: videoProgress.toFixed(1) })}
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
                                    sx={{
                                        '& [role="progressbar"]': {
                                            transition: 'width 0.2s linear',
                                            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                                        },
                                    }}
                                />
                            </Box>
                        </Alert>
                    )}
                </ModalBody>

                <ModalFooter>
                    <HStack>
                        <Box>
                            <Tooltip label={t('header.download.videoExport.unavailableLines')} hasArrow>
                                <span>
                                    <Button
                                        id="video_export_button"
                                        colorScheme="teal"
                                        variant="outline"
                                        size="sm"
                                        isDisabled={!isTermsAndConditionsSelected || unavailableLineCount > 0}
                                        isLoading={isVideoGenerating}
                                        onClick={handleVideoExport}
                                    >
                                        {t('header.download.confirm')}
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
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
