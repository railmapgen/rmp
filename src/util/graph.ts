import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor } from '../components/panels/details/color-field';
import {
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeType,
    StnId,
    Theme,
} from '../constants/constants';
import { LineStylesWithColor } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { MasterParam } from '../constants/master';

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

const inRange = (x1: number, y1: number, x2: number, y2: number, xq: number, yq: number) =>
    x1 <= xq && xq <= x2 && y1 <= yq && yq <= y2;

/**
 * Add nodes that are in the rectangle top-left (x1, y1) and bottom-right (x2, y2).
 */
export const findNodesInRectangle = (
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
    return graph.filterNodes((_, attr) => inRange(sX, sY, eX, eY, attr.x, attr.y)) as (StnId | MiscNodeId)[];
};

/**
 * Find all themes in selected items or in map
 */
export const findThemes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: (StnId | MiscNodeId)[],
    edges: LineId[]
) => {
    const colorList: Theme[] = [];
    const colorSet: Set<string> = new Set<string>();
    nodes.forEach(id => {
        const thisType = graph.getNodeAttributes(id).type;
        const attrs = graph.getNodeAttribute(id, thisType);
        if ((attrs as AttributesWithColor)['color'] !== undefined) {
            const color = (attrs as AttributesWithColor)['color'];
            if (!colorSet.has(color.toString())) {
                colorList.push(color);
                colorSet.add(color.toString());
            }
        }
    });
    edges
        .filter(edge => LineStylesWithColor.includes(graph.getEdgeAttribute(edge, 'style')))
        .forEach(edge => {
            const attr = graph.getEdgeAttributes(edge);
            const color = (attr[attr.style] as AttributesWithColor).color;
            if (!colorSet.has(color.toString())) {
                colorList.push(color);
                colorSet.add(color.toString());
            }
        });
    return colorList;
};

export const getMasterNodeTypes = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    const newList: MasterParam[] = [];
    const nodeSet = new Set<string>();
    graph
        .filterNodes(node => graph.getNodeAttribute(node, 'type') === MiscNodeType.Master)
        .forEach(node => {
            const attrs = graph.getNodeAttributes(node)[MiscNodeType.Master]!;
            if (!nodeSet.has(attrs.randomId)) {
                nodeSet.add(attrs.randomId);
                newList.push(attrs);
            }
        });
    return newList;
};
