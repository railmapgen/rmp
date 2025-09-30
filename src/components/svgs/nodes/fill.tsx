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
    const graph = window.graph!;

    const closedPath = React.useMemo(() => findShortestClosedPath(graph, id), [graph, id, refresh]);
    const fillPath = React.useMemo(() => {
        if (!closedPath) return undefined;
        return generateClosedPath(graph, closedPath.nodes, closedPath.edges);
    }, [closedPath]);

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
}

export const defaultFillAttributes: FillAttributes = {
    color: [CityCode.Shanghai, 'fill', '#FF0000', MonoColour.white],
    opacity: 0.5,
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
