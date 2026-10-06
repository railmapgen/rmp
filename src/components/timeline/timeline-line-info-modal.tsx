import {
    Badge,
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRestore } from 'react-icons/md';
import { VideoLineLabel } from '../../constants/line-definitions';
import { TimelineGraph } from '../../timeline/timeline-project-context';
import { commitRevision, useTimelineDispatch, useTimelineSelector } from '../../timeline/timeline-store';
import { isOpeningDateValid } from '../../util/line-definitions';
import { getVideoLineLabel } from '../../util/video-overlay';

interface TimelineLineInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const isColorValid = (color: string) => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color);
const pickerColor = (color: string) =>
    /^#[\da-f]{3}$/i.test(color)
        ? `#${color
              .slice(1)
              .split('')
              .map(char => char + char)
              .join('')}`
        : isColorValid(color)
          ? color
          : '#64748b';

/** Independent field drafts keep unfinished names intact when a sibling autosaves. */
function LabelField({
    label,
    value,
    onSave,
    isValid = () => true,
    error,
    placeholder,
    leading,
}: {
    label: string;
    value: string;
    onSave: (value: string) => void;
    isValid?: (value: string) => boolean;
    error?: string;
    placeholder?: string;
    leading?: React.ReactNode;
}) {
    const [draft, setDraft] = React.useState(value);
    React.useEffect(() => setDraft(value), [value]);
    const input = React.useRef<HTMLInputElement>(null);
    return (
        <FormControl isInvalid={!isValid(draft)}>
            <FormLabel fontSize="sm">{label}</FormLabel>
            <HStack>
                {leading}
                <Input
                    ref={input}
                    size="sm"
                    value={draft}
                    aria-label={label}
                    placeholder={placeholder}
                    onChange={event => setDraft(event.target.value)}
                    onBlur={event => {
                        const next = event.currentTarget.value.trim();
                        if (next !== value && isValid(next)) onSave(next);
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter') input.current?.blur();
                    }}
                />
            </HStack>
            <FormErrorMessage>{error}</FormErrorMessage>
        </FormControl>
    );
}

/** Edits only the active Timeline project's label overrides, never the painter graph. */
export default function TimelineLineInfoModal({ isOpen, onClose }: TimelineLineInfoModalProps) {
    const { t } = useTranslation();
    const dispatch = useTimelineDispatch();
    const active = useTimelineSelector(state => state.project.active);
    const latestProject = React.useRef(active);
    latestProject.current = active;
    const graph = React.useMemo(
        () => (active ? (MultiDirectedGraph.from(active.revision.graph) as TimelineGraph) : undefined),
        [active?.revision.graph]
    );
    const mutedColor = useColorModeValue('gray.600', 'gray.300');
    const cardBackground = useColorModeValue('gray.50', 'whiteAlpha.50');
    const lines =
        graph?.getAttribute('lineDefinitions')?.filter(line => line.edgeIds.some(id => graph.hasEdge(id))) ?? [];

    const update = (id: string, changes?: Partial<VideoLineLabel>) => {
        const project = latestProject.current;
        if (!project) return;
        const source = project.revision.graph;
        const currentGraph = MultiDirectedGraph.from(source) as TimelineGraph;
        const definitions = source.attributes.lineDefinitions ?? [];
        const line = definitions.find(item => item.id === id);
        if (!line) return;
        const videoLabel = changes ? { ...getVideoLineLabel(currentGraph, line), ...changes } : undefined;
        const nextGraph = {
            ...source,
            attributes: {
                ...source.attributes,
                lineDefinitions: definitions.map(item => {
                    if (item.id !== id) return item;
                    const next = { ...item };
                    if (videoLabel) next.videoLabel = videoLabel;
                    else delete next.videoLabel;
                    return next;
                }),
            },
        };
        const revision = { ...project.revision, graph: nextGraph };
        // Closing the modal may blur several fields before React renders again.
        latestProject.current = { ...project, revision };
        dispatch(commitRevision(revision));
    };
    const close = () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={close} size="3xl" scrollBehavior="inside" isCentered>
            <ModalOverlay backdropFilter="blur(3px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader pb={2}>{t('header.timelinePage.lineLabels.title')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={5}>
                    {lines.length === 0 && (
                        <Box borderWidth="1px" borderStyle="dashed" borderRadius="lg" p={6}>
                            <Text color={mutedColor} fontSize="sm">
                                {t('header.timelinePage.lineLabels.empty')}
                            </Text>
                        </Box>
                    )}
                    <Stack spacing={4}>
                        {graph &&
                            lines.map(line => {
                                const label = getVideoLineLabel(graph, line);
                                return (
                                    <Box key={line.id} borderWidth="1px" borderRadius="xl" overflow="hidden">
                                        <HStack bg={cardBackground} spacing={3} px={4} py={3} borderBottomWidth="1px">
                                            <Box width="5px" height="36px" borderRadius="full" bg={label.color} />
                                            <Box flex={1} minW={0}>
                                                <Heading size="sm" noOfLines={1}>
                                                    {label.name[0] ||
                                                        label.name[1] ||
                                                        line.lineNumber ||
                                                        t('header.lineInfo.unnamed')}
                                                </Heading>
                                                {label.name[0] && label.name[1] && (
                                                    <Text color={mutedColor} fontSize="xs" noOfLines={1} mt={1}>
                                                        {label.name[1]}
                                                    </Text>
                                                )}
                                            </Box>
                                            {label.lineNumber && <Badge>{label.lineNumber}</Badge>}
                                            <Tooltip label={t('header.timelinePage.lineLabels.resetHint')}>
                                                <Button
                                                    leftIcon={<MdRestore />}
                                                    size="xs"
                                                    variant="ghost"
                                                    isDisabled={!line.videoLabel}
                                                    aria-label={`${t('header.timelinePage.lineLabels.reset')}: ${line.name.filter(Boolean).join(' / ') || line.id}`}
                                                    onClick={() => update(line.id)}
                                                >
                                                    {t('header.timelinePage.lineLabels.reset')}
                                                </Button>
                                            </Tooltip>
                                        </HStack>
                                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} p={4}>
                                            {([0, 1] as const).map(index => (
                                                <LabelField
                                                    key={index}
                                                    label={t(
                                                        `header.download.2rmg.placeholder.${index === 0 ? 'chinese' : 'english'}`
                                                    )}
                                                    value={label.name[index]}
                                                    onSave={name => {
                                                        const current =
                                                            latestProject.current?.revision.graph.attributes.lineDefinitions?.find(
                                                                item => item.id === line.id
                                                            );
                                                        const names: [string, string] = [
                                                            ...(current?.videoLabel?.name ??
                                                                current?.name ??
                                                                label.name),
                                                        ];
                                                        names[index] = name;
                                                        update(line.id, { name: names });
                                                    }}
                                                />
                                            ))}
                                            <LabelField
                                                label={t('header.lineInfo.lineNumber')}
                                                value={label.lineNumber}
                                                onSave={lineNumber => update(line.id, { lineNumber })}
                                            />
                                            <LabelField
                                                label={t('header.lineInfo.openingDate')}
                                                value={label.openingDate}
                                                placeholder="YYYY-MM-DD"
                                                isValid={isOpeningDateValid}
                                                error={t('header.lineInfo.invalidDate')}
                                                onSave={openingDate => update(line.id, { openingDate })}
                                            />
                                            <LabelField
                                                label={t('header.timelinePage.lineLabels.color')}
                                                value={label.color}
                                                placeholder="#1677ff"
                                                isValid={isColorValid}
                                                error={t('header.timelinePage.lineLabels.invalidColor')}
                                                onSave={color => update(line.id, { color: color.toLowerCase() })}
                                                leading={
                                                    <Input
                                                        type="color"
                                                        aria-label={`${t('header.timelinePage.lineLabels.color')} picker`}
                                                        value={pickerColor(label.color)}
                                                        width="44px"
                                                        height="32px"
                                                        padding={0.5}
                                                        flexShrink={0}
                                                        onChange={event =>
                                                            update(line.id, { color: event.target.value })
                                                        }
                                                    />
                                                }
                                            />
                                        </SimpleGrid>
                                    </Box>
                                );
                            })}
                    </Stack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px" justifyContent="space-between" gap={4}>
                    <Text fontSize="xs" color={mutedColor}>
                        {t('header.timelinePage.settings.savedWithProject')}
                    </Text>
                    <Button colorScheme="teal" onClick={close}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
