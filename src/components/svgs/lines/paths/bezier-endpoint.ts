import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint } from '../../../../constants/path';
import { areSameLineStyles } from '../../../../util/same-style';
import { BezierPathAttributes, defaultBezierPathAttributes } from './bezier-model';

/**
 * Resolves the node-relative Bezier endpoint offset regardless of the edge's direction.
 *
 * Both the node overlay and normalization logic use this helper so source/target orientation cannot drift between
 * reading and writing paths. The caller must pass an incident Bezier edge. A cloned point is returned and may be
 * safely modified without mutating saved attributes.
 */
export const getBezierEndpointOffset = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    edgeId: LineId
): PathPoint => {
    const attrs = graph.getEdgeAttribute(edgeId, LinePathType.Bezier) ?? defaultBezierPathAttributes;
    const offset =
        graph.source(edgeId) === nodeId
            ? (attrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset)
            : (attrs.targetOffset ?? defaultBezierPathAttributes.targetOffset);
    return { ...offset };
};

/**
 * Finds the established virtual endpoint for a same-style Bezier group.
 *
 * Pending edges are excluded while a batch is normalized, so only stable or already-normalized peers can anchor the
 * next edge. The prospective-preview path passes no ignored edges because it has not been added to the graph yet.
 */
export const getSameStyleBezierEndpointOffset = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    referenceAttrs: EdgeAttributes,
    ignoredEdgeIds: ReadonlySet<LineId> = new Set()
): PathPoint | undefined => {
    for (const peerId of graph.edges(nodeId) as LineId[]) {
        if (ignoredEdgeIds.has(peerId)) continue;
        const peerAttrs = graph.getEdgeAttributes(peerId);
        if (peerAttrs.type !== LinePathType.Bezier || !areSameLineStyles(referenceAttrs, peerAttrs)) continue;
        return getBezierEndpointOffset(graph, nodeId, peerId);
    }
    return undefined;
};

/**
 * Produces the same endpoint initialization as `created` normalization for an edge that is not in the graph yet.
 *
 * This keeps previews aligned with the persisted result without mutating the graph during render. An unknown target
 * uses the path default until the pointer is over a connectable node.
 */
export const initializeBezierEndpointOffsets = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    source: NodeId,
    target: NodeId | undefined,
    edgeAttrs: EdgeAttributes
): BezierPathAttributes => {
    const current = edgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
    return {
        ...current,
        sourceOffset: getSameStyleBezierEndpointOffset(graph, source, edgeAttrs) ?? {
            ...defaultBezierPathAttributes.sourceOffset,
        },
        targetOffset: target
            ? (getSameStyleBezierEndpointOffset(graph, target, edgeAttrs) ?? {
                  ...defaultBezierPathAttributes.targetOffset,
              })
            : { ...defaultBezierPathAttributes.targetOffset },
    };
};
