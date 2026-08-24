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
    MdSkipPrevious,
} from 'react-icons/md';
import { Events } from '../../constants/constants';
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
    const [isAttachSelected, setIsAttachSelected] = React.useState(false);
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
    const previewRef = React.useRef<VideoPreview | null>(null);
    const previewFrameRef = React.useRef(0);
    const previewPlayRef = React.useRef(false);
    const previewPlayTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewSeekRafRef = React.useRef<number | null>(null);
    const previewSeekTargetRef = React.useRef<number | null>(null);
    const previewSeekDraggingRef = React.useRef(false);
    // 预览画布舞台（用于全屏）
    const previewStageRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreen = document.fullscreenElement === previewStageRef.current;
            setIsPreviewFullscreen(fullscreen);
            setShowPreviewControls(!fullscreen);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    // 预览帧 SVG 的 HTML 字符串（由 React 渲染，避免 ref 直接操作 DOM 与虚拟 DOM 冲突）
    const [previewSvgHtml, setPreviewSvgHtml] = React.useState('');
    // 渲染队列：并发请求合并，只渲染最新的目标帧，避免拖拽时并发渲染互相污染状态。
    // showLoading 标记本次队列是否需要展示加载状态（拖动/跳转时展示，播放时静默）
    const previewQueueRef = React.useRef<{ running: boolean; next: number | null; showLoading: boolean }>({
        running: false,
        next: null,
        showLoading: false,
    });

    // #region debug-point A:preview-queue
    const reportPreviewDebug = React.useCallback((hypothesisId: string, msg: string, data: Record<string, unknown>) => {
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            body: JSON.stringify({
                sessionId: 'preview-drag-freeze',
                runId: 'pre-fix',
                hypothesisId,
                location: 'video-export-modal.tsx:preview-queue',
                msg: `[DEBUG] ${msg}`,
                data,
                ts: Date.now(),
            }),
        }).catch(() => undefined);
    }, []);
    // #endregion

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
                hideWatermark: isAttachSelected,
                // Pass timeline data for animated video
                timelineDiffs,
                actionRows,
                timelineLines: lines,
                lineGroups: groups,
                // Pass existsNodeTypes for makeRenderReadySVGElement
                existsNodeTypes,
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

    const renderPreviewFrame = async (frame: number) => {
        const renderer = previewRef.current;
        if (!renderer) return;
        const startedAt = performance.now();
        reportPreviewDebug('B', 'render-start', { frame, running: previewQueueRef.current.running });
        try {
            const svg = await renderer.renderFrame(frame);
            // 序列化为 HTML 字符串交给 React 渲染（dangerouslySetInnerHTML），
            // 避免用 ref 直接操作 DOM 与 React 的虚拟 DOM 冲突（卸载时 removeChild 报 NotFoundError）
            svg.style.display = 'block';
            svg.style.width = '100%';
            svg.style.height = '100%';
            setPreviewSvgHtml(svg.outerHTML);
            svg.remove();
            previewFrameRef.current = frame;
            setPreviewFrameIndex(frame);
            reportPreviewDebug('B', 'render-success', { frame, durationMs: Math.round(performance.now() - startedAt) });
        } catch (error) {
            reportPreviewDebug('D', 'render-error', {
                frame,
                durationMs: Math.round(performance.now() - startedAt),
                error: String(error),
            });
            console.error('Preview frame render failed:', error);
        }
    };

    // 合并式渲染队列：拖拽时只渲染最新的目标帧，避免并发渲染互相污染镜头状态。
    // showLoading=true（拖动/跳转）时，渲染期间展示转圈并禁用控件；播放时传 false 静默渲染
    const enqueuePreview = (frame: number, showLoading: boolean) => {
        const queue = previewQueueRef.current;
        queue.next = frame;
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
                queue.next = null;
                reportPreviewDebug('A', 'dequeue', { target, showLoading: queue.showLoading });
                await renderPreviewFrame(target);
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
        const loop = () => {
            if (!previewPlayRef.current) return;
            if (previewFrameRef.current >= renderer.totalFrames - 1) {
                stopPreviewPlay();
                return;
            }
            const next = previewFrameRef.current + 1;
            previewFrameRef.current = next;
            setPreviewFrameIndex(next);
            enqueuePreview(next, false);
            previewPlayTimerRef.current = setTimeout(loop, 1000 / videoFps);
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
                    hideWatermark: isAttachSelected,
                    actionRows,
                    timelineLines: lines,
                    lineGroups: groups,
                    existsNodeTypes,
                },
                bgColor
            );
            previewRef.current?.dispose();
            previewRef.current = renderer;
            setPreviewTotalFrames(renderer.totalFrames);
            previewFrameRef.current = 0;
            setPreviewFrameIndex(0);
            enqueuePreview(0, true);
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
        enqueuePreview(target, true);
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
        enqueuePreview(target, true);
    };

    const handleClosePreview = () => {
        // 渲染加载中禁用关闭，避免在帧渲染进行中销毁渲染器导致未捕获错误
        if (isPreviewRendering) return;
        stopPreviewPlay();
        previewRef.current?.dispose();
        previewRef.current = null;
        if (document.fullscreenElement === previewStageRef.current) void document.exitFullscreen();
        setIsPreviewFullscreen(false);
        setIsPreviewOpen(false);
        setIsPreviewRendering(false);
        setPreviewSvgHtml('');
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
                        <Checkbox
                            isChecked={isSystemFontsOnly}
                            isDisabled={isVideoGenerating}
                            onChange={e => setIsSystemFontsOnly(e.target.checked)}
                        >
                            <Text>{t('header.download.isSystemFontsOnly')}</Text>
                        </Checkbox>
                        <Checkbox
                            id="share_info_video"
                            isChecked={isAttachSelected}
                            isDisabled={isVideoGenerating}
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
                                className="preview-frame"
                                width="100%"
                                height="100%"
                                pointerEvents="none"
                                sx={{ '& > svg': { display: 'block', width: '100%', height: '100%' } }}
                                dangerouslySetInnerHTML={{ __html: previewSvgHtml }}
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
                                    <IconButton
                                        aria-label="后退到上一个动作"
                                        icon={<Icon as={MdSkipPrevious} />}
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => seekToAdjacentAction(-1)}
                                    />
                                    <IconButton
                                        aria-label="前进到下一个动作"
                                        icon={<Icon as={MdSkipNext} />}
                                        size="sm"
                                        isDisabled={isPreviewRendering}
                                        onClick={() => seekToAdjacentAction(1)}
                                    />
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
                                <IconButton
                                    aria-label="后退到上一个动作"
                                    icon={<Icon as={MdSkipPrevious} />}
                                    size="sm"
                                    isDisabled={isPreviewRendering}
                                    onClick={() => seekToAdjacentAction(-1)}
                                />
                                <IconButton
                                    aria-label="前进到下一个动作"
                                    icon={<Icon as={MdSkipNext} />}
                                    size="sm"
                                    isDisabled={isPreviewRendering}
                                    onClick={() => seekToAdjacentAction(1)}
                                />
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
