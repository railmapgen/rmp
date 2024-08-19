import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, Id, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';

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
    selected: Set<Id>
) => {
    const nodesWithAttrs: NodesWithAttrs = {};
    const edgesWithAttrs: EdgesWithAttrs = {};
    let [sumX, sumY] = [0, 0];
    let countNode = 0;
    selected.forEach(id => {
        if (graph.hasNode(id)) {
            const node = id as StnId | MiscNodeId;
            const attr = graph.getNodeAttributes(node);
            nodesWithAttrs[node] = attr;
            sumX += attr.x;
            sumY += attr.y;
            countNode++;
        } else if (graph.hasEdge(id)) {
            const edge = id as LineId;
            const [source, target] = graph.extremities(edge) as [StnId | MiscNodeId, StnId | MiscNodeId];
            edgesWithAttrs[edge] = {
                attr: graph.getEdgeAttributes(edge),
                source,
                target,
            };
        }
    });
    const data: ClipboardData = {
        app: 'rmp',
        version: 1,
        nodesWithAttrs,
        edgesWithAttrs,
        avgX: sumX / countNode,
        avgY: sumY / countNode,
    };
    return JSON.stringify(data);
};

/**
 * Import nodes and edges from the clipboard data. Version of the data must be the same as the current.
 * @param s The text from the clipboard.
 * @param graph The graph.
 * @param filterMaster Whether filter master nodes on paste (no subscription only).
 * @param x The central x of the svg canvas. Nodes and edges added will repositioned around this point.
 * @param y The central y of the svg canvas. Nodes and edges added will repositioned around this point.
 * @returns The nodes and edges added to the graph.
 */
export const importSelectedNodesAndEdges = (
    s: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    filterMaster: boolean,
    x: number,
    y: number
) => {
    const { nodesWithAttrs: nodes, edgesWithAttrs: edges, version } = JSON.parse(s) as ClipboardData;
    if (version !== 1) throw Error(`Unrecognized version: ${version}`);

    // rename id to be not existed in the current graph
    const renamedMap: { [key in string]: string } = {};
    Object.keys(nodes)
        .filter(node => graph.hasNode(node))
        .forEach(node => {
            const rand = nanoid(10);
            if (node.startsWith('stn_')) renamedMap[node] = `stn_${rand}`;
            else if (node.startsWith('misc_node_')) renamedMap[node] = `misc_node_${rand}`;
            else throw Error(`Unrecognized node id: ${node}`);
        });
    Object.keys(edges)
        .filter(edge => graph.hasEdge(edge))
        .forEach(edge => (renamedMap[edge] = `line_${nanoid(10)}`));
    const renamedS = Object.entries(renamedMap).reduce((_, [k, v]) => _.replaceAll(k, v), s);

    // Filter master nodes if requested.
    // Note users might exceed the current limit (3) if copy and paste 2 master nodes.
    // This will result in a 4 node situation. A finer solution might be required.
    const { nodesWithAttrs, edgesWithAttrs, avgX, avgY } = JSON.parse(renamedS) as ClipboardData;
    const filteredNodes = filterMaster
        ? Object.fromEntries(Object.entries(nodesWithAttrs).filter(([_, attrs]) => attrs.type !== MiscNodeType.Master))
        : nodesWithAttrs;
    const filteredEdges = filterMaster
        ? Object.fromEntries(
              Object.entries(edgesWithAttrs).filter(
                  ([_, { source, target }]) => source in filteredNodes && target in filteredNodes
              )
          )
        : edgesWithAttrs;

    // add nodes and edges into the graph
    const [offsetX, offsetY] = [x - avgX, y - avgY];
    Object.entries(filteredNodes).forEach(([node, attr]) => {
        attr.x += offsetX;
        attr.y += offsetY;
        graph.addNode(node, attr);
    });
    Object.entries(filteredEdges).forEach(([edge, { attr, source, target }]) =>
        graph.addDirectedEdgeWithKey(edge, source, target, attr)
    );

    return {
        nodes: new Set(Object.keys(filteredNodes)) as Set<StnId | MiscNodeId>,
        edges: new Set(Object.keys(filteredEdges)) as Set<LineId>,
    };
};
