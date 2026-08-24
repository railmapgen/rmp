import {
    Box,
    Button,
    Heading,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import { RmgSidePanel, RmgSidePanelBody, RmgSidePanelFooter, RmgSidePanelHeader } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id, LineId, NodeId, NodeVersion, StnId } from '../../../constants/constants';
import { MAX_MASTER_NODE_FREE } from '../../../constants/master';
import { MiscNodeType } from '../../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import {
    clearSelected,
    hideDetailsPanel,
    refreshEdgesThunk,
    refreshNodesThunk,
    startPlacingNodeVersion,
} from '../../../redux/runtime/runtime-slice';
import { checkAndChangeStationIntType } from '../../../util/change-types';
import { reconcileSelectedEdges } from '../../../util/reconcile-ui';
import {
    EdgeSpecificAttrsClipboardData,
    exportEdgeSpecificAttrs,
    exportNodeSpecificAttrs,
    exportSelectedNodesAndEdges,
    getSelectedElementsType,
    importEdgeSpecificAttrs,
    importNodeSpecificAttrs,
    NodeSpecificAttrsClipboardData,
    parseClipboardData,
} from '../../../util/clipboard';
import { isPortraitClient } from '../../../util/helpers';
import { sendErrorNotification } from '../../../util/notifications';
import {
    addNodeVersion,
    applyNodeVersion,
    getCurrentNodeVersion,
    getNodeVersion,
    removeNodeVersion,
    renameNodeVersion,
} from '../../../util/timeline';
import InfoSection from './info-section';
import LineExtremitiesSection from './line-extremities-section';
import NodePositionSection from './node-position-section';
import { LineSpecificAttributes, NodeSpecificAttributes } from './specific-attrs';
import TimelineAttrsSection from './timeline-attrs-section';

const NodeVersionSection = ({ nodeId, onRefresh }: { nodeId: NodeId; onRefresh: () => void }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = window.graph;
    const baseGraph = useRootSelector(state => state.timeline.baseGraph);
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    const placingNodeVersion = useRootSelector(state => state.runtime.placingNodeVersion);
    const isPlacingThis = placingNodeVersion?.nodeId === nodeId;
    const { timelineFeatureEnabled } = useRootSelector(state => state.app.preference);

    const [renamingVersion, setRenamingVersion] = React.useState<number | null>(null);
    const [renameValue, setRenameValue] = React.useState('');

    // 名称输入模态框状态
    const [nameModalOpen, setNameModalOpen] = React.useState(false);
    const [newVersionName, setNewVersionName] = React.useState('');
    const [pendingSavedState, setPendingSavedState] = React.useState<any>(null);

    if (!timelineFeatureEnabled) return null;

    const versionsRaw = graph.hasNode(nodeId) ? (graph.getNodeAttribute(nodeId, 'versions') ?? []) : [];
    // Use Set to dedupe — v1 may be stored in versions[] after the first add.
    const versionSet = new Set<number>([1, ...versionsRaw.map(v => v.version)]);
    const versions = Array.from(versionSet).sort((a, b) => a - b);

    const currentVersion = graph.hasNode(nodeId) ? (graph.getNodeAttribute(nodeId, 'currentVersion') ?? 1) : 1;

    const isActiveVersion = (version: number) => version === currentVersion;

    const getVersionName = (version: number): string => {
        const versions = graph.hasNode(nodeId) ? (graph.getNodeAttribute(nodeId, 'versions') ?? []) : [];
        const v = versions.find(v => v.version === version);
        if (v?.name) return v.name;
        // For v1, default to "basic" when no stored name exists.
        if (version === 1) return 'basic';
        return `v${version}`;
    };

    const handleStartEditVersion = () => {
        const savedState = getCurrentNodeVersion(graph, nodeId);
        if (!savedState) return;

        // 先保存状态，显示名称输入模态框
        setPendingSavedState(savedState);
        setNewVersionName('');
        setNameModalOpen(true);
    };

    const handleConfirmNameAndStart = () => {
        if (!pendingSavedState) return;

        dispatch(
            startPlacingNodeVersion({
                nodeId,
                version: 0,
                savedState: pendingSavedState,
                versionName: newVersionName.trim() || undefined,
            })
        );
        setNameModalOpen(false);
        setPendingSavedState(null);
        onRefresh();
    };

    const handleCancelNameModal = () => {
        setNameModalOpen(false);
        setPendingSavedState(null);
        setNewVersionName('');
    };

    const handleApplyVersion = (version: number) => {
        let nodeVersion = getNodeVersion(graph, nodeId, version);
        if (!nodeVersion && version === 1) {
            const baseNode = baseGraph.nodes?.find(node => node.key === nodeId);
            const baseAttrs = baseNode?.attributes;
            if (baseAttrs?.type) {
                nodeVersion = {
                    version: 1,
                    name: 'basic',
                    x: baseAttrs.x,
                    y: baseAttrs.y,
                    type: baseAttrs.type,
                    ...(baseAttrs[baseAttrs.type]
                        ? { [baseAttrs.type]: structuredClone(baseAttrs[baseAttrs.type]) }
                        : {}),
                } as NodeVersion;
                graph.mergeNodeAttributes(nodeId, {
                    versions: [...(graph.getNodeAttribute(nodeId, 'versions') ?? []), nodeVersion],
                });
            }
        }
        if (!nodeVersion) return;
        applyNodeVersion(graph, nodeId, nodeVersion);
        dispatch(saveGraph(graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        onRefresh();
        forceUpdate();
        requestAnimationFrame(() => {
            const container = document.querySelector('[data-details-scroll-container]') as HTMLElement | null;
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
    };

    const handleRemoveVersion = (version: number) => {
        removeNodeVersion(graph, nodeId, version);
        dispatch(saveGraph(graph.export()));
        if (version === 1) {
            dispatch(refreshNodesThunk());
            dispatch(refreshEdgesThunk());
        }
        forceUpdate();
    };

    const handleStartRename = (version: number) => {
        setRenamingVersion(version);
        setRenameValue(getVersionName(version));
    };

    const handleConfirmRename = () => {
        if (renamingVersion !== null) {
            const finalName = renameValue.trim();
            if (finalName) {
                if (renamingVersion === 1) {
                    // v1 uses the name "basic", stored as default
                    // For v1, we don't actually store name in versions array
                } else {
                    renameNodeVersion(graph, nodeId, renamingVersion, finalName);
                }
                dispatch(saveGraph(graph.export()));
            }
        }
        setRenamingVersion(null);
        setRenameValue('');
        forceUpdate();
    };

    return (
        <>
            <Box p={1} mt={2} pointerEvents={isPlacingThis ? 'none' : undefined}>
                <Heading as="h5" size="sm" mb={2}>
                    {t('panel.details.nodeVersion.title', '历史版本')}
                </Heading>
                {isPlacingThis && (
                    <Box mb={2} px={2} py={1} bg="blue.50" borderRadius="md">
                        <Text fontSize="xs" color="blue.600">
                            {t(
                                'panel.details.nodeVersion.placingNewWithId',
                                '正在编辑节点{{id}}，完成后请点击上方的确定按钮。',
                                { id: nodeId }
                            )}
                        </Text>
                    </Box>
                )}
                <VStack align="stretch" spacing={1}>
                    {versions.map(version => {
                        const displayName = getVersionName(version);
                        const isRenaming = renamingVersion === version;

                        return (
                            <HStack
                                key={version}
                                spacing={1}
                                justifyContent="space-between"
                                bg={isActiveVersion(version) ? 'blue.50' : undefined}
                                borderLeft={isActiveVersion(version) ? '3px solid' : undefined}
                                borderColor={isActiveVersion(version) ? 'blue.400' : undefined}
                                pl={isActiveVersion(version) ? 1 : 0}
                                borderRadius="sm"
                            >
                                <HStack spacing={1} flex={1} minWidth={0}>
                                    {isRenaming ? (
                                        <Input
                                            size="xs"
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={handleConfirmRename}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleConfirmRename();
                                                if (e.key === 'Escape') {
                                                    setRenamingVersion(null);
                                                    setRenameValue('');
                                                }
                                            }}
                                            autoFocus
                                            width="100px"
                                        />
                                    ) : (
                                        <>
                                            <Text
                                                fontSize="xs"
                                                cursor={isPlacingThis ? 'default' : 'pointer'}
                                                onDoubleClick={() => !isPlacingThis && handleStartRename(version)}
                                                fontWeight={isActiveVersion(version) ? 'semibold' : 'medium'}
                                                color={isActiveVersion(version) ? 'blue.700' : undefined}
                                                whiteSpace="nowrap"
                                            >
                                                {displayName}
                                            </Text>
                                            {isActiveVersion(version) && (
                                                <Text
                                                    fontSize="xs"
                                                    color="blue.500"
                                                    fontWeight="semibold"
                                                    whiteSpace="nowrap"
                                                >
                                                    {t('panel.details.nodeVersion.current', '(当前)')}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </HStack>
                                <HStack spacing={1}>
                                    {!isRenaming && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            fontSize="xs"
                                            onClick={() => handleStartRename(version)}
                                            isDisabled={isPlacingThis}
                                        >
                                            {t('panel.details.nodeVersion.rename', '重命名')}
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="blue"
                                        onClick={() => handleApplyVersion(version)}
                                        isDisabled={isPlacingThis}
                                    >
                                        {t('panel.details.nodeVersion.apply', '应用')}
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => handleRemoveVersion(version)}
                                        isDisabled={isPlacingThis || versions.length <= 1}
                                    >
                                        {t('panel.details.nodeVersion.remove', '删除')}
                                    </Button>
                                </HStack>
                            </HStack>
                        );
                    })}
                    <Button size="xs" variant="outline" onClick={handleStartEditVersion} isDisabled={isPlacingThis}>
                        {t('panel.details.nodeVersion.add', '添加新版本')}
                    </Button>
                </VStack>
            </Box>

            {/* 名称输入模态框 */}
            <Modal isOpen={nameModalOpen} onClose={handleCancelNameModal} size="sm">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('panel.details.nodeVersion.enterName', '输入版本名称')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text fontSize="sm" mb={2}>
                            {t(
                                'panel.details.nodeVersion.enterNameDesc',
                                '请为新版本输入一个名称（可选，留空将使用默认名称）'
                            )}
                        </Text>
                        <Input
                            value={newVersionName}
                            onChange={e => setNewVersionName(e.target.value)}
                            placeholder={t('panel.details.nodeVersion.versionName', '版本名称')}
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleConfirmNameAndStart();
                            }}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={handleCancelNameModal}>
                            {t('cancel', '取消')}
                        </Button>
                        <Button colorScheme="blue" onClick={handleConfirmNameAndStart}>
                            {t('confirm', '确定')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

const DetailsPanel = ({ zIndex = 5 }: { zIndex?: number }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = window.graph;
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(window.graph.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph]);
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        selected,
        isDetailsOpen,
        count: { masters: masterNodesCount },
    } = useRootSelector(state => state.runtime);
    const {
        preference: { autoChangeStationType },
    } = useRootSelector(state => state.app);
    const [selectedFirst] = selected;

    const isMasterDisabled = !activeSubscriptions.RMP_CLOUD && masterNodesCount + 1 > MAX_MASTER_NODE_FREE;
    const isGenericLineStyleLayerLimited = !activeSubscriptions.RMP_CLOUD;

    const canCopyAttrs = selected.size === 1;
    const hasMultipleEdges = React.useMemo(
        () => [...selected].filter(id => graph.hasEdge(id)).length >= 2,
        [selected, graph]
    );

    const handleClose = () => {
        if (!isPortraitClient()) {
            dispatch(clearSelected());
        } else {
            dispatch(hideDetailsPanel());
        }
    };
    const handleDuplicate = (selectedFirst: string) => {
        const allAttr = structuredClone(graph.getNodeAttributes(selectedFirst));
        allAttr.x += 50;
        allAttr.y += 50;
        const id = selectedFirst.startsWith('stn') ? `stn_${nanoid(10)}` : `misc_node_${nanoid(10)}`;
        graph.addNode(id, allAttr);
        dispatch(saveGraph(graph.export()));
        dispatch(refreshNodesThunk());
    };
    const handleCopy = (selected: Set<Id>) => {
        const s = exportSelectedNodesAndEdges(graph, selected);
        navigator.clipboard.writeText(s);
    };
    const handleRemove = (selected: Set<Id>) => {
        dispatch(clearSelected());
        selected.forEach(s => {
            if (graph.hasNode(s)) graph.dropNode(s);
            else if (graph.hasEdge(s)) {
                const [u, v] = graph.extremities(s);
                graph.dropEdge(s);

                // Automatically change the station type to basic if the station is connected by lines in a single color.
                if (autoChangeStationType && u.startsWith('stn')) checkAndChangeStationIntType(graph, u as StnId);
                if (autoChangeStationType && v.startsWith('stn')) checkAndChangeStationIntType(graph, v as StnId);
            }
        });
        hardRefresh();
    };

    const handleCopyAttrs = () => {
        if (selected.size !== 1) return;
        const id = selectedFirst;

        if (graph.hasNode(id)) {
            const s = exportNodeSpecificAttrs(graph, id as NodeId);
            navigator.clipboard.writeText(s);
        } else if (graph.hasEdge(id)) {
            const s = exportEdgeSpecificAttrs(graph, id as LineId);
            navigator.clipboard.writeText(s);
        }
    };

    const handlePasteAttrs = async () => {
        let s = '';
        try {
            s = await navigator.clipboard.readText();
        } catch (error) {
            console.warn('Failed to read clipboard:', error);
            sendErrorNotification(t('error'), t('clipboard.errors.readText'));
            return;
        }

        const parsed = parseClipboardData(s);
        const selectionInfo = getSelectedElementsType(graph, selected);
        if (!parsed || parsed.type === 'elements' || !selectionInfo.allSameType || !selectionInfo.category) {
            sendErrorNotification(t('error'), t('clipboard.errors.cannotPasteSpecificAttrs'));
            return;
        }

        if (selectionInfo.category === 'node') {
            if (selectionInfo.nodeType !== parsed.type) {
                sendErrorNotification(t('error'), t('clipboard.errors.cannotPasteSpecificAttrs'));
                return;
            }

            if (!importNodeSpecificAttrs(graph, selected, parsed.data as NodeSpecificAttrsClipboardData)) {
                sendErrorNotification(t('error'), t('clipboard.errors.cannotPasteSpecificAttrs'));
                return;
            }

            hardRefresh();
            return;
        }

        if (selectionInfo.category !== 'edge' || selectionInfo.edgeStyleType !== parsed.type) {
            sendErrorNotification(t('error'), t('clipboard.errors.cannotPasteSpecificAttrs'));
            return;
        }

        if (
            !importEdgeSpecificAttrs(
                graph,
                selected,
                parsed.data as EdgeSpecificAttrsClipboardData,
                isGenericLineStyleLayerLimited
            )
        ) {
            sendErrorNotification(t('error'), t('clipboard.errors.cannotPasteSpecificAttrs'));
            return;
        }

        hardRefresh();
    };

    const handleReconcile = () => {
        if (reconcileSelectedEdges(graph, selected)) {
            hardRefresh();
        }
    };

    return (
        <RmgSidePanel isOpen={isDetailsOpen === 'show'} width={300} header="Dummy header" alwaysOverlay sx={{ zIndex }}>
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <Box data-details-scroll-container overflowY="auto" height="100%">
                    <InfoSection />

                    {selected.size === 1 && graph.hasNode(selectedFirst) && <NodePositionSection />}
                    {selected.size === 1 && graph.hasEdge(selectedFirst) && <LineExtremitiesSection />}

                    {selected.size === 1 && (
                        <Box p={1}>
                            <Heading as="h5" size="sm">
                                {t('panel.details.specificAttrsTitle')}
                            </Heading>

                            {graph.hasNode(selectedFirst) && <NodeSpecificAttributes />}
                            {graph.hasEdge(selectedFirst) && <LineSpecificAttributes />}
                        </Box>
                    )}

                    {selected.size === 1 && graph.hasNode(selectedFirst) && (
                        <NodeVersionSection nodeId={selectedFirst as NodeId} onRefresh={hardRefresh} />
                    )}

                    <TimelineAttrsSection />
                </Box>
            </RmgSidePanelBody>
            <RmgSidePanelFooter>
                <VStack spacing={2} align="stretch" width="100%">
                    <HStack>
                        {selected.size === 1 && graph.hasNode(selectedFirst) && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicate(selectedFirst)}
                                isDisabled={
                                    graph.getNodeAttributes(selectedFirst).type === MiscNodeType.Master &&
                                    isMasterDisabled
                                }
                                flex={1}
                            >
                                {t('panel.details.footer.duplicate')}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleCopy(selected)} flex={1}>
                            {t('copy')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRemove(selected)} flex={1}>
                            {t('remove')}
                        </Button>
                    </HStack>

                    <Button size="sm" variant="outline" onClick={handleCopyAttrs} isDisabled={!canCopyAttrs}>
                        {t('copyAttrs')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePasteAttrs}>
                        {t('pasteAttrs')}
                    </Button>
                    {hasMultipleEdges && (
                        <Button size="sm" variant="outline" onClick={handleReconcile}>
                            {t('panel.details.info.reconcile')}
                        </Button>
                    )}
                </VStack>
            </RmgSidePanelFooter>
        </RmgSidePanel>
    );
};

export default DetailsPanel;
