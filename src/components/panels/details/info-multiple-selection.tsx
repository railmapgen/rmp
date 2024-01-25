import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Box,
    Button,
    Heading,
    HStack,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import { RmgLabel, RmgSelect } from '@railmapgen/rmg-components';
import React from 'react';
import { MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/constants';
import { LinePathType, LineStyleType } from '../../../constants/lines';
import { StationAttributes, StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import {
    openPaletteAppClip,
    setRefreshEdges,
    setRefreshNodes,
    setSelected,
    removeSelected,
} from '../../../redux/runtime/runtime-slice';
import { linePaths, lineStyles } from '../../svgs/lines/lines';
import stations from '../../svgs/stations/stations';
import { AttributesWithColor } from './color-field';
import {
    changeLinePathTypeSelected,
    changeLineStyleTypeSelected,
    changeStationsTypeSelected,
} from '../../../util/change-types';
import ThemeButton from '../theme-button';

export default function InfoMultipleSection() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);

    const graph = React.useRef(window.graph);

    const getName = (id: string) => {
        if (graph.current.hasNode(id)) {
            const attr = graph.current.getNodeAttributes(id);
            const type = attr.type;
            return id.startsWith('stn') ? (attr[type] as StationAttributes).names.join('/') : type;
        } else if (graph.current.hasEdge(id)) {
            const [s, t] = graph.current.extremities(id);
            const source = graph.current.getSourceAttributes(id);
            const target = graph.current.getTargetAttributes(id);
            const sT = source.type;
            const tT = target.type;
            return (
                (s.startsWith('stn') ? (source[sT] as StationAttributes).names[0] : sT) +
                ' - ' +
                (t.startsWith('stn') ? (target[tT] as StationAttributes).names[0] : tT)
            );
        }
    };

    const [filterNodes, setFilterNodes] = React.useState(true);
    const [filterEdges, setFilterEdges] = React.useState(true);
    React.useEffect(() => {
        setFilterNodes(true);
        setFilterEdges(true);
    }, [selected]);

    const [isOpenChangeModal, setIsOpenChangeModal] = React.useState(false);

    return (
        <>
            <Box>
                {(filterEdges || filterNodes) && (
                    <Button width="100%" size="sm" onClick={() => setIsOpenChangeModal(true)}>
                        {t('panel.details.multipleSelection.change')}
                    </Button>
                )}

                <Heading as="h5" size="sm">
                    {t('panel.details.multipleSelection.selected')} {selected.size}
                </Heading>
                <VStack m="var(--chakra-space-1)">
                    <HStack m="var(--chakra-space-1)" width="100%">
                        <Button
                            size="sm"
                            width="100%"
                            variant={filterNodes ? 'solid' : 'ghost'}
                            onClick={() => setFilterNodes(!filterNodes)}
                            colorScheme="blue"
                        >
                            {t('panel.details.multipleSelection.filterNodes')}
                        </Button>
                        <Button
                            size="sm"
                            width="100%"
                            variant={filterEdges ? 'solid' : 'ghost'}
                            onClick={() => setFilterEdges(!filterEdges)}
                            colorScheme="blue"
                        >
                            {t('panel.details.multipleSelection.filterEdges')}
                        </Button>
                    </HStack>
                    {[...selected]
                        .filter(id => filterNodes || !(id.startsWith('stn') || id.startsWith('misc_node')))
                        .filter(id => filterEdges || !id.startsWith('line'))
                        .map(id => (
                            <HStack key={id} width="100%">
                                <Button
                                    width="100%"
                                    size="sm"
                                    variant="solid"
                                    onClick={() => dispatch(setSelected(new Set([id])))}
                                    overflow="hidden"
                                    maxW="270"
                                    textOverflow="ellipsis"
                                    whiteSpace="nowrap"
                                    display="ruby"
                                >
                                    {getName(id)?.replaceAll('\\', '⏎')}
                                </Button>
                                <Button size="sm" onClick={() => dispatch(removeSelected(id))}>
                                    <MdClose />
                                </Button>
                            </HStack>
                        ))}
                </VStack>
            </Box>
            <ChangeSelectedModal
                isOpen={isOpenChangeModal}
                onClose={() => setIsOpenChangeModal(false)}
                filterEdges={filterEdges}
                filterNodes={filterNodes}
            />
        </>
    );
}

export const ChangeSelectedModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    filterNodes: boolean;
    filterEdges: boolean;
}) => {
    const { isOpen, onClose, filterNodes, filterEdges } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        selected,
        theme,
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);

    const hardRefresh = React.useCallback(() => {
        dispatch(setRefreshNodes());
        dispatch(setRefreshEdges());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefreshNodes, setRefreshEdges, saveGraph]);
    const graph = React.useRef(window.graph);

    const availableLinePathOptions = {
        default: '...',
        ...(Object.fromEntries(
            Object.entries(linePaths).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LinePathType]: string }),
    };
    const availableLineStyleOptions = {
        default: '...',
        ...(Object.fromEntries(
            Object.entries(lineStyles).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in LineStyleType]: string }),
    };
    const availableStationOptions = {
        default: '...',
        ...(Object.fromEntries(
            Object.entries(stations).map(([key, val]) => [key, t(val.metadata.displayName).toString()])
        ) as { [k in StationType]: string }),
    };

    const handleChangeColor = (color: Theme) => {
        selected.forEach(id => {
            if (filterEdges && graph.current.hasEdge(id)) {
                const thisType = graph.current.getEdgeAttributes(id).style;
                const attrs = graph.current.getEdgeAttribute(id, thisType);
                if (thisType !== LineStyleType.River && (attrs as AttributesWithColor)['color'] !== undefined) {
                    (attrs as AttributesWithColor)['color'] = color;
                }
                graph.current.mergeEdgeAttributes(id, { [thisType]: attrs });
            } else if (filterNodes && graph.current.hasNode(id)) {
                const thisType = graph.current.getNodeAttributes(id).type;
                const attrs = graph.current.getNodeAttribute(id, thisType);
                if ((attrs as AttributesWithColor)['color'] !== undefined)
                    (attrs as AttributesWithColor)['color'] = color;
                graph.current.mergeNodeAttributes(id, { [thisType]: attrs });
            }
        });
        hardRefresh();
    };

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (isThemeRequested && output) {
            handleChangeColor(output);
            setIsThemeRequested(false);
        }
    }, [output?.toString()]);

    const [isChangeTypeWarningOpen, setIsChangeTypeWarningOpen] = React.useState(false);
    const cancelRef = React.useRef(null);
    const [newLinePathType, setNewLinePathType] = React.useState<LinePathType | undefined>(undefined);
    const [newLineStyleType, setNewLineStyleType] = React.useState<LineStyleType | undefined>(undefined);
    const [newStationType, setNewStationType] = React.useState<StationType | undefined>(undefined);
    const handleClose = (proceed: boolean) => {
        if (proceed) {
            if (newLinePathType) {
                changeLinePathTypeSelected(graph.current, selected, newLinePathType);
                setNewLinePathType(undefined);
                hardRefresh();
            } else if (newLineStyleType) {
                changeLineStyleTypeSelected(graph.current, selected, newLineStyleType, theme);
                setNewLineStyleType(undefined);
                hardRefresh();
            } else if (newStationType) {
                changeStationsTypeSelected(graph.current, selected, newStationType);
                setNewStationType(undefined);
                hardRefresh();
            }
        }
        setIsChangeTypeWarningOpen(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Text as="b" fontSize="xl">
                        {t('panel.details.multipleSelection.change')}
                    </Text>
                </ModalHeader>

                <ModalBody>
                    {filterNodes && (
                        <RmgLabel label={t('panel.details.multipleSelection.changeStationType')} minW="276">
                            <RmgSelect
                                options={availableStationOptions}
                                defaultValue="default"
                                value="default"
                                onChange={({ target: { value } }) => {
                                    setNewStationType(value as StationType);
                                    setIsChangeTypeWarningOpen(true);
                                }}
                            />
                        </RmgLabel>
                    )}
                    {filterEdges && (
                        <>
                            <RmgLabel label={t('panel.details.multipleSelection.changeLinePathType')} minW="276">
                                <RmgSelect
                                    options={availableLinePathOptions}
                                    disabledOptions={['simple']}
                                    defaultValue="default"
                                    value="default"
                                    onChange={({ target: { value } }) => {
                                        setNewLinePathType(value as LinePathType);
                                        setIsChangeTypeWarningOpen(true);
                                    }}
                                />
                            </RmgLabel>
                            <RmgLabel label={t('panel.details.multipleSelection.changeLineStyleType')} minW="276">
                                <RmgSelect
                                    options={availableLineStyleOptions}
                                    defaultValue="default"
                                    value="default"
                                    onChange={({ target: { value } }) => {
                                        setNewLineStyleType(value as LineStyleType);
                                        setIsChangeTypeWarningOpen(true);
                                    }}
                                />
                            </RmgLabel>
                        </>
                    )}
                    {(filterNodes || filterEdges) && (
                        <RmgLabel label={t('panel.details.multipleSelection.changeColor')}>
                            <ThemeButton
                                theme={theme}
                                onClick={() => {
                                    setIsThemeRequested(true);
                                    dispatch(openPaletteAppClip(theme));
                                }}
                            />
                        </RmgLabel>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
            <AlertDialog
                isOpen={isChangeTypeWarningOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => handleClose(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader>{t('warning')}</AlertDialogHeader>
                        <AlertDialogBody>
                            {t(
                                newStationType
                                    ? 'panel.details.changeStationTypeContent'
                                    : 'panel.details.changeLineTypeContent'
                            )}
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => handleClose(false)}>
                                {t('cancel')}
                            </Button>
                            <Button ml="2" colorScheme="red" onClick={() => handleClose(true)}>
                                {t('panel.details.changeType')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Modal>
    );
};
