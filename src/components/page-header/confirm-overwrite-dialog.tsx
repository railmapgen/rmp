import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
    Text,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENT_VERSION } from '../../util/save';

interface ConfirmOverwriteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    saveVersion: number;
}

/**
 * A shared dialog component for confirming overwrite of current project data.
 * Used when importing data from various sources that would replace the current graph.
 */
export default function ConfirmOverwriteDialog(props: ConfirmOverwriteDialogProps) {
    const { isOpen, onClose, onConfirm, saveVersion } = props;
    const { t } = useTranslation();
    const cancelRef = React.useRef<HTMLButtonElement | null>(null);

    const isNewerVersion = saveVersion > CURRENT_VERSION;

    return (
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        {t('header.open.confirmOverwrite.title')}
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        {t('header.open.confirmOverwrite.body')}
                        {isNewerVersion && (
                            <Text mt={4} color="orange.500" fontWeight="semibold">
                                {t('header.open.confirmOverwrite.newerVersion', {
                                    saveVersion,
                                    currentVersion: CURRENT_VERSION,
                                })}
                            </Text>
                        )}
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button id="confirm_overwrite" colorScheme="red" onClick={onConfirm} ml={3}>
                            {t('header.open.confirmOverwrite.overwrite')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
    );
}
