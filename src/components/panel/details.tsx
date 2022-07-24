import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, HStack, Flex } from '@chakra-ui/react';
import {
    RmgFields,
    RmgFieldsField,
    RmgSidePanelHeader,
    RmgSidePanelBody,
    RmgSidePanelFooter,
} from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { clearSelected, setRefresh } from '../../redux/runtime/runtime-slice';
import ThemeButton from './theme-button';
import ColourModal from './colour-modal/colour-modal';
import { Theme } from '../../constants/constants';
import stations from '../station/stations';
import lines from '../line/lines';

const DetailsPanel = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const selected = useRootSelector(state => state.runtime.selected).at(0);
    const graph = React.useRef(window.graph);

    const handleClose = () => {};
    const handleRemove = (id: string | undefined, type: 'node' | 'line') => {
        if (!id) return;
        type === 'node' ? graph.current.dropNode(id) : graph.current.dropEdge(id);
        dispatch(clearSelected());
        dispatch(setRefresh());
        dispatch(saveGraph(JSON.stringify(graph.current.export())));
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.id'),
            value: selected ?? 'undefined',
            onChange: val => {},
        },
        {
            type: 'input',
            label: t('panel.details.type'),
            value: selected
                ? graph.current.hasNode(selected)
                    ? graph.current.getNodeAttribute(selected, 'type')
                    : graph.current.getEdgeAttribute(selected, 'type')
                : 'undefined',
            onChange: val => {},
        },
    ];

    if (graph.current.hasNode(selected)) {
        const type = graph.current.getNodeAttribute(selected, 'type');
        const attrs = graph.current.getNodeAttribute(selected, type);
        fields.push(
            ...stations[type].fields.map(
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
                            graph.current.mergeNodeAttributes(selected, {
                                // TODO: fix this
                                // @ts-ignore-error
                                [type]: field.onChange(val, attrs),
                            });
                            dispatch(setRefresh());
                            dispatch(saveGraph(JSON.stringify(graph.current.export())));
                        },
                    } as RmgFieldsField)
            )
        );
        fields.push({
            type: 'input',
            label: t('panel.details.stn.pos'),
            // TODO: hardRefresh required, now debug only
            value: graph.current.getNodeAttribute(selected, 'x') + ' ' + graph.current.getNodeAttribute(selected, 'y'),
            onChange: val => {},
        });
    }

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const handleChangeLineColor = (color: Theme) => {
        if (selected && graph.current.hasEdge(selected)) {
            graph.current.mergeEdgeAttributes(selected, { color });
            dispatch(setRefresh());
            dispatch(saveGraph(JSON.stringify(graph.current.export())));
        }
    };
    if (graph.current.hasEdge(selected)) {
        fields.push({
            type: 'custom',
            label: t('color'),
            component: (
                <ThemeButton
                    theme={graph.current.getEdgeAttribute(selected, 'color')}
                    onClick={() => setIsModalOpen(true)}
                />
            ),
            minW: '40px',
        });
        const type = graph.current.getEdgeAttribute(selected, 'type');
        const attrs = graph.current.getEdgeAttribute(selected, type);
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
                            graph.current.mergeEdgeAttributes(selected, {
                                // TODO: fix this
                                // @ts-ignore-error
                                [type]: field.onChange(val, attrs),
                            });
                            dispatch(setRefresh());
                            dispatch(saveGraph(JSON.stringify(graph.current.export())));
                        },
                    } as RmgFieldsField)
            )
        );
    }

    return (
        <Flex direction="column" height="100%" width={300} overflow="hidden">
            <RmgSidePanelHeader onClose={handleClose}>{t('panel.details.header')}</RmgSidePanelHeader>
            <RmgSidePanelBody>
                <RmgFields fields={fields} minW={300} />

                <ColourModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={nextTheme => handleChangeLineColor(nextTheme)}
                />
            </RmgSidePanelBody>
            <RmgSidePanelFooter>
                <HStack>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(selected, graph.current.hasNode(selected) ? 'node' : 'line')}
                    >
                        {t('panel.details.footer.remove')}
                    </Button>
                </HStack>
            </RmgSidePanelFooter>
        </Flex>
    );
};

export default DetailsPanel;
