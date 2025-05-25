import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmOverwriteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * A shared dialog component for confirming overwrite of current project data.
 * Used when importing data from various sources that would replace the current graph.
 */
export default function ConfirmOverwriteDialog(props: ConfirmOverwriteDialogProps) {
    const { isOpen, onClose, onConfirm } = props;
    const { t } = useTranslation();
    const cancelRef = React.useRef<HTMLButtonElement | null>(null);

    return (
        <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        {t('header.open.confirmOverwrite.title')}
                    </AlertDialogHeader>
                    <AlertDialogBody>{t('header.open.confirmOverwrite.body')}</AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button colorScheme="red" onClick={onConfirm} ml={3}>
                            {t('header.open.confirmOverwrite.overwrite')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
    );
}
