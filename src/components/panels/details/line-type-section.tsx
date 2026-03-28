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
import { LanguageCode } from '@railmapgen/rmg-translate';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setDisableWarningChangeType } from '../../../redux/app/app-slice';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../redux/runtime/runtime-slice';
import { changeLinePathType, changeLineStyleType } from '../../../util/change-types';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import { localizedLineStyles } from '../tools/localized-order';

const legacySimplePathAvailableStyles = new Set([
    LineStyleType.ShmetroVirtualInt,
    LineStyleType.GzmtrVirtualInt,
    LineStyleType.River,
    LineStyleType.MTRPaidArea,
    LineStyleType.MTRUnpaidArea,
    LineStyleType.MRTTapeOut,
]);

/**
 * Determine if a line path type or style type should be disabled based
 * on the current selection and subscription status.
 */
const isLinePathAndStyleDisabled = (pathType: LinePathType, styleType: LineStyleType, pro: boolean) => {
    // This must be placed first as the simple path is pro and all will be rejected in the next check.
    if (pathType === LinePathType.Simple && legacySimplePathAvailableStyles.has(styleType)) {
        return false;
    }
    if (linePaths[pathType].isPro && !pro) {
        return true;
    }
    if (lineStyles[styleType].isPro && !pro) {
        return true;
    }
    if (!lineStyles[styleType].metadata.supportLinePathType.includes(pathType)) {
        return true;
    }
    return false;
};

export default function LineTypeSection() {
    const { i18n, t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshEdgesThunk, saveGraph]);

    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        preference: { autoParallel, disableWarning },
    } = useRootSelector(state => state.app);
    const { selected, theme } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const availableLinePathOptions = Object.fromEntries(
        Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in LinePathType]: string };
    const [currentLinePathType, setCurrentLinePathType] = React.useState(
        graph.current.getEdgeAttribute(selectedFirst, 'type')
    );
    const [newLinePathType, setNewLinePathType] = React.useState<LinePathType | undefined>(undefined);

    const availableLineStyleOptions = Object.fromEntries(
        localizedLineStyles[i18n.language as LanguageCode]?.map(lineStyle => [
            lineStyle,
            t(lineStyles[lineStyle].metadata.displayName).toString(),
        ]) ?? []
    ) as { [k in LineStyleType]: string };
    const [currentLineStyleType, setCurrentLineStyleType] = React.useState(
        graph.current.getEdgeAttribute(selectedFirst, 'style')
    );
    const [newLineStyleType, setNewLineStyleType] = React.useState<LineStyleType | undefined>(undefined);

    React.useEffect(() => {
        setCurrentLinePathType(graph.current.getEdgeAttribute(selectedFirst, 'type'));
        setCurrentLineStyleType(graph.current.getEdgeAttribute(selectedFirst, 'style'));
    }, [selectedFirst]);

    const disabledLinePathOptions = Object.values(LinePathType).filter(linePathType =>
        isLinePathAndStyleDisabled(linePathType, currentLineStyleType, activeSubscriptions.RMP_CLOUD)
    );
    const disabledLineStyleOptions = Object.values(LineStyleType).filter(lineStyleType =>
        isLinePathAndStyleDisabled(currentLinePathType, lineStyleType, activeSubscriptions.RMP_CLOUD)
    );

    const handleChangeLinePathType = (newLinePathType: LinePathType) => {
        if (newLinePathType) {
            changeLinePathType(graph.current, selectedFirst!, newLinePathType, autoParallel);
            setCurrentLinePathType(graph.current.getEdgeAttribute(selectedFirst, 'type'));
            hardRefresh();
        }
    };
    const handleChangeLineStyleType = (newLineStyleType: LineStyleType) => {
        if (newLineStyleType) {
            changeLineStyleType(graph.current, selectedFirst!, newLineStyleType, theme);
            setCurrentLineStyleType(graph.current.getEdgeAttribute(selectedFirst, 'style'));
            hardRefresh();
        }
    };
    const handleClose = (proceed: boolean) => {
        if (proceed) {
            if (newLinePathType) {
                handleChangeLinePathType(newLinePathType);
                setNewLinePathType(undefined);
            } else if (newLineStyleType) {
                handleChangeLineStyleType(newLineStyleType);
                setNewLineStyleType(undefined);
            }
            if (dontShowAgain) {
                dispatch(setDisableWarningChangeType(true));
            }
        }
        setDontShowAgain(false);
        setIsChangeTypeWarningOpen(false);
    };

    return (
        <>
            <RmgLabel label={t('panel.details.info.linePathType')} minW="276">
                <RmgSelect
                    options={availableLinePathOptions}
                    disabledOptions={disabledLinePathOptions}
                    defaultValue={currentLinePathType}
                    value={currentLinePathType}
                    onChange={({ target: { value } }) => {
                        if (!disableWarning.changeType) {
                            setNewLinePathType(value as LinePathType);
                            setIsChangeTypeWarningOpen(true);
                        } else {
                            handleChangeLinePathType(value as LinePathType);
                        }
                    }}
                />
            </RmgLabel>
            <RmgLabel label={t('panel.details.info.lineStyleType')} minW="276">
                <RmgSelect
                    options={availableLineStyleOptions}
                    disabledOptions={disabledLineStyleOptions}
                    defaultValue={currentLineStyleType}
                    value={currentLineStyleType}
                    onChange={({ target: { value } }) => {
                        if (!disableWarning.changeType) {
                            setNewLineStyleType(value as LineStyleType);
                            setIsChangeTypeWarningOpen(true);
                        } else {
                            handleChangeLineStyleType(value as LineStyleType);
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
                            {t('panel.details.changeLineTypeContent')}
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
