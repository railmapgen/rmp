import {
    Badge,
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
} from '@chakra-ui/react';
import { RmgLineBadge } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAltRoute, MdClose } from 'react-icons/md';
import type { LineDefinition, LineOperatingStatus } from '../../constants/line-definitions';
import { useRootDispatch, useRootSelector } from '../../redux';
import { ParamGraph, saveGraph } from '../../redux/param/param-slice';
import {
    assignLineSection,
    getLineAssignmentTargets,
    getLineEndpointsLabel,
    getLineTopology,
    getStationLabel,
    getUnassignedLineSections,
    isOpeningDateValid,
    unassignLineDefinition,
} from '../../util/line-definitions';
import { getLineExports, LineExport } from '../../util/line-export';
import { LineIntervalModal } from './line-interval-modal';

const STATUSES: LineOperatingStatus[] = ['planned', 'construction', 'operating', 'closed'];

/** Each input owns its draft so a sibling's save cannot reset unfinished typing. */
const AutosaveTextField = ({
    label,
    value,
    onSave,
    date = false,
    multiline = false,
}: {
    label: string;
    value: string;
    onSave: (value: string) => void;
    date?: boolean;
    multiline?: boolean;
}) => {
    const { t } = useTranslation();
    const [draft, setDraft] = React.useState(value);
    React.useEffect(() => setDraft(value), [value]);
    const inputProps = {
        size: 'sm' as const,
        value: draft,
        'aria-label': label,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
        onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const next = event.currentTarget.value;
            if (next !== value && (!date || isOpeningDateValid(next))) onSave(next);
        },
    };
    return (
        <FormControl isInvalid={date && !isOpeningDateValid(draft)}>
            <FormLabel fontSize="sm">{label}</FormLabel>
            {multiline ? (
                <Textarea {...inputProps} />
            ) : (
                <Input {...inputProps} type="text" placeholder={date ? 'YYYY-MM-DD' : undefined} />
            )}
            {date && <FormErrorMessage>{t('header.lineInfo.invalidDate')}</FormErrorMessage>}
        </FormControl>
    );
};

const LineInfoRow = ({
    entry,
    graph,
    onUpdate,
    onEditInterval,
    onRemove,
}: {
    entry: LineExport;
    graph: ParamGraph;
    onUpdate: (id: string, patch: Partial<LineDefinition>) => void;
    onEditInterval: () => void;
    onRemove: () => void;
}) => {
    const { t } = useTranslation();
    const { line, topology } = entry;
    const textField = (field: 'lineNumber' | 'openingDate' | 'operator' | 'notes') => (
        <AutosaveTextField
            label={t(`header.lineInfo.${field}`)}
            value={line[field]}
            date={field === 'openingDate'}
            multiline={field === 'notes'}
            onSave={value => onUpdate(line.id, { [field]: value })}
        />
    );
    return (
        <Box borderWidth="1px" borderRadius="md" p="4" data-testid={`line-info-${line.id}`}>
            <HStack mb={entry.error ? '0' : '4'} flexWrap="wrap" spacing="3">
                <RmgLineBadge
                    name={
                        topology.theme[0] === 'other' && topology.theme[1] === 'other'
                            ? topology.theme[2]
                            : topology.theme[1]
                    }
                    bg={topology.theme[2]}
                    fg={topology.theme[3]}
                />
                <Text flex="1" minW="120px">
                    {getLineEndpointsLabel(graph, line)}
                </Text>
                <Badge>{t(`header.download.2rmg.type.${topology.type.toLowerCase()}`)}</Badge>
                <HStack width={{ base: '100%', sm: 'auto' }} flexShrink="0">
                    <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<MdAltRoute />}
                        flex="1"
                        aria-label={`${t('header.lineInfo.adjustInterval')}: ${getLineEndpointsLabel(graph, line)}`}
                        onClick={onEditInterval}
                    >
                        {t('header.lineInfo.adjustInterval')}
                    </Button>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        icon={<MdClose />}
                        title={t('header.lineInfo.removeLine')}
                        aria-label={`${t('header.lineInfo.removeLine')}: ${getLineEndpointsLabel(graph, line)}`}
                        onClick={onRemove}
                    />
                </HStack>
            </HStack>
            {!entry.error && (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3">
                    {([0, 1] as const).map(index => (
                        <AutosaveTextField
                            key={index}
                            label={t(`header.download.2rmg.placeholder.${index === 0 ? 'chinese' : 'english'}`)}
                            value={line.name[index]}
                            onSave={value => {
                                const name: [string, string] = [...line.name];
                                name[index] = value.trim();
                                onUpdate(line.id, { name });
                            }}
                        />
                    ))}
                    {textField('lineNumber')}
                    {textField('openingDate')}
                    {textField('operator')}
                    <FormControl>
                        <FormLabel fontSize="sm">{t('header.lineInfo.status')}</FormLabel>
                        <Select
                            size="sm"
                            value={line.status}
                            aria-label={t('header.lineInfo.status')}
                            onChange={event => onUpdate(line.id, { status: event.target.value as LineOperatingStatus })}
                        >
                            {STATUSES.map(status => (
                                <option key={status} value={status}>
                                    {t(`header.lineInfo.statuses.${status}`)}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <FormLabel fontSize="sm">{t('header.lineInfo.exportStart')}</FormLabel>
                        <Select
                            size="sm"
                            value={line.exportStartStationId}
                            aria-label={t('header.lineInfo.exportStart')}
                            onChange={event => onUpdate(line.id, { exportStartStationId: event.target.value })}
                        >
                            {(entry.startCandidates.length ? entry.startCandidates : topology.startCandidates).map(
                                id => (
                                    <option key={id} value={id}>
                                        {getStationLabel(graph, id)}
                                    </option>
                                )
                            )}
                        </Select>
                    </FormControl>
                    {textField('notes')}
                </SimpleGrid>
            )}
            {entry.error && (
                <Text mt="2" fontSize="sm" color="orange.600">
                    {t(`header.lineInfo.${entry.error}`)}
                </Text>
            )}
        </Box>
    );
};

const UnassignedLineRow = ({
    line,
    graph,
    onAssign,
}: {
    line: LineDefinition;
    graph: ParamGraph;
    onAssign: (targetId?: string) => void;
}) => {
    const { t } = useTranslation();
    const theme = getLineTopology(graph, line).theme;
    const endpoints = getLineEndpointsLabel(graph, line);
    const targets = getLineAssignmentTargets(graph, line.id).filter(
        target => getLineTopology(graph, target).stationIds.length >= 2
    );
    const [targetId, setTargetId] = React.useState('new');
    const selectedTarget = targets.some(item => item.id === targetId) ? targetId : 'new';
    return (
        <Box borderWidth="1px" borderRadius="md" p="4">
            <HStack flexWrap="wrap" spacing="3">
                <RmgLineBadge
                    name={theme[0] === 'other' && theme[1] === 'other' ? theme[2] : theme[1]}
                    bg={theme[2]}
                    fg={theme[3]}
                />
                <Text flex="1" minW="120px">
                    {endpoints}
                </Text>
                <HStack width={{ base: '100%', sm: 'auto' }}>
                    <Select
                        size="sm"
                        width={{ base: '100%', sm: '220px' }}
                        value={selectedTarget}
                        aria-label={`${t('header.lineInfo.assignmentTarget')}: ${endpoints}`}
                        onChange={event => setTargetId(event.target.value)}
                    >
                        <option value="new">{t('header.lineInfo.newLine')}</option>
                        {targets.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name.filter(Boolean).join(' / ') || t('header.lineInfo.unnamed')}
                                {' · '}
                                {getLineEndpointsLabel(graph, item)}
                            </option>
                        ))}
                    </Select>
                    <Button
                        size="sm"
                        colorScheme="blue"
                        flexShrink="0"
                        aria-label={`${t('header.lineInfo.assignInterval')}: ${endpoints}`}
                        onClick={() => onAssign(selectedTarget === 'new' ? undefined : selectedTarget)}
                    >
                        {t('header.lineInfo.assignInterval')}
                    </Button>
                </HStack>
            </HStack>
        </Box>
    );
};

export const LineInfoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const graph = useRootSelector(state => state.param.present.graph);
    const entries = React.useMemo(
        () => (isOpen ? getLineExports(graph).filter(entry => entry.topology.stationIds.length >= 2) : []),
        [graph, isOpen]
    );
    const available = entries.filter(entry => !entry.error);
    const unavailable = entries.filter(entry => entry.error);
    const unassigned = React.useMemo(
        () =>
            isOpen
                ? getUnassignedLineSections(graph).filter(line => getLineTopology(graph, line).stationIds.length >= 2)
                : [],
        [graph, isOpen]
    );
    const [editingId, setEditingId] = React.useState<string>();
    const editingLine = graph.attributes?.lineDefinitions?.find(line => line.id === editingId);
    const close = () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setEditingId(undefined);
        onClose();
    };
    const update = (id: string, patch: Partial<LineDefinition>) => {
        const definitions = window.graph.getAttribute('lineDefinitions') ?? [];
        window.graph.setAttribute(
            'lineDefinitions',
            definitions.map(line => (line.id === id ? { ...line, ...patch } : line))
        );
        dispatch(saveGraph(window.graph.export()));
    };
    const apply = (next: ParamGraph) => {
        window.graph.replaceAttributes(structuredClone(next.attributes));
        dispatch(saveGraph(window.graph.export()));
    };
    const renderLine = (entry: LineExport) => (
        <LineInfoRow
            key={entry.line.id}
            entry={entry}
            graph={graph}
            onUpdate={update}
            onEditInterval={() => setEditingId(entry.line.id)}
            onRemove={() => apply(unassignLineDefinition(window.graph.export(), entry.line.id))}
        />
    );
    return (
        <>
            <Modal isOpen={isOpen} onClose={close} size="4xl" scrollBehavior="inside" blockScrollOnMount={false}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.lineInfo.title')}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Stack spacing="4">
                            <Text fontSize="sm">{t('header.lineInfo.help')}</Text>
                            {entries.length === 0 && unassigned.length === 0 && (
                                <Text>{t('header.download.2rmg.noline')}</Text>
                            )}
                            {available.map(renderLine)}
                            {unassigned.length > 0 && (
                                <>
                                    <Text as="h3" fontWeight="bold">
                                        {t('header.lineInfo.unassignedIntervals')}
                                    </Text>
                                    <Text fontSize="sm">{t('header.lineInfo.unassignedHelp')}</Text>
                                    {unassigned.map(line => (
                                        <UnassignedLineRow
                                            key={line.id}
                                            line={line}
                                            graph={graph}
                                            onAssign={targetId =>
                                                apply(assignLineSection(window.graph.export(), line.id, targetId))
                                            }
                                        />
                                    ))}
                                </>
                            )}
                            {unavailable.length > 0 && (
                                <Stack as="section" aria-label={t('header.lineInfo.unavailableLines')} spacing="4">
                                    <Text as="h3" fontWeight="bold">
                                        {t('header.lineInfo.unavailableLines')}
                                    </Text>
                                    {unavailable.map(renderLine)}
                                </Stack>
                            )}
                        </Stack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="outline" onClick={close}>
                            {t('close')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            {isOpen && editingLine && (
                <LineIntervalModal
                    key={editingLine.id}
                    graph={graph}
                    line={editingLine}
                    onClose={() => setEditingId(undefined)}
                    onApply={preview => {
                        apply(preview);
                        setEditingId(undefined);
                    }}
                />
            )}
        </>
    );
};
