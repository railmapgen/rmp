import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootSelector } from '../../../redux';
import StationTypeSection from './station-type-section';
import LineTypeSection from './line-type-section';

export default function InfoSection() {
    const { t } = useTranslation();

    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.info.id'),
            value: selected.length > 0 ? selected.join(', ') : 'undefined',
            minW: 276,
        },
    ];

    // deal with undefined and multiple selection
    if (selected.length === 0) {
        // do nothing as the details panel will be closed
    } else if (selected.length > 1) {
        fields.push({
            type: 'input',
            label: t('panel.details.info.type'),
            value: 'multiple selection',
            minW: 276,
        });
    }

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />

            {selected.length === 1 && selectedFirst!.startsWith('stn') && graph.current.hasNode(selectedFirst) && (
                <StationTypeSection />
            )}

            {selected.length === 1 && selectedFirst!.startsWith('line') && graph.current.hasEdge(selectedFirst) && (
                <LineTypeSection />
            )}
        </Box>
    );
}
