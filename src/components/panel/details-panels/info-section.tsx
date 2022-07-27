import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../../redux';

export default function InfoSection() {
    const { t } = useTranslation();
    const selected = useRootSelector(state => state.runtime.selected).at(0);
    const graph = React.useRef(window.graph);

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.info.id'),
            value: selected ?? 'undefined',
            onChange: val => {},
        },
        {
            type: 'input',
            label: t('panel.details.info.type'),
            value: selected
                ? graph.current.hasNode(selected)
                    ? graph.current.getNodeAttribute(selected, 'type')
                    : graph.current.getEdgeAttribute(selected, 'type')
                : 'undefined',
            onChange: val => {},
        },
    ];

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />
        </Box>
    );
}
