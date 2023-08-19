import {
    Badge,
    Box,
    Button,
    Icon,
    Kbd,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    StackDivider,
    Switch,
    SystemStyleObject,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useColorModeValue,
    VStack,
} from '@chakra-ui/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowBack, MdArrowDownward, MdArrowForward, MdArrowUpward, MdOpenInNew, MdReadMore } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setTelemetryApp } from '../../redux/app/app-slice';
import { setKeepLastPath } from '../../redux/runtime/runtime-slice';
import { isMacClient } from '../../util/helpers';
import {
    ChangeTypeModal,
    RemoveLinesWithSingleColorModal,
    ScaleNodesModal,
    TranslateNodesModal,
    UnlockSimplePathModal,
} from './procedures-modal';

const procedureButtonStyle: SystemStyleObject = {
    width: '100%',
    justifyContent: 'space-between',
};

const macKeyStyle: SystemStyleObject = {
    fontFamily: '-apple-system',
};

const SettingsModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { keepLastPath } = useRootSelector(state => state.runtime);
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const [isTranslateNodesOpen, setIsTranslateNodesOpen] = React.useState(false);
    const [isScaleNodesOpen, setIsScaleNodesOpen] = React.useState(false);
    const [isChangeTypeOpen, setIsChangeTypeOpen] = React.useState(false);
    const [isRemoveLinesWithSingleColorOpen, setIsRemoveLinesWithSingleColorOpen] = React.useState(false);
    const [isUnlockSimplePathOpen, setIsUnlockSimplePathOpen] = React.useState(false);

    const isAllowAnalytics = rmgRuntime.isAllowAnalytics();
    const {
        telemetry: { app: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);
    const handleAdditionalTelemetry = (allowAppTelemetry: boolean) => dispatch(setTelemetryApp(allowAppTelemetry));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" trapFocus={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack divider={<StackDivider borderColor="gray.200" />}>
                        <Box width="100%" mb="3">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.preference.title')}
                            </Text>
                            <Box mt="3">
                                <Box display="flex" mb="1">
                                    <Text flex="1">{t('header.settings.preference.keepLastPath')}</Text>
                                    <Switch
                                        isChecked={keepLastPath}
                                        onChange={({ target: { checked } }) => dispatch(setKeepLastPath(checked))}
                                    />
                                </Box>
                            </Box>
                        </Box>

                        <Box width="100%" mb="3">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.procedures.title')}
                            </Text>
                            <Box mt="3">
                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsTranslateNodesOpen(true)}
                                >
                                    {t('header.settings.procedures.translate.title')}
                                </Button>
                                <TranslateNodesModal
                                    isOpen={isTranslateNodesOpen}
                                    onClose={() => setIsTranslateNodesOpen(false)}
                                />

                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsScaleNodesOpen(true)}
                                >
                                    {t('header.settings.procedures.scale.title')}
                                </Button>
                                <ScaleNodesModal isOpen={isScaleNodesOpen} onClose={() => setIsScaleNodesOpen(false)} />

                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsChangeTypeOpen(true)}
                                >
                                    <Box>
                                        {t('header.settings.procedures.changeType.title')}
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
                                </Button>
                                <ChangeTypeModal isOpen={isChangeTypeOpen} onClose={() => setIsChangeTypeOpen(false)} />

                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsRemoveLinesWithSingleColorOpen(true)}
                                >
                                    {t('header.settings.procedures.removeLines.title')}
                                </Button>
                                <RemoveLinesWithSingleColorModal
                                    isOpen={isRemoveLinesWithSingleColorOpen}
                                    onClose={() => setIsRemoveLinesWithSingleColorOpen(false)}
                                />

                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsUnlockSimplePathOpen(true)}
                                >
                                    {t('header.settings.procedures.unlockSimplePath.title')}
                                </Button>
                                <UnlockSimplePathModal
                                    isOpen={isUnlockSimplePathOpen}
                                    onClose={() => setIsUnlockSimplePathOpen(false)}
                                />
                            </Box>
                        </Box>

                        <Box width="100%" mb="3">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.shortcuts.title')}
                            </Text>
                            <Box mt="3">
                                <Table>
                                    <Thead>
                                        <Tr>
                                            <Th>{t('header.settings.shortcuts.keys')}</Th>
                                            <Th>{t('header.settings.shortcuts.description')}</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        <Tr>
                                            <Td>
                                                <Kbd>f</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.f')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                <Box display="flex" flexDirection="row">
                                                    <MdArrowUpward />
                                                    <MdArrowBack />
                                                    <MdArrowForward />
                                                    <MdArrowDownward />
                                                </Box>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.arrows')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                <Box display="flex" flexDirection="row">
                                                    <Kbd>i</Kbd>
                                                    <Kbd>j</Kbd>
                                                    <Kbd>k</Kbd>
                                                    <Kbd>l</Kbd>
                                                </Box>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.ijkl')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#8679;</Kbd> : <Kbd>shift</Kbd>}
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.shift')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#8997;</Kbd> : <Kbd>alt</Kbd>}
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.alt')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#9003;</Kbd> : <Kbd>delete</Kbd>}
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.delete')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#8984;</Kbd> : <Kbd>ctrl</Kbd>}
                                                {' + '}
                                                <Kbd>z</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.undo')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? (
                                                    <>
                                                        <Kbd sx={macKeyStyle}>&#8679;</Kbd>
                                                        {' + '}
                                                        <Kbd sx={macKeyStyle}>&#8984;</Kbd>
                                                        {' + '}
                                                        <Kbd>z</Kbd>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Kbd>ctrl</Kbd> + <Kbd>y</Kbd>
                                                    </>
                                                )}
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.redo')}</Td>
                                        </Tr>
                                    </Tbody>
                                </Table>
                            </Box>
                        </Box>

                        <Box width="100%" mb="3">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.telemetry.title')}
                            </Text>
                            <Box mt="3">
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
