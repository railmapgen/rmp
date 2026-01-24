import React from 'react';
import {
    Button,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    Textarea,
    VStack,
    HStack,
    Circle,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { MultiDirectedGraph } from 'graphology';
import { useRootDispatch } from '../../redux';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk } from '../../redux/runtime/runtime-slice';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { convertAarcToRmp, StationTypeOption } from '../../util/import-from-aarc';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';

interface ImportFromAarcProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Simple modal that accepts pasted/imported text in a textarea.
 * - Close button simply closes the modal.
 * - Import button calls onImport(text) and then closes the modal.
 */
export default function ImportFromAarc({ isOpen, onClose }: ImportFromAarcProps) {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const [text, setText] = React.useState('');
    const [step, setStep] = React.useState<1 | 2>(1);
    const [mode, setMode] = React.useState('suzhou');
    const graph = React.useRef(window.graph);
    const graphNew = React.useRef(new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>());

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch]);

    const [nodeCount, setNodeCount] = React.useState(0);
    const [edgeCount, setEdgeCount] = React.useState(0);

    const handleImport = () => {
        if (!text.trim()) return;
        dispatch(clearSelected());

        graphNew.current.clear();
        if (convertAarcToRmp(text, graphNew.current)) {
            setNodeCount(graphNew.current.nodes().length);
            setEdgeCount(graphNew.current.edges().length);
        } else {
            setNodeCount(0);
            setEdgeCount(0);
        }

        setStep(2);
    };

    const confirmImport = () => {
        graph.current.clear();
        graph.current.import(graphNew.current.export());
        dispatch(setSvgViewBoxZoom(100));
        dispatch(setSvgViewBoxMin({ x: 0, y: 0 }));
        refreshAndSave();
        setStep(1);
        onClose();
    };

    const handleClose = () => {
        setStep(1);
        setText('');
        onClose();
    };

    const modeOptions: Record<string, string> = Object.values(StationTypeOption).reduce<Record<string, string>>(
        (acc, v) => {
            acc[v] = t(`aarc.import.mode.${v}`);
            return acc;
        },
        {}
    );

    const modeFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('aarc.import.mode'),
            value: mode,
            options: modeOptions,
            onChange: value => setMode(value as string),
        },
    ];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('aarc')}</ModalHeader>
                <ModalCloseButton onClick={handleClose} />
                <ModalBody pb={0}>
                    <HStack justify="center" spacing={8} mb={2}>
                        <HStack>
                            <Circle size="8" bg={step === 1 ? 'blue.500' : 'gray.300'} color="white" fontWeight="bold">
                                1
                            </Circle>
                            <Text fontSize="sm" color={step === 1 ? 'blue.500' : 'gray.500'}>
                                {t('aarc.import.step1')}
                            </Text>
                        </HStack>
                        <HStack>
                            <Circle size="8" bg={step === 2 ? 'blue.500' : 'gray.300'} color="white" fontWeight="bold">
                                2
                            </Circle>
                            <Text fontSize="sm" color={step === 2 ? 'blue.500' : 'gray.500'}>
                                {t('aarc.import.step2')}
                            </Text>
                        </HStack>
                    </HStack>
                </ModalBody>
                {step === 1 && (
                    <>
                        <ModalBody pt={2}>
                            <VStack align="stretch" spacing={4}>
                                <Text fontSize="sm" color="gray.500">
                                    {t('aarc.import.description')}
                                </Text>
                                <input
                                    type="file"
                                    accept="application/json,.json"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const result = reader.result as string | ArrayBuffer | null;
                                            if (!result) return;
                                            try {
                                                const parsed = JSON.parse(String(result));
                                                setText(JSON.stringify(parsed, null, 2));
                                            } catch {
                                                setText(String(result));
                                            }
                                        };
                                        reader.readAsText(file);
                                    }}
                                    aria-label="Upload JSON file"
                                />
                                <RmgFields fields={modeFields} />
                            </VStack>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" mr={3} onClick={handleClose}>
                                {t('close')}
                            </Button>
                            <Button colorScheme="blue" onClick={handleImport} isDisabled={!text.trim()}>
                                {t('next')}
                            </Button>
                        </ModalFooter>
                    </>
                )}
                {step === 2 &&
                    (nodeCount > 0 && edgeCount > 0 ? (
                        <>
                            <ModalBody pt={2}>
                                <VStack align="stretch" spacing={4}>
                                    <Text fontSize="sm" color="gray.500">
                                        Nodes: {nodeCount}, Edges: {edgeCount}
                                    </Text>
                                </VStack>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="ghost" mr={3} onClick={handleClose}>
                                    {t('close')}
                                </Button>
                                <Button variant="outline" mr={3} onClick={() => setStep(1)}>
                                    {t('previous')}
                                </Button>
                                <Button colorScheme="blue" onClick={confirmImport}>
                                    {t('confirm')}
                                </Button>
                            </ModalFooter>
                        </>
                    ) : (
                        <>
                            <ModalBody pt={2}>
                                <VStack align="stretch" spacing={4}>
                                    <Text fontSize="sm" color="gray.500">
                                        {t('aarc.import.error')}
                                    </Text>
                                </VStack>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="ghost" mr={3} onClick={handleClose}>
                                    {t('close')}
                                </Button>
                                <Button variant="outline" mr={3} onClick={() => setStep(1)}>
                                    {t('previous')}
                                </Button>
                            </ModalFooter>
                        </>
                    ))}
            </ModalContent>
        </Modal>
    );
}
