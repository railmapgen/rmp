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

    // The queue now only stores the current node, its parent, and the edge used to reach it.
    const queue: { node: NodeId; parent: NodeId; edge: LineId }[] = [];

    // `visited` map stores the "parent" and "edge" for each visited node to reconstruct the path later.
    // The value is the path from the startNode.
    const visited = new Map<NodeId, { parent: NodeId; edge: LineId }>();

    // Initialize the queue with neighbors of the start node.
    graph.forEachOutEdge(startNode, (edge, _attrs, _source, target) => {
        const neighbor = target as NodeId;
        if (neighbor === startNode) return; // Avoid self-loops at the very beginning
        if (!visited.has(neighbor)) {
            visited.set(neighbor, { parent: startNode, edge: edge as LineId });
            queue.push({ node: neighbor, parent: startNode, edge: edge as LineId });
        }
    });

    let shortestPath: { nodes: NodeId[]; edges: LineId[] } | undefined;

    while (queue.length > 0) {
        const { node } = queue.shift()!;

        // Reconstruct path to check length
        const tempPath: NodeId[] = [];
        let curr = node;
        while (visited.has(curr)) {
            tempPath.push(curr);
            const parentInfo = visited.get(curr)!;
            curr = parentInfo.parent;
        }
        const currentPathLength = tempPath.length;

        if (shortestPath && currentPathLength >= shortestPath.nodes.length - 1) {
            continue;
        }
        // The current path to `node` has `currentPathLength` edges.
        // A cycle would add one more edge, making the total length `currentPathLength + 1`.
        // The number of nodes in a cycle is `edges + 1`.
        // So, the final cycle would have `currentPathLength + 2` nodes.
        // We stop if this would exceed maxNodes.
        if (currentPathLength + 2 > maxNodes) {
            continue;
        }

        graph.forEachOutEdge(node, (edge, _attrs, _source, target) => {
            const neighbor = target as NodeId;

            if (neighbor === startNode) {
                // Found a cycle back to the start node.
                const pathNodes = [startNode];
                const pathEdges: LineId[] = [];
                let pathCurr = node;

                pathEdges.unshift(edge as LineId); // Add the final edge
                while (pathCurr !== startNode && visited.has(pathCurr)) {
                    pathNodes.unshift(pathCurr);
                    const parentInfo = visited.get(pathCurr)!;
                    pathEdges.unshift(parentInfo.edge);
                    pathCurr = parentInfo.parent;
                }
                pathNodes.unshift(startNode);

                const finalPath = { nodes: pathNodes, edges: pathEdges };

                if (!shortestPath || finalPath.nodes.length < shortestPath.nodes.length) {
                    shortestPath = finalPath;
                }
                return; // Continue search for even shorter paths on the same level
            }

            if (!visited.has(neighbor)) {
                visited.set(neighbor, { parent: node, edge: edge as LineId });
                queue.push({ node: neighbor, parent: node, edge: edge as LineId });
            }
        });
    }

    return shortestPath;
};
