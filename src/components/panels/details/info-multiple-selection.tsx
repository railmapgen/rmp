import { Box, Button, Heading, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StationAttributes } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { addSelected, clearSelected } from '../../../redux/runtime/runtime-slice';
import { ColorField } from './color-field';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LineStyleType } from '../../../constants/lines';
import { RmgFields } from '@railmapgen/rmg-components';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);

    const handleChange = (id: string) => {
        dispatch(clearSelected());
        dispatch(addSelected(id));
    };

    const getName = (id: string) => {
        if (id.startsWith('stn') || id.startsWith('misc_node')) {
            const attr = graph.current.getNodeAttributes(id);
            const type = attr.type;
            return id.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        } else if (id.startsWith('line')) {
            const [s, t] = graph.current.extremities(id);
            const source = graph.current.getSourceAttributes(id);
            const target = graph.current.getTargetAttributes(id);
            const sT = source.type;
            const tT = target.type;
            return (
                (s.startsWith('stn') ? (source[sT] as StationAttributes).names[0] : sT) +
                ' - ' +
                (t.startsWith('stn') ? (target[tT] as StationAttributes).names[0] : tT)
            );
        }
    };

    return (
        <Box>
            <Heading as="h5" size="sm">
                {t('panel.details.selected')} {selected.length}
            </Heading>
            <RmgFields
                fields={[
                    {
                        type: 'custom',
                        label: t("Change selected objects' color to:"),
                        component: (
                            <ColorField
                                type={LineStyleType.SingleColor}
                                defaultTheme={[CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white]}
                            />
                        ),
                        minW: 'full',
                    },
                ]}
            />
            <VStack m="var(--chakra-space-1)">
                {selected.map(id => {
                    return (
                        <Button
                            key={id}
                            width="100%"
                            size="sm"
                            variant="solid"
                            onClick={() => handleChange(id)}
                            overflow="hidden"
                            maxW="270"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                            display="ruby"
                        >
                            {getName(id)?.replaceAll('\\', '⏎')}
                        </Button>
                    );
                })}
            </VStack>
        </Box>
    );
}
