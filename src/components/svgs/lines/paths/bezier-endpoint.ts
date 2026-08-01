import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint } from '../../../../constants/path';
import { defaultBezierPathAttributes } from './bezier-model';

/** Resolve the saved Bezier offset attached to an edge at the given graph node. */
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
