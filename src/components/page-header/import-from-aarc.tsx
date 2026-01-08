import React from 'react';
import {
    Button,
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
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../redux';
import { clearSelected, refreshEdgesThunk, refreshNodesThunk } from '../../redux/runtime/runtime-slice';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { convertAarcToRmp } from '../../util/import-from-aarc';

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
    const graph = React.useRef(window.graph);

    const refreshAndSave = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph, graph]);

    const handleImport = () => {
        dispatch(clearSelected());
        graph.current.clear();
        dispatch(setSvgViewBoxZoom(100));
        dispatch(setSvgViewBoxMin({ x: 0, y: 0 }));
        convertAarcToRmp(text, graph.current);
        refreshAndSave();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('aarc')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Tabs variant="soft-rounded" colorScheme="blue" isFitted>
                            <TabList>
                                <Tab>Upload JSON</Tab>
                                <Tab>Paste JSON</Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel>
                                    <VStack align="stretch">
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
                                                        // If not valid JSON, still set raw content
                                                        setText(String(result));
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }}
                                            aria-label="Upload JSON file"
                                        />
                                    </VStack>
                                </TabPanel>

                                <TabPanel>
                                    <VStack align="stretch">
                                        <Textarea
                                            value={text}
                                            onChange={e => setText(e.target.value)}
                                            placeholder="Paste JSON here..."
                                            minHeight="200px"
                                            resize="vertical"
                                            aria-label="JSON import textarea"
                                        />
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Close
                    </Button>
                    <Button colorScheme="blue" onClick={handleImport} isDisabled={!text.trim()} aria-label="Import">
                        Import
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
