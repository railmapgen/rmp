import { Box, Button, Heading, HStack, VStack } from '@chakra-ui/react';
import { RmgSidePanel, RmgSidePanelBody, RmgSidePanelFooter, RmgSidePanelHeader } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id, LineId, NodeId, StnId } from '../../../constants/constants';
import { MAX_MASTER_NODE_FREE } from '../../../constants/master';
import { MiscNodeType } from '../../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import {
    clearSelected,
    hideDetailsPanel,
    refreshEdgesThunk,
    refreshNodesThunk,
} from '../../../redux/runtime/runtime-slice';
import {
    exportSelectedNodesAndEdges,
    exportNodeSpecificAttrs,
    exportEdgeSpecificAttrs,
    parseClipboardData,
    importNodeSpecificAttrs,
    importEdgeSpecificAttrs,
    getSelectedElementsType,
    NodeSpecificAttrsClipboardData,
    EdgeSpecificAttrsClipboardData,
} from '../../../util/clipboard';
import { isPortraitClient } from '../../../util/helpers';
import { checkAndChangeStationIntType } from '../../../util/change-types';
import InfoSection from './info-section';
import LineExtremitiesSection from './line-extremities-section';
import NodePositionSection from './node-position-section';
import { LineSpecificAttributes, NodeSpecificAttributes } from './specific-attrs';

const DetailsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
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

    // Check if we can paste specific attributes
    const selectionInfo = getSelectedElementsType(graph.current, selected);
    const canCopyAttrs = selected.size === 1;
    const canPasteAttrs =
        selectionInfo.allSameType && (selectionInfo.category === 'node' || selectionInfo.category === 'edge');

    const handleClose = () => {
        if (!isPortraitClient()) {
            dispatch(clearSelected());
        } else {
            dispatch(hideDetailsPanel());
        }
    };
    const handleDuplicate = (selectedFirst: string) => {
        const allAttr = structuredClone(graph.current.getNodeAttributes(selectedFirst));
        allAttr.x += 50;
        allAttr.y += 50;
        const id = selectedFirst.startsWith('stn') ? `stn_${nanoid(10)}` : `misc_node_${nanoid(10)}`;
        graph.current.addNode(id, allAttr);
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
    };
    const handleCopy = (selected: Set<Id>) => {
        const s = exportSelectedNodesAndEdges(graph.current, selected);
        navigator.clipboard.writeText(s);
    };
    const handleRemove = (selected: Set<Id>) => {
        dispatch(clearSelected());
        selected.forEach(s => {
            if (graph.current.hasNode(s)) graph.current.dropNode(s);
            else if (graph.current.hasEdge(s)) {
                const [u, v] = graph.current.extremities(s);
                graph.current.dropEdge(s);

                // Automatically change the station type to basic if the station is connected by lines in a single color.
                if (autoChangeStationType && u.startsWith('stn'))
                    checkAndChangeStationIntType(graph.current, u as StnId);
                if (autoChangeStationType && v.startsWith('stn'))
                    checkAndChangeStationIntType(graph.current, v as StnId);
            }
        });
        hardRefresh();
    };

    const handleCopyAttrs = () => {
        if (selected.size !== 1) return;
        const id = selectedFirst;

        if (graph.current.hasNode(id)) {
            const s = exportNodeSpecificAttrs(graph.current, id as NodeId);
            navigator.clipboard.writeText(s);
        } else if (graph.current.hasEdge(id)) {
            const s = exportEdgeSpecificAttrs(graph.current, id as LineId);
            navigator.clipboard.writeText(s);
        }
    };

    const handlePasteAttrs = async () => {
        try {
            const s = await navigator.clipboard.readText();
            const parsed = parseClipboardData(s);
            if (!parsed) return;

            if (parsed.type === 'node-attrs' && selectionInfo.category === 'node') {
                const nodeIds = new Set<NodeId>();
                selected.forEach(id => {
                    if (graph.current.hasNode(id)) {
                        nodeIds.add(id as NodeId);
                    }
                });
                if (importNodeSpecificAttrs(graph.current, nodeIds, parsed.data as NodeSpecificAttrsClipboardData)) {
                    hardRefresh();
                }
            } else if (parsed.type === 'edge-attrs' && selectionInfo.category === 'edge') {
                const edgeIds = new Set<LineId>();
                selected.forEach(id => {
                    if (graph.current.hasEdge(id)) {
                        edgeIds.add(id as LineId);
                    }
                });
                if (importEdgeSpecificAttrs(graph.current, edgeIds, parsed.data as EdgeSpecificAttrsClipboardData)) {
                    hardRefresh();
                }
            }
        } catch (error) {
            // Handle clipboard read error
            console.warn('Failed to read clipboard:', error);
        }
    };

    return (
        <RmgSidePanel isOpen={isDetailsOpen === 'show'} width={300} header="Dummy header" alwaysOverlay>
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <InfoSection />

                {selected.size === 1 && graph.current.hasNode(selectedFirst) && <NodePositionSection />}
                {selected.size === 1 && graph.current.hasEdge(selectedFirst) && <LineExtremitiesSection />}

                {selected.size === 1 && (
                    <Box p={1}>
                        <Heading as="h5" size="sm">
                            {t('panel.details.specificAttrsTitle')}
                        </Heading>

                        {window.graph.hasNode(selectedFirst) && <NodeSpecificAttributes />}
                        {window.graph.hasEdge(selectedFirst) && <LineSpecificAttributes />}
                    </Box>
                )}
            </RmgSidePanelBody>
            <RmgSidePanelFooter>
                <VStack spacing={2} align="stretch">
                    <HStack>
                        {selected.size === 1 && graph.current.hasNode(selectedFirst) && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicate(selectedFirst)}
                                isDisabled={
                                    graph.current.getNodeAttributes(selectedFirst).type === MiscNodeType.Master &&
                                    isMasterDisabled
                                }
                            >
                                {t('panel.details.footer.duplicate')}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleCopy(selected)}>
                            {t('panel.details.footer.copy')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRemove(selected)}>
                            {t('panel.details.footer.remove')}
                        </Button>
                    </HStack>
                    <HStack>
                        <Button size="sm" variant="outline" onClick={handleCopyAttrs} isDisabled={!canCopyAttrs}>
                            {t('panel.details.footer.copyAttrs')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handlePasteAttrs} isDisabled={!canPasteAttrs}>
                            {t('panel.details.footer.pasteAttrs')}
                        </Button>
                    </HStack>
                </VStack>
            </RmgSidePanelFooter>
        </RmgSidePanel>
    );
};

export default DetailsPanel;
