import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Heading, Tooltip } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootSelector, useRootDispatch } from '../../../redux';
import { StationAttributes } from '../../../constants/stations';
import { addSelected, clearSelected } from '../../../redux/runtime/runtime-slice';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const selectField: RmgFieldsField[] = [];

    const handleChange = (node: string) => {
        dispatch(clearSelected());
        dispatch(addSelected(node));
    };

    if (selected.length > 1) {
        selected.forEach(node => {
            const value = node.startsWith('stn')
                ? (
                      graph.current.getNodeAttributes(node)[
                          graph.current.getNodeAttributes(node).type
                      ] as StationAttributes
                  ).names[0] +
                  '/' +
                  (
                      graph.current.getNodeAttributes(node)[
                          graph.current.getNodeAttributes(node).type
                      ] as StationAttributes
                  ).names[1]
                : graph.current.getNodeAttributes(node).type;
            selectField.push({
                type: 'custom',
                label: value,
                component: (
                    <Button flex={1} size="xs" variant="link" onClick={() => handleChange(node)}>
                        {node}
                    </Button>
                ),
            });
        });
    }

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('Selected Objects')} ({selected.length})
            </Heading>
            <RmgFields fields={selectField} minW={130} />
        </Box>
    );
}
