import {
    Box,
    Button,
    Checkbox,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimelineProjectRevision } from '../../timeline/timeline-project';
import { getTimelineImportLines } from '../../util/timeline-line-import';

interface TimelineRmpImportModalProps {
    revision?: TimelineProjectRevision;
    summary?: string;
    replacesTrack?: boolean;
    isLoading?: boolean;
    onClose: () => void;
    onImport: (applyLineInformation: boolean) => void;
}

export default function TimelineRmpImportModal({
    revision,
    summary,
    replacesTrack = false,
    isLoading = false,
    onClose,
    onImport,
}: TimelineRmpImportModalProps) {
    const { t } = useTranslation();
    const [applyLineInformation, setApplyLineInformation] = React.useState(true);
    const lineCount = React.useMemo(() => (revision ? getTimelineImportLines(revision.graph).length : 0), [revision]);
    React.useEffect(() => setApplyLineInformation(lineCount > 0), [revision, lineCount]);

    return (
        <Modal isOpen={!!revision} onClose={isLoading ? () => undefined : onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.timelinePage.rmpImport.title')}</ModalHeader>
                <ModalCloseButton isDisabled={isLoading} />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Text color="gray.500" fontSize="sm">
                            {t('header.timelinePage.rmpImport.summary', {
                                lines: lineCount,
                                nodes: revision?.graph.nodes.length ?? 0,
                                edges: revision?.graph.edges.length ?? 0,
                            })}
                        </Text>
                        {summary && <Text fontSize="sm">{summary}</Text>}
                        <Box borderWidth="1px" borderRadius="lg" p={4}>
                            <Checkbox
                                isChecked={applyLineInformation}
                                isDisabled={lineCount === 0 || isLoading}
                                onChange={event => setApplyLineInformation(event.target.checked)}
                                colorScheme="teal"
                                fontWeight="semibold"
                            >
                                {t('header.timelinePage.rmpImport.applyLineInfo')}
                            </Checkbox>
                            <Text fontSize="sm" color="gray.500" mt={2}>
                                {t(
                                    lineCount > 0
                                        ? 'header.timelinePage.rmpImport.description'
                                        : 'header.timelinePage.rmpImport.unavailable'
                                )}
                            </Text>
                            {replacesTrack && applyLineInformation && (
                                <Text fontSize="sm" color="orange.500" mt={2}>
                                    {t('header.timelinePage.rmpImport.replaceTrack')}
                                </Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter gap={3}>
                    <Button onClick={onClose} isDisabled={isLoading}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="teal" isLoading={isLoading} onClick={() => onImport(applyLineInformation)}>
                        {t('header.timelinePage.importRmpData')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
