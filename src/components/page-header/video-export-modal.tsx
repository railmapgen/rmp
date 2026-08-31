import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Center,
    Checkbox,
    HStack,
    Icon,
    IconButton,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Progress,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Spinner,
    Text,
    Tooltip,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    MdFullscreen,
    MdFullscreenExit,
    MdOpenInNew,
    MdPause,
    MdPlayArrow,
    MdPlayCircleOutline,
    MdSkipNext,
    MdPlaylistPlay,
    MdSkipPrevious,
} from 'react-icons/md';
import { Events } from '../../constants/constants';
import { calculateCanvasSize } from '../../util/helpers';
import { renderMapLayerForExport } from '../../map/map-tile-controller';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { downloadBlobAs } from '../../util/download';
import {
    createVideoPreview,
    exportVideo,
    getActionRowsTotalDuration,
    getSupportedMp4MimeType,
    VideoExportOptions,
    VideoPreview,
} from '../../util/video-export';
import TermsAndConditionsModal from './terms-and-conditions';

interface VideoExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PREVIEW_PERSIST_KEY = 'video_preview_frame';
const PREVIEW_PERSIST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7天过期

const getPersistedFrame = (): number | null => {
    try {
        const raw = localStorage.getItem(PREVIEW_PERSIST_KEY);
        if (!raw) return null;
        const { frame, ts } = JSON.parse(raw);
        if (Date.now() - ts > PREVIEW_PERSIST_TTL_MS) {
            localStorage.removeItem(PREVIEW_PERSIST_KEY);
            return null;
        }
        return typeof frame === 'number' ? frame : null;
    } catch {
        return null;
    }
};

const savePersistedFrame = (frame: number) => {
    try {
        localStorage.setItem(PREVIEW_PERSIST_KEY, JSON.stringify({ frame, ts: Date.now() }));
    } catch {
        // localStorage 不可用时静默忽略，不影响功能
    }
};

const formatTime = (seconds: number): string => {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

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

    // Get timeline state for animated video export
    const {
        diffs: timelineDiffs,
        baseGraph: timelineBaseGraph,
        actionRows,
        groups,
        lines,
    } = useRootSelector(state => state.timeline);

    const graph = React.useRef(window.graph);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const getMapLayerMarkup = React.useCallback(async () => {
        if (!mapEnabled) return undefined;
        const canvas = document.querySelector<SVGSVGElement>('#canvas');
        const sourceMapLayer = canvas?.querySelector<SVGGElement>('[data-map-layer]');
        if (!canvas || !sourceMapLayer) return undefined;

        const bounds = calculateCanvasSize(graph.current);
        const exportMapLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        exportMapLayer.setAttribute('data-map-layer', '');
        await renderMapLayerForExport(sourceMapLayer, exportMapLayer, bounds);

        const mapStyle = canvas.querySelector<SVGStyleElement>('style[data-map-style]');
        return `${mapStyle?.outerHTML ?? ''}${exportMapLayer.outerHTML}`;
    }, [mapEnabled]);

    const scales = [25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
    const scaleOptions: { [k: number]: string } = Object.fromEntries(scales.map(v => [v, `${v}%`]));
    const [scale, setScale] = React.useState(100);
    const [isTransparent, setIsTransparent] = React.useState(false);
    const [isSystemFontsOnly, setIsSystemFontsOnly] = React.useState(false);

    const [videoFps, setVideoFps] = React.useState(24);
    const [videoQuality, setVideoQuality] = React.useState(20);
    const [videoFormat, setVideoFormat] = React.useState<'webm' | 'mp4'>('mp4');
    const [videoProgress, setVideoProgress] = React.useState(0);
    const [isVideoGenerating, setIsVideoGenerating] = React.useState(false);
    // Abort controller for the in-flight video export, so cancelling truly stops it.
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const [isTermsAndConditionsSelected, setIsTermsAndConditionsSelected] = React.useState(false);
    const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = React.useState(false);

    // ── 预览功能状态 ──
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [previewTotalFrames, setPreviewTotalFrames] = React.useState(1);
    const [previewFrameIndex, setPreviewFrameIndex] = React.useState(0);
    const [isPreviewRendering, setIsPreviewRendering] = React.useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
    const [showPreviewControls, setShowPreviewControls] = React.useState(true);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = React.useState(false);
    const [isActionSelectorOpen, setIsActionSelectorOpen] = React.useState(false);
    const previewRef = React.useRef<VideoPreview | null>(null);
    const previewFrameRef = React.useRef(0);
    const previewPlayRef = React.useRef(false);
    const previewPlayTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewSeekRafRef = React.useRef<number | null>(null);
    const previewSeekTargetRef = React.useRef<number | null>(null);
    const previewSeekDraggingRef = React.useRef(false);
    // 预览画布舞台（用于全屏）
    const previewStageRef = React.useRef<HTMLDivElement | null>(null);
    const previewFrameContainerRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreen = document.fullscreenElement === previewStageRef.current;
            setIsPreviewFullscreen(fullscreen);
            setShowPreviewControls(!fullscreen);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    // 渲染队列：并发请求合并，只渲染最新的目标帧，避免拖拽时并发渲染互相污染状态。
    // showLoading 标记本次队列是否需要展示加载状态（拖动/跳转时展示，播放时静默）
    const previewQueueRef = React.useRef<{
        running: boolean;
        next: number | null;
        showLoading: boolean;
        snapCameraToTarget: boolean;
    }>({
        running: false,
        next: null,
        showLoading: false,
        snapCameraToTarget: false,
    });

    // Auto-calculate video duration from action rows.
    // Uses each phase's effective durationWeight (which already includes the
    // minimum time needed to animate all of its elements), plus a fixed overview
    // tail for the final camera zoom-out.
    const calculatedDuration = React.useMemo(() => {
        if (actionRows && actionRows.length > 0) {
            return getActionRowsTotalDuration(actionRows, lines, graph.current);
        }
        return 10;
    }, [actionRows, lines]);

    const videoDuration = calculatedDuration;

    // Check if MP4 is supported by the browser
    const isMp4Supported = React.useMemo(() => !!getSupportedMp4MimeType(), []);
    const formatOptions = React.useMemo(() => {
        const opts: Record<string, string> = { webm: 'WebM' };
        if (isMp4Supported) {
            opts.mp4 = 'MP4';
        }
        return opts;
    }, [isMp4Supported]);

    // Close confirmation state
    const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

    const validateAndSetFps = (value: string) => {
        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 60) {
            setVideoFps(num);
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

        // Create a fresh abort controller for this export run.
        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        if (isAllowAppTelemetry)
            rmgRuntime.event(
                Events.DOWNLOAD_IMAGES,
                isAllowProjectTelemetry ? { numberOfNodes: graph.current.order, numberOfEdges: graph.current.size } : {}
            );

        try {
            const options: VideoExportOptions = {
                fps: videoFps,
                duration: videoDuration,
                format: videoFormat,
                isTransparent,
                scale,
                isSystemFontsOnly,
                quality: videoQuality,
                // Pass timeline data for animated video
                timelineDiffs,
                actionRows,
                timelineLines: lines,
                lineGroups: groups,
                // Pass existsNodeTypes for makeRenderReadySVGElement
                existsNodeTypes,
                mapLayerMarkup: await getMapLayerMarkup(),
                signal: abortController.signal,
            };

            const blob = await exportVideo(graph.current, languages, options, bgColor, progress =>
                setVideoProgress(Math.floor(progress * 100))
            );

            downloadBlobAs(`RMP_${new Date().valueOf()}.${videoFormat}`, blob);
        } catch (error) {
            // Ignore user-initiated cancellations — no error toast for AbortError.
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Video export cancelled by user');
                return;
            }
            console.error('Video export failed:', error);
            dispatch(setGlobalAlert({ status: 'error', message: t('header.download.videoExport.error') }));
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
            setIsVideoGenerating(false);
            setVideoProgress(0);
        }
    };

    const handleCloseClick = () => {
        if (isVideoGenerating) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    // ── 预览功能：不导出完整视频，自由调整进度查看动画效果 ──
    const stopPreviewPlay = () => {
        previewPlayRef.current = false;
        if (previewPlayTimerRef.current) {
            clearTimeout(previewPlayTimerRef.current);
            previewPlayTimerRef.current = null;
        }
        setIsPreviewPlaying(false);
    };

    const renderPreviewFrame = async (frame: number, snapCameraToTarget: boolean) => {
        const renderer = previewRef.current;
        if (!renderer) return;
        try {
            const svg = await renderer.renderFrame(frame, snapCameraToTarget);
            svg.style.display = 'block';
            svg.style.width = '100%';
            svg.style.height = '100%';
            const container = previewFrameContainerRef.current;
            if (!container) {
                svg.remove();
                return;
            }
            container.replaceChildren(svg);
            previewFrameRef.current = frame;
            setPreviewFrameIndex(frame);
        } catch (error) {
            console.error('Preview frame render failed:', error);
        }
    };

    // 合并式渲染队列：拖拽时只渲染最新的目标帧，避免并发渲染互相污染镜头状态。
    // showLoading=true（拖动/跳转）时，渲染期间展示转圈并禁用控件；播放时传 false 静默渲染
    const enqueuePreview = (frame: number, showLoading: boolean, snapCameraToTarget = false) => {
        const queue = previewQueueRef.current;
        queue.next = frame;
        queue.snapCameraToTarget = snapCameraToTarget;
        if (showLoading) {
            queue.showLoading = true;
            // 立即置为加载中：即使队列已在运行（播放中/上次渲染未完），
            // 点击进度条跳转也要立刻禁用控件并显示转圈，直到本次渲染完成
            setIsPreviewRendering(true);
        }
        if (queue.running) return;
        queue.running = true;
        void (async () => {
            while (queue.next !== null) {
                const target = queue.next;
                const snapCameraToTarget = queue.snapCameraToTarget;
                queue.next = null;
                queue.snapCameraToTarget = false;
                await renderPreviewFrame(target, snapCameraToTarget);
            }
            queue.running = false;
            if (queue.showLoading) {
                queue.showLoading = false;
                setIsPreviewRendering(false);
            }
        })();
    };

    const startPreviewPlay = () => {
        const renderer = previewRef.current;
        if (!renderer || previewPlayRef.current) return;
        previewPlayRef.current = true;
        setIsPreviewPlaying(true);
        const frameIntervalMs = 1000 / videoFps;
        const playbackStartedAt = performance.now() - previewFrameRef.current * frameIntervalMs;
        const loop = () => {
            if (!previewPlayRef.current) return;
            const elapsedMs = performance.now() - playbackStartedAt;
            const targetFrame = Math.min(renderer.totalFrames - 1, Math.floor(elapsedMs / frameIntervalMs));
            if (targetFrame > previewFrameRef.current) {
                enqueuePreview(targetFrame, false);
            }
            if (targetFrame >= renderer.totalFrames - 1) {
                stopPreviewPlay();
                return;
            }
            const nextFrameAt = (targetFrame + 1) * frameIntervalMs;
            previewPlayTimerRef.current = setTimeout(loop, Math.max(0, nextFrameAt - elapsedMs));
        };
        loop();
    };

    const handleOpenPreview = async () => {
        if (!actionRows || actionRows.length === 0) return;
        stopPreviewPlay();
        setIsPreviewOpen(true);
        setIsPreviewRendering(true);
        try {
            const renderer = await createVideoPreview(
                graph.current,
                languages,
                {
                    fps: videoFps,
                    duration: videoDuration,
                    isTransparent,
                    scale,
                    isSystemFontsOnly,
                    actionRows,
                    timelineLines: lines,
                    lineGroups: groups,
                    existsNodeTypes,
                    mapLayerMarkup: await getMapLayerMarkup(),
                },
                bgColor
            );
            previewRef.current?.dispose();
            previewRef.current = renderer;
            setPreviewTotalFrames(renderer.totalFrames);
            // 恢复上次关闭时的帧位置，播放到末尾则重置到0
            const savedFrame = getPersistedFrame();
            const startFrame = savedFrame !== null && savedFrame < renderer.totalFrames ? savedFrame : 0;
            previewFrameRef.current = startFrame;
            setPreviewFrameIndex(startFrame);
            enqueuePreview(startFrame, true);
        } catch (error) {
            console.error('Preview creation failed:', error);
            setIsPreviewOpen(false);
            setIsPreviewRendering(false);
        }
    };

    const handleSeekPreview = (frame: number) => {
        stopPreviewPlay();
        previewSeekDraggingRef.current = true;
        previewSeekTargetRef.current = frame;
        setPreviewFrameIndex(frame);
    };

    const commitSeekPreview = () => {
        previewSeekDraggingRef.current = false;
        const target = previewSeekTargetRef.current;
        previewSeekTargetRef.current = null;
        if (target === null) return;
        setIsPreviewRendering(true);
        enqueuePreview(target, true, true);
    };

    const seekToAdjacentAction = (direction: -1 | 1) => {
        const renderer = previewRef.current;
        if (!renderer) return;
        stopPreviewPlay();
        const starts = renderer.actionStartFrames;
        const current = previewFrameRef.current;
        const target =
            direction < 0
                ? ([...starts].reverse().find(frame => frame < current) ?? 0)
                : (starts.find(frame => frame > current) ?? renderer.totalFrames - 1);
        previewFrameRef.current = target;
        setPreviewFrameIndex(target);
        setIsPreviewRendering(true);
        enqueuePreview(target, true, true);
    };

    const handleJumpToAction = (index: number) => {
        const target = previewRef.current?.actionStartFrames[index];
        if (target === undefined) return;
        stopPreviewPlay();
        previewFrameRef.current = target;
        setPreviewFrameIndex(target);
        setIsPreviewRendering(true);
        enqueuePreview(target, true, true);
        setIsActionSelectorOpen(false);
    };

    const handleClosePreview = () => {
        // 渲染加载中禁用关闭，避免在帧渲染进行中销毁渲染器导致未捕获错误
        if (isPreviewRendering) return;
        stopPreviewPlay();
        savePersistedFrame(previewFrameRef.current);
        previewRef.current?.dispose();
        previewRef.current = null;
        if (document.fullscreenElement === previewStageRef.current) void document.exitFullscreen();
        setIsPreviewFullscreen(false);
        setIsActionSelectorOpen(false);
        setIsPreviewOpen(false);
        setIsPreviewRendering(false);
        previewFrameContainerRef.current?.replaceChildren();
    };

    // 预览画布全屏切换
    const handleTogglePreviewFullscreen = () => {
        const stage = previewStageRef.current;
        if (!stage) return;
        if (document.fullscreenElement === stage) {
            void document.exitFullscreen();
        } else if (!document.fullscreenElement) {
            setShowPreviewControls(false);
            void stage.requestFullscreen?.();
        }
    };

    const handlePreviewStagePointerDown = () => {
        setShowPreviewControls(value => !value);
    };

    // 预览确认后直接进入完整视频导出
    const handlePreviewExport = () => {
        void handleVideoExport();
    };

    const handleConfirmCancelExport = () => {
        // Abort the in-flight export so it truly stops (no background rendering).
        abortControllerRef.current?.abort();
        setShowCloseConfirm(false);
        setIsVideoGenerating(false);
        setVideoProgress(0);
        onClose();
    };

    const handleConfirmBackgroundExport = () => {
        // Close the modal but let the export continue
        setShowCloseConfirm(false);
        onClose();
    };

    const videoFields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.download.videoExport.fps'),
            value: videoFps.toString(),
            onChange: validateAndSetFps,
            isDisabled: isVideoGenerating,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.download.videoExport.quality'),
            value: videoQuality.toString(),
            onChange: validateAndSetQuality,
            isDisabled: isVideoGenerating,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('header.download.videoExport.format'),
            value: videoFormat,
            options: formatOptions,
            onChange: value => setVideoFormat(value as 'webm' | 'mp4'),
            isDisabled: isVideoGenerating,
        },
        {
            type: 'select',
            label: t('header.download.scale'),
            value: scale,
            options: scaleOptions,
            onChange: value => setScale(Number(value)),
            isDisabled: isVideoGenerating,
        },
        {
            type: 'switch',
            label: t('header.download.transparent'),
            isChecked: isTransparent,
            onChange: setIsTransparent,
            isDisabled: isVideoGenerating,
        },
    ];

    return (
        <>
            <Modal
                size="2xl"
                isOpen={isOpen}
                onClose={handleCloseClick}
                closeOnOverlayClick={false}
                scrollBehavior="inside"
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.videoExport.title')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <Text mb={4}>{t('header.download.videoExport.description')}</Text>

                        <RmgFields fields={videoFields} />
                        <br />
                        <VStack align="start" spacing={2}>
                            <Checkbox
                                isChecked={isSystemFontsOnly}
                                isDisabled={isVideoGenerating}
                                onChange={e => setIsSystemFontsOnly(e.target.checked)}
                            >
                                <Text>{t('header.download.isSystemFontsOnly')}</Text>
                            </Checkbox>
                            <Checkbox
                                id="agree_terms_video"
                                isChecked={isTermsAndConditionsSelected}
                                isDisabled={isVideoGenerating}
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
                        </VStack>

                        {isVideoGenerating && (
                            <Alert status="info" mt="4">
                                <AlertIcon />
                                <Box width="100%">
                                    <AlertTitle>{t('header.download.videoExport.generating')}</AlertTitle>
                                    <AlertDescription>
                                        <Text mb={2}>
                                            {t('header.download.videoExport.progress', { progress: videoProgress })}
                                            {' | '}
                                            {formatTime((videoDuration * videoProgress) / 100)}
                                            {' / '}
                                            {formatTime((videoDuration * (100 - videoProgress)) / 100)}
                                        </Text>
                                        <Progress
                                            value={videoProgress}
                                            size="sm"
                                            colorScheme="teal"
                                            borderRadius="md"
                                            hasStripe
                                            isAnimated
                                        />
                                    </AlertDescription>
                                </Box>
                            </Alert>
                        )}
                    </ModalBody>

                    <ModalFooter>
                        <HStack>
                            <Button
                                id="video_preview_button"
                                leftIcon={<Icon as={MdPlayCircleOutline} />}
                                colorScheme="teal"
                                variant="outline"
                                size="sm"
                                isDisabled={!isTermsAndConditionsSelected || !actionRows || actionRows.length === 0}
                                onClick={handleOpenPreview}
                            >
                                {t('header.download.videoExport.preview')}
                            </Button>
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

            {/* Preview modal */}
            <Modal isOpen={isPreviewOpen} onClose={handleClosePreview} size="3xl" scrollBehavior="outside">
                <ModalOverlay />
                <ModalContent maxH="90vh" overflow="hidden">
                    <ModalHeader>{t('header.download.videoExport.previewTitle')}</ModalHeader>
                    <ModalCloseButton isDisabled={isPreviewRendering} />
                    <ModalBody overflow="hidden" display="flex" flexDirection="column">
                        <Text mb={4}>{t('header.download.videoExport.previewDesc')}</Text>
                        <Box
                            ref={previewStageRef}
                            position="relative"
                            width="100%"
                            aspectRatio={16 / 9}
                            maxH="calc(90vh - 230px)"
                            height="auto"
                            border="1px"
                            borderColor="gray.300"
                            borderRadius="md"
                            overflow="hidden"
                            bg={bgColor}
                        >
                            <Box
                                ref={previewFrameContainerRef}
                                position="absolute"
                                inset={0}
                                width="100%"
                                height="100%"
                                pointerEvents="none"
                                sx={{ '& > svg': { display: 'block', width: '100%', height: '100%' } }}
                            />
                            {/* 加载中（首帧未就绪或拖动跳转渲染中）显示转圈，渲染完成后自动消失 */}
                            {isPreviewRendering && !previewSeekDraggingRef.current && (
                                <Center position="absolute" inset={0} bg="blackAlpha.300" pointerEvents="none">
                                    <Spinner color="teal.500" />
                                </Center>
                            )}
                            {isPreviewFullscreen && (
                                <Box
                                    position="absolute"
                                    inset={0}
                                    zIndex={1}
                                    onPointerDown={handlePreviewStagePointerDown}
                                />
                            )}
                            {isPreviewFullscreen && showPreviewControls && (
                                <HStack
                                    className="preview-controls"
                                    position="absolute"
                                    bottom={3}
                                    left={3}
                                    right={3}
                                    p={2}
                                    borderRadius="md"
                                    bg="blackAlpha.700"
                                    spacing={3}
                                    zIndex={2}
                                    onPointerDown={event => event.stopPropagation()}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <Tooltip label={t('header.download.videoExport.previousAction')} hasArrow>
                                        <IconButton
                                            aria-label={t('header.download.videoExport.previousAction')}
                                            icon={<Icon as={MdSkipPrevious} />}
                                            size="sm"
                                            isDisabled={isPreviewRendering}
                                            onClick={() => seekToAdjacentAction(-1)}
                                        />
                                    </Tooltip>
                                    <Tooltip label={t('header.download.videoExport.nextAction')} hasArrow>
                                        <IconButton
                                            aria-label={t('header.download.videoExport.nextAction')}
                                            icon={<Icon as={MdSkipNext} />}
                                            size="sm"
                                            isDisabled={isPreviewRendering}
                                            onClick={() => seekToAdjacentAction(1)}
                                        />
                                    </Tooltip>
                                    <Tooltip label={t('header.download.videoExport.jumpToAction')} hasArrow>
                                        <IconButton
                                            aria-label={t('header.download.videoExport.jumpToAction')}
                                            icon={<Icon as={MdPlaylistPlay} />}
                                            size="sm"
                                            isDisabled={isPreviewRendering}
                                            onClick={() => setIsActionSelectorOpen(true)}
                                        />
                                    </Tooltip>
                                    <IconButton
                                        aria-label={
                                            isPreviewPlaying
                                                ? t('header.download.videoExport.previewPause')
                                                : t('header.download.videoExport.previewPlay')
                                        }
                                        icon={<Icon as={isPreviewPlaying ? MdPause : MdPlayArrow} />}
                                        colorScheme="teal"
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => (isPreviewPlaying ? stopPreviewPlay() : startPreviewPlay())}
                                    />
                                    <Slider
                                        flex={1}
                                        min={0}
                                        max={Math.max(0, previewTotalFrames - 1)}
                                        value={previewFrameIndex}
                                        step={1}
                                        isDisabled={false}
                                        onChange={handleSeekPreview}
                                        onChangeEnd={commitSeekPreview}
                                        focusThumbOnChange={false}
                                    >
                                        <SliderTrack>
                                            <SliderFilledTrack />
                                        </SliderTrack>
                                        <SliderThumb />
                                    </Slider>
                                    <Text fontSize="sm" color="white" whiteSpace="nowrap">
                                        {formatTime(previewFrameIndex / videoFps)} / {formatTime(videoDuration)}
                                    </Text>
                                    <IconButton
                                        aria-label={t('header.download.videoExport.previewFullscreen')}
                                        icon={
                                            <Icon
                                                as={isPreviewFullscreen ? MdFullscreenExit : MdFullscreen}
                                                boxSize={6}
                                            />
                                        }
                                        colorScheme="teal"
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={handleTogglePreviewFullscreen}
                                    />
                                </HStack>
                            )}
                        </Box>
                        {!isPreviewFullscreen && (
                            <HStack mt={4} spacing={3} bg="white" p={2} borderRadius="md">
                                <Tooltip label={t('header.download.videoExport.previousAction')} hasArrow>
                                    <IconButton
                                        aria-label={t('header.download.videoExport.previousAction')}
                                        icon={<Icon as={MdSkipPrevious} />}
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => seekToAdjacentAction(-1)}
                                    />
                                </Tooltip>
                                <Tooltip label={t('header.download.videoExport.nextAction')} hasArrow>
                                    <IconButton
                                        aria-label={t('header.download.videoExport.nextAction')}
                                        icon={<Icon as={MdSkipNext} />}
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => seekToAdjacentAction(1)}
                                    />
                                </Tooltip>
                                <Tooltip label={t('header.download.videoExport.jumpToAction')} hasArrow>
                                    <IconButton
                                        aria-label={t('header.download.videoExport.jumpToAction')}
                                        icon={<Icon as={MdPlaylistPlay} />}
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => setIsActionSelectorOpen(true)}
                                    />
                                </Tooltip>
                                <IconButton
                                    aria-label={
                                        isPreviewPlaying
                                            ? t('header.download.videoExport.previewPause')
                                            : t('header.download.videoExport.previewPlay')
                                    }
                                    icon={<Icon as={isPreviewPlaying ? MdPause : MdPlayArrow} />}
                                    colorScheme="teal"
                                    size="sm"
                                    isDisabled={isPreviewRendering}
                                    onClick={() => (isPreviewPlaying ? stopPreviewPlay() : startPreviewPlay())}
                                />
                                <Slider
                                    flex={1}
                                    min={0}
                                    max={Math.max(0, previewTotalFrames - 1)}
                                    value={previewFrameIndex}
                                    step={1}
                                    isDisabled={false}
                                    onChange={handleSeekPreview}
                                    onChangeEnd={commitSeekPreview}
                                    focusThumbOnChange={false}
                                >
                                    <SliderTrack>
                                        <SliderFilledTrack />
                                    </SliderTrack>
                                    <SliderThumb />
                                </Slider>
                                <Text fontSize="sm" whiteSpace="nowrap">
                                    {formatTime(previewFrameIndex / videoFps)} / {formatTime(videoDuration)}
                                </Text>
                                <IconButton
                                    aria-label={t('header.download.videoExport.previewFullscreen')}
                                    icon={<Icon as={MdFullscreen} boxSize={6} />}
                                    colorScheme="teal"
                                    size="sm"
                                    isDisabled={isPreviewRendering}
                                    onClick={handleTogglePreviewFullscreen}
                                />
                            </HStack>
                        )}
                        {isVideoGenerating && (
                            <Progress
                                mt={3}
                                value={videoProgress}
                                colorScheme="teal"
                                size="sm"
                                h={5}
                                hasStripe
                                isAnimated
                                borderRadius="md"
                            >
                                <Text
                                    position="absolute"
                                    inset={0}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color="black"
                                >
                                    {videoProgress}%
                                </Text>
                            </Progress>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <HStack>
                            <Button
                                size="sm"
                                colorScheme="teal"
                                variant="outline"
                                isDisabled={isPreviewRendering || isVideoGenerating || !isTermsAndConditionsSelected}
                                onClick={handlePreviewExport}
                            >
                                {t('header.download.confirm')}
                            </Button>
                            <Button
                                size="sm"
                                colorScheme="teal"
                                isDisabled={isPreviewRendering}
                                onClick={handleClosePreview}
                            >
                                {t('close')}
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal
                isOpen={isActionSelectorOpen}
                onClose={() => setIsActionSelectorOpen(false)}
                size="md"
                scrollBehavior="inside"
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.videoExport.jumpToAction')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack align="stretch" spacing={2}>
                            {actionRows.map((action, index) => (
                                <Button
                                    key={action.id}
                                    justifyContent="flex-start"
                                    variant="outline"
                                    isDisabled={isPreviewRendering}
                                    onClick={() => handleJumpToAction(index)}
                                >
                                    {action.actionType === 'focus' || action.actionType === 'overview'
                                        ? t('header.download.videoExport.actionOptionType', {
                                              index: index + 1,
                                              type: t(`timeline.action.${action.actionType}`),
                                          })
                                        : action.actionType === 'wait'
                                          ? t('header.download.videoExport.actionOptionWait', {
                                                index: index + 1,
                                                type: t(`timeline.action.${action.actionType}`),
                                                duration: action.actionDuration ?? 2,
                                            })
                                          : t('header.download.videoExport.actionOption', {
                                                index: index + 1,
                                                type: t(`timeline.action.${action.actionType}`),
                                                remark: action.remark || t('header.download.videoExport.noRemark'),
                                            })}
                                </Button>
                            ))}
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Close confirmation modal */}
            <Modal isOpen={showCloseConfirm} onClose={() => setShowCloseConfirm(false)} size="sm">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.download.videoExport.closeConfirmTitle', '导出进行中')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text mb={4}>
                            {t('header.download.videoExport.closeConfirmDesc', '视频正在导出中，请选择操作：')}
                        </Text>
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing={3}>
                            <Button size="sm" variant="outline" colorScheme="red" onClick={handleConfirmCancelExport}>
                                {t('header.download.videoExport.cancelExport', '取消导出')}
                            </Button>
                            <Button size="sm" colorScheme="teal" onClick={handleConfirmBackgroundExport}>
                                {t('header.download.videoExport.backgroundExport', '后台导出')}
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
