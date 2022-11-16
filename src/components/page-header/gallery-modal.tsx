import React from 'react';
import {
    Badge,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { RMPSave } from '../../util/save';
import RMP_Shanghai from '../../util/RMP_Shanghai.json';
import RMP_Beijing from '../../util/RMP_Beijing.json';
import RMP_Santiago from '../../util/RMP_Santiago.json';
import RMP_Guangzhou from '../../util/RMP_Guangzhou.json';

export const GalleryModal = (props: {
    isOpen: boolean;
    handleOpenTemplates: (rmpSave: RMPSave) => void;
    onClose: () => void;
}) => {
    const { isOpen, handleOpenTemplates, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.open.gallery')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack>
                        <Button
                            minWidth={200}
                            onClick={() => {
                                handleOpenTemplates(RMP_Shanghai as RMPSave);
                                onClose();
                            }}
                        >
                            {t('header.open.shanghai')}
                        </Button>
                        <Button
                            minWidth={200}
                            onClick={() => {
                                handleOpenTemplates(RMP_Guangzhou as RMPSave);
                                onClose();
                            }}
                        >
                            {t('header.open.guangzhou')}
                            <Badge ml="1" colorScheme="green">
                                New
                            </Badge>
                        </Button>
                        <Button
                            minWidth={200}
                            onClick={() => {
                                handleOpenTemplates(RMP_Beijing as RMPSave);
                                onClose();
                            }}
                        >
                            {t('header.open.beijing')}
                        </Button>
                        <Button
                            minWidth={200}
                            onClick={() => {
                                handleOpenTemplates(RMP_Santiago as RMPSave);
                                onClose();
                            }}
                        >
                            {t('header.open.santiago')}
                        </Button>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
