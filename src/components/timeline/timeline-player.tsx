import {
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Select,
    Text,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdPlayArrow, MdPause, MdStop, MdFullscreen, MdFullscreenExit, MdVideoCall } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setCurrentTime } from '../../redux/timeline/timeline-slice';
import { ActionRow, DateRow, LineGroup } from '../../constants/timeline';
import { PlayerAnimator, FrameState } from '../../util/player-animator';
import { buildPhases } from '../../util/player-schedule';
import { exportVideoWithFrameCallback } from '../../util/video-export';
import { calculateCanvasSize } from '../../util/helpers';
import { renderMapLayerForExport } from '../../map/map-tile-controller';
import { getActionDuration, scheduleActionRows } from '../../util/action-schedule';

interface TimelinePlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 全屏动画播放器组件。
 * 展示日期、里程、车站数、小地图、备注、已开通线路等信息。
 */
export default function TimelinePlayer({ isOpen, onClose }: TimelinePlayerProps) {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { totalDuration, currentTime, diffs, groups, lines, dateRows, actionRows } = useRootSelector(
        state => state.timeline
    );

    const svgAreaRef = React.useRef<HTMLDivElement>(null);
    const miniMapMarkupRef = React.useRef('');
    const graph = React.useRef(window.graph);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const animatorRef = React.useRef<PlayerAnimator | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
    const [hudState, setHudState] = React.useState<FrameState | null>(null);
    const [isExporting, setIsExporting] = React.useState(false);
    const [playerTotalMs, setPlayerTotalMs] = React.useState(0);
    const actionSchedule = React.useMemo(
        () =>
            scheduleActionRows(
                actionRows,
                actionRows.map(action => getActionDuration(action) * 1000)
            ),
        [actionRows]
    );

    const bgColor = useColorModeValue('rgba(255,255,255,0.95)', 'rgba(26,32,44,0.95)');

    // 初始化播放器
    React.useEffect(() => {
        if (!isOpen || !svgAreaRef.current) return;

        const svgArea = svgAreaRef.current;
        // Clone the existing SVG into the player
        const canvasSvg = document.querySelector<SVGSVGElement>('#canvas');
        if (canvasSvg && svgArea) {
            svgArea.innerHTML = '';
            const clonedSvg = canvasSvg.cloneNode(true) as SVGSVGElement;
            clonedSvg.querySelectorAll(':scope > g').forEach(group => group.removeAttribute('transform'));
            svgArea.appendChild(clonedSvg);
            const miniMapSvg = clonedSvg.cloneNode(true) as SVGSVGElement;
            if (miniMapSvg.matches('[data-map-layer], [data-map-raster], [data-map-attribution]')) {
                miniMapSvg.removeAttribute('data-map-layer');
                miniMapSvg.removeAttribute('data-map-raster');
                miniMapSvg.removeAttribute('data-map-attribution');
            }
            miniMapSvg
                .querySelectorAll(
                    '[data-map-layer], [data-map-raster], [data-map-tiles], style[data-map-style], [data-map-attribution]'
                )
                .forEach(element => element.remove());
            miniMapSvg
                .querySelectorAll(
                    'text, [data-station-name], .station-name, .rmp-virtual-node, g[id^="stn_"] path, g[id^="misc_node_"] path, g[id^="node_"] path'
                )
                .forEach(element => element.remove());
            miniMapSvg.querySelectorAll('defs, script, foreignObject').forEach(element => element.remove());
            miniMapMarkupRef.current = miniMapSvg.innerHTML;
        }

        // 将 diffs 从秒转毫秒构建调度。线路段元素本身已按起点到终点保存，停运时据此逐条执行。
        const diffsMs = diffs.map(d => ({ ...d, time: d.time * 1000 }));
        const edgeOrder = new Map<string, number>();
        lines.forEach(line => {
            line.elements.forEach((element, index) => {
                if (typeof element.id === 'string' && element.id.startsWith('line_')) {
                    edgeOrder.set(element.id, index);
                }
            });
        });
        const actionSchedule = scheduleActionRows(
            actionRows,
            actionRows.map(action => getActionDuration(action) * 1000)
        );
        const actionLineEdges = new Map<string, string[]>();
        lines.forEach(line =>
            actionLineEdges.set(
                line.id,
                line.elements
                    .filter(element => typeof element.id === 'string' && element.id.startsWith('line_'))
                    .map(element => element.id as string)
            )
        );
        const rawSchedule = buildPhases(diffsMs, {
            edgeOrder,
            actionRows,
            actionSchedule: actionSchedule.entries,
            actionLineEdges,
        });

        // 预览以动作时长作为唯一总时长；diff 调度的默认绘制时长不能额外拉长播放时间。
        const actionTotalMs = actionSchedule.totalDuration;
        const rawScheduleDurationMs = rawSchedule.length > 0 ? Math.max(...rawSchedule.map(phase => phase.endMs)) : 0;
        const scheduleScale =
            actionTotalMs > 0 && rawScheduleDurationMs > actionTotalMs ? actionTotalMs / rawScheduleDurationMs : 1;
        const schedule =
            scheduleScale === 1
                ? rawSchedule
                : rawSchedule.map(phase => ({
                      ...phase,
                      startMs: phase.startMs * scheduleScale,
                      endMs: phase.endMs * scheduleScale,
                  }));
        const playerTotalMs = Math.max(actionTotalMs, 1000);
        setPlayerTotalMs(playerTotalMs);
        // 整段添加等操作计算出的 reverse 标志 → 播放器绘制方向。
        // reverse 的边从路径末端开始绘制（backward）。
        const edgeDirections = new Map<string, 'forward' | 'backward'>();
        lines.forEach(line => {
            line.elements.forEach(elem => {
                if (typeof elem.id === 'string' && elem.id.startsWith('line_')) {
                    edgeDirections.set(elem.id, elem.reverse ? 'backward' : 'forward');
                }
            });
        });

        const animator = new PlayerAnimator(svgArea, {
            schedule,
            diffs: diffsMs,
            totalDuration: playerTotalMs,
            edgeDirections,
            onProgress: (state: FrameState) => {
                setHudState(state);
                // 同步 Redux 时间
                dispatch(setCurrentTime(state.currentMs / 1000));
            },
        });

        animatorRef.current = animator;
        animator.seek(0);

        return () => {
            animator.destroy();
            animatorRef.current = null;
        };
    }, [isOpen, diffs, lines, actionRows, totalDuration, dispatch]);

    // 同步进度条
    React.useEffect(() => {
        if (!isPlaying && animatorRef.current) {
            animatorRef.current.seek(currentTime * 1000);
        }
    }, [currentTime, isPlaying]);

    const handlePlayPause = () => {
        if (!animatorRef.current) return;
        if (isPlaying) {
            animatorRef.current.pause();
        } else {
            animatorRef.current.start();
        }
        setIsPlaying(!isPlaying);
    };

    const handleStop = () => {
        if (!animatorRef.current) return;
        animatorRef.current.stop();
        setIsPlaying(false);
        dispatch(setCurrentTime(0));
    };

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
        animatorRef.current?.setSpeed(speed);
    };

    const handleExportVideo = async () => {
        if (!animatorRef.current || !svgAreaRef.current) return;
        setIsExporting(true);

        try {
            const svgElement = svgAreaRef.current.querySelector<SVGSVGElement>('svg');
            if (!svgElement) return;

            let mapLayerMarkup: string | undefined;
            if (mapEnabled) {
                const sourceCanvas = document.querySelector<SVGSVGElement>('#canvas');
                const sourceMapLayer = sourceCanvas?.querySelector<SVGGElement>('[data-map-layer]');
                const targetMapLayer = svgElement.querySelector<SVGGElement>('[data-map-layer]');

                if (sourceCanvas && sourceMapLayer && targetMapLayer) {
                    await renderMapLayerForExport(sourceMapLayer, targetMapLayer, calculateCanvasSize(graph.current));
                    const mapStyle = sourceCanvas.querySelector<SVGStyleElement>('style[data-map-style]');
                    if (mapStyle && !svgElement.querySelector('style[data-map-style]')) {
                        svgElement.prepend(mapStyle.cloneNode(true));
                    }
                    mapLayerMarkup = `${mapStyle?.outerHTML ?? ''}${targetMapLayer.outerHTML}`;
                }
            }

            await exportVideoWithFrameCallback(
                svgElement,
                playerTotalMs / 1000,
                (time: number) => {
                    animatorRef.current?.seek(time * 1000);
                },
                { fps: 10, quality: 90, format: 'webm', mapLayerMarkup }
            );
        } catch (err) {
            console.error('Video export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // 获取当前日期行信息
    const getCurrentDateInfo = (): {
        date: string | null;
        remark: string | null;
        badgeBgColor: string | null;
        badgeText: string | null;
    } => {
        if (!hudState || dateRows.length === 0)
            return { date: null, remark: null, badgeBgColor: null, badgeText: null };
        const timeSeconds = hudState.currentMs / 1000;
        const activeRow = dateRows.find(row => timeSeconds >= row.startTime && timeSeconds <= row.endTime);
        if (!activeRow) return { date: null, remark: null, badgeBgColor: null, badgeText: null };
        return {
            date: activeRow.date,
            remark: activeRow.remark,
            badgeBgColor: activeRow.badgeBgColor,
            badgeText: activeRow.badgeText,
        };
    };

    // 获取活跃线路（显示所有线路组）
    const getActiveLines = (): LineGroup[] => {
        if (!hudState) return [];
        const timeSeconds = hudState.currentMs / 1000;
        let cursor = 0;
        const openedSegments = new Set<string>();
        for (let index = 0; index < actionRows.length; index++) {
            const action = actionRows[index];
            const duration = getActionDuration(action);
            const startTime = (actionSchedule.entries[index]?.startTime ?? cursor * 1000) / 1000;
            if (startTime >= timeSeconds) break;
            if (action.actionLineId && (action.actionType === 'open' || action.actionType === 'close')) {
                const endTime = actionSchedule.entries[index]
                    ? actionSchedule.entries[index].endTime / 1000
                    : startTime + duration;
                if (endTime <= timeSeconds) {
                    if (action.actionType === 'open') openedSegments.add(action.actionLineId);
                    else openedSegments.delete(action.actionLineId);
                }
            }
            cursor = Math.max(cursor, startTime + duration);
        }
        const groupIds = new Set(
            [...openedSegments]
                .map(segmentId => lines.find(line => line.id === segmentId)?.groupId)
                .filter((groupId): groupId is string => Boolean(groupId))
        );
        return groups.filter(group => groupIds.has(group.id));
    };

    const dateInfo = getCurrentDateInfo();
    const activeLines = getActiveLines();

    const getCurrentAction = (): ActionRow | null => {
        if (!hudState || actionRows.length === 0) return null;
        const timeSeconds = hudState.currentMs / 1000;
        for (let index = 0; index < actionRows.length; index++) {
            const action = actionRows[index];
            const entry = actionSchedule.entries[index];
            if (entry && timeSeconds >= entry.startTime / 1000 && timeSeconds < entry.endTime / 1000) return action;
        }
        return actionRows[actionRows.length - 1] ?? null;
    };

    const currentAction = getCurrentAction();
    const currentActionLine = currentAction?.actionLineId
        ? lines.find(line => line.id === currentAction.actionLineId)
        : undefined;
    const currentActionGroup = currentActionLine
        ? groups.find(group => group.id === currentActionLine.groupId)
        : undefined;
    const hudLineGroups = currentActionGroup ? [currentActionGroup] : activeLines;
    const hudRemark = currentAction?.remark || '';

    if (!isOpen) return null;

    return (
        <Box position="fixed" top={0} left={0} width="100vw" height="100vh" bg="black" zIndex={9999}>
            {/* SVG 播放区域 */}
            <Box ref={svgAreaRef} width="100%" height="100%" />

            {/* HUD 覆盖层 */}
            <Box position="absolute" top={0} left={0} width="100%" height="100%" pointerEvents="none">
                {/* 左上：当前线路、动作备注和日期 */}
                {hudState && (
                    <Box
                        position="absolute"
                        top={4}
                        left={4}
                        bg={bgColor}
                        px={3}
                        py={2}
                        borderRadius="md"
                        pointerEvents="auto"
                    >
                        <HStack spacing={2}>
                            {hudLineGroups.map(group => (
                                <Badge
                                    key={group.id}
                                    bg={group.bgColor}
                                    color="white"
                                    fontSize="sm"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                >
                                    {group.text}
                                </Badge>
                            ))}
                            {hudRemark && (
                                <Text fontSize="sm" fontWeight="medium" maxW="45vw" noOfLines={2}>
                                    {hudRemark}
                                </Text>
                            )}
                            {dateInfo.badgeBgColor && (
                                <Badge
                                    bg={dateInfo.badgeBgColor}
                                    color="white"
                                    fontSize="sm"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                >
                                    {dateInfo.badgeText || dateInfo.date}
                                </Badge>
                            )}
                            {dateInfo.remark && (
                                <Text fontSize="sm" fontWeight="medium">
                                    {dateInfo.remark}
                                </Text>
                            )}
                        </HStack>
                    </Box>
                )}

                {/* 中央统计 */}
                {hudState && (
                    <Box
                        position="absolute"
                        top="50%"
                        left={4}
                        transform="translateY(-50%)"
                        bg={bgColor}
                        px={3}
                        py={2}
                        borderRadius="md"
                        pointerEvents="auto"
                    >
                        <VStack spacing={1} align="flex-start">
                            <Text fontSize="xs">
                                {t('timeline.player.stations', '车站数')}: {hudState.stationCount}
                            </Text>
                            <Text fontSize="xs">
                                {t('timeline.player.mileage', '里程')}: {hudState.mileage.toFixed(1)} km
                            </Text>
                            {dateInfo.date && (
                                <Text fontSize="xs">
                                    {t('timeline.player.date', '日期')}: {dateInfo.date}
                                </Text>
                            )}
                        </VStack>
                    </Box>
                )}

                {/* 右上：小地图 */}
                <Box
                    position="absolute"
                    zIndex={999}
                    isolation="isolate"
                    top={4}
                    right={4}
                    width="200px"
                    height="150px"
                    bg="#ffffff"
                    border="4px solid black"
                    boxShadow="0 0 0 2px rgba(255,255,255,0.4)"
                    borderRadius="md"
                    overflow="hidden"
                    pointerEvents="auto"
                >
                    <svg
                        width="100%"
                        height="100%"
                        overflow="hidden"
                        preserveAspectRatio="xMidYMid meet"
                        viewBox={svgAreaRef.current?.querySelector('svg')?.getAttribute('viewBox') || '0 0 500 500'}
                    >
                        <rect width="100%" height="100%" fill="#ffffff" />
                        <defs>
                            <clipPath id="mini-map-viewport" clipPathUnits="objectBoundingBox">
                                <rect width="1" height="1" />
                            </clipPath>
                        </defs>
                        {svgAreaRef.current?.querySelector('svg') && (
                            <g
                                clipPath="url(#mini-map-viewport)"
                                dangerouslySetInnerHTML={{
                                    __html: miniMapMarkupRef.current,
                                }}
                            />
                        )}
                    </svg>
                </Box>

                {/* 左下：活跃线路 */}
                {activeLines.length > 0 && (
                    <Box
                        position="absolute"
                        bottom={16}
                        left={4}
                        bg={bgColor}
                        px={3}
                        py={2}
                        borderRadius="md"
                        pointerEvents="auto"
                    >
                        <Text fontSize="xs" fontWeight="bold" mb={1}>
                            {t('timeline.player.activeLines', '已开通线路')}:
                        </Text>
                        <HStack spacing={1} flexWrap="wrap">
                            {activeLines.map(line => (
                                <Badge
                                    key={line.id}
                                    bg={line.bgColor}
                                    color="white"
                                    fontSize="xs"
                                    px={2}
                                    py={0.5}
                                    borderRadius="sm"
                                >
                                    {line.text}
                                </Badge>
                            ))}
                        </HStack>
                    </Box>
                )}
            </Box>

            {/* 播放控件 */}
            <Box
                position="absolute"
                bottom={4}
                left="50%"
                transform="translateX(-50%)"
                bg={bgColor}
                px={4}
                py={2}
                borderRadius="lg"
                pointerEvents="auto"
                boxShadow="lg"
            >
                <HStack spacing={3}>
                    <IconButton
                        size="sm"
                        icon={<MdStop />}
                        aria-label={t('timeline.player.stop', '停止')}
                        onClick={handleStop}
                        isDisabled={isExporting}
                    />
                    <IconButton
                        size="sm"
                        icon={isPlaying ? <MdPause /> : <MdPlayArrow />}
                        aria-label={isPlaying ? t('timeline.player.pause', '暂停') : t('timeline.player.play', '播放')}
                        onClick={handlePlayPause}
                        isDisabled={isExporting}
                    />
                    <Select
                        size="xs"
                        width="70px"
                        value={playbackSpeed}
                        onChange={e => handleSpeedChange(Number(e.target.value))}
                        isDisabled={isExporting}
                    >
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                    </Select>
                    <IconButton
                        size="sm"
                        icon={<MdVideoCall />}
                        aria-label={t('timeline.player.export', '导出视频')}
                        onClick={handleExportVideo}
                        isLoading={isExporting}
                    />
                    <Button size="sm" variant="outline" onClick={onClose} isDisabled={isExporting}>
                        {t('close', '关闭')}
                    </Button>
                </HStack>

                {/* 进度条 */}
                {hudState && (
                    <Box width="100%" height="3px" bg="gray.200" borderRadius="full" mt={1}>
                        <Box
                            height="100%"
                            bg="primary.500"
                            borderRadius="full"
                            style={{ width: `${(hudState.currentMs / Math.max(playerTotalMs, 1)) * 100}%` }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
