import { MultiDirectedGraph } from 'graphology';
import {
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeType,
    StnId,
} from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

/**
 * Finds all edges that both its source and targets are in the nodes.
 */
export const findEdgesConnectedByNodes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: Set<StnId | MiscNodeId>
) =>
    graph.filterEdges(
        (edge, attr, source, target, sourceAttr, targetAttr, undirected) =>
            nodes.has(source as StnId | MiscNodeId) && nodes.has(target as StnId | MiscNodeId)
    ) as LineId[];

/**
 * Finds a map that shows whether a station/misc node type exists in the graph or not.
 */
export const findNodesExist = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const nodesExist: { [key in NodeType]: boolean } = Object.fromEntries(
        [...Object.values(StationType), Object.values(MiscNodeType)].map(type => [type, false])
    );
    graph.forEachNode(node => {
        const type = graph.getNodeAttribute(node, 'type');
        nodesExist[type] = true;
    });
    return nodesExist;
};

const inRange = (x1: number, y1: number, x2: number, y2: number, xq: number, yq: number) => {
    return x1 <= xq && xq <= x2 && y1 <= yq && yq <= y2;
};

/**
 * Add nodes that is in the range
 */
export const handleSelectTool = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) => {
    const sX = x1 <= x2 ? x1 : x2;
    const sY = y1 <= y2 ? y1 : y2;
    const eX = x1 <= x2 ? x2 : x1;
    const eY = y1 <= y2 ? y2 : y1;
    const result: string[] = [];
    graph.forEachNode(node => {
        // console.log(graph.getNodeAttributes(node));
        if (inRange(sX, sY, eX, eY, graph.getNodeAttributes(node).x, graph.getNodeAttributes(node).y)) {
            console.log(node);
            result.push(node);
        }
    });
    return result;
};
