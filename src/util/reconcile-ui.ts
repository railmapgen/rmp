import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';

/**
 * Reconcile changes the authored geometry, so both the path and the visual
 * style must explicitly opt into the operation.
 */
export const canReconcileLine = (pathType: LinePathType, styleType: LineStyleType): boolean =>
    Boolean(linePaths[pathType]?.metadata.supportsReconcile && lineStyles[styleType]?.metadata.supportsReconcile);

/**
 * Batch-reconcile all edges in the selection.
 * Picks the first existing non-empty reconcileId, or generates a new one.
 * Skips edges whose path or style does not support reconcile.
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
        const { type, style } = graph.getEdgeAttributes(edge);
        if (!canReconcileLine(type, style)) continue;
        graph.setEdgeAttribute(edge, 'reconcileId', reconcileId);
        updated = true;
    }
    return updated;
};
