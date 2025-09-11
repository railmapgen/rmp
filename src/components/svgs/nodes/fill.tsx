import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode, EdgeAttributes, GraphAttributes, LineId, MiscNodeId, NodeAttributes, StnId } from '../../../constants/constants';
import { linePaths } from '../lines/lines';
import { LinePathType, Path } from '../../../constants/lines';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

/**
 * Find the shortest closed path starting from a node.
 * Returns undefined if no closed path is found within the max node limit.
 */
const findShortestClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    startNode: StnId | MiscNodeId,
    maxNodes: number = 100
): { nodes: (StnId | MiscNodeId)[]; edges: LineId[] } | undefined => {
    const visited = new Set<StnId | MiscNodeId>();
    const queue: { node: StnId | MiscNodeId; path: (StnId | MiscNodeId)[]; edges: LineId[] }[] = [
        { node: startNode, path: [startNode], edges: [] }
    ];
    
    while (queue.length > 0) {
        const { node, path, edges } = queue.shift()!;
        
        if (path.length > maxNodes) continue;
        
        // Get all neighbors of current node (treat graph as undirected)
        const neighbors = new Set<StnId | MiscNodeId>();
        const edgeMap = new Map<StnId | MiscNodeId, LineId>();
        
        // Outgoing edges
        graph.forEachOutboundEdge(node, (edge, attributes, source, target) => {
            neighbors.add(target as StnId | MiscNodeId);
            edgeMap.set(target as StnId | MiscNodeId, edge as LineId);
        });
        
        // Incoming edges (treat as undirected)
        graph.forEachInboundEdge(node, (edge, attributes, source, target) => {
            neighbors.add(source as StnId | MiscNodeId);
            edgeMap.set(source as StnId | MiscNodeId, edge as LineId);
        });
        
        for (const neighbor of neighbors) {
            const edge = edgeMap.get(neighbor)!;
            
            // If we found a cycle back to start and path has at least 3 nodes
            if (neighbor === startNode && path.length >= 3) {
                return {
                    nodes: [...path, startNode],
                    edges: [...edges, edge]
                };
            }
            
            // Continue exploring if not visited in current path
            if (!path.includes(neighbor)) {
                queue.push({
                    node: neighbor,
                    path: [...path, neighbor],
                    edges: [...edges, edge]
                });
            }
        }
    }
    
    return undefined;
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
    let firstPoint: { x: number; y: number } | undefined;
    
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
            firstPoint = { x: x1, y: y1 };
        }
        
        const pathType = edgeAttrs.type;
        const pathAttr = edgeAttrs[pathType];
        
        if (pathType in linePaths) {
            const pathStr = linePaths[pathType].generatePath(x1, x2, y1, y2, pathAttr as any);
            
            // For the first segment, include the M command
            if (i === 0) {
                pathSegments.push(pathStr);
            } else {
                // For subsequent segments, remove M command and connect with L if needed
                const pathWithoutM = pathStr.replace(/^M\s*[+-]?\d*\.?\d+\s*[+-]?\d*\.?\d+\s*/, '');
                pathSegments.push(pathWithoutM);
            }
        } else {
            // Fallback to simple line
            if (i === 0) {
                pathSegments.push(`M ${x1} ${y1} L ${x2} ${y2}`);
            } else {
                pathSegments.push(`L ${x2} ${y2}`);
            }
        }
    }
    
    // Close the path
    pathSegments.push('Z');
    
    return pathSegments.join(' ');
};

const Fill = (props: NodeComponentProps<FillAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultFillAttributes.color,
        maxNodes = defaultFillAttributes.maxNodes,
        opacity = defaultFillAttributes.opacity,
    } = attrs ?? defaultFillAttributes;
    
    // Access graph directly from window object as it's available globally
    const graph = React.useMemo(() => {
        return (window as any).graph as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> | undefined;
    }, []);
    
    // Find closed path starting from this node's position
    const closedPathData = React.useMemo(() => {
        if (!graph) return undefined;
        
        // Find the closest node to this fill node
        const allNodes = graph.nodes() as (StnId | MiscNodeId)[];
        let closestNode: StnId | MiscNodeId | undefined;
        let minDistance = Infinity;
        
        for (const node of allNodes) {
            if (node === id) continue; // Skip self
            const nodeAttr = graph.getNodeAttributes(node);
            const distance = Math.hypot(nodeAttr.x - x, nodeAttr.y - y);
            if (distance < minDistance) {
                minDistance = distance;
                closestNode = node;
            }
        }
        
        if (!closestNode) return undefined;
        
        return findShortestClosedPath(graph, closestNode, maxNodes);
    }, [graph, x, y, id, maxNodes]);
    
    const fillPath = React.useMemo(() => {
        if (!closedPathData || !graph) return undefined;
        return generateClosedPath(graph, closedPathData.nodes, closedPathData.edges);
    }, [closedPathData, graph]);
    
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
    
    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            {fillPath && (
                <path
                    d={fillPath}
                    fill={color[2]}
                    fillOpacity={opacity}
                    stroke="none"
                />
            )}
            {/* Small indicator circle to show the fill node position */}
            <circle
                r="3"
                fill={color[2]}
                fillOpacity="0.8"
                stroke="#000"
                strokeWidth="0.5"
                className="removeMe"
            />
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
        <path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1"/>
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