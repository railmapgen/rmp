import { Badge, Box, Button, Divider, HStack, Heading, Tooltip, VStack } from '@chakra-ui/react';
import { RmgButtonGroup } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDeselect } from 'react-icons/md';
import { StationAttributes } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { removeSelected, setSelected } from '../../../redux/runtime/runtime-slice';
import { ChangeTypeModal, FilterType } from '../../page-header/procedures/change-type-modal';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);

    const graph = React.useRef(window.graph);

    const getName = (id: string) => {
        if (graph.current.hasNode(id)) {
            const attr = graph.current.getNodeAttributes(id);
            const type = attr.type;
            return id.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        } else if (graph.current.hasEdge(id)) {
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

    const [filter, setFilter] = React.useState<FilterType[]>([]);
    React.useEffect(() => {
        setFilter(['station', 'misc-node', 'line']);
    }, [selected]);

    const [isOpenChangeModal, setIsOpenChangeModal] = React.useState(false);

    return (
        <Box>
            <Heading as="h5" size="sm">
                {t('panel.details.multipleSelection.selected')} {selected.size}
            </Heading>
            <VStack m="var(--chakra-space-1)">
                <HStack w="100%">
                    <Heading as="h5" size="xs" w="100%">
                        {t('panel.details.multipleSelection.show')}
                    </Heading>
                    <RmgButtonGroup
                        selections={[
                            {
                                label: t('panel.details.multipleSelection.station'),
                                value: 'station',
                            },
                            {
                                label: t('panel.details.multipleSelection.miscNode'),
                                value: 'misc-node',
                            },
                            {
                                label: t('panel.details.multipleSelection.edge'),
                                value: 'line',
                            },
                        ]}
                        defaultValue={filter}
                        multiSelect={true}
                        onChange={value => setFilter(value as FilterType[])}
                    />
                </HStack>
                {filter.length !== 0 && (
                    <>
                        <Button width="100%" size="sm" onClick={() => setIsOpenChangeModal(true)}>
                            {t('panel.details.multipleSelection.change')}
                            <Tooltip label={t('header.settings.pro')}>
                                <Badge ml="1" color="gray.50" background="radial-gradient(circle, #3f5efb, #fc466b)">
                                    PRO
                                </Badge>
                            </Tooltip>
                        </Button>
                        <Divider />
                    </>
                )}
                {[...selected]
                    .filter(id => filter.includes('station') || !id.startsWith('stn'))
                    .filter(id => filter.includes('misc-node') || !id.startsWith('misc'))
                    .filter(id => filter.includes('line') || !id.startsWith('line'))
                    .map(id => (
                        <HStack key={id} width="100%">
                            <Button
                                width="100%"
                                size="sm"
                                variant="solid"
                                onClick={() => dispatch(setSelected(new Set([id])))}
                                overflow="hidden"
                                textOverflow="ellipsis"
                                whiteSpace="nowrap"
                                display="ruby"
                            >
                                {getName(id)?.replaceAll('\\', '⏎')}
                            </Button>
                            <Button size="sm" onClick={() => dispatch(removeSelected(id))}>
                                <MdDeselect />
                            </Button>
                        </HStack>
                    ))}
            </VStack>
            <ChangeTypeModal
                isOpen={isOpenChangeModal}
                onClose={() => setIsOpenChangeModal(false)}
                isSelect={true}
                filter={filter}
            />
        </Box>
    );
}
