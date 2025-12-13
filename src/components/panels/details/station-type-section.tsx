import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
    Checkbox,
} from '@chakra-ui/react';
import { RmgLabel, RmgSelect } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StationType } from '../../../constants/stations';
import { StnId } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setDisableWarningChangeType } from '../../../redux/app/app-slice';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import { autoPopulateTransfer, changeStationType } from '../../../util/change-types';
import stations from '../../svgs/stations/stations';

export default function StationTypeSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
    }, [dispatch, refreshNodesThunk, saveGraph]);

    const {
        selected,
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);
    const {
        preference: { autoChangeStationType, disableWarning },
    } = useRootSelector(state => state.app);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);
    const [newType, setNewType] = React.useState<StationType | undefined>(undefined);
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const [currentStationType, setCurrentStationType] = React.useState<StationType>(StationType.ShmetroBasic);
    React.useEffect(() => {
        if (selectedFirst?.startsWith('stn')) {
            const type = graph.current.getNodeAttribute(selectedFirst, 'type') as StationType;
            setCurrentStationType(type);
        }
    }, [refreshNodes, selected]);
    // type options for stations and others
    const availableStationOptions = Object.fromEntries(
        Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in StationType]: string };

    const handleChangeStationType = (newType: StationType) => {
        if (newType) {
            changeStationType(graph.current, selectedFirst!, newType);
            if (autoChangeStationType && selectedFirst.startsWith('stn'))
                autoPopulateTransfer(graph.current, selectedFirst! as StnId);
            hardRefresh();
        }
    };
    const handleClose = (proceed: boolean) => {
        if (proceed && newType) {
            handleChangeStationType(newType);
            if (dontShowAgain) {
                dispatch(setDisableWarningChangeType(true));
            }
        }
        setNewType(undefined);
        setDontShowAgain(false);
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
                        if (!disableWarning.changeType) {
                            setNewType(value as StationType);
                            setIsChangeTypeWarningOpen(true);
                        } else {
                            handleChangeStationType(value as StationType);
                        }
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
                        <AlertDialogBody>
                            {t('panel.details.changeStationTypeContent')}
                            <Checkbox
                                mt={4}
                                isChecked={dontShowAgain}
                                onChange={e => setDontShowAgain(e.target.checked)}
                                width="100%"
                            >
                                {t('noShowAgain')}
                            </Checkbox>
                        </AlertDialogBody>
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
