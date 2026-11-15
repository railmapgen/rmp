import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Checkbox,
    Divider,
    FormControl,
    FormLabel,
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
    Select,
    Stack,
    Text,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { getTimelineSettings, TimelineEntry } from '../../constants/timeline';
import { hasSubscriberOnlyTimelineOverlays } from '../../constants/timeline-overlays';
import { useTimelineProjectContext } from '../../timeline/timeline-project-context';
import { setError, setVideoOptions, useTimelineDispatch, useTimelineSelector } from '../../timeline/timeline-store';
import {
    exportVideo,
    normalizeVideoExportOptions,
    VideoExportOptions,
    VideoExportResolution,
} from '../../util/video-export/video-export';
import {
    downloadVideoExportResult,
    prepareVideoExportDestination,
    VideoExportResult,
    VideoExportStorageError,
} from '../../util/video-export/video-export-destination';
import { getUnavailableLineIds } from '../../util/line-path-availability';
import { useSvgRenderContext } from '../svg-render-context';
import SubscriptionBadge from '../subscription-badge';
import TermsAndConditionsModal from './terms-and-conditions';

interface VideoExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VideoExportModal({ isOpen, onClose }: VideoExportModalProps) {
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
    const isSubscriber = useTimelineSelector(state => state.account.activeSubscriptions.RMP_CLOUD);
    const hasExportSubscription = useTimelineSelector(state => state.account.activeSubscriptions.RMP_EXPORT);
    const hasLockedOverlays = !hasExportSubscription && hasSubscriberOnlyTimelineOverlays(timeline);
    const unavailableLineCount = React.useMemo(() => {
        const unavailable = getUnavailableLineIds(graph, mapEnabled, isSubscriber);
        if (!timeline.fixedResources?.length) return unavailable.size;
        const renderedIds = new Set([
            ...timeline.fixedResources,
            ...timeline.track.flatMap((entry: TimelineEntry) => (entry.kind === 'edge' ? [entry.refId] : [])),
        ]);
        return [...unavailable].filter(id => renderedIds.has(id)).length;
    }, [graph, mapEnabled, isSubscriber, timeline.fixedResources, timeline.track]);
    const [isTransparent, setIsTransparent] = React.useState(savedVideoOptions?.isTransparent ?? false);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(savedVideoOptions?.isSystemFontsOnly ?? false);

    const [videoFps, setVideoFps] = React.useState<30 | 60>(savedVideoOptions?.fps === 60 ? 60 : 30);
    const [videoQuality, setVideoQuality] = React.useState(95);
    const [videoFormat, setVideoFormat] = React.useState<'webm' | 'mp4'>(savedVideoOptions?.format ?? 'mp4');
    const [videoResolution, setVideoResolution] = React.useState<VideoExportResolution>(
        savedVideoOptions?.resolution ?? '1080p'
    );
    const [videoProgress, setVideoProgress] = React.useState(0);
    const [isVideoGenerating, setIsVideoGenerating] = React.useState(false);
    const [isAttachSelected, setIsAttachSelected] = React.useState(savedVideoOptions?.hideWatermark ?? false);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);
    const exportController = React.useRef<AbortController | null>(null);
    const {
        fps: effectiveFps,
        resolution: effectiveResolution,
        hideWatermark: effectiveHideWatermark,
    } = normalizeVideoExportOptions(
        { fps: videoFps, resolution: videoResolution, hideWatermark: isAttachSelected },
        hasExportSubscription
    );

    React.useEffect(() => () => exportController.current?.abort(), []);

    React.useEffect(() => {
        setVideoFps(effectiveFps === 60 ? 60 : 30);
        setVideoResolution(effectiveResolution);
        setIsAttachSelected(effectiveHideWatermark);
    }, [effectiveFps, effectiveResolution, effectiveHideWatermark]);

    React.useEffect(() => {
        dispatch(
            setVideoOptions({
                format: videoFormat,
                resolution: effectiveResolution,
                fps: effectiveFps,
                isTransparent,
                isSystemFontsOnly,
                hideWatermark: effectiveHideWatermark,
            })
        );
    }, [
        dispatch,
        videoFormat,
        effectiveResolution,
        effectiveFps,
        isTransparent,
        isSystemFontsOnly,
        effectiveHideWatermark,
    ]);

    const handleClose = () => {
        if (!isVideoGenerating) {
            onClose();
        }
    };

    const handleVideoExport = async () => {
        if (unavailableLineCount > 0 || hasLockedOverlays || exportController.current) return;
        const controller = new AbortController();
        exportController.current = controller;
        setIsVideoGenerating(true);
        setVideoProgress(0);

        if (isAllowAppTelemetry)
            rmgRuntime.event(Events.DOWNLOAD_IMAGES, { numberOfNodes: graph.order, numberOfEdges: graph.size });

        let result: VideoExportResult | undefined;
        let consumed = false;
        try {
            const fileName = `Timeline_${new Date().valueOf()}.${videoFormat}`;
            const destinationFactory = await prepareVideoExportDestination(fileName, videoFormat);
            controller.signal.throwIfAborted();
            const options: VideoExportOptions = {
                format: videoFormat,
                fps: effectiveFps,
                speedMultiplier: settings.speedMultiplier,
                resolution: effectiveResolution,
                isTransparent,
                autoChangeStationType: settings.autoChangeStationType,
                isSystemFontsOnly,
                quality: videoQuality,
                hideWatermark: effectiveHideWatermark,
            };

            result = await exportVideo(
                graph,
                timeline,
                languages,
                options,
                'white',
                progress => setVideoProgress(progress * 100),
                {
                    mapEnabled: active.revision.mapEnabled,
                    mapStyle: active.revision.mapStyle,
                    svgViewBoxMin: active.revision.svgViewBoxMin,
                    svgViewBoxZoom: active.revision.svgViewBoxZoom,
                    isSubscriber,
                    hasExportSubscription,
                    getAudio,
                    getImage,
                },
                { destinationFactory, signal: controller.signal }
            );

            if (result.kind !== 'saved-file') controller.signal.throwIfAborted();
            downloadVideoExportResult(fileName, result);
            consumed = true;
        } catch (error) {
            if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
            console.error('Video export failed:', error);
            const message = t('header.download.videoExport.error');
            dispatch(setError(error instanceof VideoExportStorageError ? `${message} ${error.message}` : message));
        } finally {
            if (!consumed && result?.kind === 'temporary-file') {
                await result
                    .dispose()
                    .catch(error => console.warn('Could not remove the temporary video export:', error));
            }
            exportController.current = null;
            setIsVideoGenerating(false);
            setVideoProgress(0);
        }
    };

    const formatFields: RmgFieldsField[] = [
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
    ];
    const qualityFields: RmgFieldsField[] = [
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
            lockFocusAcrossFrames={false}
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
                    {hasLockedOverlays && (
                        <Alert status="warning" mb={4}>
                            <AlertIcon />
                            <AlertDescription>
                                {t('header.timelinePage.overlayEditor.subscriptionExport')}
                                <SubscriptionBadge subscription="RMP_EXPORT" ml="1" />
                            </AlertDescription>
                        </Alert>
                    )}
                    {unavailableLineCount > 0 && (
                        <Alert status="warning" mb={4}>
                            <AlertIcon />
                            <AlertDescription>
                                {t('header.download.videoExport.unavailableLines')}
                                <SubscriptionBadge subscription="RMP_CLOUD" ml="1" />
                            </AlertDescription>
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
                                <RmgFields fields={formatFields} />
                                <Stack spacing={3} px={1} py={2}>
                                    <FormControl>
                                        <HStack mb={1} flexWrap="wrap">
                                            <FormLabel htmlFor="video_export_fps" fontSize="sm" mb={0} mr={0}>
                                                {t('header.download.videoExport.fps')}
                                            </FormLabel>
                                            <SubscriptionBadge subscription="RMP_EXPORT" />
                                        </HStack>
                                        <Select
                                            id="video_export_fps"
                                            variant="flushed"
                                            size="sm"
                                            h={6}
                                            value={effectiveFps}
                                            onChange={e =>
                                                setVideoFps(hasExportSubscription && e.target.value === '60' ? 60 : 30)
                                            }
                                        >
                                            <option value={30}>30 FPS</option>
                                            <option value={60} disabled={!hasExportSubscription}>
                                                60 FPS
                                            </option>
                                        </Select>
                                    </FormControl>
                                    <FormControl>
                                        <HStack mb={1} flexWrap="wrap">
                                            <FormLabel htmlFor="video_export_resolution" fontSize="sm" mb={0} mr={0}>
                                                {t('header.download.videoExport.resolution')}
                                            </FormLabel>
                                            <SubscriptionBadge subscription="RMP_EXPORT" />
                                        </HStack>
                                        <Select
                                            id="video_export_resolution"
                                            variant="flushed"
                                            size="sm"
                                            h={6}
                                            value={effectiveResolution}
                                            onChange={e =>
                                                setVideoResolution(
                                                    normalizeVideoExportOptions(
                                                        {
                                                            fps: effectiveFps,
                                                            resolution: e.target.value as VideoExportResolution,
                                                            hideWatermark: effectiveHideWatermark,
                                                        },
                                                        hasExportSubscription
                                                    ).resolution
                                                )
                                            }
                                        >
                                            {(['720p', '1080p', '2k', '4k'] as const).map(resolution => (
                                                <option
                                                    key={resolution}
                                                    value={resolution}
                                                    disabled={
                                                        !hasExportSubscription &&
                                                        (resolution === '2k' || resolution === '4k')
                                                    }
                                                >
                                                    {t(`header.download.videoExport.resolutions.${resolution}`)}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>
                                <RmgFields fields={qualityFields} />
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
                                    <Box>
                                        <HStack align="start" flexWrap="wrap">
                                            <Checkbox
                                                id="share_info_video"
                                                isChecked={effectiveHideWatermark}
                                                isDisabled={!hasExportSubscription}
                                                size="sm"
                                                onChange={e =>
                                                    setIsAttachSelected(hasExportSubscription && e.target.checked)
                                                }
                                            >
                                                <Text>
                                                    {t('header.download.videoExport.shareInfo1')}
                                                    <Link color="teal.500" href="https://railmapgen.org/rmp">
                                                        {t('header.about.rmp')} <Icon as={MdOpenInNew} />
                                                    </Link>
                                                    {t('header.download.videoExport.shareInfo2')}
                                                </Text>
                                            </Checkbox>
                                            <SubscriptionBadge subscription="RMP_EXPORT" />
                                        </HStack>
                                    </Box>
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
                        {isVideoGenerating && (
                            <Button size="sm" onClick={() => exportController.current?.abort()}>
                                {t('cancel')}
                            </Button>
                        )}
                        <Box>
                            <Tooltip
                                label={
                                    <Box>
                                        {t(
                                            hasLockedOverlays
                                                ? 'header.timelinePage.overlayEditor.subscriptionExport'
                                                : 'header.download.videoExport.unavailableLines'
                                        )}
                                        <SubscriptionBadge
                                            subscription={hasLockedOverlays ? 'RMP_EXPORT' : 'RMP_CLOUD'}
                                            ml="1"
                                        />
                                    </Box>
                                }
                                isDisabled={unavailableLineCount === 0 && !hasLockedOverlays}
                                hasArrow
                            >
                                <span>
                                    <Button
                                        id="video_export_button"
                                        colorScheme="teal"
                                        variant="outline"
                                        size="sm"
                                        isDisabled={
                                            !isTermsAndConditionsSelected ||
                                            unavailableLineCount > 0 ||
                                            hasLockedOverlays
                                        }
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
