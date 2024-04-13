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
} from '@chakra-ui/react';
import { RmgAutoComplete, RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CityCode, LineId, MiscNodeId, StnId, Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { openPaletteAppClip, setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import {
    changeLinePathTypeInBatch,
    changeLineStyleTypeInBatch,
    changeLinesColorInBatch,
    changeNodesColorInBatch,
    changeStationsTypeInBatch,
} from '../../../util/change-types';
import { findThemes } from '../../../util/graph';
import ThemeButton from '../../panels/theme-button';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
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
    const {
        selected,
        theme,
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);
    const {
        preference: { autoParallel },
    } = useRootSelector(state => state.app);

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph]);
    const graph = React.useRef(window.graph);

    const availableLinePathOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LinePathType]: string }),
    };
    const availableLineStyleOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(lineStyles).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LineStyleType]: string }),
    };
    const availableStationOptions = {
        any: t('header.settings.procedures.changeType.any'),
        ...(Object.fromEntries(
            Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in StationType]: string }),
    };

    const defaultSelectedTheme: ChangeTypeTheme = {
        id: 'any',
        theme: [CityCode.Other, 'other', '#ffffff', MonoColour.black],
        value: t('header.settings.procedures.changeType.any'),
    };

    const [isStationTypeSwitch, setIsStationTypeSwitch] = React.useState(false);
    const [currentStationType, setCurrentStationType] = React.useState<StationType | 'any'>('any');
    const [newStationType, setNewStationType] = React.useState(StationType.ShmetroBasic);
    const [isLineStyleTypeSwitch, setIsLineStyleTypeSwitch] = React.useState(false);
    const [currentLineStyleType, setCurrentLineStyleType] = React.useState<LineStyleType | 'any'>('any');
    const [newLineStyleType, setNewLineStyleType] = React.useState(LineStyleType.SingleColor);
    const [isLinePathTypeSwitch, setIsLinePathTypeSwitch] = React.useState(false);
    const [currentLinePathType, setCurrentLinePathType] = React.useState<LinePathType | 'any'>('any');
    const [newLinePathType, setNewLinePathType] = React.useState(LinePathType.Diagonal);
    const [isColorSwitch, setIsColorSwitch] = React.useState(false);
    const [selectedColor, setSelectedColor] = React.useState(defaultSelectedTheme);
    const [newColor, setNewColor] = React.useState(theme);

    const [isNewThemeRequested, setIsNewThemeRequested] = React.useState(false);

    React.useEffect(() => {
        if (isNewThemeRequested && output) {
            setNewColor(output);
            setIsNewThemeRequested(false);
        }
    }, [output?.toString()]);

    const [themeList, setThemeList] = React.useState<ChangeTypeTheme[]>([]);

    const changeTypeField: ChangeTypeField[] = [
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
                    disabledOptions: ['any', currentLineStyleType],
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
                    options: availableLinePathOptions,
                    value: currentLinePathType,
                    disabledOptions: [newLinePathType],
                    onChange: value => setCurrentLinePathType(value as LinePathType | 'any'),
                },
                {
                    type: 'select',
                    label: t('header.settings.procedures.changeLinePathType.changeTo'),
                    options: availableLinePathOptions,
                    value: newLinePathType,
                    disabledOptions: ['any', 'simple', currentLinePathType],
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
                    component: (
                        <ThemeButton
                            theme={newColor}
                            onClick={() => {
                                setIsNewThemeRequested(true);
                                dispatch(openPaletteAppClip(theme));
                            }}
                        />
                    ),
                },
            ],
        },
    ];

    React.useEffect(() => {
        if (isOpen) {
            setIsStationTypeSwitch(false);
            setIsLineStyleTypeSwitch(false);
            setIsLinePathTypeSwitch(false);
            setIsColorSwitch(false);
            setThemeList([
                defaultSelectedTheme,
                ...findThemes(
                    graph.current,
                    (isSelect
                        ? [...selected].filter(id => id.startsWith('stn') || id.startsWith('misc_node'))
                        : graph.current.nodes()) as (StnId | MiscNodeId)[],
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
    }, [isOpen]);

    const handleChange = () => {
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
        if ((!filter || filter.includes('station')) && isStationTypeSwitch) {
            changeStationsTypeInBatch(graph.current, currentStationType, newStationType, stations);
        }
        if ((!filter || filter.includes('line')) && isLineStyleTypeSwitch) {
            changeLineStyleTypeInBatch(graph.current, currentLineStyleType, newLineStyleType, theme, lines);
        }
        if ((!filter || filter.includes('line')) && isLinePathTypeSwitch) {
            changeLinePathTypeInBatch(graph.current, currentLinePathType, newLinePathType, lines, autoParallel);
        }
        if (isColorSwitch) {
            if (!filter || filter.includes('line'))
                changeLinesColorInBatch(
                    graph.current,
                    selectedColor.id === 'any' ? 'any' : selectedColor.theme,
                    newColor,
                    lines
                );
            if (!filter || filter.includes('misc-node') || filter.includes('station'))
                changeNodesColorInBatch(
                    graph.current,
                    selectedColor.id === 'any' ? 'any' : selectedColor.theme,
                    newColor,
                    stations,
                    miscNodes
                );
        }
        hardRefresh();
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
                    <Button
                        colorScheme="red"
                        mr="1"
                        onClick={handleChange}
                        isDisabled={
                            !isStationTypeSwitch && !isLineStyleTypeSwitch && !isLinePathTypeSwitch && !isColorSwitch
                        }
                    >
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
