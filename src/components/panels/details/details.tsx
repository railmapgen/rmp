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
import { saveGraph } from '../../../redux/param/param-slice';
import { clearSelected, setGlobalAlert, setRefreshNodes, setRefreshEdges } from '../../../redux/runtime/runtime-slice';
import { NodeAttributes } from '../../../constants/constants';
import stations from '../../svgs/stations/stations';
import miscNodes from '../../svgs/nodes/misc-nodes';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import InfoSection from './info-section';
import NodePositionSection from './node-position-section';
import LineExtremitiesSection from './line-extremities-section';

const nodes = { ...stations, ...miscNodes };

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
    const handleRemove = (selected: string[]) => {
        dispatch(clearSelected());
        selected.forEach(s => {
            if (graph.current.hasNode(s)) {
                graph.current.dropNode(s);
                hardRefresh();
            } else if (graph.current.hasEdge(s)) {
                graph.current.dropEdge(s);
                dispatch(setRefreshEdges());
                dispatch(saveGraph(graph.current.export()));
            }
        });
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
                            value: field.value?.(attrs),
                            isChecked: field.isChecked?.(attrs),
                            hidden: field.hidden?.(attrs),
                            options: field.options,
                            disabledOptions: field.disabledOptions && field.disabledOptions(attrs),
                            validator: field.validator,
                            oneLine: field.oneLine,
                            // TODO: val could be string | number | boolean or others in different types.
                            onChange: (val: any) => {
                                let updatedAttrs: NodeAttributes;
                                try {
                                    updatedAttrs = field.onChange(val, attrs);
                                } catch (error) {
                                    dispatch(
                                        setGlobalAlert({
                                            status: 'error',
                                            message: t(`err-code.${error as string}`),
                                        })
                                    );
                                    return;
                                }

                                graph.current.mergeNodeAttributes(selectedFirst, {
                                    [type]: updatedAttrs,
                                });
                                dispatch(setRefreshNodes());
                                dispatch(saveGraph(graph.current.export()));
                            },
                        } as RmgFieldsField)
                ),
            // TODO: filter will complain the type
            // @ts-expect-error
            ...nodes[type].fields.filter(field => field.type === 'custom')
        );
    }

    if (selected.length === 1 && graph.current.hasEdge(selectedFirst)) {
        // fields.push({
        //     type: 'input',
        //     label: t('panel.details.line.reconcileId'),
        //     value: reconcileId,
        //     onChange: val => {
        //         setReconcileId(val);
        //         graph.current.mergeEdgeAttributes(selectedFirst, { reconcileId: val });
        //         dispatch(setRefreshEdges());
        //         dispatch(saveGraph(graph.current.export()));
        //     },
        // });
        const type = graph.current.getEdgeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getEdgeAttribute(selectedFirst, type);
        fields.push(
            ...linePaths[type].fields.map(
                field =>
                    ({
                        // TODO: fix this
                        type: field.type,
                        label: t(field.label),
                        // @ts-ignore-error
                        value: field.value(attrs),
                        // @ts-ignore-error
                        options: field.options,
                        // @ts-ignore-error
                        disabledOptions: field.disabledOptions && field.disabledOptions(attrs),
                        // @ts-ignore-error
                        validator: field.validator,
                        onChange: (val: string | number) => {
                            graph.current.mergeEdgeAttributes(selectedFirst, {
                                // @ts-ignore-error
                                [type]: field.onChange(val, attrs),
                            });
                            // console.log(graph.current.getEdgeAttributes(selectedFirst));
                            dispatch(setRefreshEdges());
                            dispatch(saveGraph(graph.current.export()));
                        },
                    } as RmgFieldsField)
            )
        );
        const style = graph.current.getEdgeAttribute(selectedFirst, 'style');
        const styleAttrs = graph.current.getEdgeAttribute(selectedFirst, style);
        fields.push(
            ...lineStyles[style].fields
                // TODO: filter will complain the type
                // @ts-expect-error
                .filter(field => field.type !== 'custom')
                .map(
                    // @ts-expect-error
                    field =>
                        ({
                            // TODO: fix this
                            type: field.type,
                            label: t(field.label),
                            // @ts-ignore-error
                            value: field.value(styleAttrs),
                            // @ts-ignore-error
                            options: field.options,
                            // @ts-ignore-error
                            disabledOptions: field.disabledOptions && field.disabledOptions(styleAttrs),
                            // @ts-ignore-error
                            validator: field.validator,
                            onChange: (val: string | number) => {
                                graph.current.mergeEdgeAttributes(selectedFirst, {
                                    // @ts-ignore-error
                                    [style]: field.onChange(val, styleAttrs),
                                });
                                // console.log(graph.current.getEdgeAttributes(selectedFirst));
                                dispatch(setRefreshEdges());
                                dispatch(saveGraph(graph.current.export()));
                            },
                        } as RmgFieldsField)
                )
        );
        // TODO: filter will complain the type
        // @ts-expect-error
        fields.push(...lineStyles[style].fields.filter(field => field.type === 'custom'));
    }

    return (
        <RmgSidePanel
            isOpen={selected.length > 0 && !mode.startsWith('line') && !mode.startsWith('misc-edge')}
            width={300}
            header="Dummy header"
            alwaysOverlay
        >
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <InfoSection />

                {selected.length === 1 && graph.current.hasNode(selectedFirst) && <NodePositionSection />}

                {selected.length === 1 && graph.current.hasEdge(selectedFirst) && <LineExtremitiesSection />}

                {selected.length === 1 && (
                    <Box p={1}>
                        <Heading as="h5" size="sm">
                            {t('panel.details.specificAttrsTitle')}
                        </Heading>

                        <RmgFields fields={fields} minW={276} />
                    </Box>
                )}
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
                </HStack>
            </RmgSidePanelFooter>
        </RmgSidePanel>
    );
};

export default DetailsPanel;
