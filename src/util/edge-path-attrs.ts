import { RayGuidedPathAttributes } from '../components/svgs/lines/paths/ray-guided';
import { ExternalLinePathAttributes, LinePathType } from '../constants/lines';

type EdgePathAttrs = NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>;

/**
 * Flip a cloned edge path attrs object so the generated segment visually
 * connects from the traversal's entry endpoint rather than the edge's declared
 * source. Used when a chain / loop traverses an edge in the direction opposite
 * to `graph.source(edge) → graph.target(edge)`.
 *
 * Mutates in place — callers should pass a clone.
 */
export const reverseEdgePathAttrs = (type: LinePathType, attrs: EdgePathAttrs): void => {
    if ('startFrom' in attrs) {
        attrs.startFrom = attrs.startFrom === 'from' ? 'to' : 'from';
    }
    // Without this swap, the user's offsetFrom (which they think shifts the
    // graph.source side) would silently end up shifting the graph.target side
    // when the segment is traversed in reverse. Swapping keeps offsetFrom/To
    // bound to graph.source/target regardless of traversal direction.
    if ('offsetFrom' in attrs && 'offsetTo' in attrs) {
        [attrs.offsetFrom, attrs.offsetTo] = [attrs.offsetTo, attrs.offsetFrom];
    }
    if (type === LinePathType.RayGuided) {
        const rayGuided = attrs as RayGuidedPathAttributes;
        [rayGuided.startAngle, rayGuided.endAngle] = [rayGuided.endAngle, rayGuided.startAngle];
    }
    // simple path is symmetrical; no flip needed
};
