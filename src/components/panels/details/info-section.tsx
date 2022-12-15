import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootSelector } from '../../../redux';

export default function InfoSection() {
    const { t } = useTranslation();
    const { selected } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.info.id'),
            value: selected.length > 0 ? selected.join(', ') : 'undefined',
            minW: 276,
        },
        {
            type: 'input',
            label: t('panel.details.info.type'),
            value:
                selected.length === 1
                    ? graph.current.hasNode(selected.at(0))
                        ? graph.current.getNodeAttribute(selected.at(0), 'type')
                        : graph.current.getEdgeAttribute(selected.at(0), 'type')
                    : selected.length > 1
                    ? 'multiple nodes'
                    : 'undefined',
            minW: 276,
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
