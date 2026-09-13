import type { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../../../constants/constants';
import { LinePathEdgeAttrsNormalizationMode, LinePathType } from '../../../constants/lines';
import simplePath from './paths/simple';
import diagonalPath from './paths/diagonal';
import perpendicularPath from './paths/perpendicular';
import rotatePerpendicularPath from './paths/rotate-perpendicular';
import rayGuidedPath from './paths/ray-guided';
import bezierPath from './paths/bezier';
import freeformPath from './paths/freeform';

export { lineStyles } from './line-styles';

export const linePaths = {
    [LinePathType.Diagonal]: diagonalPath,
    [LinePathType.Perpendicular]: perpendicularPath,
    [LinePathType.RotatePerpendicular]: rotatePerpendicularPath,
    [LinePathType.RayGuided]: rayGuidedPath,
    [LinePathType.Simple]: simplePath,
    [LinePathType.Bezier]: bezierPath,
    [LinePathType.Freeform]: freeformPath,
};

/**
 * Runs the registered LinePath normalizer for a complete semantic edge change set.
 *
 * Call this after all listed edges exist with their new attributes and before saving the graph. Supply only edges
 * changed by the current transaction, in deterministic priority order. Missing/deleted edges and path types without
 * a normalizer are ignored. Importing or copying serialized edges should bypass this function so saved path
 * attributes are not rewritten.
 *
 * The pending set is also passed to each hook as `ignoredEdgeIds`: the current and later edges cannot act as anchors.
 * Once an edge is normalized it becomes eligible to anchor later edges, making a batch converge without depending on
 * partially updated values. The function mutates `graph` in place and does not save or refresh it.
 */
// TODO: Replace the temporary manual normalize → save → refresh sequences as soon as the unified graph-operation
// pipeline in `docs/graph-mutation-pipeline-design.md` is implemented. Move this coordinator into a dependency-light
// registry first so the graph-operation thunk can call registered normalizers without importing component definitions.
export const normalizeEdgeAttributes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeIds: Iterable<LineId>,
    mode: LinePathEdgeAttrsNormalizationMode = 'updated'
) => {
    const pending = new Set<LineId>();
    for (const edgeId of edgeIds) {
        if (graph.hasEdge(edgeId)) pending.add(edgeId);
    }

    for (const edgeId of pending) {
        const type = graph.getEdgeAttribute(edgeId, 'type');
        linePaths[type]?.normalizeEdgeAttrs?.(graph, edgeId, mode, pending);
        pending.delete(edgeId);
    }
};
