import { Box, Button, Heading, HStack } from '@chakra-ui/react';
import { RmgSidePanel, RmgSidePanelBody, RmgSidePanelFooter, RmgSidePanelHeader } from '@railmapgen/rmg-components';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Id } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { clearSelected, setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { exportSelectedNodesAndEdges } from '../../../util/clipboard';
import InfoSection from './info-section';
import LineExtremitiesSection from './line-extremities-section';
import NodePositionSection from './node-position-section';
import { LineSpecificAttributes, NodeSpecificAttributes } from './specific-attrs';

const DetailsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = React.useRef(window.graph);
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph]);
    const { selected, mode } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;

    const handleClose = () => dispatch(clearSelected());
    const handleDuplicate = (selectedFirst: string) => {
        const allAttr = structuredClone(graph.current.getNodeAttributes(selectedFirst));
        allAttr.x += 50;
        allAttr.y += 50;
        const id = selectedFirst.startsWith('stn') ? `stn_${nanoid(10)}` : `misc_node_${nanoid(10)}`;
        graph.current.addNode(id, allAttr);
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
    };
    const handleCopy = (selected: Set<Id>) => {
        const s = exportSelectedNodesAndEdges(graph.current, selected);
        navigator.clipboard.writeText(s);
    };
    const handleRemove = (selected: Set<Id>) => {
        dispatch(clearSelected());
        selected.forEach(s => {
            if (graph.current.hasNode(s)) graph.current.dropNode(s);
            else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
        });
        hardRefresh();
    };

    return (
        <RmgSidePanel
            isOpen={selected.size > 0 && !mode.startsWith('line')}
            width={300}
            header="Dummy header"
            alwaysOverlay
        >
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
                <HStack>
                    {selected.size === 1 && graph.current.hasNode([...selected].at(0)) && (
                        <Button size="sm" variant="outline" onClick={() => handleDuplicate([...selected].at(0)!)}>
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
            </RmgSidePanelFooter>
        </RmgSidePanel>
    );
};

export default DetailsPanel;
