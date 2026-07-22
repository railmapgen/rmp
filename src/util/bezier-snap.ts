import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { PathPoint, makePoint } from '../constants/path';
import { defaultBezierControlAttributes, getBezierControlPoint } from './bezier-line';

export type BezierEndpoint = 'source' | 'target';

export interface BezierTangentCandidate {
    endpoint: BezierEndpoint;
    node: PathPoint;
    control: PathPoint;
}

interface ProjectedBezierTangent extends BezierTangentCandidate {
    direction: PathPoint;
    projection: PathPoint;
    distance: number;
}

const TANGENT_LENGTH_EPSILON = 1e-6;
const PARALLEL_EPSILON = 1e-9;

const getNodePoint = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>, nodeId: NodeId) => {
    const attrs = graph.getNodeAttributes(nodeId);
    return makePoint(attrs.x, attrs.y);
};

/** Get tangent lines contributed by other Bezier edges at both endpoints of the edited edge. */
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
        const node = getNodePoint(graph, nodeId);
        return (graph.edges(nodeId) as LineId[])
            .filter(candidateId => candidateId !== edgeId)
            .flatMap(candidateId => {
                const edgeAttrs = graph.getEdgeAttributes(candidateId);
                if (edgeAttrs.type !== LinePathType.Bezier) return [];

                const [candidateSourceId, candidateTargetId] = graph.extremities(candidateId) as [NodeId, NodeId];
                const source = getNodePoint(graph, candidateSourceId);
                const target = getNodePoint(graph, candidateTargetId);
                const attrs = edgeAttrs[LinePathType.Bezier] ?? defaultBezierControlAttributes;

                return [{ endpoint, node, control: getBezierControlPoint(source, target, attrs) }];
            });
    });
};

const projectToTangent = (
    pointer: PathPoint,
    candidate: BezierTangentCandidate
): ProjectedBezierTangent | undefined => {
    const dx = candidate.control.x - candidate.node.x;
    const dy = candidate.control.y - candidate.node.y;
    const length = Math.hypot(dx, dy);
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

const getIntersection = (a: ProjectedBezierTangent, b: ProjectedBezierTangent): PathPoint | undefined => {
    const determinant = a.direction.x * b.direction.y - a.direction.y * b.direction.x;
    if (Math.abs(determinant) < PARALLEL_EPSILON) return undefined;

    const offsetX = b.node.x - a.node.x;
    const offsetY = b.node.y - a.node.y;
    const alongA = (offsetX * b.direction.y - offsetY * b.direction.x) / determinant;
    return makePoint(a.node.x + alongA * a.direction.x, a.node.y + alongA * a.direction.y);
};

/** Snap a dragged Bezier control point to one tangent, or to the intersection of tangents at opposite endpoints. */
export const getSnappedBezierControlPoint = (
    pointer: PathPoint,
    candidates: BezierTangentCandidate[],
    snapDistance: number
): PathPoint | undefined => {
    const eligible = candidates
        .map(candidate => projectToTangent(pointer, candidate))
        .filter((candidate): candidate is ProjectedBezierTangent =>
            Boolean(candidate && candidate.distance <= snapDistance)
        );

    let nearestIntersection: { point: PathPoint; distance: number } | undefined;
    const sourceTangents = eligible.filter(candidate => candidate.endpoint === 'source');
    const targetTangents = eligible.filter(candidate => candidate.endpoint === 'target');
    sourceTangents.forEach(source => {
        targetTangents.forEach(target => {
            const point = getIntersection(source, target);
            if (!point) return;
            const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
            if (distance <= snapDistance && (!nearestIntersection || distance < nearestIntersection.distance)) {
                nearestIntersection = { point, distance };
            }
        });
    });
    if (nearestIntersection) return nearestIntersection.point;

    return eligible.reduce<ProjectedBezierTangent | undefined>(
        (nearest, candidate) => (!nearest || candidate.distance < nearest.distance ? candidate : nearest),
        undefined
    )?.projection;
};
