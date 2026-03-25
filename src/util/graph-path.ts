import { MultiDirectedGraph } from 'graphology';
import { linePaths } from '../components/svgs/lines/lines';
import { RayGuidedPathAttributes } from '../components/svgs/lines/paths/ray-guided';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType, Path } from '../constants/lines';

/**
 * Generate the SVG path segment for a single edge in a chain.
 *
 * When the traversal direction differs from the edge direction (reversed),
 * attributes like `startFrom` and RayGuided angles are flipped so the
 * generated path visually connects chainSource → chainTarget.
 *
 * @param graph The graph instance.
 * @param edgeId The edge to generate path for.
 * @param chainSource The node where traversal enters this edge.
 * @param chainTarget The node where traversal exits this edge.
 */
export const generateEdgePathSegment = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId,
    chainSource: NodeId,
    chainTarget: NodeId
): string => {
    const sourceAttrs = graph.getNodeAttributes(chainSource);
    const targetAttrs = graph.getNodeAttributes(chainTarget);
    const edgeAttrs = graph.getEdgeAttributes(edgeId);
    const pathType = edgeAttrs.type;
    const initialPathAttr = edgeAttrs[pathType]!;

    const x1 = sourceAttrs.x,
        y1 = sourceAttrs.y,
        x2 = targetAttrs.x,
        y2 = targetAttrs.y;
    const finalPathAttr = structuredClone(initialPathAttr);

    const isReversed = graph.source(edgeId) !== chainSource;

    if (isReversed) {
        if ('startFrom' in finalPathAttr) {
            finalPathAttr.startFrom = finalPathAttr.startFrom === 'from' ? 'to' : 'from';
        }
        if (pathType === LinePathType.RayGuided) {
            const rayGuidedAttr = finalPathAttr as RayGuidedPathAttributes;
            [rayGuidedAttr.startAngle, rayGuidedAttr.endAngle] = [rayGuidedAttr.endAngle, rayGuidedAttr.startAngle];
            [rayGuidedAttr.offsetFrom, rayGuidedAttr.offsetTo] = [rayGuidedAttr.offsetTo, rayGuidedAttr.offsetFrom];
        }
        // no need to handle simple path as it is symmetrical
    }

    return (
        linePaths[pathType]?.generatePath(x1, x2, y1, y2, finalPathAttr as any) || `M ${x1} ${y1} L ${x2} ${y2}`
    );
};

/**
 * Merge multiple SVG path segments into one continuous path.
 *
 * The first segment is kept as-is. For subsequent segments the initial
 * `M x y` move command is stripped so the path continues from where
 * the previous segment ended.
 */
export const mergePathSegments = (segments: string[]): Path | undefined => {
    if (segments.length === 0) return undefined;

    let path = segments[0];
    for (let i = 1; i < segments.length; i++) {
        const parts = segments[i].split(' ');
        // Slice from the 4th element (index 3) to remove the initial move command and its coordinates.
        path += ' ' + parts.slice(3).join(' ');
    }
    return path as Path;
};
