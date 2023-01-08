import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Icon,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    StackDivider,
    Switch,
    Text,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react';
import { MdOpenInNew } from 'react-icons/md';
import { useRootSelector, useRootDispatch } from '../../redux';
import { setTelemetryApp } from '../../redux/app/app-slice';

const SettingsModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const isAllowAnalytics = rmgRuntime.isAllowAnalytics();

    const {
        telemetry: { app: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);
    const handleAdditionalTelemetry = (allowAppTelemetry: boolean) => dispatch(setTelemetryApp(allowAppTelemetry));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack divider={<StackDivider borderColor="gray.200" />}>
                        <Box width="100%">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.telemetry.title')}
                            </Text>
                            <Box mt="3" mb="3">
                                <Box display="flex" mb="1">
                                    <Text flex="1">{t('header.settings.telemetry.essential')}</Text>
                                    <Switch isChecked={isAllowAnalytics} isDisabled />
                                </Box>
                                <Text fontSize="sm" lineHeight="100%" color="gray.600">
                                    {t('header.settings.telemetry.essentialInfo')}
                                </Text>
                                <Link
                                    color={linkColour}
                                    fontSize="sm"
                                    lineHeight="100%"
                                    href="https://support.google.com/analytics/answer/11593727"
                                    isExternal={true}
                                >
                                    {t('header.settings.telemetry.essentialLink')} <Icon as={MdOpenInNew} />
                                </Link>
                            </Box>
                            <Box mb="3">
                                <Box display="flex" mb="1">
                                    <Text flex="1">{t('header.settings.telemetry.additional')}</Text>
                                    <Switch
                                        isChecked={isAllowAppTelemetry}
                                        onChange={({ target: { checked } }) => handleAdditionalTelemetry(checked)}
                                    />
                                </Box>
                                <Text fontSize="sm" lineHeight="100%" color="gray.600">
                                    {t('header.settings.telemetry.additionalInfo')}
                                </Text>
                            </Box>
                        </Box>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default SettingsModal;
