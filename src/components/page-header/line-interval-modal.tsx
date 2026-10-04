import {
    Box,
    Button,
    FormControl,
    FormLabel,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Stack,
    Text,
} from '@chakra-ui/react';
import type { SerializedGraph } from 'graphology-types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import type { LineDefinition } from '../../constants/line-definitions';
import {
    getLineEndpointsLabel,
    getLineRoutes,
    getLineTopology,
    getStationLabel,
    splitLineDefinition,
} from '../../util/line-definitions';
import {
    getLineIntervalDiagram,
    INTERVAL_PADDING as PADDING,
    INTERVAL_ROUTE_Y,
    INTERVAL_STATION_GAP as GAP,
} from '../../util/line-interval-diagram';

type Graph = SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
type Selection = { key: string; start: number; end: number };

export const LineIntervalModal = ({
    graph,
    line,
    onClose,
    onApply,
}: {
    graph: Graph;
    line: LineDefinition;
    onClose: () => void;
    onApply: (preview: Graph) => void;
}) => {
    const { t } = useTranslation();
    const topology = React.useMemo(() => getLineTopology(graph, line), [graph, line]);
    const isLoop = topology.type === 'LOOP';
    const [from, setFrom] = React.useState(line.exportStartStationId || topology.startCandidates[0] || '');
    const [to, setTo] = React.useState(topology.startCandidates.find(id => id !== from) || from);
    const [routeIndex, setRouteIndex] = React.useState(0);
    const [selection, setSelection] = React.useState<Selection>();
    const routes = React.useMemo(
        () => getLineRoutes(graph, line, from, isLoop ? from : to),
        [graph, line, from, to, isLoop]
    );
    const route = routes[Math.min(routeIndex, routes.length - 1)];
    const diagram = React.useMemo(() => route && getLineIntervalDiagram(graph, line, route), [graph, line, route]);
    const last = (route?.stationIds.length ?? 1) - 1;
    const end = selection?.key === route?.key ? Math.min(selection?.end ?? last, last) : last;
    const start = selection?.key === route?.key ? Math.min(selection?.start ?? 0, Math.max(0, end - 1)) : 0;
    const drag = React.useRef<{ handle: 'start' | 'end'; pointerId: number } | undefined>(undefined);
    const svgRef = React.useRef<SVGSVGElement>(null);
    const width = diagram?.width ?? 440;
    const preview = React.useMemo(() => {
        if (!route) return undefined;
        try {
            return splitLineDefinition(graph, line.id, route, start, end);
        } catch {
            return undefined;
        }
    }, [graph, line.id, route, start, end]);

    const move = (handle: 'start' | 'end', index: number) => {
        if (!route) return;
        setSelection({
            key: route.key,
            start: handle === 'start' ? Math.max(0, Math.min(index, end - 1)) : start,
            end: handle === 'end' ? Math.min(last, Math.max(index, start + 1)) : end,
        });
    };
    const swapArc = () => {
        if (!route || !isLoop) return;
        const a = route.stationIds[start],
            b = route.stationIds[end];
        if (a === b) return;
        const selected = new Set(route.segments.slice(start, end).flat());
        const options = getLineRoutes(graph, line, a, a);
        const index = options.findIndex(option => {
            const bIndex = option.stationIds.indexOf(b);
            return (
                bIndex > 0 &&
                option.segments
                    .slice(0, bIndex)
                    .flat()
                    .some(id => !selected.has(id))
            );
        });
        if (index < 0) return;
        setFrom(a);
        setRouteIndex(index);
        setSelection({ key: options[index].key, start: 0, end: options[index].stationIds.indexOf(b) });
    };
    const handleRing = (kind: 'start' | 'end', index: number, colour: string) => (
        <g
            role="slider"
            tabIndex={0}
            aria-label={t(`header.lineInfo.${kind === 'start' ? 'rangeStart' : 'rangeEnd'}`)}
            aria-valuemin={kind === 'start' ? 0 : start + 1}
            aria-valuemax={kind === 'start' ? end - 1 : last}
            aria-valuenow={index}
            aria-valuetext={route ? getStationLabel(graph, route.stationIds[index]) : ''}
            transform={`translate(${PADDING + index * GAP},${INTERVAL_ROUTE_Y})`}
            style={{ cursor: 'ew-resize', touchAction: 'none' }}
            onPointerDown={event => {
                if (event.button !== 0 || event.isPrimary === false) return;
                event.preventDefault();
                drag.current = { handle: kind, pointerId: event.pointerId };
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={event => {
                if (drag.current?.handle !== kind || drag.current.pointerId !== event.pointerId || !svgRef.current)
                    return;
                const rect = svgRef.current.getBoundingClientRect();
                if (rect.width)
                    move(kind, Math.round((((event.clientX - rect.left) * width) / rect.width - PADDING) / GAP));
            }}
            onPointerUp={event => {
                drag.current = undefined;
                event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={() => {
                drag.current = undefined;
            }}
            onLostPointerCapture={() => {
                drag.current = undefined;
            }}
            onKeyDown={event => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    move(
                        kind,
                        event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? last
                              : index + (event.key === 'ArrowLeft' ? -1 : 1)
                    );
                }
            }}
        >
            <circle r="18" fill="transparent" stroke={colour} strokeWidth="4" />
            <text y="-33" textAnchor="middle" fill={colour} fontSize="13">
                {t(`header.lineInfo.${kind === 'start' ? 'rangeStart' : 'rangeEnd'}`)}
            </text>
        </g>
    );

    return (
        <Modal isOpen onClose={onClose} size="4xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.lineInfo.editInterval')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Stack spacing="4">
                        <Text fontSize="sm">{t('header.lineInfo.intervalHelp')}</Text>
                        <HStack align="start" flexWrap="wrap">
                            <FormControl flex="1" minW="160px">
                                <FormLabel>
                                    {t(`header.lineInfo.${isLoop ? 'referenceStation' : 'pathStart'}`)}
                                </FormLabel>
                                <Select
                                    value={from}
                                    onChange={event => {
                                        setFrom(event.target.value);
                                        if (event.target.value === to)
                                            setTo(topology.startCandidates.find(id => id !== event.target.value) || '');
                                        setRouteIndex(0);
                                        setSelection(undefined);
                                    }}
                                >
                                    {topology.startCandidates.map(id => (
                                        <option key={id} value={id}>
                                            {getStationLabel(graph, id)}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                            {!isLoop && (
                                <FormControl flex="1" minW="160px">
                                    <FormLabel>{t('header.lineInfo.pathEnd')}</FormLabel>
                                    <Select
                                        value={to}
                                        onChange={event => {
                                            setTo(event.target.value);
                                            setRouteIndex(0);
                                            setSelection(undefined);
                                        }}
                                    >
                                        {topology.startCandidates
                                            .filter(id => id !== from)
                                            .map(id => (
                                                <option key={id} value={id}>
                                                    {getStationLabel(graph, id)}
                                                </option>
                                            ))}
                                    </Select>
                                </FormControl>
                            )}
                            {routes.length > 1 && (
                                <FormControl flex="1" minW="160px">
                                    <FormLabel>{t('header.lineInfo.path')}</FormLabel>
                                    <Select
                                        value={routeIndex}
                                        onChange={event => {
                                            setRouteIndex(Number(event.target.value));
                                            setSelection(undefined);
                                        }}
                                    >
                                        {routes.map((option, index) => (
                                            <option key={option.key} value={index}>
                                                {option.stationIds.map(id => getStationLabel(graph, id)).join(' — ')}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </HStack>
                        {topology.type === 'BRANCH' && <Text fontSize="sm">{t('header.lineInfo.branchHelp')}</Text>}
                        {route && diagram ? (
                            <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                                <svg
                                    ref={svgRef}
                                    width={width}
                                    height={diagram.height}
                                    viewBox={`0 0 ${width} ${diagram.height}`}
                                    aria-label={t('header.lineInfo.intervalDiagram')}
                                    style={{ display: 'block' }}
                                >
                                    {diagram.branches.map(branch => (
                                        <path
                                            key={branch.key}
                                            data-branch-edges={branch.edgeIds.join(' ')}
                                            d={branch.path}
                                            fill="none"
                                            stroke={topology.theme[2]}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity="0.5"
                                        />
                                    ))}
                                    <line
                                        x1={PADDING}
                                        x2={PADDING + last * GAP}
                                        y1={INTERVAL_ROUTE_Y}
                                        y2={INTERVAL_ROUTE_Y}
                                        stroke={topology.theme[2]}
                                        strokeWidth="5"
                                        opacity="0.3"
                                    />
                                    <line
                                        x1={PADDING + start * GAP}
                                        x2={PADDING + end * GAP}
                                        y1={INTERVAL_ROUTE_Y}
                                        y2={INTERVAL_ROUTE_Y}
                                        stroke={topology.theme[2]}
                                        strokeWidth="6"
                                    />
                                    {diagram.junctions.map(point => (
                                        <g key={point.id} transform={`translate(${point.x},${point.y})`}>
                                            {!point.id.startsWith('stn_') && <circle r="4" fill={topology.theme[2]} />}
                                            <text x="20" y="-18" fontSize="11" fill="currentColor">
                                                {t('header.lineInfo.junction')}
                                            </text>
                                        </g>
                                    ))}
                                    {diagram.stations.map(point => (
                                        <g
                                            key={point.key}
                                            data-station-id={point.stationId}
                                            data-on-route={point.onRoute}
                                            transform={`translate(${point.x},${point.y})`}
                                        >
                                            <circle r="8" fill="white" stroke={topology.theme[2]} strokeWidth="3" />
                                            <text
                                                transform="translate(12,38) rotate(25)"
                                                fontSize="12"
                                                fill="currentColor"
                                            >
                                                <title>{getStationLabel(graph, point.stationId)}</title>
                                                {getStationLabel(graph, point.stationId)}
                                            </text>
                                        </g>
                                    ))}
                                    {handleRing('start', start, '#3182ce')}
                                    {handleRing('end', end, '#dd6b20')}
                                </svg>
                            </Box>
                        ) : (
                            <Text>{t('header.lineInfo.noPath')}</Text>
                        )}
                        {isLoop && (
                            <Button
                                alignSelf="start"
                                size="sm"
                                onClick={swapArc}
                                isDisabled={!route || route.stationIds[start] === route.stationIds[end]}
                            >
                                {t('header.lineInfo.otherArc')}
                            </Button>
                        )}
                        {route && (
                            <Text>
                                {t('header.lineInfo.selection')}: {getStationLabel(graph, route.stationIds[start])} —{' '}
                                {getStationLabel(graph, route.stationIds[end])}
                            </Text>
                        )}
                        {preview ? (
                            <Box>
                                <Text fontWeight="bold">{t('header.lineInfo.splitPreview')}</Text>
                                {preview.attributes?.lineDefinitions
                                    ?.filter(
                                        item =>
                                            item.id === line.id ||
                                            !graph.attributes?.lineDefinitions?.some(old => old.id === item.id)
                                    )
                                    .map(item => (
                                        <Text key={item.id}>{getLineEndpointsLabel(preview, item)}</Text>
                                    ))}
                            </Box>
                        ) : (
                            <Text fontSize="sm">{t('header.lineInfo.properInterval')}</Text>
                        )}
                    </Stack>
                </ModalBody>
                <ModalFooter gap="2">
                    <Button variant="outline" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button
                        colorScheme="blue"
                        isDisabled={!preview}
                        onClick={() => {
                            if (preview) onApply(preview);
                        }}
                    >
                        {t('header.lineInfo.split')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
