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
import { MdClose, MdDragIndicator } from 'react-icons/md';
import { Id, NodeId, Theme } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph, setSvgViewBoxMin, setSvgViewBoxZoom } from '../../redux/param/param-slice';
import { clearSelected, setSelected } from '../../redux/runtime/runtime-slice';
import ThemeButton from '../panels/theme-button';
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

interface TimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PickState =
    | { step: 'idle' }
    | { step: 'pickingStart' }
    | { step: 'pickingTheme'; startNode: NodeId }
    | { step: 'pickingEnd'; startNode: NodeId; theme: Theme };

export default function TimelineModal({ isOpen, onClose }: TimelineModalProps) {
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const selected = useRootSelector(state => state.runtime.selected);

    const [pickState, setPickState] = React.useState<PickState>({ step: 'idle' });
    const [timeline, setTimelineState] = React.useState<Id[]>([]);
    const [availableThemes, setAvailableThemes] = React.useState<Theme[]>([]);
    const [unaddedNodes, setUnaddedNodes] = React.useState<NodeId[]>([]);

    // drag state
    const [dragIndex, setDragIndex] = React.useState<number | null>(null);

    // Sync timeline from graph on open
    React.useEffect(() => {
        if (isOpen) {
            const tl = getTimeline(graph.current);
            setTimelineState(tl);
            setUnaddedNodes(getUnaddedNodes(graph.current, tl));
            setPickState({ step: 'idle' });
        }
    }, [isOpen]);

    // Watch runtime.selected during picking states
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
                    const newTimeline = deduplicateTimeline(timeline, path);
                    updateTimeline(newTimeline);
                } else {
                    // TODO: show no-path alert
                }
                setPickState({ step: 'idle' });
                dispatch(clearSelected());
            }
        }
    }, [selected]);

    const updateTimeline = (newTimeline: Id[]) => {
        setTimelineState(newTimeline);
        setTimeline(graph.current, newTimeline);
        dispatch(saveGraph(graph.current.export()));
        setUnaddedNodes(getUnaddedNodes(graph.current, newTimeline));
    };

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
        // If there's already exactly one node selected, use it as start directly
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
        const newTimeline = timeline.filter((_, i) => i !== index);
        updateTimeline(newTimeline);
    };

    // Drag-and-drop handlers
    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;

        const newTimeline = [...timeline];
        const [removed] = newTimeline.splice(dragIndex, 1);
        newTimeline.splice(index, 0, removed);
        setTimelineState(newTimeline);
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        // Save the reordered timeline
        updateTimeline(timeline);
    };

    // Collapsed picking mode: render a floating bar instead of full modal
    if (pickState.step === 'pickingStart' || pickState.step === 'pickingEnd') {
        return (
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
        );
    }

    // Full modal mode
    return (
        <Modal size="2xl" isOpen={isOpen} onClose={onClose} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.timeline.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {pickState.step === 'pickingTheme' ? (
                        /* Theme selection only — no timeline list */
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
                                    const newTimeline = deduplicateTimeline(timeline, [pickState.startNode]);
                                    updateTimeline(newTimeline);
                                    setPickState({ step: 'idle' });
                                }}
                            >
                                {t('header.timeline.addStationOnly')}
                            </Button>
                        </Box>
                    ) : (
                        <>
                            {/* Timeline list */}
                            {timeline.length > 0 ? (
                                <VStack align="stretch" spacing={1}>
                                    {timeline.map((id, index) => (
                                        <TimelineItem
                                            key={`${id}-${index}`}
                                            id={id}
                                            index={index}
                                            graph={graph.current}
                                            isDragging={dragIndex === index}
                                            onRemove={() => handleRemoveItem(index)}
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

                            {/* Unadded nodes */}
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
                                                colorScheme={(nodeId as string).startsWith('stn_') ? 'teal' : 'purple'}
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
                        <HStack>
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
                            <Button size="sm" onClick={onClose}>
                                {t('close')}
                            </Button>
                        </HStack>
                    </ModalFooter>
                )}
            </ModalContent>
        </Modal>
    );
}

function TimelineItem({
    id,
    index,
    graph,
    isDragging,
    onRemove,
    onDragStart,
    onDragOver,
    onDragEnd,
}: {
    id: Id;
    index: number;
    graph: import('graphology').MultiDirectedGraph<
        import('../../constants/constants').NodeAttributes,
        import('../../constants/constants').EdgeAttributes,
        import('../../constants/constants').GraphAttributes
    >;
    isDragging: boolean;
    onRemove: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
}) {
    const isNode = (id as string).startsWith('stn_') || (id as string).startsWith('misc_node_');

    if (isNode) {
        const name = getNodeDisplayName(graph, id as NodeId);
        return (
            <HStack
                p={1}
                borderRadius="sm"
                bg={isDragging ? 'teal.50' : undefined}
                opacity={isDragging ? 0.7 : 1}
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                cursor="grab"
            >
                <MdDragIndicator />
                <Badge colorScheme={(id as string).startsWith('stn_') ? 'teal' : 'purple'} fontSize="xs">
                    {index + 1}
                </Badge>
                <Text flex={1} fontSize="sm">
                    {name}
                </Text>
                <IconButton aria-label="Remove" icon={<MdClose />} size="xs" variant="ghost" onClick={onRemove} />
            </HStack>
        );
    }

    // Edge item
    let colors: Theme[] = [];
    if (graph.hasEdge(id)) {
        colors = getEdgeThemes(graph, id);
    }

    let label: string = id;
    if (graph.hasEdge(id)) {
        const [source, target] = graph.extremities(id);
        label = `${getNodeDisplayName(graph, source as NodeId)} → ${getNodeDisplayName(graph, target as NodeId)}`;
    }

    return (
        <HStack
            p={1}
            borderRadius="sm"
            bg={isDragging ? 'teal.50' : undefined}
            opacity={isDragging ? 0.7 : 1}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            cursor="grab"
        >
            <MdDragIndicator />
            <Badge colorScheme="gray" fontSize="xs">
                {index + 1}
            </Badge>
            {colors.map((c, i) => (
                <Box key={i} w="20px" h="4px" bg={c[2]} borderRadius="sm" />
            ))}
            <Text flex={1} fontSize="xs" color="gray.500">
                {label}
            </Text>
            <IconButton aria-label="Remove" icon={<MdClose />} size="xs" variant="ghost" onClick={onRemove} />
        </HStack>
    );
}
