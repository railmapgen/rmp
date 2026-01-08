import {
    Badge,
    Box,
    Button,
    HStack,
    Icon,
    Kbd,
    Link,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Select,
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
import { StationCity } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import {
    setAutoChangeStationType,
    setAutoParallel,
    setDisableWarningChangeType,
    setGridLines,
    setPredictNextNode,
    setRandomStationsNames,
    setSnapLines,
    setTelemetryProject,
} from '../../redux/app/app-slice';
import { setKeepLastPath } from '../../redux/runtime/runtime-slice';
import { isMacClient } from '../../util/helpers';
import { MAX_PARALLEL_LINES_FREE, MAX_PARALLEL_LINES_PRO } from '../../util/parallel';
import { MasterManager } from './master-manager';
import { ChangeTypeModal } from './procedures/change-type-modal';
import { RemoveLinesWithSingleColorModal } from './procedures/remove-lines-with-single-color-modal';
import { ScaleNodesModal } from './procedures/scale-nodes-modal';
import { TranslateNodesModal } from './procedures/translate-nodes-modal';
import { UpdateColorModal } from './procedures/update-color-modal';
import { StatusSection } from './status-section';

const procedureButtonStyle: SystemStyleObject = {
    width: '100%',
    justifyContent: 'space-between',
};

const macKeyStyle: SystemStyleObject = {
    fontFamily: '-apple-system',
};

const SettingsModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const {
        telemetry: { project: isAllowProjectTelemetry },
        preference: {
            autoParallel,
            randomStationsNames,
            gridLines,
            snapLines,
            predictNextNode,
            autoChangeStationType,
            disableWarning: { changeType: disableWarningChangeType },
        },
    } = useRootSelector(state => state.app);
    const {
        keepLastPath,
        count: { parallel: parallelLinesCount },
    } = useRootSelector(state => state.runtime);
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const linkColour = useColorModeValue('primary.500', 'primary.300');

    const [isTranslateNodesOpen, setIsTranslateNodesOpen] = React.useState(false);
    const [isScaleNodesOpen, setIsScaleNodesOpen] = React.useState(false);
    const [isChangeTypeOpen, setIsChangeTypeOpen] = React.useState(false);
    const [isRemoveLinesWithSingleColorOpen, setIsRemoveLinesWithSingleColorOpen] = React.useState(false);
    const [isUpdateColorOpen, setIsUpdateColorOpen] = React.useState(false);
    const [isManagerOpen, setIsManagerOpen] = React.useState(false);

    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();
    const handleAdditionalTelemetry = (allowTelemetry: boolean) => {
        dispatch(setTelemetryProject(allowTelemetry));
    };

    const maximumParallelLines = activeSubscriptions.RMP_CLOUD ? MAX_PARALLEL_LINES_PRO : MAX_PARALLEL_LINES_FREE;
    const isParallelLineDisabled = parallelLinesCount >= maximumParallelLines;
    const isRandomStationNamesDisabled = !activeSubscriptions.RMP_CLOUD;

    const handleRandomStationNamesChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch(setRandomStationsNames(event.target.value as 'none' | StationCity));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" trapFocus={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack divider={<StackDivider borderColor="gray.200" />}>
                        <StatusSection />
                        <Box width="100%" mb="3">
                            <Text as="b" fontSize="xl">
                                {t('header.settings.preference.title')}
                            </Text>
                            <VStack spacing="0" mt="3" align="stretch">
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.keepLastPath')}</Text>
                                    <Switch
                                        isChecked={keepLastPath}
                                        onChange={({ target: { checked } }) => dispatch(setKeepLastPath(checked))}
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text>{t('header.settings.preference.autoParallel')}</Text>
                                    <Badge ml="auto" colorScheme="green">
                                        New
                                    </Badge>
                                    <Tooltip label={t('header.settings.proWithTrial')}>
                                        <Badge
                                            ml="1"
                                            color="gray.50"
                                            background="radial-gradient(circle, #3f5efb, #fc466b)"
                                        >
                                            PRO
                                        </Badge>
                                    </Tooltip>
                                    <Switch
                                        ml="1"
                                        isDisabled={isParallelLineDisabled}
                                        isChecked={autoParallel}
                                        onChange={({ target: { checked } }) => dispatch(setAutoParallel(checked))}
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.randomStationNames.title')}</Text>
                                    <Badge ml="auto" colorScheme="green">
                                        New
                                    </Badge>
                                    <Tooltip label={t('header.settings.pro')}>
                                        <Badge
                                            color="gray.50"
                                            ml="1"
                                            background="radial-gradient(circle, #3f5efb, #fc466b)"
                                        >
                                            PRO
                                        </Badge>
                                    </Tooltip>
                                    <Select
                                        size="xs"
                                        width="auto"
                                        ml="1"
                                        value={randomStationsNames}
                                        onChange={handleRandomStationNamesChange}
                                    >
                                        <option value="none">
                                            {t('header.settings.preference.randomStationNames.none')}
                                        </option>
                                        <option value={StationCity.Shmetro} disabled={isRandomStationNamesDisabled}>
                                            {t(`header.settings.preference.randomStationNames.${StationCity.Shmetro}`)}
                                        </option>
                                        <option value={StationCity.Bjsubway} disabled={isRandomStationNamesDisabled}>
                                            {t(`header.settings.preference.randomStationNames.${StationCity.Bjsubway}`)}
                                        </option>
                                    </Select>
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.gridline')}</Text>
                                    <Switch
                                        isChecked={gridLines}
                                        onChange={({ target: { checked } }) => dispatch(setGridLines(checked))}
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.snapline')}</Text>
                                    <Switch
                                        isChecked={snapLines}
                                        onChange={({ target: { checked } }) => dispatch(setSnapLines(checked))}
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.predictNextNode')}</Text>
                                    <Switch
                                        isChecked={predictNextNode}
                                        onChange={({ target: { checked } }) => dispatch(setPredictNextNode(checked))}
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.autoChangeStationType')}</Text>
                                    <Switch
                                        isChecked={autoChangeStationType}
                                        onChange={({ target: { checked } }) =>
                                            dispatch(setAutoChangeStationType(checked))
                                        }
                                    />
                                </HStack>
                                <HStack mb="1">
                                    <Text flex="1">{t('header.settings.preference.disableWarningChangeType')}</Text>
                                    <Switch
                                        isChecked={disableWarningChangeType}
                                        onChange={({ target: { checked } }) =>
                                            dispatch(setDisableWarningChangeType(checked))
                                        }
                                    />
                                </HStack>
                            </VStack>
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
                                    {t('header.settings.procedures.changeType.title')}
                                    <Tooltip label={t('header.settings.pro')}>
                                        <Badge
                                            ml="1"
                                            color="gray.50"
                                            background="radial-gradient(circle, #3f5efb, #fc466b)"
                                            mr="auto"
                                        >
                                            PRO
                                        </Badge>
                                    </Tooltip>
                                </Button>
                                <ChangeTypeModal
                                    isOpen={isChangeTypeOpen}
                                    onClose={() => setIsChangeTypeOpen(false)}
                                    isSelect={false}
                                />

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
                                    onClick={() => setIsUpdateColorOpen(true)}
                                >
                                    {t('header.settings.procedures.updateColor.title')}
                                </Button>
                                <UpdateColorModal
                                    isOpen={isUpdateColorOpen}
                                    onClose={() => setIsUpdateColorOpen(false)}
                                />

                                <Button
                                    sx={procedureButtonStyle}
                                    rightIcon={<MdReadMore />}
                                    onClick={() => setIsManagerOpen(true)}
                                >
                                    {t('header.settings.procedures.masterManager.title')}
                                </Button>
                                <MasterManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
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
                                                <Kbd>s</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.s')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                <Kbd>c</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.c')}</Td>
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
                                                <Kbd>x</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.cut')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#8984;</Kbd> : <Kbd>ctrl</Kbd>}
                                                {' + '}
                                                <Kbd>c</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.copy')}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>
                                                {isMacClient ? <Kbd sx={macKeyStyle}>&#8984;</Kbd> : <Kbd>ctrl</Kbd>}
                                                {' + '}
                                                <Kbd>v</Kbd>
                                            </Td>
                                            <Td>{t('header.settings.shortcuts.paste')}</Td>
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
                                <Text fontSize="sm" lineHeight="100%" color="gray.600">
                                    {t('header.settings.telemetry.info')}
                                </Text>

                                <Box mt="3" mb="1">
                                    <Box display="flex" mb="1">
                                        <Text flex="1">{t('header.settings.telemetry.essential')}</Text>
                                        <Tooltip label={t('header.settings.telemetry.essentialTooltip')}>
                                            <Switch isChecked={isAllowAppTelemetry} isDisabled />
                                        </Tooltip>
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

                                <Box mt="1" mb="1">
                                    <Box display="flex">
                                        <Text flex="1">{t('header.settings.telemetry.additional')}</Text>
                                        <Switch
                                            isChecked={isAllowProjectTelemetry}
                                            onChange={({ target: { checked } }) => handleAdditionalTelemetry(checked)}
                                        />
                                    </Box>
                                    <Text fontSize="sm" lineHeight="100%" color="gray.600">
                                        {t('header.settings.telemetry.additionalInfo')}
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default SettingsModal;
