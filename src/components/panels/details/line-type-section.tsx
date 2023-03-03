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
import { setRefreshEdges } from '../../../redux/runtime/runtime-slice';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import { changeLinePathType, changeLineStyleType } from '../../../util/change-types';
import { LinePathType, LineStyleType } from '../../../constants/lines';

export default function LineTypeSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshEdges, saveGraph]);

    const { selected, theme } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);

    const availableLinePathOptions = Object.fromEntries(
        Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in LinePathType]: string };
    const [currentLinePathType, setCurrentLinePathType] = React.useState(
        graph.current.getEdgeAttribute(selectedFirst, 'type')
    );
    const [newLinePathType, setNewLinePathType] = React.useState<LinePathType | undefined>(undefined);

    const availableLineStyleOptions = Object.fromEntries(
        Object.entries(lineStyles).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in LineStyleType]: string };
    const [currentLineStyleType, setCurrentLineStyleType] = React.useState(
        graph.current.getEdgeAttribute(selectedFirst, 'style')
    );
    const [newLineStyleType, setNewLineStyleType] = React.useState<LineStyleType | undefined>(undefined);

    const disabledLinePathOptions = Object.values(LinePathType).filter(
        linePathType => !lineStyles[currentLineStyleType].metadata.supportLinePathType.includes(linePathType)
    );
    const disabledLineStyleOptions = Object.values(LineStyleType).filter(
        lineStyleType => !lineStyles[lineStyleType].metadata.supportLinePathType.includes(currentLinePathType)
    );

    const handleChangeLinePathType = () => {
        if (newLinePathType) {
            changeLinePathType(graph.current, selectedFirst!, newLinePathType);
            setCurrentLinePathType(graph.current.getEdgeAttribute(selectedFirst, 'type'));
            hardRefresh();
        }
    };
    const handleChangeLineStyleType = () => {
        if (newLineStyleType) {
            changeLineStyleType(graph.current, selectedFirst!, newLineStyleType, theme);
            setCurrentLineStyleType(graph.current.getEdgeAttribute(selectedFirst, 'style'));
            hardRefresh();
        }
    };
    const handleClose = (proceed: boolean) => {
        if (proceed) {
            if (newLinePathType) {
                handleChangeLinePathType();
                setNewLinePathType(undefined);
            } else if (newLineStyleType) {
                handleChangeLineStyleType();
                setNewLineStyleType(undefined);
            }
        }
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
                        setNewLinePathType(value as LinePathType);
                        setIsChangeTypeWarningOpen(true);
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
                        setNewLineStyleType(value as LineStyleType);
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
                        <AlertDialogBody>{t('panel.details.changeLineTypeContent')}</AlertDialogBody>
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
