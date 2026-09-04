import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../../../../constants/constants';
import { LinePathType } from '../../../../constants/lines';
import { PathPoint, makePoint } from '../../../../constants/path';
import { getBezierControlPoint, getBezierEffectiveEndpoints } from './bezier-geometry';
import { defaultBezierPathAttributes } from './bezier-model';

/** Which endpoint of the edited Bezier receives the tangent alignment feedback. */
export type BezierEndpoint = 'source' | 'target';

/**
 * A tangent line supplied by another Bezier that shares one endpoint with the
 * edited line. The line is represented by the shared node and the neighbour's
 * tangent-intersection control point, because that is the same editable model
 * used by the current Bezier overlay.
 */
export interface BezierTangentCandidate {
    endpoint: BezierEndpoint;
    node: PathPoint;
    control: PathPoint;
}

/**
 * Snap result plus the endpoint(s) that should be highlighted. Keeping endpoint
 * metadata avoids showing both overlay handles as snapped when only one tangent
 * was actually aligned.
 */
export interface BezierTangentSnap {
    point: PathPoint;
    endpoints: BezierEndpoint[];
}

/** A drag snap identifies whether the handle followed another tangent or collapsed onto its own chord. */
export interface BezierDragSnap extends BezierTangentSnap {
    kind: 'tangent' | 'straight';
}

/** Projection data is cached per candidate so intersection and nearest-line logic can share the same distance check. */
interface ProjectedBezierTangent extends BezierTangentCandidate {
    direction: PathPoint;
    projection: PathPoint;
    distance: number;
}

/** Ignore tangent candidates whose control point is effectively on top of the shared node. */
const TANGENT_LENGTH_EPSILON = 1e-6;
/** Treat nearly parallel tangent lines as non-intersecting to avoid unstable far-away intersections. */
const PARALLEL_EPSILON = 1e-9;

const getNodePoint = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, nodeId: NodeId) => {
    const attrs = graph.getNodeAttributes(nodeId);
    return makePoint(attrs.x, attrs.y);
};

/**
 * Get tangent lines contributed by other Bezier edges at both endpoints of the edited edge.
 *
 * Only connected Bezier edges participate: unrelated lines would not share a
 * node tangent, and non-Bezier paths do not expose the same single
 * tangent-intersection model to align against.
 */
export const getBezierTangentCandidates = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId
): BezierTangentCandidate[] => {
    const [sourceId, targetId] = graph.extremities(edgeId) as [NodeId, NodeId];

    return (
        [
            ['source', sourceId],
            ['target', targetId],
        ] as const
    ).flatMap(([endpoint, nodeId]) => {
        const candidateIds = graph.edges(nodeId) as LineId[];

        // The dragged line already defines the tangent being edited, so it must
        // not be used as its own snap target.
        return candidateIds
            .filter(candidateId => candidateId !== edgeId)
            .flatMap(candidateId => {
                const edgeAttrs = graph.getEdgeAttributes(candidateId);
                if (edgeAttrs.type !== LinePathType.Bezier) return [];

                const [candidateSourceId, candidateTargetId] = graph.extremities(candidateId) as [NodeId, NodeId];
                const source = getNodePoint(graph, candidateSourceId);
                const target = getNodePoint(graph, candidateTargetId);
                const attrs = edgeAttrs[LinePathType.Bezier] ?? defaultBezierPathAttributes;
                const effective = getBezierEffectiveEndpoints(source, target, attrs);
                const node = candidateSourceId === nodeId ? effective.source : effective.target;

                return [
                    {
                        endpoint,
                        node,
                        control: getBezierControlPoint(effective.source, effective.target, attrs),
                    },
                ];
            });
    });
};

/** Project the pointer onto a candidate tangent line and keep the perpendicular miss distance. */
const projectToTangent = (
    pointer: PathPoint,
    candidate: BezierTangentCandidate
): ProjectedBezierTangent | undefined => {
    const dx = candidate.control.x - candidate.node.x;
    const dy = candidate.control.y - candidate.node.y;
    const length = Math.hypot(dx, dy);
    // If the neighbour's control point collapses onto the shared node, there is
    // no reliable tangent direction to align with.
    if (length < TANGENT_LENGTH_EPSILON) return undefined;

    const direction = makePoint(dx / length, dy / length);
    const pointerDx = pointer.x - candidate.node.x;
    const pointerDy = pointer.y - candidate.node.y;
    const along = pointerDx * direction.x + pointerDy * direction.y;
    const projection = makePoint(candidate.node.x + along * direction.x, candidate.node.y + along * direction.y);

    return {
        ...candidate,
        direction,
        projection,
        distance: Math.hypot(pointer.x - projection.x, pointer.y - projection.y),
    };
};

/** Find the intersection of two projected tangent lines when both endpoints can be aligned at once. */
const getIntersection = (a: ProjectedBezierTangent, b: ProjectedBezierTangent): PathPoint | undefined => {
    const determinant = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
    if (Math.abs(determinant) < PARALLEL_EPSILON) return undefined;

    const offsetX = b.node.x - a.node.x;
    const offsetY = b.node.y - a.node.y;
    const alongA = (offsetX * b.direction.y - offsetY * b.direction.x) / determinant;
    return makePoint(a.node.x + alongA * a.direction.x, a.node.y + alongA * a.direction.y);
};

/** Get the snapped control point and which side(s) of the edited Bezier are aligned by that snap. */
export const getBezierTangentSnap = (
    pointer: PathPoint,
    candidates: BezierTangentCandidate[],
    snapDistance: number
): BezierTangentSnap | undefined => {
    // Keep only candidates already close enough to the pointer. This makes the
    // interaction predictable: far tangents do not pull the handle across the map.
    const eligible = candidates
        .map(candidate => projectToTangent(pointer, candidate))
        .filter((candidate): candidate is ProjectedBezierTangent =>
            Boolean(candidate && candidate.distance <= snapDistance)
        );

    let nearestIntersection: { point: PathPoint; distance: number; endpoints: BezierEndpoint[] } | undefined;
    const sourceTangents = eligible.filter(candidate => candidate.endpoint === 'source');
    const targetTangents = eligible.filter(candidate => candidate.endpoint === 'target');
    // Prefer a source/target intersection when available because it aligns both
    // endpoint tangents and gives the strongest visual constraint.
    sourceTangents.forEach(source => {
        targetTangents.forEach(target => {
            const point = getIntersection(source, target);
            if (!point) return;
            const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
            if (distance <= snapDistance && (!nearestIntersection || distance < nearestIntersection.distance)) {
                nearestIntersection = { point, distance, endpoints: [source.endpoint, target.endpoint] };
            }
        });
    });
    if (nearestIntersection) return { point: nearestIntersection.point, endpoints: nearestIntersection.endpoints };

    // With candidates on only one endpoint, fall back to the nearest tangent
    // projection and report just that endpoint for one-sided overlay feedback.
    const nearest = eligible.reduce<ProjectedBezierTangent | undefined>(
        (nearest, candidate) => (!nearest || candidate.distance < nearest.distance ? candidate : nearest),
        undefined
    );
    return nearest ? { point: nearest.projection, endpoints: [nearest.endpoint] } : undefined;
};

/**
 * Project the handle onto its own endpoint chord when the pointer is close
 * enough to the finite segment.
 *
 * Restricting the projection to the segment matters: a collinear control point
 * beyond either endpoint makes a quadratic Bezier overshoot and turn back, so
 * it is not visually equivalent to a simple line.
 */
export const getBezierStraightSnap = (
    pointer: PathPoint,
    source: PathPoint,
    target: PathPoint,
    snapDistance: number
): BezierDragSnap | undefined => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < TANGENT_LENGTH_EPSILON * TANGENT_LENGTH_EPSILON) return undefined;

    const pointerDx = pointer.x - source.x;
    const pointerDy = pointer.y - source.y;
    const along = (pointerDx * dx + pointerDy * dy) / lengthSquared;
    if (along < 0 || along > 1) return undefined;

    const point = makePoint(source.x + along * dx, source.y + along * dy);
    if (Math.hypot(pointer.x - point.x, pointer.y - point.y) > snapDistance) return undefined;
    return { kind: 'straight', point, endpoints: ['source', 'target'] };
};

/**
 * Resolve competing drag affordances without making a nearby one-sided
 * tangent prevent an easier straight-line snap.
 *
 * A two-ended tangent intersection remains the strongest constraint. For all
 * other candidates, pointer distance is the most predictable tie-breaker.
 */
export const getBezierDragSnap = (
    pointer: PathPoint,
    source: PathPoint,
    target: PathPoint,
    candidates: BezierTangentCandidate[],
    snapDistance: number
): BezierDragSnap | undefined => {
    const tangent = getBezierTangentSnap(pointer, candidates, snapDistance);
    const straight = getBezierStraightSnap(pointer, source, target, snapDistance);
    if (tangent?.endpoints.length === 2) return { ...tangent, kind: 'tangent' };
    if (!tangent) return straight;
    if (!straight) return { ...tangent, kind: 'tangent' };

    const tangentDistance = Math.hypot(pointer.x - tangent.point.x, pointer.y - tangent.point.y);
    const straightDistance = Math.hypot(pointer.x - straight.point.x, pointer.y - straight.point.y);
    return straightDistance < tangentDistance ? straight : { ...tangent, kind: 'tangent' };
};
