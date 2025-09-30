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
import { linePaths } from '../lines/lines';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { useRootSelector } from '../../../redux';
import { NonSimpleLinePathAttributes } from '../../../util/parallel';

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

    console.log(`%c[Path Calculation Start]`, 'font-weight:bold; color:blue;');

    const pathSequence = nodes.reduce((acc, node, i) => {
        return acc + node + (i < edges.length ? ` --(${edges[i]})--> ` : '');
    }, '');
    console.log('Path sequence:', pathSequence);

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

        console.groupCollapsed(`Segment ${i + 1}: ${sourceNodeId} -> ${targetNodeId}`);
        console.log(`Source position: (${sourceAttrs.x}, ${sourceAttrs.y})`);
        console.log(`Target position: (${targetAttrs.x}, ${targetAttrs.y})`);
        console.log(`Edge ID: ${edgeId}`);
        console.log('Original Edge Attributes:', initialPathAttr);
        console.log('Final Path Attributes (after reversal adjustments):', finalPathAttr);
        console.log('Generated SVG Path Segment:', segment);
        console.log(
            'Current SVG Path Segment:',
            linePaths[pathType]?.generatePath(x1, x2, y1, y2, initialPathAttr as any)
        );
        console.groupEnd();

        if (i > 0) {
            const parts = segment.split(' ');
            // we slice from the 4th element (index 3) to remove the initial move command and its coordinates.
            segment = parts.slice(3).join(' ');
        }

        pathString += (i > 0 ? ' ' : '') + segment;
    }

    const finalFullPath = pathString + ' Z';
    console.log(`%c[Path Calculation End]`, 'font-weight:bold; color:blue;');
    console.log('Final Combined SVG Path:', finalFullPath);

    return finalFullPath as Path;
};

const Fill = (props: NodeComponentProps<FillAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { color = defaultFillAttributes.color, opacity = defaultFillAttributes.opacity } =
        attrs ?? defaultFillAttributes;

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

    const { refresh } = useRootSelector(state => state.runtime);
    const graph = window.graph;

    const fillPath = React.useMemo(() => {
        if (!graph) return undefined;

        const path = findShortestClosedPath(graph, id);

        if (path) {
            return generateClosedPath(graph, path.nodes, path.edges);
        }

        return undefined;
    }, [graph, id, refresh]);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {fillPath && (
                <path
                    d={fillPath}
                    transform={`translate(${-x}, ${-y})`}
                    fill={color[2]}
                    fillOpacity={opacity}
                    stroke="none"
                    pointerEvents="none"
                />
            )}
            <circle
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
        </g>
    );
};

export interface FillAttributes extends ColorAttribute {
    opacity: number;
}

export const defaultFillAttributes: FillAttributes = {
    color: [CityCode.Shanghai, 'fill', '#FF0000', MonoColour.white],
    opacity: 0.3,
};

const fillAttrsComponent = (props: AttrsProps<FillAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
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
