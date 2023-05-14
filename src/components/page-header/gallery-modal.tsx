import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export const FRAME_ID = 'rmp:frame-rmp-gallery';

export const GalleryModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal size="full" isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.open.gallery')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <iframe
                        id={FRAME_ID}
                        src="/rmp-gallery/"
                        loading="lazy"
                        title="rmp-gallery"
                        width="100%"
                        height="100%"
                        style={{ display: 'initial' }}
                    />
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
