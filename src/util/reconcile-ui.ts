import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../constants/constants';
import { lineStyles } from '../components/svgs/lines/lines';

/**
 * Batch-reconcile all edges in the selection.
 * Picks the first existing non-empty reconcileId, or generates a new one.
 * Skips edges whose style has supportsReconcile === false.
 *
 * @returns true if any edge was updated.
 */
export const reconcileSelectedEdges = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selected: Set<Id>
): boolean => {
    const edges = [...selected].filter(id => graph.hasEdge(id));
    if (edges.length < 2) return false;

    // Pick an existing reconcileId from the selection, or generate new
    let reconcileId = '';
    for (const edge of edges) {
        const existing = graph.getEdgeAttribute(edge, 'reconcileId');
        if (existing) {
            reconcileId = existing;
            break;
        }
    }
    if (!reconcileId) reconcileId = nanoid(10);

    let updated = false;
    for (const edge of edges) {
        const style = graph.getEdgeAttribute(edge, 'style');
        if (!lineStyles[style].metadata.supportsReconcile) continue;
        graph.setEdgeAttribute(edge, 'reconcileId', reconcileId);
        updated = true;
    }
    return updated;
};
