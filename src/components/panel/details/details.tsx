import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Heading, HStack } from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import {
    RmgFields,
    RmgFieldsField,
    RmgSidePanel,
    RmgSidePanelHeader,
    RmgSidePanelBody,
    RmgSidePanelFooter,
} from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/app/app-slice';
import { clearSelected, setRefresh, setRefreshReconcile } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../theme-button';
import ColourModal from '../colour-modal/colour-modal';
import { NodeAttributes, Theme } from '../../../constants/constants';
import stations from '../../station/stations';
import miscNodes from '../../nodes/misc-nodes';
import lines from '../../line/lines';
import miscEdges from '../../edges/misc-edges';
import InfoSection from './info-section';
import NodePositionSection from './node-position-section';

const nodes = { ...stations, ...miscNodes };
const edges = { ...lines, ...miscEdges };

const DetailsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);
    const { selected } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const handleClose = () => dispatch(clearSelected());
    const handleDuplicate = (selectedFirst: string) => {
        const allAttr = JSON.parse(JSON.stringify(graph.current.getNodeAttributes(selectedFirst))) as NodeAttributes;
        allAttr.x += 50;
        allAttr.y += 50;
        const id = selectedFirst.startsWith('stn') ? `stn_${nanoid(10)}` : `misc_node_${nanoid(10)}`;
        graph.current.addNode(id, allAttr);
        hardRefresh();
    };
    const handleRemove = (selected: string[]) => {
        dispatch(clearSelected());
        selected.forEach(s => {
            if (graph.current.hasNode(s)) graph.current.dropNode(s);
            else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
        });
        hardRefresh();
    };
    // A helper method to remove all lines with the same color
    const handleRemoveEntireLine = (selectedFirst: string) => {
        dispatch(clearSelected());
        const theme = graph.current.getEdgeAttribute(selectedFirst, 'color');
        const lines = graph.current.filterEdges((edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
            attr.color.every((v, i) => v === theme[i])
        );
        lines.forEach(line => {
            graph.current.dropEdge(line);
        });
        hardRefresh();
    };

    // hide reconcile for now
    const [reconcileId, setReconcileId] = React.useState('');
    React.useEffect(() => {
        const selectedFirst = selected.at(0);
        if (graph.current.hasEdge(selectedFirst))
            setReconcileId(graph.current.getEdgeAttribute(selectedFirst, 'reconcileId') ?? 'undefined');
    }, [selected]);

    const fields: RmgFieldsField[] = [];
    const selectedFirst = selected.at(0);

    if (selected.length === 1 && graph.current.hasNode(selectedFirst)) {
        const type = graph.current.getNodeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getNodeAttribute(selectedFirst, type);
        fields.push(
            ...nodes[type].fields
                // TODO: filter will complain the type
                // @ts-expect-error
                .filter(field => field.type !== 'custom')
                .map(
                    // @ts-expect-error
                    field =>
                        ({
                            type: field.type,
                            label: t(field.label),
                            // TODO: fix this
                            // @ts-ignore-error
                            value: field.value(attrs),
                            // TODO: fix this
                            // @ts-ignore-error
                            options: field.options,
                            // TODO: fix this
                            // @ts-ignore-error
                            validator: field.validator,
                            onChange: (val: string | number) => {
                                graph.current.mergeNodeAttributes(selectedFirst, {
                                    // TODO: fix this
                                    // @ts-ignore-error
                                    [type]: field.onChange(val, attrs),
                                });
                                hardRefresh();
                            },
                        } as RmgFieldsField)
                ),
            // TODO: filter will complain the type
            // @ts-expect-error
            ...nodes[type].fields.filter(field => field.type === 'custom')
        );
    }

    if (selected.length === 1 && graph.current.hasEdge(selectedFirst)) {
        fields.push({
            type: 'custom',
            label: t('color'),
            component: (
                <ThemeButton
                    theme={graph.current.getEdgeAttribute(selectedFirst, 'color')}
                    onClick={() => setIsModalOpen(true)}
                />
            ),
            minW: '40px',
        });
        // fields.push({
        //     type: 'input',
        //     label: t('panel.details.line.reconcileId'),
        //     value: reconcileId,
        //     onChange: val => {
        //         setReconcileId(val);
        //         graph.current.mergeEdgeAttributes(selectedFirst, { reconcileId: val });
        //         dispatch(setRefreshReconcile());
        //         dispatch(saveGraph(graph.current.export()));
        //     },
        // });
        const type = graph.current.getEdgeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getEdgeAttribute(selectedFirst, type);
        fields.push(
            ...edges[type].fields.map(
                field =>
                    ({
                        type: field.type,
                        label: t(field.label),
                        // TODO: fix this
                        // @ts-ignore-error
                        value: field.value(attrs),
                        // TODO: fix this
                        // @ts-ignore-error
                        options: field.options,
                        // TODO: fix this
                        // @ts-ignore-error
                        validator: field.validator,
                        onChange: (val: string | number) => {
                            graph.current.mergeEdgeAttributes(selectedFirst, {
                                // TODO: fix this
                                // @ts-ignore-error
                                [type]: field.onChange(val, attrs),
                            });
                            // console.log(graph.current.getEdgeAttributes(selectedFirst));
                            hardRefresh();
                        },
                    } as RmgFieldsField)
            )
        );
    }

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const handleChangeLineColor = (color: Theme) => {
        if (selected.at(0) && graph.current.hasEdge(selected.at(0))) {
            graph.current.mergeEdgeAttributes(selected.at(0), { color });
            hardRefresh();
        }
    };

    return (
        <RmgSidePanel isOpen={selected.length > 0} width={300} header="Dummy header" alwaysOverlay>
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <InfoSection />

                {selected.length === 1 && graph.current.hasNode(selectedFirst) && <NodePositionSection />}

                <Box p={1}>
                    <Heading as="h5" size="sm">
                        {t('panel.details.node.title')}
                    </Heading>

                    <RmgFields fields={fields} minW={276} />
                </Box>

                <ColourModal
                    isOpen={isModalOpen}
                    defaultTheme={
                        selected.at(0)?.startsWith('line')
                            ? graph.current.getEdgeAttribute(selected.at(0), 'color')
                            : undefined
                    }
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={nextTheme => handleChangeLineColor(nextTheme)}
                />
            </RmgSidePanelBody>
            <RmgSidePanelFooter>
                <HStack>
                    {selected.length === 1 && graph.current.hasNode(selected.at(0)) && (
                        <Button size="sm" variant="outline" onClick={() => handleDuplicate(selected.at(0)!)}>
                            {t('panel.details.footer.duplicate')}
                        </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleRemove(selected)}>
                        {t('panel.details.footer.remove')}
                    </Button>
                    {selected.length === 1 && selectedFirst?.startsWith('line-') && (
                        <Button size="sm" variant="outline" onClick={() => handleRemoveEntireLine(selected.at(0)!)}>
                            {t('panel.details.footer.removeEntireLine')}
                        </Button>
                    )}
                </HStack>
            </RmgSidePanelFooter>
        </RmgSidePanel>
    );
};

export default DetailsPanel;
