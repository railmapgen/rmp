import {
    Badge,
    Box,
    Button,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Spinner,
    Text,
} from '@chakra-ui/react';
import { RmgLineBadge } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDownload } from 'react-icons/md';
import { useLineInformation } from '../../util/hooks';
import { getLineEndpointsLabel } from '../../util/line-definitions';
import { exportToRmg } from '../../util/to-rmg';

/** Read-only projection of the same persisted definitions edited in LineInfoModal. */
export const ToRmgModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const { graph, entries: lineEntries, isLoading, error: calculationError } = useLineInformation(isOpen);
    const sortedEntries = React.useMemo(
        () =>
            [...lineEntries]
                .sort((a, b) => Number(!a.param) - Number(!b.param))
                .map(entry => ({
                    ...entry,
                    endpoints: getLineEndpointsLabel(graph, entry.line, entry.topology),
                })),
        [lineEntries, graph]
    );
    const entries = isLoading ? [] : sortedEntries;
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" blockScrollOnMount={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.download.2rmg.title')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Stack spacing="3" aria-busy={isLoading}>
                        <Text fontSize="sm">{t('header.lineInfo.exportHelp')}</Text>
                        {isLoading && (
                            <HStack role="status" justify="center" py="6">
                                <Spinner />
                                <Text>{t('header.lineInfo.calculating')}</Text>
                            </HStack>
                        )}
                        {!isLoading && calculationError && <Text color="red.600">{calculationError}</Text>}
                        {!isLoading && !calculationError && entries.length === 0 && (
                            <Text>{t('header.download.2rmg.noline')}</Text>
                        )}
                        {entries.map(({ line, topology, param, error, endpoints }) => (
                            <Box key={line.id}>
                                <Button
                                    width="100%"
                                    height="auto"
                                    p="4"
                                    variant="outline"
                                    whiteSpace="normal"
                                    textAlign="left"
                                    justifyContent="start"
                                    isDisabled={!param}
                                    aria-label={`${t('header.lineInfo.downloadLine')} ${line.name.filter(Boolean).join(' / ') || endpoints}`}
                                    onClick={() => {
                                        if (param)
                                            exportToRmg(structuredClone(param), line.name, line.lineNumber, new Map());
                                    }}
                                >
                                    <Stack width="100%" spacing="2">
                                        <HStack flexWrap="wrap">
                                            <RmgLineBadge
                                                name={line.lineNumber || topology.theme[1]}
                                                bg={topology.theme[2]}
                                                fg={topology.theme[3]}
                                            />
                                            <Text>{endpoints}</Text>
                                            <Badge>
                                                {t(`header.download.2rmg.type.${topology.type.toLowerCase()}`)}
                                            </Badge>
                                            <MdDownload />
                                        </HStack>
                                        <Text fontWeight="bold">
                                            {line.name.filter(Boolean).join(' / ') || t('header.lineInfo.unnamed')}
                                        </Text>
                                        <Text fontSize="sm" fontWeight="normal">
                                            {t('header.lineInfo.lineNumber')}: {line.lineNumber || '—'} ·{' '}
                                            {t('header.lineInfo.openingDate')}: {line.openingDate || '—'}
                                        </Text>
                                        <Text fontSize="sm" fontWeight="normal">
                                            {t('header.lineInfo.operator')}: {line.operator || '—'} ·{' '}
                                            {t('header.lineInfo.status')}:{' '}
                                            {t(`header.lineInfo.statuses.${line.status}`)}
                                        </Text>
                                        {line.notes && (
                                            <Text fontSize="sm" fontWeight="normal">
                                                {line.notes}
                                            </Text>
                                        )}
                                    </Stack>
                                </Button>
                                {error && (
                                    <Text mt="1" fontSize="sm" color="orange.600">
                                        {t(`header.lineInfo.${error}`)}
                                    </Text>
                                )}
                            </Box>
                        ))}
                    </Stack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
