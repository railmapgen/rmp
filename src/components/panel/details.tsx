import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Heading, HStack, Flex, Divider } from '@chakra-ui/react';
import {
    RmgFields,
    RmgFieldsField,
    RmgSidePanelHeader,
    RmgSidePanelBody,
    RmgSidePanelFooter,
} from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { clearSelected, setRefresh, setRefreshReconcile } from '../../redux/runtime/runtime-slice';
import ThemeButton from './theme-button';
import ColourModal from './colour-modal/colour-modal';
import { Theme } from '../../constants/constants';
import stations from '../station/stations';
import miscNodes from '../misc/misc-nodes';
import lines from '../line/lines';
import InterchangeSection from './details-panels/interchange-section';
import InfoSection from './details-panels/info-section';

const nodes = { ...stations, ...miscNodes };

const DetailsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(JSON.stringify(graph.current.export())));
    }, [dispatch, setRefresh, saveGraph]);
    const {
        selected,
        refresh: { all: refreshAll },
    } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const [pos, setPos] = React.useState({ x: 0, y: 0 });
    React.useEffect(() => {
        const selectedFirst = selected.at(0);
        if (selectedFirst?.startsWith('stn') || selectedFirst?.startsWith('misc_node_')) {
            const x = graph.current.getNodeAttribute(selectedFirst, 'x');
            const y = graph.current.getNodeAttribute(selectedFirst, 'y');
            setPos({ x, y });
        }
    }, [refreshAll, selected]);

    const handleClose = () => {};
    const handleRemove = (selected: string[]) => {
        selected.forEach(s => {
            if (graph.current.hasNode(s)) graph.current.dropNode(s);
            else if (graph.current.hasEdge(s)) graph.current.dropEdge(s);
        });
        dispatch(clearSelected());
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

        // list pos { x, y }
        fields.push(
            {
                type: 'input',
                label: t('panel.details.station.pos.x'),
                value: pos.x.toString(),
                validator: val => !Number.isNaN(val),
                onChange: val => {
                    graph.current.mergeNodeAttributes(selectedFirst, { x: Number(val) });
                    hardRefresh();
                },
            },
            {
                type: 'input',
                label: t('panel.details.station.pos.y'),
                value: pos.y.toString(),
                validator: val => !Number.isNaN(val),
                onChange: val => {
                    graph.current.mergeNodeAttributes(selectedFirst, { y: Number(val) });
                    hardRefresh();
                },
            }
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
        //         dispatch(saveGraph(JSON.stringify(graph.current.export())));
        //     },
        // });
        const type = graph.current.getEdgeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getEdgeAttribute(selectedFirst, type);
        fields.push(
            ...lines[type].fields.map(
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
        <Flex direction="column" height="100%" width={selected.length ? 300 : 0} overflow="hidden">
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <InfoSection />

                {/* <Divider />

                {selectedFirst?.startsWith('stn') && graph.current.hasNode(selectedFirst) && <InterchangeSection />} */}

                <Divider />

                <Box p={1}>
                    <Heading as="h5" size="sm">
                        {t('panel.details.node.title')}
                    </Heading>

                    <RmgFields fields={fields} minW={300} />
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
                    <Button size="sm" variant="outline" onClick={() => handleRemove(selected)}>
                        {t('panel.details.footer.remove')}
                    </Button>
                </HStack>
            </RmgSidePanelFooter>
        </Flex>
    );
};

export default DetailsPanel;
