import React from 'react';
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
    Badge,
    Tooltip,
} from '@chakra-ui/react';
import { MdOpenInNew } from 'react-icons/md';
import { RmgSelect } from '@railmapgen/rmg-components';
import { StationType } from '../../constants/stations';
import { useRootSelector, useRootDispatch } from '../../redux';
import { setTelemetryApp } from '../../redux/app/app-slice';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import { saveGraph } from '../../redux/param/param-slice';
import stations from '../svgs/stations/stations';
import { changeStationsTypeInBatch } from '../../util/change-types';

const SettingsModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);
    const graph = React.useRef(window.graph);
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const availableStationOptions = Object.fromEntries(
        Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
    ) as { [k in StationType]: string };
    const [oldStnType, setOldStnType] = React.useState(Object.keys(stations).at(0)! as StationType);
    const [newStnType, setNewStnType] = React.useState(undefined as StationType | undefined);
    React.useEffect(() => {
        if (newStnType) {
            changeStationsTypeInBatch(graph.current, oldStnType, newStnType);
            hardRefresh();
        }
    }, [newStnType]);

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
                        <Box width="100%" mb="3">
                            <Box display="flex" alignItems="center">
                                <Text as="b" fontSize="xl">
                                    {t('header.settings.changeType.title')}
                                </Text>
                                <Tooltip label={t('header.settings.pro')}>
                                    <Badge
                                        ml="1"
                                        color="gray.50"
                                        background="radial-gradient(circle, #3f5efb, #fc466b)"
                                    >
                                        PRO
                                    </Badge>
                                </Tooltip>
                            </Box>
                            <Box mt="3">
                                <Text>{t('header.settings.changeType.changeFrom')}</Text>
                                <RmgSelect
                                    options={availableStationOptions}
                                    defaultValue={oldStnType}
                                    onChange={({ target: { value } }) => setOldStnType(value as StationType)}
                                />
                                <Text>{t('header.settings.changeType.changeTo')}</Text>
                                <RmgSelect
                                    options={availableStationOptions}
                                    disabledOptions={[oldStnType]}
                                    value={newStnType}
                                    onChange={({ target: { value } }) => setNewStnType(value as StationType)}
                                />
                                <Text fontSize="sm" mt="3" lineHeight="100%" color="red.500">
                                    {t('header.settings.changeType.info')}
                                </Text>
                            </Box>
                        </Box>
                        <Box width="100%" mb="3">
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
