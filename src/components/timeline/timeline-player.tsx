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
import { exportVideoWithFrameCallback, getActionLineMinimumDuration } from '../../util/video-export';

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
    const animatorRef = React.useRef<PlayerAnimator | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
    const [hudState, setHudState] = React.useState<FrameState | null>(null);
    const [isExporting, setIsExporting] = React.useState(false);
    const [playerTotalMs, setPlayerTotalMs] = React.useState(0);

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
        }

        // 将 diffs 从秒转毫秒构建调度
        const diffsMs = diffs.map(d => ({ ...d, time: d.time * 1000 }));
        const schedule = buildPhases(diffsMs);

        // 播放总时长只包含动作阶段，用户已经可以显式添加全览。
        // 不再使用 Redux 中用户设置的总时长，避免动作完成后长时间空转。
        const lastEndMs = schedule.length > 0 ? Math.max(...schedule.map(p => p.endMs)) : 0;
        const playerTotalMs = Math.max(lastEndMs, 1000);
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
    }, [isOpen, diffs, lines, totalDuration, dispatch]);

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
            const svgElement = svgAreaRef.current.querySelector('svg');
            if (!svgElement) return;

            await exportVideoWithFrameCallback(
                svgElement,
                playerTotalMs / 1000,
                (time: number) => {
                    animatorRef.current?.seek(time * 1000);
                },
                { fps: 10, quality: 0.9, format: 'webm' }
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
        for (const action of actionRows) {
            const line = action.actionLineId ? lines.find(item => item.id === action.actionLineId) : undefined;
            const minimum =
                action.actionType === 'open' || action.actionType === 'close'
                    ? getActionLineMinimumDuration(line)
                    : action.actionType === 'wait'
                      ? 0.5
                      : 1;
            const duration = Math.max(action.actionDuration ?? 2, minimum);
            if (cursor >= timeSeconds) break;
            if (action.actionLineId && (action.actionType === 'open' || action.actionType === 'close')) {
                if (cursor + duration <= timeSeconds) {
                    if (action.actionType === 'open') openedSegments.add(action.actionLineId);
                    else openedSegments.delete(action.actionLineId);
                }
            }
            cursor += duration;
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
        let cursor = 0;
        for (const action of actionRows) {
            const line = action.actionLineId ? lines.find(item => item.id === action.actionLineId) : undefined;
            const minimum =
                action.actionType === 'open' || action.actionType === 'close'
                    ? getActionLineMinimumDuration(line)
                    : action.actionType === 'wait'
                      ? 0.5
                      : 1;
            const duration = Math.max(action.actionDuration ?? 2, minimum);
            if (timeSeconds < cursor + duration) return action;
            cursor += duration;
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
    const hudRemark = currentActionLine?.remark || currentAction?.remark || currentActionGroup?.remark || '';

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
                    top={4}
                    right={4}
                    width="200px"
                    height="150px"
                    bg="rgba(0,0,0,0.5)"
                    border="2px solid black"
                    boxShadow="0 0 0 2px rgba(255,255,255,0.4)"
                    borderRadius="md"
                    overflow="hidden"
                    pointerEvents="auto"
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={svgAreaRef.current?.querySelector('svg')?.getAttribute('viewBox') || '0 0 500 500'}
                    >
                        {svgAreaRef.current?.querySelector('svg') && (
                            <g
                                dangerouslySetInnerHTML={{
                                    __html: svgAreaRef.current.querySelector('svg')?.innerHTML || '',
                                }}
                                transform="scale(0.3)"
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
