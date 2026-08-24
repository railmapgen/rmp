import { Alert, AlertIcon, Box, Button, Flex, HStack, Link, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { RmgErrorBoundary, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalStorageKey, NodeId } from '../constants/constants';
import { useRootDispatch, useRootSelector } from '../redux';
import { saveGraph } from '../redux/param/param-slice';
import {
    cancelPlacingNodeVersion,
    closePaletteAppClip,
    confirmPlacingNodeVersion,
    onPaletteAppClipEmit,
    refreshNodesThunk,
    refreshEdgesThunk,
} from '../redux/runtime/runtime-slice';
import { addNodeVersion, applyNodeVersion, getCurrentNodeVersion, renameNodeVersion } from '../util/timeline';
import { NOTIFICATION_EVENT } from '../util/notifications';
import { useTimelineDiff } from '../hooks/useTimelineDiff';

const PageHeader = React.lazy(() => import('./page-header/page-header'));
const ToolsPanel = React.lazy(() => import('./panels/tools/tools'));
const SvgWrapper = React.lazy(() => import('./svg-wrapper'));
const DetailsPanel = React.lazy(() => import('./panels/details/details'));
const RmgPaletteAppClip = React.lazy(() => import('./panels/rmg-palette-app-clip'));
const TimelineEditorPanel = React.lazy(() => import('./panels/timeline/timeline-editor'));
const TimelinePlayer = React.lazy(() => import('./timeline/timeline-player'));

export default function AppRoot() {
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { input },
        placingNodeVersion,
        selected,
    } = useRootSelector(state => state.runtime);
    const { timelineFeatureEnabled } = useRootSelector(state => state.app.preference);
    const { t } = useTranslation();

    const [isShowRMTMessage, setIsShowRMTMessage] = React.useState(false);
    const [isTimelinePanelOpen, setIsTimelinePanelOpen] = React.useState(false);
    const [isTimelinePlayerOpen, setIsTimelinePlayerOpen] = React.useState(false);

    // zIndex 管理：后弹出的面板图层更高
    const [panelZIndex, setPanelZIndex] = React.useState({ details: 5, timeline: 5 });

    const bgColor = useColorModeValue('white', 'gray.700');

    // 启用时间线差异追踪
    useTimelineDiff();

    // 新编辑模式：确定按钮始终可见（问题3：节点失焦不影响确定按钮）
    const showConfirmButton = !!placingNodeVersion;

    // 新编辑模式：确定 → 将当前节点状态保存为新版本，恢复节点到原始v1状态
    const handleConfirmPlace = React.useCallback(() => {
        if (!placingNodeVersion) return;

        const { nodeId, savedState, versionName } = placingNodeVersion;

        // 从当前节点状态创建新版本，并保存原始v1快照
        const newVersionNumber = addNodeVersion(window.graph, nodeId, savedState);
        if (newVersionNumber === undefined) return;

        // 使用用户输入的名称或默认名称
        const finalName = versionName?.trim() || `v${newVersionNumber}`;
        renameNodeVersion(window.graph, nodeId, newVersionNumber, finalName);

        // 创建后立即应用新版本
        const newVersion = window.graph
            .getNodeAttribute(nodeId, 'versions')
            ?.find(version => version.version === newVersionNumber);
        if (!newVersion) return;
        applyNodeVersion(window.graph, nodeId, newVersion);

        dispatch(confirmPlacingNodeVersion());
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, placingNodeVersion, refreshNodesThunk, refreshEdgesThunk]);

    // 新编辑模式：取消 → 恢复节点到编辑前的样子
    const handleCancelPlace = React.useCallback(() => {
        if (!placingNodeVersion) return;
        const { nodeId, savedState } = placingNodeVersion;

        // 恢复节点到原始状态
        applyNodeVersion(window.graph, nodeId, savedState);

        dispatch(cancelPlacingNodeVersion());
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
    }, [dispatch, placingNodeVersion, refreshNodesThunk]);

    React.useEffect(() => {
        if (rmgRuntime.isStandaloneWindow() && !window.localStorage.getItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG)) {
            setIsShowRMTMessage(true);
        }
    }, []);

    // 桥接到 Chakra toast：同时监听 rmgRuntime 跨窗口通知和本地自定义事件
    const toast = useToast();
    React.useEffect(() => {
        // 1. rmgRuntime 跨窗口通知（来自子窗口/宿主）
        const unsub = rmgRuntime.onNewNotification(notification => {
            toast({
                title: notification.title,
                description: notification.message || undefined,
                status: notification.type,
                duration: notification.duration || 5000,
                isClosable: true,
            });
        });

        // 2. 本地自定义事件（来自本窗口内的 sendErrorNotification 调用）
        const handleLocalNotification = (e: Event) => {
            const notification = (e as CustomEvent).detail;
            toast({
                title: notification.title,
                description: notification.message || undefined,
                status: notification.type,
                duration: notification.duration || 5000,
                isClosable: true,
            });
        };
        window.addEventListener(NOTIFICATION_EVENT, handleLocalNotification);

        return () => {
            window.removeEventListener(NOTIFICATION_EVENT, handleLocalNotification);
        };
    }, [toast]);

    // 面板打开/点击时更新zIndex：始终把时间线面板提到最前
    const handleOpenTimelinePanel = React.useCallback(() => {
        setIsTimelinePanelOpen(true);
        setPanelZIndex(prevZ => ({ ...prevZ, timeline: Math.max(prevZ.details, prevZ.timeline) + 1 }));
    }, []);

    // 选中元素时（详情面板弹出），仅在未置顶时提高详情面板的zIndex
    React.useEffect(() => {
        if (selected.size > 0) {
            setPanelZIndex(prevZ => {
                if (prevZ.details > prevZ.timeline) return prevZ; // 已在最前，无需提升
                return { ...prevZ, details: Math.max(prevZ.details, prevZ.timeline) + 1 };
            });
        }
    }, [selected.size]);

    const handleCloseTimelinePanel = React.useCallback(() => {
        setIsTimelinePanelOpen(false);
    }, []);

    const loadingFallback = (
        <p
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }}
        >
            Rail Map Painter protocol... checked
        </p>
    );

    return (
        <RmgThemeProvider>
            <RmgWindow>
                <React.Suspense fallback={loadingFallback}>
                    <PageHeader onTimelineClick={handleOpenTimelinePanel} />
                </React.Suspense>

                {isShowRMTMessage && (
                    <Alert status="info" variant="solid" size="xs" pl={3} pr={1} py={1} zIndex="1">
                        <AlertIcon />
                        <Text>
                            <Link href="/?app=rmp" isExternal fontWeight="bold">
                                {t('rmtPromotion')}
                            </Link>{' '}
                            <Link
                                as="button"
                                ml="auto"
                                textDecoration="underline"
                                onClick={() => setIsShowRMTMessage(false)}
                            >
                                {t('close')}
                            </Link>
                            {' | '}
                            <Link
                                as="button"
                                textDecoration="underline"
                                onClick={() => {
                                    setIsShowRMTMessage(false);
                                    window.localStorage.setItem(LocalStorageKey.DO_NOT_SHOW_RMT_MSG, 'true');
                                }}
                            >
                                {t('noShowAgain')}
                            </Link>
                        </Text>
                    </Alert>
                )}

                {placingNodeVersion && (
                    <Box
                        position="fixed"
                        top="40px"
                        left="50%"
                        transform="translateX(-50%)"
                        bg={bgColor}
                        px={4}
                        py={2}
                        borderRadius="md"
                        boxShadow="lg"
                        zIndex="modal"
                    >
                        <HStack>
                            <Text fontWeight="bold">
                                {t(
                                    'panel.details.nodeVersion.placingNewWithId',
                                    '正在编辑节点{id}，完成后请点击确定按钮。',
                                    { id: placingNodeVersion.nodeId }
                                )}
                            </Text>
                            {showConfirmButton && (
                                <Button size="sm" colorScheme="blue" onClick={handleConfirmPlace}>
                                    {t('ok', '确定')}
                                </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={handleCancelPlace}>
                                {t('cancel', '取消')}
                            </Button>
                        </HStack>
                    </Box>
                )}

                <RmgErrorBoundary allowReset>
                    <Flex direction="row" height="100%" overflow="hidden" sx={{ position: 'relative' }}>
                        {/* `position: 'relative'` is used to make sure RmgSidePanel in DetailsPanel
                        have the right parent container for its `position: 'absolute'` calculation. */}
                        <React.Suspense fallback={null}>
                            <ToolsPanel />
                        </React.Suspense>
                        <React.Suspense fallback={loadingFallback}>
                            <SvgWrapper />
                        </React.Suspense>
                        <React.Suspense fallback={null}>
                            <DetailsPanel zIndex={panelZIndex.details} />
                        </React.Suspense>
                        {timelineFeatureEnabled && (
                            <React.Suspense fallback={null}>
                                <TimelineEditorPanel
                                    isOpen={isTimelinePanelOpen}
                                    onClose={handleCloseTimelinePanel}
                                    zIndex={panelZIndex.timeline}
                                />
                            </React.Suspense>
                        )}
                    </Flex>
                </RmgErrorBoundary>

                <React.Suspense fallback={null}>
                    <RmgPaletteAppClip
                        isOpen={!!input}
                        onClose={() => dispatch(closePaletteAppClip())}
                        defaultTheme={input}
                        onSelect={nextTheme => dispatch(onPaletteAppClipEmit(nextTheme))}
                    />
                </React.Suspense>

                {timelineFeatureEnabled && (
                    <React.Suspense fallback={null}>
                        <TimelinePlayer isOpen={isTimelinePlayerOpen} onClose={() => setIsTimelinePlayerOpen(false)} />
                    </React.Suspense>
                )}
            </RmgWindow>
        </RmgThemeProvider>
    );
}
