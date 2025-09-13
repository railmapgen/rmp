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
import { linePaths } from '../lines/lines';
import { LinePathType, Path } from '../../../constants/lines';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

/**
 * Find the shortest closed path starting from a node using a modified BFS.
 * Returns undefined if no closed path is found within the max node limit.
 */
const findShortestClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    startNode: StnId | MiscNodeId,
    maxNodes: number = 100
): { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined => {
    // Priority queue for paths, prioritizing shorter paths
    const queue: { node: StnId | MiscNodeId; path: (StnId | MiscNodeId)[]; edges: LineId[]; depth: number }[] = [
        { node: startNode, path: [startNode], edges: [], depth: 0 },
    ];

    let shortestPath: { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined;

    // Sort by depth to explore shorter paths first
    const sortQueue = () => {
        queue.sort((a, b) => a.depth - b.depth);
    };

    while (queue.length > 0) {
        sortQueue();
        const { node, path, edges, depth } = queue.shift()!;

        // Skip if path is too long or we already found a shorter path
        if (depth > maxNodes || (shortestPath && depth >= shortestPath.nodes.length)) continue;

        // Get all neighbors of current node (treat graph as undirected)
        const neighbors = new Map<StnId | MiscNodeId, LineId>();

        // Outgoing edges
        graph.forEachOutboundEdge(node, (edge, attributes, source, target) => {
            if (!neighbors.has(target as StnId | MiscNodeId)) {
                neighbors.set(target as StnId | MiscNodeId, edge as LineId);
            }
        });

        // Incoming edges (treat as undirected)
        graph.forEachInboundEdge(node, (edge, attributes, source, target) => {
            if (!neighbors.has(source as StnId | MiscNodeId)) {
                neighbors.set(source as StnId | MiscNodeId, edge as LineId);
            }
        });

        for (const [neighbor, edge] of neighbors) {
            // If we found a cycle back to start and path has at least 3 nodes
            if (neighbor === startNode && path.length >= 3) {
                const newPath = {
                    nodes: [...path, startNode],
                    edges: [...edges, edge],
                };

                // Keep the shortest path found so far
                if (!shortestPath || newPath.nodes.length < shortestPath.nodes.length) {
                    shortestPath = newPath;
                }
                continue;
            }

            // Continue exploring if not visited in current path
            if (!path.includes(neighbor)) {
                queue.push({
                    node: neighbor,
                    path: [...path, neighbor],
                    edges: [...edges, edge],
                    depth: depth + 1,
                });
            }
        }
    }

    return shortestPath;
};

/**
 * Generate the combined path for the closed loop
 */
const generateClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: (StnId | MiscNodeId)[],
    edges: LineId[]
): Path | undefined => {
    if (nodes.length !== edges.length + 1 || nodes.length < 4) return undefined;

    const pathSegments: string[] = [];
    let startPoint: { x: number; y: number } | undefined;

    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const sourceNode = nodes[i];
        const targetNode = nodes[i + 1];

        if (!graph.hasEdge(edge) || !graph.hasNode(sourceNode) || !graph.hasNode(targetNode)) {
            return undefined;
        }

        const sourceAttr = graph.getNodeAttributes(sourceNode);
        const targetAttr = graph.getNodeAttributes(targetNode);
        const edgeAttrs = graph.getEdgeAttributes(edge);

        const x1 = sourceAttr.x;
        const y1 = sourceAttr.y;
        const x2 = targetAttr.x;
        const y2 = targetAttr.y;

        if (i === 0) {
            startPoint = { x: x1, y: y1 };
        }

        const pathType = edgeAttrs.type;
        const pathAttr = edgeAttrs[pathType];

        let pathStr: string;

        if (pathType in linePaths) {
            try {
                pathStr = linePaths[pathType].generatePath(x1, x2, y1, y2, pathAttr as any);
            } catch (error) {
                // Fallback to simple line if path generation fails
                pathStr = `M ${x1} ${y1} L ${x2} ${y2}`;
            }
        } else {
            // Fallback to simple line
            pathStr = `M ${x1} ${y1} L ${x2} ${y2}`;
        }

        if (i === 0) {
            // For the first segment, use the full path
            pathSegments.push(pathStr);
        } else {
            // For subsequent segments, extract the path data after the M command
            const pathCommands = pathStr.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
            const nonMoveCommands = pathCommands.filter(cmd => !cmd.startsWith('M'));
            if (nonMoveCommands.length > 0) {
                pathSegments.push(nonMoveCommands.join(' '));
            } else {
                // If no path commands, fallback to line to target
                pathSegments.push(`L ${x2} ${y2}`);
            }
        }
    }

    // Close the path
    pathSegments.push('Z');

    const fullPath = pathSegments.join(' ');

    // Validate the path by checking if it's reasonable
    if (fullPath.length < 10) {
        return undefined;
    }

    return fullPath as Path;
};

const Fill = (props: NodeComponentProps<FillAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultFillAttributes.color,
        maxNodes = defaultFillAttributes.maxNodes,
        opacity = defaultFillAttributes.opacity,
    } = attrs ?? defaultFillAttributes;

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

    // Access graph directly from window object as it's available globally
    const graph = window.graph;

    // Find closed path starting from this node's position
    const closedPathData = React.useMemo(() => {
        if (!graph) return undefined;

        // Find all nodes except this fill node
        const allNodes = graph.nodes().filter(node => node !== id) as (StnId | MiscNodeId)[];

        if (allNodes.length < 3) return undefined; // Need at least 3 nodes for a closed path

        let bestPath: { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined;
        let shortestDistance = Infinity;

        // Try to find a closed path starting from the closest few nodes
        const candidates = allNodes
            .map(node => {
                const nodeAttr = graph.getNodeAttributes(node);
                const distance = Math.hypot(nodeAttr.x - x, nodeAttr.y - y);
                return { node, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, Math.min(5, allNodes.length)); // Try up to 5 closest nodes

        for (const { node } of candidates) {
            const path = findShortestClosedPath(graph, node, maxNodes);
            if (path && path.nodes.length < shortestDistance) {
                bestPath = path;
                shortestDistance = path.nodes.length;
            }
        }

        return bestPath;
    }, [graph, x, y, id, maxNodes]);

    const fillPath = React.useMemo(() => {
        if (!closedPathData || !graph) return undefined;
        return generateClosedPath(graph, closedPathData.nodes, closedPathData.edges);
    }, [closedPathData, graph]);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {fillPath && (
                <path
                    d={fillPath}
                    transform={`translate(${-x}, ${-y})`} // Move path to origin for correct positioning'
                    fill={color[2]}
                    fillOpacity={opacity}
                    stroke="none"
                    pointerEvents="none" // Don't interfere with node dragging
                />
            )}
            {/* Small indicator circle to show the fill node position */}
            <circle
                id={`misc_node_connectable_${id}`}
                r="3"
                fill={color[2]}
                fillOpacity="0.8"
                stroke="#000"
                strokeWidth="0.5"
                className="removeMe"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            {/* Show text when no fill path is found */}
            {!fillPath && (
                <text x="0" y="15" textAnchor="middle" fontSize="10" fill="#666" className="removeMe">
                    No closed path
                </text>
            )}
        </g>
    );
};

/**
 * Fill specific attributes.
 */
export interface FillAttributes extends ColorAttribute {
    maxNodes: number;
    opacity: number;
}

export const defaultFillAttributes: FillAttributes = {
    color: [CityCode.Shanghai, 'fill', '#FF0000', MonoColour.white],
    maxNodes: 100,
    opacity: 0.3,
};

const fillAttrsComponent = (props: AttrsProps<FillAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.fill.maxNodes'),
            value: (attrs.maxNodes ?? defaultFillAttributes.maxNodes).toString(),
            validator: (val: string) => Number.isInteger(Number(val)) && Number(val) > 0 && Number(val) <= 1000,
            onChange: val => {
                attrs.maxNodes = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.fill.opacity'),
            value: (attrs.opacity ?? defaultFillAttributes.opacity).toString(),
            validator: (val: string) => !Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
            onChange: val => {
                attrs.opacity = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.Fill} defaultTheme={defaultFillAttributes.color} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

const fillIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
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
