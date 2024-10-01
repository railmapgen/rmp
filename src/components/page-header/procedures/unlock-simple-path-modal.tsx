import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Tooltip,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setUnlockSimplePath } from '../../../redux/app/app-slice';

export const UnlockSimplePathModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const {
        preference: { unlockSimplePathAttempts },
    } = useRootSelector(state => state.app);
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const { t } = useTranslation();

    const handleChange = () => {
        dispatch(setUnlockSimplePath(-1));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.unlockSimplePath.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content1')}</Text>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content2')}</Text>
                    <Text mb="2">{t('header.settings.procedures.unlockSimplePath.content3')}</Text>
                </ModalBody>

                <ModalFooter>
                    <Tooltip
                        label={t('header.settings.pro')}
                        isOpen={!activeSubscriptions.RMP_CLOUD && unlockSimplePathAttempts >= 0}
                    >
                        <Button
                            onClick={handleChange}
                            isDisabled={!activeSubscriptions.RMP_CLOUD || unlockSimplePathAttempts < 0}
                        >
                            {unlockSimplePathAttempts >= 0
                                ? t('header.settings.procedures.unlockSimplePath.check')
                                : t('header.settings.procedures.unlockSimplePath.unlocked')}
                        </Button>
                    </Tooltip>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
