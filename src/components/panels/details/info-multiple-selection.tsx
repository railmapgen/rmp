import { Box, Button, Heading, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StationAttributes } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
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

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.selected')} {selected.length}
            </Heading>
            <VStack m="var(--chakra-space-1)">
                {selected.map(node => {
                    const attr = graph.current.getNodeAttributes(node);
                    const type = attr.type;
                    const value = node.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
                    return (
                        <Button
                            key={node}
                            width="100%"
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
                })}
            </VStack>
        </Box>
    );
}
