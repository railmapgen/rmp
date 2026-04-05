import rmgRuntime from '@railmapgen/rmg-runtime';
import {
    Badge,
    Box,
    Button,
    HStack,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useColorModeValue,
    VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdClose, MdDragIndicator, MdSwapHoriz } from 'react-icons/md';
import { Id, NodeId, Theme, TimelineEntry } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, setSelected } from '../../redux/runtime/runtime-slice';
import {
    deduplicateTimeline,
    findPathByTheme,
    findThemesAtNode,
    getEdgeThemes,
    getNodeDisplayName,
    getTimeline,
    getUnaddedNodes,
    setTimeline,
} from '../../util/timeline';
import ThemeButton from '../panels/theme-button';

interface TimelineModalProps {
    isOpen: boolean;
    onClose: (shouldSave: boolean) => void;
}

type PickState =
    | { step: 'idle' }
    | { step: 'pickingStart' }
    | { step: 'pickingTheme'; startNode: NodeId }
    | { step: 'pickingEnd'; startNode: NodeId; theme: Theme };

const isNodeId = (id: Id) => id.startsWith('stn_') || id.startsWith('misc_node_');
const isLineId = (id: Id) => id.startsWith('line_');

export default function TimelineModal({ isOpen, onClose }: TimelineModalProps) {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const selected = useRootSelector(state => state.runtime.selected);

    const [pickState, setPickState] = React.useState<PickState>({ step: 'idle' });
    const [timeline, setTimelineState] = React.useState<TimelineEntry[]>([]);
    const [availableThemes, setAvailableThemes] = React.useState<Theme[]>([]);
    const [unaddedNodes, setUnaddedNodes] = React.useState<NodeId[]>([]);
    const [selectedLineIndexes, setSelectedLineIndexes] = React.useState<Set<number>>(new Set());

    const handleClose = (shouldSave: boolean) => {
        if (shouldSave) {
            setTimeline(graph.current, timeline);
            dispatch(saveGraph(graph.current.export()));
            rmgRuntime.event('timeline_updated', { timeline: getTimeline(graph.current) });
        }
        onClose(shouldSave);
    };

    const updateTimeline = (newTimeline: TimelineEntry[], options?: { preserveSelection?: boolean }) => {
        setTimelineState(newTimeline);
        setUnaddedNodes(getUnaddedNodes(graph.current, newTimeline));
        if (!options?.preserveSelection) {
            setSelectedLineIndexes(new Set());
            return;
        }
        setSelectedLineIndexes(prev => {
            const next = new Set<number>();
            for (const index of prev) {
                if (newTimeline[index] && isLineId(newTimeline[index].id)) {
                    next.add(index);
                }
            }
            return next;
        });
    };

    React.useEffect(() => {
        if (isOpen) {
            const nextTimeline = getTimeline(graph.current);
            setTimelineState(nextTimeline);
            setUnaddedNodes(getUnaddedNodes(graph.current, nextTimeline));
            setSelectedLineIndexes(new Set());
            setPickState({ step: 'idle' });
        }
    }, [isOpen]);

    const prevSelectedRef = React.useRef(selected);
    React.useEffect(() => {
        if (selected === prevSelectedRef.current) return;
        prevSelectedRef.current = selected;

        if (pickState.step === 'pickingStart') {
            const first = [...selected][0];
            const id = first as string;
            if (first && (id.startsWith('stn_') || id.startsWith('misc_node_'))) {
                const startNode = first as NodeId;
                const themes = findThemesAtNode(graph.current, startNode);
                setAvailableThemes(themes);
                setPickState({ step: 'pickingTheme', startNode });
                dispatch(clearSelected());
            }
        } else if (pickState.step === 'pickingEnd') {
            const first = [...selected][0];
            const id = first as string;
            if (first && (id.startsWith('stn_') || id.startsWith('misc_node_'))) {
                const endNode = first as NodeId;
                const path = findPathByTheme(graph.current, pickState.startNode, endNode, pickState.theme);
                if (path) {
                    updateTimeline(
                        deduplicateTimeline(
                            timeline.map(e => e.id),
                            path
                        ).map(id => ({ id }))
                    );
                } else {
                    rmgRuntime.sendNotification({
                        title: t('header.timeline.noPath'),
                        message: '',
                        type: 'warning',
                        duration: 5000,
                    });
                }
                setPickState({ step: 'idle' });
                dispatch(clearSelected());
            }
        }
    }, [dispatch, pickState, selected, t, timeline]);

    const panToNode = (nodeId: NodeId) => {
        if (!graph.current.hasNode(nodeId)) return;
        const x = graph.current.getNodeAttribute(nodeId, 'x');
        const y = graph.current.getNodeAttribute(nodeId, 'y');
        const targetZoom = 100;
        const canvasW = (window.innerWidth - 40) * (targetZoom / 100);
        const canvasH = (window.innerHeight - 40) * (targetZoom / 100);
        dispatch(setSvgViewBoxZoom(targetZoom));
        dispatch(setSvgViewBoxMin({ x: x - canvasW / 2, y: y - canvasH / 2 }));
        dispatch(setSelected(new Set([nodeId])));
    };

    const handleAddSegment = () => {
        if (selected.size === 1) {
            const first = [...selected][0];
            const id = first as string;
            if (id.startsWith('stn_') || id.startsWith('misc_node_')) {
                const startNode = first as NodeId;
                const themes = findThemesAtNode(graph.current, startNode);
                setAvailableThemes(themes);
                setPickState({ step: 'pickingTheme', startNode });
                dispatch(clearSelected());
                return;
            }
        }
        setPickState({ step: 'pickingStart' });
    };

    const handleClearTimeline = () => {
        updateTimeline([]);
    };

    const handleRemoveItem = (index: number) => {
        updateTimeline(timeline.filter((_, i) => i !== index));
    };

    const handleToggleItemReverse = (index: number) => {
        updateTimeline(
            timeline.map((item, itemIndex) =>
                itemIndex === index && isLineId(item.id) ? { ...item, reverse: !item.reverse } : item
            ),
            { preserveSelection: true }
        );
    };

    const handleToggleLineSelection = (index: number, checked: boolean) => {
        setSelectedLineIndexes(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(index);
            } else {
                next.delete(index);
            }
            return next;
        });
    };

    const handleReverseSelected = () => {
        updateTimeline(
            timeline.map((item, index) =>
                selectedLineIndexes.has(index) && isLineId(item.id) ? { ...item, reverse: !item.reverse } : item
            ),
            { preserveSelection: true }
        );
    };

    const dragTimelineRef = React.useRef(timeline);

    const handleDragStart = (index: number) => {
        setSelectedLineIndexes(new Set());
        dragTimelineRef.current = timeline;
        setDragIndex(index);
    };

    const [dragIndex, setDragIndex] = React.useState<number | null>(null);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;

        const newTimeline = [...dragTimelineRef.current];
        const [removed] = newTimeline.splice(dragIndex, 1);
        newTimeline.splice(index, 0, removed);
        dragTimelineRef.current = newTimeline;
        setTimelineState(newTimeline);
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        updateTimeline(dragTimelineRef.current);
    };

    const isPicking = pickState.step === 'pickingStart' || pickState.step === 'pickingEnd';
    const selectedLineCount = selectedLineIndexes.size;

    return (
        <>
            {isPicking && (
                <Box
                    position="fixed"
                    top="40px"
                    left="50%"
                    transform="translateX(-50%)"
                    bg={bgColor}
                    px={4}
                    py={2}
                    borderRadius="md"
                    boxShadow="lg"
                    zIndex="modal"
                >
                    <HStack>
                        <Text fontWeight="bold">
                            {pickState.step === 'pickingStart'
                                ? t('header.timeline.pickStart')
                                : t('header.timeline.pickEnd')}
                        </Text>
                        <Button size="sm" variant="outline" onClick={() => setPickState({ step: 'idle' })}>
                            {t('cancel')}
                        </Button>
                    </HStack>
                </Box>
            )}

            <Modal size="2xl" isOpen={isOpen && !isPicking} onClose={() => handleClose(false)} scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.timeline.title')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        {pickState.step === 'pickingTheme' ? (
                            <Box p={3} borderWidth="1px" borderRadius="md">
                                <HStack mb={2} justifyContent="space-between">
                                    <Text fontWeight="bold">{t('header.timeline.selectTheme')}</Text>
                                    <Button size="xs" variant="outline" onClick={() => setPickState({ step: 'idle' })}>
                                        {t('cancel')}
                                    </Button>
                                </HStack>
                                <HStack flexWrap="wrap" spacing={2}>
                                    {availableThemes.map((theme, i) => (
                                        <ThemeButton
                                            key={i}
                                            theme={theme}
                                            onClick={() =>
                                                setPickState({
                                                    step: 'pickingEnd',
                                                    startNode: pickState.startNode,
                                                    theme,
                                                })
                                            }
                                        />
                                    ))}
                                </HStack>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    mt={3}
                                    onClick={() => {
                                        updateTimeline(
                                            deduplicateTimeline(
                                                timeline.map(e => e.id),
                                                [pickState.startNode]
                                            ).map(id => ({
                                                id,
                                            }))
                                        );
                                        setPickState({ step: 'idle' });
                                    }}
                                >
                                    {t('header.timeline.addStationOnly')}
                                </Button>
                            </Box>
                        ) : (
                            <>
                                {timeline.length > 0 ? (
                                    <VStack align="stretch" spacing={1}>
                                        {timeline.map((entry, index) => (
                                            <TimelineItem
                                                key={`${entry.id}-${index}`}
                                                entry={entry}
                                                index={index}
                                                graph={graph.current}
                                                isDragging={dragIndex === index}
                                                isSelected={selectedLineIndexes.has(index)}
                                                onSelectionChange={checked => handleToggleLineSelection(index, checked)}
                                                onRemove={handleRemoveItem}
                                                onToggleReverse={handleToggleItemReverse}
                                                onDragStart={() => handleDragStart(index)}
                                                onDragOver={e => handleDragOver(e, index)}
                                                onDragEnd={handleDragEnd}
                                            />
                                        ))}
                                    </VStack>
                                ) : (
                                    <Text color="gray.500" mb={4}>
                                        {t('header.timeline.empty')}
                                    </Text>
                                )}

                                {unaddedNodes.length > 0 && (
                                    <Box mt={4}>
                                        <Text fontSize="sm" color="gray.500" mb={1}>
                                            {t('header.timeline.unadded', { count: unaddedNodes.length })}
                                        </Text>
                                        <HStack flexWrap="wrap" spacing={1}>
                                            {unaddedNodes.slice(0, 30).map(nodeId => (
                                                <Button
                                                    key={nodeId}
                                                    size="xs"
                                                    variant="outline"
                                                    colorScheme={
                                                        (nodeId as string).startsWith('stn_') ? 'teal' : 'purple'
                                                    }
                                                    onClick={() => panToNode(nodeId)}
                                                >
                                                    {getNodeDisplayName(graph.current, nodeId)}
                                                </Button>
                                            ))}
                                            {unaddedNodes.length > 30 && (
                                                <Badge fontSize="xs" variant="outline">
                                                    ...+{unaddedNodes.length - 30}
                                                </Badge>
                                            )}
                                        </HStack>
                                    </Box>
                                )}
                            </>
                        )}
                    </ModalBody>

                    {pickState.step !== 'pickingTheme' && (
                        <ModalFooter>
                            <HStack flexWrap="wrap" justifyContent="flex-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    colorScheme="red"
                                    onClick={handleClearTimeline}
                                    isDisabled={timeline.length === 0}
                                >
                                    {t('header.timeline.clearAll')}
                                </Button>
                                <Button size="sm" colorScheme="teal" onClick={handleAddSegment}>
                                    {t('header.timeline.addSegment')}
                                </Button>
                                <Button size="sm" onClick={() => handleClose(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button size="sm" colorScheme="teal" onClick={() => handleClose(true)}>
                                    {t('apply')}
                                </Button>
                            </HStack>
                        </ModalFooter>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}

function TimelineItem({
    entry,
    index,
    graph,
    isDragging,
    isSelected,
    onSelectionChange,
    onRemove,
    onToggleReverse,
    onDragStart,
    onDragOver,
    onDragEnd,
}: {
    entry: TimelineEntry;
    index: number;
    graph: import('graphology').MultiDirectedGraph<
        import('../../constants/constants').NodeAttributes,
        import('../../constants/constants').EdgeAttributes,
        import('../../constants/constants').GraphAttributes
    >;
    isDragging: boolean;
    isSelected: boolean;
    onSelectionChange: (checked: boolean) => void;
    onRemove: (index: number) => void;
    onToggleReverse: (index: number) => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
}) {
    const { t } = useTranslation();
    const isNode = isNodeId(entry.id);
    const borderColor = isSelected ? 'blue.300' : isDragging ? 'teal.300' : 'transparent';
    const bg = isSelected ? 'blue.50' : isDragging ? 'teal.50' : undefined;
    const boxShadow = isDragging ? 'sm' : undefined;

    if (isNode) {
        const name = getNodeDisplayName(graph, entry.id as NodeId);
        return (
            <HStack
                p={1}
                borderRadius="sm"
                borderWidth="1px"
                borderColor={borderColor}
                bg={bg}
                boxShadow={boxShadow}
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                cursor="grab"
            >
                <MdDragIndicator />
                <Badge colorScheme={(entry.id as string).startsWith('stn_') ? 'teal' : 'purple'} fontSize="xs">
                    {index + 1}
                </Badge>
                <Text flex={1} fontSize="sm">
                    {name}
                </Text>
                <IconButton
                    aria-label="Remove"
                    icon={<MdClose />}
                    size="xs"
                    variant="ghost"
                    onClick={e => {
                        e.stopPropagation();
                        onRemove(index);
                    }}
                />
            </HStack>
        );
    }

    const colors = graph.hasEdge(entry.id) ? getEdgeThemes(graph, entry.id) : [];
    let label: string = entry.id;
    if (graph.hasEdge(entry.id)) {
        const [source, target] = graph.extremities(entry.id);
        label = `${getNodeDisplayName(graph, source as NodeId)} -> ${getNodeDisplayName(graph, target as NodeId)}`;
    }

    return (
        <HStack
            p={1}
            borderRadius="sm"
            borderWidth="1px"
            borderColor={borderColor}
            bg={bg}
            boxShadow={boxShadow}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            cursor="grab"
            spacing={2}
            onClick={() => onSelectionChange(!isSelected)}
        >
            <MdDragIndicator />
            <Badge colorScheme="gray" fontSize="xs">
                {index + 1}
            </Badge>
            {colors.map((color, i) => (
                <Box key={i} w="20px" h="4px" bg={color[2]} borderRadius="sm" />
            ))}
            <Text flex={1} fontSize="xs" color="gray.600">
                {label}
            </Text>
            {/* timeline reverse button */}
            <Button
                ml="auto"
                size="xs"
                colorScheme="orange"
                variant={entry.reverse ? 'solid' : 'outline'}
                leftIcon={<MdSwapHoriz />}
                onClick={e => {
                    e.stopPropagation();
                    onToggleReverse(index);
                }}
            >
                {t('header.timeline.reverse')}
            </Button>
            <IconButton
                aria-label="Remove"
                icon={<MdClose />}
                size="xs"
                variant="ghost"
                onClick={e => {
                    e.stopPropagation();
                    onRemove(index);
                }}
            />
        </HStack>
    );
}
