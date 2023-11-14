import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Heading } from '@chakra-ui/react';
import { useRootSelector, useRootDispatch } from '../../../redux';
import { StationAttributes } from '../../../constants/stations';
import { addSelected, clearSelected } from '../../../redux/runtime/runtime-slice';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const handleChange = (node: string) => {
        dispatch(clearSelected());
        dispatch(addSelected(node));
    };

    const selectField = selected.map(node => {
        const attr = graph.current.getNodeAttributes(node);
        const type = attr.type;
        const value = node.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        return (
            <Button
                key={node}
                flex={1}
                size="sm"
                variant="solid"
                onClick={() => handleChange(node)}
                overflow="hidden"
                maxW="270"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                display="ruby"
            >
                {value}
            </Button>
        );
    });

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('Selected Objects')} ({selected.length})
            </Heading>
            {...selectField}
        </Box>
    );
}
