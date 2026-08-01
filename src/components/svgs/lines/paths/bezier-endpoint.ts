import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint } from '../../../../constants/path';
import { defaultBezierPathAttributes } from './bezier-model';

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
