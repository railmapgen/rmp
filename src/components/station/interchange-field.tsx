import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import { Button, FormLabel, VStack } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { Theme } from '../../constants/constants';
import { StationAttributes, StationType } from '../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import InterchangeCard from './interchange-card';

/**
 * InterchangeInfo with theme, line code, station code.
 */
export type InterchangeInfo = [...Theme, ...string[]];

/**
 * A StationAttributes that have a transfer field.
 * Extend this interface if you want to use <InterchangeField>.
 */
interface StationAttributesWithInterchange extends StationAttributes {
    transfer: InterchangeInfo[][];
}

/**
 * This component provides an easy way to modify interchanges in the details panel.
 * It will read the first id in `selected` and change the `transfer` field in the related attrs.
 *
 * Make sure your station has a transfer field in the extended StationAttributes. (a.k.a extends StationAttributesWithInterchange)
 * Fail to do this will result in a redundant transfer field in your StationAttributes.
 */
export const InterchangeField = (props: {
    stationType: StationType;
    defaultAttrs: StationAttributesWithInterchange;
}) => {
    const { stationType, defaultAttrs } = props;

    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);
    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const attr =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === stationType
            ? (graph.current.getNodeAttribute(selectedFirst, stationType) as StationAttributesWithInterchange)
            : defaultAttrs;
    const transfer = attr.transfer ?? defaultAttrs.transfer;

    const handleAdd = (setIndex: number) => (interchangeInfo: InterchangeInfo) => {
        const newTransferInfo: InterchangeInfo[][] = JSON.parse(JSON.stringify(transfer));
        if (newTransferInfo.length <= setIndex) {
            for (let i = newTransferInfo.length; i <= setIndex; i++) {
                newTransferInfo[i] = [];
            }
        }
        newTransferInfo[setIndex].push(interchangeInfo);

        attr.transfer = newTransferInfo;
        graph.current.mergeNodeAttributes(selected, { [stationType]: attr });
        hardRefresh();
    };

    const handleDelete = (setIndex: number) => (interchangeIndex: number) => {
        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex ? set.filter((_, intIdx) => intIdx !== interchangeIndex) : set
            );

            attr.transfer = newTransferInfo;
            graph.current.mergeNodeAttributes(selected, { [stationType]: attr });
            hardRefresh();
        }
    };

    const handleUpdate = (setIndex: number) => (interchangeIndex: number, interchangeInfo: InterchangeInfo) => {
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
            graph.current.mergeNodeAttributes(selected, { [stationType]: attr });
            hardRefresh();
        }
    };

    const handleAddInterchangeGroup = () =>
        handleAdd(attr.transfer.length)([CityCode.Guangzhou, '', '#AAAAAA', MonoColour.white, '', '']);

    return (
        <VStack align="flex-start">
            {attr.transfer.map((infoList, i) => (
                <Fragment key={i}>
                    <FormLabel size="xs">
                        {i === 0
                            ? t('panel.details.station.interchange.within')
                            : i === 1
                            ? t('panel.details.station.interchange.outStation')
                            : t('panel.details.station.interchange.outSystem')}
                    </FormLabel>

                    <InterchangeCard
                        interchangeList={infoList}
                        onAdd={handleAdd(i)}
                        onDelete={handleDelete(i)}
                        onUpdate={handleUpdate(i)}
                    />
                </Fragment>
            ))}

            {attr.transfer.length < 2 && (
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
};
