import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import { Button, Flex, Heading, VStack } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/app/app-slice';
import { setRefresh } from '../../../redux/runtime/runtime-slice';
import InterchangeCard from './interchange-card';
import { InterchangeInfo, StationAttributes } from '../../../constants/stations';

export default function InterchangeSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { refresh } = useRootSelector(state => state.runtime);
    const selected = useRootSelector(state => state.runtime.selected).at(0);
    const graph = React.useRef(window.graph);

    const [type, setType] = React.useState(graph.current.getNodeAttribute(selected, 'type'));
    React.useEffect(() => setType(graph.current.getNodeAttribute(selected, 'type')), [refresh]);
    const [attr, setAttr] = React.useState(graph.current.getNodeAttribute(selected, type) as StationAttributes);
    React.useEffect(() => setAttr(graph.current.getNodeAttribute(selected, type) as StationAttributes), [refresh]);

    const handleAdd = (setIndex: number) => (interchangeInfo: InterchangeInfo) => {
        const { transfer } = attr;

        const newTransferInfo = transfer.map(i => i.slice());
        if (newTransferInfo.length > setIndex) {
            newTransferInfo[setIndex].push(interchangeInfo);
        } else {
            for (let i = newTransferInfo.length; i < setIndex; i++) {
                newTransferInfo[i] = [];
            }
            newTransferInfo[setIndex] = [interchangeInfo];
        }

        attr.transfer = newTransferInfo;
        graph.current.mergeNodeAttributes(selected, { [type]: attr });
        dispatch(setRefresh());
        dispatch(saveGraph(JSON.stringify(graph.current.export())));
    };

    const handleDelete = (setIndex: number) => (interchangeIndex: number) => {
        const { transfer } = attr;

        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex ? set.filter((_, intIdx) => intIdx !== interchangeIndex) : set
            );

            attr.transfer = newTransferInfo;
            graph.current.mergeNodeAttributes(selected, { [type]: attr });
            dispatch(setRefresh());
            dispatch(saveGraph(JSON.stringify(graph.current.export())));
        }
    };

    const handleUpdate = (setIndex: number) => (interchangeIndex: number, interchangeInfo: InterchangeInfo) => {
        const { transfer } = attr;

        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex
                    ? set.map((int, intIdx) =>
                          intIdx === interchangeIndex
                              ? ([0, 1, 2, 3, 4, 5].map(i =>
                                    interchangeInfo[i] === undefined ? int[i] : interchangeInfo[i]
                                ) as InterchangeInfo)
                              : int
                      )
                    : set
            );

            attr.transfer = newTransferInfo;
            graph.current.mergeNodeAttributes(selected, { [type]: attr });
            dispatch(setRefresh());
            dispatch(saveGraph(JSON.stringify(graph.current.export())));
        }
    };

    const handleAddInterchangeGroup = () =>
        handleAdd(attr.transfer.length)([CityCode.Shanghai, '', '#AAAAAA', MonoColour.white, '', '']);

    return (
        <VStack align="flex-start" p={1}>
            <Flex w="100%">
                <Heading as="h5" size="sm" mr="auto">
                    {t('panel.details.station.interchange.title')}
                </Heading>
            </Flex>

            {attr.transfer.map((infoList, i) => (
                <Fragment key={i}>
                    <Heading as="h6" size="xs">
                        {i === 0
                            ? t('panel.details.station.interchange.within')
                            : i === 1
                            ? t('panel.details.station.interchange.outStation')
                            : t('panel.details.station.interchange.outSystem')}
                    </Heading>

                    <InterchangeCard
                        interchangeList={infoList}
                        onAdd={handleAdd(i)}
                        onDelete={handleDelete(i)}
                        onUpdate={handleUpdate(i)}
                    />
                </Fragment>
            ))}

            {attr.transfer.length < 3 && (
                <Button
                    size="xs"
                    variant="ghost"
                    alignSelf="flex-end"
                    leftIcon={<MdAdd />}
                    onClick={handleAddInterchangeGroup}
                >
                    {t('panel.details.station.interchange.addGroup')}
                </Button>
            )}
        </VStack>
    );
}
