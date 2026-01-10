import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, Id, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makeParallelIndex, NonSimpleLinePathAttributes } from './parallel';

type NodesWithAttrs = { [key in NodeId]: NodeAttributes };
type EdgesWithAttrs = {
    [key in LineId]: { attr: EdgeAttributes; source: NodeId; target: NodeId };
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
            const node = id as NodeId;
            const attr = graph.getNodeAttributes(node);
            nodesWithAttrs[node] = attr;
            sumX += attr.x;
            sumY += attr.y;
            countNode++;
        } else if (graph.hasEdge(id)) {
            const edge = id as LineId;
            const [source, target] = graph.extremities(edge) as [NodeId, NodeId];
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
 * @param isMasterDisabled Whether filter master nodes on paste (no subscription only).
 * @param isParallelDisabled Whether filter parallel lines on paste (no subscription only).
 * @param x The central x of the svg canvas. Nodes and edges added will repositioned around this point.
 * @param y The central y of the svg canvas. Nodes and edges added will repositioned around this point.
 * @returns The nodes and edges added to the graph.
 */
export const importSelectedNodesAndEdges = (
    s: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    isMasterDisabled: boolean,
    isParallelDisabled: boolean,
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
    // This will result in a 4 node situation. A finer solution may be implemented.
    const { nodesWithAttrs, edgesWithAttrs, avgX, avgY } = JSON.parse(renamedS) as ClipboardData;
    const filteredNodes = isMasterDisabled
        ? Object.fromEntries(Object.entries(nodesWithAttrs).filter(([_, attrs]) => attrs.type !== MiscNodeType.Master))
        : nodesWithAttrs;
    const filteredEdges = isMasterDisabled
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
    Object.entries(filteredEdges).forEach(([edge, { attr, source, target }]) => {
        // tweak parallel index
        if (isParallelDisabled) {
            // Set parallelIndex to -1 (disable) if not enabled.
            // Note users might exceed the current limit (5) if copy and paste 1...4 parallel lines.
            // This will result in a at max 8 parallel lines situation. A finer solution may be implemented.
            attr.parallelIndex = -1;
        } else {
            const { type } = attr;
            if (!(source in renamedMap || target in renamedMap)) {
                // When the user only copy the lines, not the nodes, from the current graph and paste back,
                // we should recalculate the parallel index to avoid overlap.
                const { startFrom } = attr[type] as NonSimpleLinePathAttributes;
                attr.parallelIndex = makeParallelIndex(graph, type, source, target, startFrom);
            }
        }

        graph.addDirectedEdgeWithKey(edge, source, target, attr);
    });

    return {
        nodes: new Set(Object.keys(filteredNodes)) as Set<NodeId>,
        edges: new Set(Object.keys(filteredEdges)) as Set<LineId>,
    };
};
