import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
    Button,
} from '@chakra-ui/react';
import { RmgLabel, RmgSelect } from '@railmapgen/rmg-components';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { StationType } from '../../../constants/stations';
import stations from '../../svgs/stations/stations';
import { changeStationType } from '../../../util/change-types';

export default function StationTypeSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, saveGraph]);

    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);
    const [newType, setNewType] = React.useState<StationType | undefined>(undefined);

    const currentStationType = graph.current.getNodeAttribute(selectedFirst, 'type') as StationType;
    // type options for stations and others
    const availableStationOptions = Object.fromEntries(
        Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in StationType]: string };

    const handleChangeStationType = () => {
        if (newType) {
            changeStationType(graph.current, selectedFirst!, newType);
            hardRefresh();
        }
    };
    const handleClose = (proceed: boolean) => {
        if (proceed) handleChangeStationType();
        setNewType(undefined);
        setIsChangeTypeWarningOpen(false);
    };

    return (
        <>
            <RmgLabel label={t('panel.details.info.stationType')} minW="276">
                <RmgSelect
                    options={availableStationOptions}
                    disabledOptions={[currentStationType]}
                    value={currentStationType}
                    onChange={({ target: { value } }) => {
                        setNewType(value as StationType);
                        setIsChangeTypeWarningOpen(true);
                    }}
                />
            </RmgLabel>

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
                                {t('panel.details.changeType')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
}
