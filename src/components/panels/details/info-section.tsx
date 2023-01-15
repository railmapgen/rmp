import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
    Box,
    Heading,
    Button,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefresh } from '../../../redux/runtime/runtime-slice';
import stations from '../../svgs/stations/stations';
import nodes from '../../svgs/nodes/misc-nodes';
import lines from '../../svgs/lines/lines';
import edges from '../../svgs/edges/misc-edges';
import { StationType } from '../../../constants/stations';
import { changeStationType } from '../../../util/change-types';

export default function InfoSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);

    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);
    const [newType, setNewType] = React.useState<StationType | undefined>(undefined);

    const currentType =
        selected.length === 1
            ? graph.current.hasNode(selectedFirst)
                ? graph.current.getNodeAttribute(selectedFirst, 'type')
                : graph.current.getEdgeAttribute(selectedFirst, 'type')
            : selected.length > 1
            ? 'multiple nodes'
            : 'undefined';
    const canSwitchStationType =
        selected.length === 1 && selectedFirst!.startsWith('stn') && graph.current.hasNode(selectedFirst);

    // type options for stations and others
    const availableStationOptions = Object.fromEntries(
        Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    );
    const nonChangeableOption = {
        [currentType]: t(
            {
                ...stations,
                ...nodes,
                ...lines,
                ...edges,
                'multiple nodes': { metadata: { displayName: 'panel.details.multipleSelection' } },
                undefined: { metadata: { displayName: 'undefined' } },
            }[currentType].metadata.displayName
        ).toString(),
    };

    const handleChangeStationType = () => {
        if (canSwitchStationType && newType) {
            changeStationType(graph.current, selectedFirst!, newType);
            hardRefresh();
        }
    };
    const handleClose = (proceed: boolean) => {
        if (proceed) handleChangeStationType();
        setNewType(undefined);
        setIsChangeTypeWarningOpen(false);
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.info.id'),
            value: selected.length > 0 ? selected.join(', ') : 'undefined',
            minW: 276,
        },
        {
            type: 'select',
            label: t('panel.details.info.type'),
            value: currentType,
            options: canSwitchStationType ? availableStationOptions : nonChangeableOption,
            onChange: canSwitchStationType
                ? val => {
                      setNewType(val as StationType);
                      setIsChangeTypeWarningOpen(true);
                  }
                : undefined,
            minW: 276,
        },
    ];

    return (
        <Box p={1}>
            <Heading as="h5" size="sm">
                {t('panel.details.info.title')}
            </Heading>

            <RmgFields fields={fields} minW={130} />

            <AlertDialog
                isOpen={isChangeTypeWarningOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => handleClose(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader>{t('warning')}</AlertDialogHeader>
                        <AlertDialogBody>{t('panel.details.changeStationTypeContent')}</AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => handleClose(false)}>
                                {t('cancel')}
                            </Button>
                            <Button ml="2" colorScheme="red" onClick={() => handleClose(true)}>
                                {t('panel.details.changeStationType')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}
