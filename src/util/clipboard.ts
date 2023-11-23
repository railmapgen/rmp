import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';

type NodesWithAttrs = { [key in StnId | MiscNodeId]: NodeAttributes };
type EdgesWithAttrs = {
    [key in LineId]: { attr: EdgeAttributes; source: StnId | MiscNodeId; target: StnId | MiscNodeId };
};
interface ClipboardData {
    app: 'rmp';
    version: number;
    nodesWithAttrs: NodesWithAttrs;
    edgesWithAttrs: EdgesWithAttrs;
    avgX: number;
    avgY: number;
}

export const exportSelectedNodesAndEdges = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodes: Set<StnId | MiscNodeId>,
    edges: Set<LineId>
) => {
    const nodesWithAttrs: NodesWithAttrs = {};
    let [sumX, sumY] = [0, 0];
    nodes.forEach(node => {
        const attr = graph.getNodeAttributes(node);
        nodesWithAttrs[node] = attr;
        sumX += attr.x;
        sumY += attr.y;
    });
    const edgesWithAttrs: EdgesWithAttrs = {};
    edges.forEach(edge => {
        const [source, target] = graph.extremities(edge) as [StnId | MiscNodeId, StnId | MiscNodeId];
        edgesWithAttrs[edge] = {
            attr: graph.getEdgeAttributes(edge),
            source,
            target,
        };
    });
    const data: ClipboardData = {
        app: 'rmp',
        version: 1,
        nodesWithAttrs,
        edgesWithAttrs,
        avgX: sumX / nodes.size,
        avgY: sumY / nodes.size,
    };
    return JSON.stringify(data);
};

/**
 * Import nodes and edges from the clipboard data.
 * @param s The text from the clipboard.
 * @param graph The graph.
 * @param x The central x of the svg canvas. Nodes and edges added will repositioned around this point.
 * @param y The central y of the svg canvas. Nodes and edges added will repositioned around this point.
 * @returns The nodes and edges added to the graph.
 */
export const importSelectedNodesAndEdges = (
    s: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    x: number,
    y: number
) => {
    const { nodesWithAttrs: nodes, edgesWithAttrs: edges, version } = JSON.parse(s) as ClipboardData;
    if (version !== 1) throw Error(`Unrecognized version: ${version}`);

    // rename id to be not existed in the current graph
    const renameMap: { [key in string]: string } = {};
    Object.keys(nodes)
        .filter(node => graph.hasNode(node))
        .forEach(node => {
            const rand = nanoid(10);
            if (node.startsWith('stn_')) renameMap[node] = `stn_${rand}`;
            else if (node.startsWith('misc_node_')) renameMap[node] = `misc_node_${rand}`;
            else throw Error(`Unrecognized node id: ${node}`);
        });
    Object.keys(edges)
        .filter(edge => graph.hasEdge(edge))
        .forEach(edge => (renameMap[edge] = `line_${nanoid(10)}`));

    const renamedS = Object.entries(renameMap).reduce((_, [k, v]) => _.replaceAll(k, v), s);

    // add nodes and edges into the graph
    const { nodesWithAttrs, edgesWithAttrs, avgX, avgY } = JSON.parse(renamedS) as ClipboardData;
    const [offsetX, offsetY] = [x - avgX, y - avgY];
    Object.entries(nodesWithAttrs).forEach(([node, attr]) => {
        attr.x += offsetX;
        attr.y += offsetY;
        graph.addNode(node, attr);
    });
    Object.entries(edgesWithAttrs).forEach(([edge, { attr, source, target }]) =>
        graph.addDirectedEdgeWithKey(edge, source, target, attr)
    );

    return {
        nodes: Object.keys(nodesWithAttrs) as (StnId | MiscNodeId)[],
        edges: Object.keys(edgesWithAttrs) as LineId[],
    };
};
