import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
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
import { RmgAutoComplete, RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CityCode, LineId, MiscNodeId, NodeId, StnId, Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType, isVisibleLineStyle } from '../../../constants/lines';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
import {
    changeLinePathTypeInBatch,
    changeLineStyleTypeInBatch,
    changeLinesColorInBatch,
    changeNodesColorInBatch,
    changeStationsTypeInBatch,
    changeZIndexInBatch,
    checkAndChangeStationIntType,
} from '../../../util/change-types';
import { findThemes } from '../../../util/color';
import { usePaletteTheme } from '../../../util/hooks';
import { canUseLine } from '../../../util/line-path-availability';
import ThemeButton from '../../panels/theme-button';
import { linePaths, lineStyles, normalizeEdgeAttributes } from '../../svgs/lines/lines';
import stations from '../../svgs/stations/stations';

export type FilterType = 'station' | 'misc-node' | 'line';

interface ChangeTypeField {
    id: string;
    title: string;
    onClose: () => void;
    field: RmgFieldsField[];
}

interface ChangeTypeTheme {
    id: string;
    theme: Theme;
    value: string;
}

export const ChangeTypeModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    isSelect: boolean;
    filter?: FilterType[];
}) => {
    const { isOpen, onClose, isSelect, filter } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const mapEnabled = useRootSelector(state => state.param.present.mapEnabled);
    const {
        preference: { autoParallel, autoChangeStationType },
    } = useRootSelector(state => state.app);
    const { activeSubscriptions } = useRootSelector(state => state.account);

    const graph = React.useRef(window.graph);

    const allLinePathOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as Record<LinePathType, string>),
    };
    const targetLinePathOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as Record<LinePathType, string>),
    };
    const availableLineStyleOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.values(LineStyleType)
                .filter(isVisibleLineStyle)
                .map(lineStyleType => [lineStyleType, t(lineStyles[lineStyleType].metadata.displayName).toString()])
        ) as Partial<Record<LineStyleType, string>>),
    };
    const availableStationOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in StationType]: string }),
    };
    const defaultNewLinePathType =
        Object.values(LinePathType).find(type =>
            canUseLine(type, LineStyleType.SingleColor, mapEnabled, activeSubscriptions.RMP_CLOUD)
        ) ?? LinePathType.Diagonal;
    const disabledTargetLinePathOptions = Object.values(LinePathType).filter(
        type => !canUseLine(type, LineStyleType.SingleColor, mapEnabled, activeSubscriptions.RMP_CLOUD)
    );
    const disabledTargetLineStyleOptions = Object.values(LineStyleType).filter(
        style => !canUseLine(defaultNewLinePathType, style, mapEnabled, activeSubscriptions.RMP_CLOUD)
    );

    const defaultSelectedTheme: ChangeTypeTheme = {
        id: 'any',
        theme: [CityCode.Other, 'other', '#ffffff', MonoColour.black],
        value: t('header.settings.procedures.changeType.any'),
    };

    const [isZIndexSwitch, setIsZIndexSwitch] = React.useState(false);
    const [zIndex, setZIndex] = React.useState(0);
    const [isStationTypeSwitch, setIsStationTypeSwitch] = React.useState(false);
    const [currentStationType, setCurrentStationType] = React.useState<StationType | 'any'>('any');
    const [newStationType, setNewStationType] = React.useState(StationType.ShmetroBasic);
    const [isLineStyleTypeSwitch, setIsLineStyleTypeSwitch] = React.useState(false);
    const [currentLineStyleType, setCurrentLineStyleType] = React.useState<LineStyleType | 'any'>('any');
    const [newLineStyleType, setNewLineStyleType] = React.useState(LineStyleType.SingleColor);
    const [isLinePathTypeSwitch, setIsLinePathTypeSwitch] = React.useState(false);
    const [currentLinePathType, setCurrentLinePathType] = React.useState<LinePathType | 'any'>('any');
    const [newLinePathType, setNewLinePathType] = React.useState(defaultNewLinePathType);
    const [isColorSwitch, setIsColorSwitch] = React.useState(false);
    const [selectedColor, setSelectedColor] = React.useState(defaultSelectedTheme);

    const { theme: newTheme, requestThemeChange } = usePaletteTheme();
    const [themeList, setThemeList] = React.useState<ChangeTypeTheme[]>([]);

    const changeTypeField: ChangeTypeField[] = [
        {
            id: 'changeZIndex',
            title: t('header.settings.procedures.changeZIndex'),
            onClose: () => setIsZIndexSwitch(!isZIndexSwitch),
            field: [
                {
                    type: 'select',
                    label: t('panel.details.info.zIndex'),
                    value: zIndex,
                    options: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i - 10, (i - 10).toString()])),
                    onChange: val => setZIndex(Number(val)),
                },
            ],
        },
        {
            id: 'changeStationType',
            title: t('header.settings.procedures.changeStationType.title'),
            onClose: () => setIsStationTypeSwitch(!isStationTypeSwitch),
            field: [
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeStationType.changeFrom'),
                    options: availableStationOptions,
                    value: currentStationType,
                    disabledOptions: [newStationType],
                    onChange: value => setCurrentStationType(value as StationType | 'any'),
                },
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeStationType.changeTo'),
                    options: availableStationOptions,
                    value: newStationType,
                    disabledOptions: ['any', currentStationType],
                    onChange: value => setNewStationType(value as StationType),
                },
            ],
        },
        {
            id: 'changeLineStyleType',
            title: t('header.settings.procedures.changeLineStyleType.title'),
            onClose: () => setIsLineStyleTypeSwitch(!isLineStyleTypeSwitch),
            field: [
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeLineStyleType.changeFrom'),
                    options: availableLineStyleOptions,
                    value: currentLineStyleType,
                    disabledOptions: [newLineStyleType],
                    onChange: value => setCurrentLineStyleType(value as LineStyleType | 'any'),
                },
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeLineStyleType.changeTo'),
                    options: availableLineStyleOptions,
                    value: newLineStyleType,
                    disabledOptions: ['any', currentLineStyleType, ...disabledTargetLineStyleOptions],
                    onChange: value => setNewLineStyleType(value as LineStyleType),
                },
            ],
        },
        {
            id: 'changeLinePathType',
            title: t('header.settings.procedures.changeLinePathType.title'),
            onClose: () => setIsLinePathTypeSwitch(!isLinePathTypeSwitch),
            field: [
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeLinePathType.changeFrom'),
                    options: allLinePathOptions,
                    value: currentLinePathType,
                    disabledOptions: [newLinePathType],
                    onChange: value => setCurrentLinePathType(value as LinePathType | 'any'),
                },
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeLinePathType.changeTo'),
                    options: targetLinePathOptions,
                    value: newLinePathType,
                    disabledOptions: ['any', currentLinePathType, ...disabledTargetLinePathOptions],
                    onChange: value => setNewLinePathType(value as LinePathType),
                },
            ],
        },
        {
            id: 'changeColor',
            title: t('header.settings.procedures.changeColor.title'),
            onClose: () => setIsColorSwitch(!isColorSwitch),
            field: [
                {
                    type: 'custom',
                    label: t('header.settings.procedures.changeColor.changeFrom'),
                    component: (
                        <RmgAutoComplete
                            data={themeList}
                            displayHandler={item => (
                                <RmgLineBadge
                                    name={item.value}
                                    fg={item.theme[3]}
                                    bg={item.theme[2]}
                                    title={item.theme[1]}
                                    sx={{
                                        display: 'inline-block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                />
                            )}
                            filter={(query, item) =>
                                item.id.toLowerCase().includes(query.toLowerCase()) ||
                                Object.values(item.id).some(name => name.toLowerCase().includes(query.toLowerCase()))
                            }
                            value={selectedColor.value}
                            onChange={item => setSelectedColor(item)}
                        />
                    ),
                },
                {
                    type: 'custom',
                    label: t('header.settings.procedures.changeColor.changeTo'),
                    component: <ThemeButton theme={newTheme} onClick={requestThemeChange} />,
                },
            ],
        },
    ];

    React.useEffect(() => {
        if (isOpen) {
            setIsZIndexSwitch(false);
            setIsStationTypeSwitch(false);
            setIsLineStyleTypeSwitch(false);
            setIsLinePathTypeSwitch(false);
            setCurrentLinePathType('any');
            setNewLinePathType(defaultNewLinePathType);
            setIsColorSwitch(false);
            setZIndex(0);
            setThemeList([
                defaultSelectedTheme,
                ...findThemes(
                    graph.current,
                    (isSelect
                        ? [...selected].filter(id => id.startsWith('stn') || id.startsWith('misc_node'))
                        : graph.current.nodes()) as NodeId[],
                    (isSelect ? [...selected].filter(id => id.startsWith('line')) : graph.current.edges()) as LineId[]
                ).map(
                    theme =>
                        ({
                            id: theme.toString(),
                            theme: theme,
                            value: theme[1] === 'other' ? theme[2] : theme[1],
                        }) as ChangeTypeTheme
                ),
            ]);
            setSelectedColor(defaultSelectedTheme);
        }
    }, [isOpen, mapEnabled, activeSubscriptions.RMP_CLOUD]);

    const handleChange = async () => {
        const stations = filter?.includes('station')
            ? ([...selected].filter(node => node.startsWith('stn')) as StnId[])
            : isSelect
              ? []
              : (graph.current.filterNodes(node => node.startsWith('stn')) as StnId[]);
        const miscNodes = filter?.includes('misc-node')
            ? ([...selected].filter(node => node.startsWith('misc_node')) as MiscNodeId[])
            : isSelect
              ? []
              : (graph.current.filterNodes(node => node.startsWith('misc_node')) as MiscNodeId[]);
        const lines = isSelect
            ? ([...selected].filter(edge => edge.startsWith('line')) as LineId[])
            : (graph.current.edges() as LineId[]);
        // Only edges actually mutated by this operation enter normalization. Unchanged same-style neighbours must
        // remain eligible as established anchors rather than being treated as pending members of the change set.
        const changedLines: LineId[] = [];
        if ((!filter || filter.includes('station')) && isStationTypeSwitch) {
            changeStationsTypeInBatch(graph.current, currentStationType, newStationType, stations);
            if (autoChangeStationType) stations.forEach(s => checkAndChangeStationIntType(graph.current, s as StnId));
        }
        if ((!filter || filter.includes('line')) && isLineStyleTypeSwitch) {
            changedLines.push(
                ...changeLineStyleTypeInBatch(
                    graph.current,
                    currentLineStyleType,
                    newLineStyleType,
                    newTheme,
                    lines,
                    mapEnabled,
                    activeSubscriptions.RMP_CLOUD
                )
            );
        }
        if ((!filter || filter.includes('line')) && isLinePathTypeSwitch) {
            changedLines.push(
                ...changeLinePathTypeInBatch(
                    graph.current,
                    currentLinePathType,
                    newLinePathType,
                    lines,
                    mapEnabled,
                    activeSubscriptions.RMP_CLOUD,
                    autoParallel
                )
            );
        }
        if (isColorSwitch) {
            if (!filter || filter.includes('line')) {
                changedLines.push(
                    ...changeLinesColorInBatch(
                        graph.current,
                        selectedColor.id === 'any' ? 'any' : selectedColor.theme,
                        newTheme,
                        lines
                    )
                );
            }
            if (!filter || filter.includes('misc-node') || filter.includes('station'))
                changeNodesColorInBatch(
                    graph.current,
                    selectedColor.id === 'any' ? 'any' : selectedColor.theme,
                    newTheme,
                    stations,
                    miscNodes
                );
        }
        if (isZIndexSwitch) {
            changeZIndexInBatch(
                graph.current,
                !filter || filter.includes('station') ? stations : [],
                !filter || filter.includes('misc-node') ? miscNodes : [],
                !filter || filter.includes('line') ? lines : [],
                zIndex
            );
        }
        normalizeEdgeAttributes(graph.current, changedLines);
        dispatch(saveGraph(graph.current.export()));
        await dispatch(refreshEdgesThunk()).unwrap();
        await dispatch(refreshNodesThunk()).unwrap();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {isSelect
                            ? t('panel.details.multipleSelection.change')
                            : t('header.settings.procedures.changeType.title')}
                    </Text>
                    <ModalCloseButton />
                </ModalHeader>

                <ModalBody>
                    <Accordion allowMultiple>
                        {changeTypeField.map(p => (
                            <AccordionItem key={p.id}>
                                <AccordionButton onClick={p.onClose}>
                                    <Box as="span" flex="1" textAlign="left">
                                        <Text as="b" fontSize="md">
                                            {p.title}
                                        </Text>
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel pb={4}>
                                    <RmgFields fields={p.field} minW={270} />
                                </AccordionPanel>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Tooltip label={t('header.settings.pro')} isOpen={!activeSubscriptions.RMP_CLOUD}>
                        <Button
                            colorScheme="red"
                            mr="1"
                            onClick={handleChange}
                            isDisabled={
                                !activeSubscriptions.RMP_CLOUD ||
                                (!isZIndexSwitch &&
                                    !isStationTypeSwitch &&
                                    !isLineStyleTypeSwitch &&
                                    !isLinePathTypeSwitch &&
                                    !isColorSwitch)
                            }
                        >
                            {t('apply')}
                        </Button>
                    </Tooltip>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
