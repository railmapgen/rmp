import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';

const MAX_NODES = 100;

/**
 * Find the shortest closed path starting from a node using a modified BFS.
 */
export const findShortestClosedPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    startNode: NodeId,
    maxNodes: number = MAX_NODES
): { nodes: NodeId[]; edges: LineId[] } | undefined => {
    if (!graph.hasNode(startNode)) {
        return undefined;
    }

    // The queue now only stores the current node and the length between current node and the starting node.
    const queue: { node: NodeId; step: number }[] = [{ node: startNode, step: 1 }];

    // `visited` map stores the "parent" and "edge" for each visited node to reconstruct the path later.
    // The value is the path from the startNode.
    const visited = new Map<NodeId, { parent: NodeId; edge: LineId }>();

    visited.set(startNode, { parent: 'misc_node_origin', edge: 'line_undefined' });

    while (queue.length > 0) {
        const { node: u, step } = queue.shift()!;
        if (step * 2 >= maxNodes) break;

        for (const { edge, source, target } of graph.edgeEntries(u)) {
            const v = (source === u ? target : source) as NodeId;

            if (!visited.has(v)) {
                // Not visited yet
                visited.set(v, { parent: u, edge: edge as LineId });
                queue.push({ node: v, step: step + 1 });
            } else if (v !== visited.get(u)!.parent && v !== u) {
                // Found the shortest cycle
                const nodesU: NodeId[] = [u];
                const nodesV: NodeId[] = [v];
                const edgesU: LineId[] = [];
                const edgesV: LineId[] = [];
                for (let curr = u; visited.get(curr)!.parent !== 'misc_node_origin'; curr = visited.get(curr)!.parent) {
                    nodesU.push(visited.get(curr)!.parent);
                    edgesU.push(visited.get(curr)!.edge);
                }
                for (let curr = v; visited.get(curr)!.parent !== 'misc_node_origin'; curr = visited.get(curr)!.parent) {
                    nodesV.push(visited.get(curr)!.parent);
                    edgesV.push(visited.get(curr)!.edge);
                }
                return {
                    nodes: [...nodesV.toReversed(), ...nodesU],
                    edges: [...edgesV.toReversed(), edge as LineId, ...edgesU],
                };
            }
        }
    }
};
