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
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LineId, MiscNodeId, StnId, Theme } from '../../constants/constants';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { StationType } from '../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { openPaletteAppClip, setRefreshEdges, setRefreshNodes } from '../../redux/runtime/runtime-slice';
import {
    changeLinePathTypeInBatch,
    changeLinesColorInBatch,
    changeLineStyleTypeInBatch,
    changeNodesColorInBatch,
    changeStationsTypeInBatch,
} from '../../util/change-types';
import { linePaths, lineStyles } from '../svgs/lines/lines';
import stations from '../svgs/stations/stations';
import ThemeButton from '../panels/theme-button';

export type FilterType = 'station' | 'misc-node' | 'line';
type ChangeTypeInfo = {
    id: string;
    title: string;
    onClose: () => void;
    field: RmgFieldsField[];
};

export const ChangeTypeModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    isSelect: boolean;
    filter?: FilterType[];
}) => {
    const { isOpen, onClose, isSelect, filter } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected, theme, paletteAppClip: output } = useRootSelector(state => state.runtime);

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

    const [isStationTypeSwitch, setIsStationTypeSwitch] = React.useState(false);
    const [currentStationType, setCurrentStationType] = React.useState<StationType | 'any'>('any');
    const [newStationType, setNewStationType] = React.useState<StationType>(StationType.ShmetroBasic);
    const [isLineStyleTypeSwitch, setIsLineStyleTypeSwitch] = React.useState(false);
    const [currentLineStyleType, setCurrentLineStyleType] = React.useState<LineStyleType | 'any'>('any');
    const [newLineStyleType, setNewLineStyleType] = React.useState<LineStyleType>(LineStyleType.SingleColor);
    const [isLinePathTypeSwitch, setIsLinePathTypeSwitch] = React.useState(false);
    const [currentLinePathType, setCurrentLinePathType] = React.useState<LinePathType | 'any'>('any');
    const [newLinePathType, setNewLinePathType] = React.useState<LinePathType>(LinePathType.Diagonal);
    const [isColorSwitch, setIsColorSwitch] = React.useState(false);
    const [isCurrentColorAny, setIsCurrentColorAny] = React.useState(false);
    const [currentColor, setCurrentColor] = React.useState<Theme>(theme);
    const [newColor, setNewColor] = React.useState<Theme>(theme);

    const [isCurrentThemeRequested, setIsCurrentThemeRequested] = React.useState(false);
    const [isNewThemeRequested, setIsNewThemeRequested] = React.useState(false);

    React.useEffect(() => {
        if (isCurrentThemeRequested && output.output) {
            setCurrentColor(output.output);
            setIsCurrentThemeRequested(false);
        }
    }, [output.output?.toString()]);
    React.useEffect(() => {
        if (isNewThemeRequested && output.output) {
            setNewColor(output.output);
            setIsNewThemeRequested(false);
        }
    }, [output.output?.toString()]);

    const changeTypeField: ChangeTypeInfo[] = [
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
                    options: availableLineStyleOptions,
                    value: newLineStyleType,
                    disabledOptions: ['any', currentLineStyleType],
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
                    type: 'switch',
                    label: t('header.settings.procedures.changeColor.any'),
                    isChecked: isCurrentColorAny,
                    oneLine: true,
                    onChange: value => setIsCurrentColorAny(value),
                },
                {
                    type: 'custom',
                    label: t('header.settings.procedures.changeColor.changeFrom'),
                    component: (
                        <ThemeButton
                            theme={currentColor}
                            onClick={() => {
                                setIsCurrentThemeRequested(true);
                                dispatch(openPaletteAppClip(theme));
                            }}
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
        setIsStationTypeSwitch(false);
        setIsLineStyleTypeSwitch(false);
        setIsLinePathTypeSwitch(false);
        setIsColorSwitch(false);
    }, [isOpen]);

    const handleChange = () => {
        if ((!filter || filter.includes('station')) && isStationTypeSwitch) {
            changeStationsTypeInBatch(
                graph.current,
                currentStationType,
                newStationType,
                isSelect ? ([...selected].filter(node => node.startsWith('stn')) as StnId[]) : undefined
            );
        }
        if ((!filter || filter.includes('line')) && isLineStyleTypeSwitch) {
            changeLineStyleTypeInBatch(
                graph.current,
                currentLineStyleType,
                newLineStyleType,
                theme,
                isSelect ? ([...selected].filter(edge => edge.startsWith('line')) as LineId[]) : undefined
            );
        }
        if ((!filter || filter.includes('line')) && isLinePathTypeSwitch) {
            changeLinePathTypeInBatch(
                graph.current,
                currentLinePathType,
                newLinePathType,
                isSelect ? ([...selected].filter(edge => edge.startsWith('line')) as LineId[]) : undefined
            );
        }
        if (isColorSwitch) {
            if (!filter || filter.includes('line'))
                changeLinesColorInBatch(
                    graph.current,
                    isCurrentColorAny ? 'any' : currentColor,
                    newColor,
                    isSelect ? ([...selected].filter(edge => edge.startsWith('line')) as LineId[]) : undefined
                );
            if (!filter || filter.includes('station'))
                changeNodesColorInBatch(
                    graph.current,
                    isCurrentColorAny ? 'any' : currentColor,
                    newColor,
                    isSelect ? ([...selected].filter(node => node.startsWith('stn')) as StnId[]) : undefined,
                    []
                );
            if (!filter || filter.includes('misc-node'))
                changeNodesColorInBatch(
                    graph.current,
                    isCurrentColorAny ? 'any' : currentColor,
                    newColor,
                    [],
                    isSelect ? ([...selected].filter(node => node.startsWith('misc_node')) as MiscNodeId[]) : undefined
                );
        }
        hardRefresh();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {isSelect
                            ? t('panel.details.multipleSelection.change')
                            : t('header.settings.procedures.changeType.title')}
                    </Text>
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
                        {t('close')}
                    </Button>
                    <Button colorScheme="red" mr="1" onClick={handleChange}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
