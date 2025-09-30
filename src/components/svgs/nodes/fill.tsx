import { Checkbox, VStack } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AttrsProps,
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    StnId,
} from '../../../constants/constants';
import { Path } from '../../../constants/lines';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { useRootSelector } from '../../../redux';
import { getDynamicContrastColor } from '../../../util/color';
import { NonSimpleLinePathAttributes } from '../../../util/parallel';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { linePaths } from '../lines/lines';

const MAX_NODES = 100;

/**
 * Find the shortest closed path starting from a node using a modified BFS.
 */
const findShortestClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    startNode: StnId | MiscNodeId,
    maxNodes: number = MAX_NODES
): { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined => {
    if (!graph.hasNode(startNode)) {
        return undefined;
    }

    const queue: { node: StnId | MiscNodeId; path: (StnId | MiscNodeId)[]; edges: LineId[]; fromEdge?: LineId }[] = [
        { node: startNode, path: [startNode], edges: [] },
    ];

    let shortestPath: { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined;

    while (queue.length > 0) {
        const { node, path, edges, fromEdge } = queue.shift()!;

        if (shortestPath && path.length >= shortestPath.nodes.length) {
            continue;
        }
        if (path.length > maxNodes) {
            continue;
        }

        graph.forEachEdge(node, (edge, attrs, source, target) => {
            if (edge === fromEdge) {
                return;
            }

            const neighbor = (source === node ? target : source) as StnId | MiscNodeId;

            if (neighbor === startNode) {
                const finalPath = {
                    nodes: [...path, startNode],
                    edges: [...edges, edge as LineId],
                };
                if (!shortestPath || finalPath.nodes.length < shortestPath.nodes.length) {
                    shortestPath = finalPath;
                }
                return;
            }

            if (!path.includes(neighbor)) {
                queue.push({
                    node: neighbor,
                    path: [...path, neighbor],
                    edges: [...edges, edge as LineId],
                    fromEdge: edge as LineId,
                });
            }
        });
    }

    return shortestPath;
};

/**
 * Generate the combined SVG path string for the closed loop with detailed logging.
 */
const generateClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: (StnId | MiscNodeId)[],
    edges: LineId[]
): Path | undefined => {
    if (nodes.length !== edges.length + 1 || nodes.length < 3) return undefined;

    let pathString = '';

    for (let i = 0; i < edges.length; i++) {
        const sourceNodeId = nodes[i];
        const targetNodeId = nodes[i + 1];
        const edgeId = edges[i];

        const sourceAttrs = graph.getNodeAttributes(sourceNodeId);
        const targetAttrs = graph.getNodeAttributes(targetNodeId);
        const edgeAttrs = graph.getEdgeAttributes(edgeId);
        const pathType = edgeAttrs.type;
        const initialPathAttr = edgeAttrs[pathType];

        const x1 = sourceAttrs.x,
            y1 = sourceAttrs.y,
            x2 = targetAttrs.x,
            y2 = targetAttrs.y;
        const finalPathAttr = structuredClone(initialPathAttr);

        const isReversed = graph.source(edgeId) !== sourceNodeId;

        if (isReversed) {
            if ((finalPathAttr as any)?.startFrom) {
                (finalPathAttr as NonSimpleLinePathAttributes).startFrom =
                    (finalPathAttr as NonSimpleLinePathAttributes).startFrom === 'from' ? 'to' : 'from';
            }
        }

        let segment: string =
            linePaths[pathType]?.generatePath(x1, x2, y1, y2, finalPathAttr as any) || `M ${x1} ${y1} L ${x2} ${y2}`;

        if (i > 0) {
            const parts = segment.split(' ');
            // we slice from the 4th element (index 3) to remove the initial move command and its coordinates.
            segment = parts.slice(3).join(' ');
        }

        pathString += (i > 0 ? ' ' : '') + segment;
    }

    const finalFullPath = pathString + ' Z';
    return finalFullPath as Path;
};

const Fill = (props: NodeComponentProps<FillAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultFillAttributes.color,
        opacity = defaultFillAttributes.opacity,
        selectedPatterns = defaultFillAttributes.selectedPatterns,
    } = attrs ?? defaultFillAttributes;

    const { t } = useTranslation();
    const { refresh } = useRootSelector(state => state.runtime);
    const graph = window.graph!;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const closedPath = React.useMemo(() => findShortestClosedPath(graph, id), [graph, id, refresh]);
    const fillPath = React.useMemo(() => {
        if (!closedPath) return undefined;
        return generateClosedPath(graph, closedPath.nodes, closedPath.edges);
    }, [closedPath]);

    const pattern = { width: 60, height: 60 };
    const patternColor = getDynamicContrastColor(color[2], opacity);
    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {fillPath && (
                <g transform={`translate(${-x}, ${-y})`}>
                    <defs>
                        <pattern
                            id={`logo_${id}`}
                            patternUnits="userSpaceOnUse"
                            width={pattern.width * 2}
                            height={pattern.height}
                            fill={patternColor}
                            fontFamily="Arial, sans-serif"
                        >
                            <text x="2" y="24" fontSize="4">
                                {t('Rail Map Painter')}
                            </text>
                            <text x="2" y="28" fontSize="4">
                                https://railmapgen.org/
                            </text>
                        </pattern>
                        <pattern
                            id={`trees_${id}`}
                            patternUnits="userSpaceOnUse"
                            width={pattern.width}
                            height={pattern.height}
                            fill="none"
                            stroke={patternColor}
                            strokeWidth="0.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path
                                transform="translate(0,0)"
                                d="M10 20 L10 14 L4 16 L10 8 L4 10 L10 2 L16 10 L10 8 L16 16 L10 14"
                            />
                        </pattern>
                        <pattern
                            id={`water_${id}`}
                            patternUnits="userSpaceOnUse"
                            width={pattern.width}
                            height={pattern.height}
                            fill="none"
                            stroke={patternColor}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                        >
                            <path transform="translate(20,0)" d="M2 4 Q7 -2 12 4 T18 4" />
                            <path transform="translate(20,0)" d="M2 10 Q7 4 12 10 T18 10" />
                            <path transform="translate(20,0)" d="M2 16 Q7 10 12 16 T18 16" />
                        </pattern>
                    </defs>
                    <path d={fillPath} fill={color[2]} fillOpacity={opacity} stroke="none" pointerEvents="none" />
                    {selectedPatterns.map(patternId => (
                        <path
                            key={patternId}
                            d={fillPath}
                            fill={`url(#${patternId}_${id})`}
                            fillOpacity={opacity}
                            stroke="none"
                            pointerEvents="none"
                        />
                    ))}
                </g>
            )}
            <g transform="rotate(45)" className="removeMe">
                <circle r="5" fill={color[2]} stroke="#000" />
                <line x1="-5" y1="0" x2="5" y2="0" stroke="black" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="black" />
                <circle
                    r="5"
                    fill="rgb(255, 255, 255, 0)"
                    stroke="rgb(0, 0, 0, 0)"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        </g>
    );
};

export interface FillAttributes extends ColorAttribute {
    opacity: number;
    selectedPatterns: string[];
}

export const defaultFillAttributes: FillAttributes = {
    color: [CityCode.Shanghai, 'fill', '#FF0000', MonoColour.white],
    opacity: 0.5,
    selectedPatterns: ['logo'],
};

const fillAttrsComponent = (props: AttrsProps<FillAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const { activeSubscriptions } = useRootSelector(state => state.account);

    const handlePatternChange = (patternId: string, isChecked: boolean) => {
        const currentPatterns = attrs.selectedPatterns ?? [];
        const newPatterns = isChecked ? [...currentPatterns, patternId] : currentPatterns.filter(p => p !== patternId);
        handleAttrsUpdate(id, { ...attrs, selectedPatterns: newPatterns });
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.fill.opacity'),
            value: (attrs.opacity ?? defaultFillAttributes.opacity).toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
            onChange: val => {
                handleAttrsUpdate(id, { ...attrs, opacity: Number(val) });
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.Fill} defaultTheme={defaultFillAttributes.color} />,
        },
        {
            type: 'custom',
            label: t('panel.details.nodes.fill.patterns'),
            component: (
                <VStack alignItems="flex-start">
                    <Checkbox
                        isChecked={(attrs.selectedPatterns ?? []).includes('logo')}
                        onChange={e => handlePatternChange('logo', e.target.checked)}
                        isDisabled={!activeSubscriptions.RMP_CLOUD}
                    >
                        {t('panel.details.nodes.fill.logo')}
                    </Checkbox>
                    <Checkbox
                        isChecked={(attrs.selectedPatterns ?? []).includes('trees')}
                        onChange={e => handlePatternChange('trees', e.target.checked)}
                    >
                        {t('panel.details.nodes.fill.trees')}
                    </Checkbox>
                    <Checkbox
                        isChecked={(attrs.selectedPatterns ?? []).includes('water')}
                        onChange={e => handlePatternChange('water', e.target.checked)}
                    >
                        {t('panel.details.nodes.fill.water')}
                    </Checkbox>
                </VStack>
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const fillIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" />
    </svg>
);

const fill: Node<FillAttributes> = {
    component: Fill,
    icon: fillIcon,
    defaultAttrs: defaultFillAttributes,
    attrsComponent: fillAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.fill.displayName',
        tags: [],
    },
};

export default fill;
