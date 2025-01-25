import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor } from '../components/panels/details/color-field';
import {
    EdgeAttributes,
    GraphAttributes,
    Id,
    LineId,
    MiscNodeId,
    NodeAttributes,
    NodeType,
    Polyline,
    Polylines,
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
    const nodeSet = new Set<string | undefined>();
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

export const isNodeSupportPolyline = (
    node: StnId | MiscNodeId,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
) =>
    node.startsWith('stn') ||
    (node.startsWith('misc_node') && graph.getNodeAttribute(node, 'type') === MiscNodeType.Virtual) ||
    (node.startsWith('misc_node') &&
        graph.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
        graph.getNodeAttributes(node)[MiscNodeType.Master]!.nodeType === 'Station');

export const getPolylines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Polylines => {
    const polylinesX: Polyline[] = [];
    const polylinesY: Polyline[] = [];
    const polylinesP: Polyline[] = [];
    const polylinesN: Polyline[] = [];

    graph
        .filterNodes(node => isNodeSupportPolyline(node as StnId | MiscNodeId, graph))
        .forEach(node => {
            const x = graph.getNodeAttribute(node, 'x');
            const y = graph.getNodeAttribute(node, 'y');
            polylinesX.push({ a: 1, b: 0, c: -x, node, x, y } as Polyline);
            polylinesY.push({ a: 0, b: 1, c: -y, node, x, y } as Polyline);
            polylinesP.push({ a: 1, b: -1, c: -x + y, node, x, y } as Polyline);
            polylinesN.push({ a: 1, b: 1, c: -x - y, node, x, y } as Polyline);
        });
    return {
        x: polylinesX,
        y: polylinesY,
        p: polylinesP,
        n: polylinesN,
    };
};

export const getPolylineDistance = (line: Polyline, x: number, y: number) => {
    return Math.abs(line.a * x + line.b * y + line.c) / Math.sqrt(line.a ** 2 + line.b ** 2);
};

/**
 * Find the nearest polyline to the point (x, y) in the polylines.
 * The nearest polyline is the one which minimizes the sum of lineDis and pointDis.
 * - lineDis: the distance from the point (x, y) to the polyline.
 * - pointDis: the distance from the point (x, y) to the node of the polyline (l.node).
 */
export const getNearestPolyline = (x: number, y: number, polylines: Polyline[], nodes: Id[]) => {
    const pointDistance = (x1: number, y1: number, x2: number, y2: number) =>
        Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    let minDistance = Infinity,
        retDistance = Infinity,
        minLine = { a: 0, b: 0, c: 0, node: 'stn_null', x: 0, y: 0 } as Polyline;
    polylines
        .filter(l => nodes.includes(l.node))
        .forEach(line => {
            const lineDis = getPolylineDistance(line, x, y);
            const pointDis = pointDistance(x, y, line.x, line.y);
            if (lineDis + pointDis < minDistance) {
                minDistance = lineDis + pointDis;
                retDistance = lineDis;
                minLine = line;
            }
        });
    return { l: minLine, d: retDistance };
};
