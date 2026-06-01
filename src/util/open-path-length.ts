import { makePoint, OpenPath, PathPoint } from '../constants/path';
import { getOpenPathPrimitives, OpenPathPrimitive, primitiveLength, primitiveToBezier } from './open-path-primitives';

/**
 * Arc-length utilities for a flattened open path.
 *
 * The key idea in this file is that positions along a path are tracked in two coordinate systems:
 *
 * 1. Global arc length `s`
 *    Distance measured from the very start of the primitive list.
 *
 * 2. Local primitive location `{ primitiveIndex, t }`
 *    - `primitiveIndex` selects which authored segment we are on
 *    - `t` is the segment-local Bezier parameter in `[0, 1]`
 *
 * Converting from `s -> {primitiveIndex, t}` is what makes exact trimming possible:
 * once we know the source segment and its local parameter, we can call `Bezier.split()`
 * and keep the output as a curve instead of approximating it with a polyline.
 */

const EPSILON = 1e-6;
/** Number of binary-search refinement steps used when inverting cubic arc length. */
const BINARY_SEARCH_ITERATIONS = 30;

/** A segment-local position expressed as "which primitive" + "where inside it". */
export interface PrimitiveArcLocation {
    primitiveIndex: number;
    t: number;
}

/** Clamp helper for arc lengths and normalized parameters. */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Sum authored segment lengths to obtain the total length of a primitive list. */
export const getPrimitiveListLength = (primitives: readonly OpenPathPrimitive[]): number =>
    primitives.reduce((total, primitive) => total + primitiveLength(primitive), 0);

/** Convenience wrapper for callers that still hold the higher-level `OpenPath`. */
export const getOpenPathLength = (path: OpenPath): number => getPrimitiveListLength(getOpenPathPrimitives(path));

/**
 * Sample the geometric point at arc length `s`.
 *
 * This first resolves `s` into a primitive-local location, then evaluates that primitive at
 * the recovered parameter. Lines use direct interpolation; cubics delegate to `Bezier.get(t)`.
 */
export const getPointAtPrimitiveArcLength = (primitives: readonly OpenPathPrimitive[], s: number): PathPoint => {
    const { primitiveIndex, t } = locatePrimitiveByArcLength(primitives, s);
    const primitive = primitives[primitiveIndex];

    if (primitive.kind === 'line') {
        return makePoint(
            primitive.start.x + (primitive.end.x - primitive.start.x) * t,
            primitive.start.y + (primitive.end.y - primitive.start.y) * t
        );
    }

    const point = primitiveToBezier(primitive).get(t);
    return makePoint(point.x, point.y);
};

/**
 * Invert cubic arc length numerically.
 *
 * Cubic Bezier curves are not parameterized by arc length, so "distance travelled"
 * and "Bezier parameter `t`" are not linearly related. There is also no simple closed-form
 * inverse for arc length in the general cubic case.
 *
 * We therefore solve:
 *   length(curve.split(0, t)) = targetLength
 *
 * by binary search over `t in [0, 1]`. This is an approximation, but the result is used to
 * recover a segment-local `t` so later operations can still split the original curve exactly
 * with `Bezier.split()` instead of rasterizing or polyline-sampling it.
 */
const findBezierTAtArcLength = (primitive: OpenPathPrimitive, targetLength: number): number => {
    const curve = primitiveToBezier(primitive);
    const totalLength = curve.length();

    if (targetLength <= EPSILON) return 0;
    if (targetLength >= totalLength - EPSILON) return 1;

    let low = 0;
    let high = 1;

    for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i += 1) {
        const mid = (low + high) / 2;
        const partialLength = curve.split(0, mid).length();

        if (partialLength < targetLength) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return (low + high) / 2;
};

/**
 * Resolve a global arc length `s` into a primitive-local location.
 *
 * Algorithm:
 * 1. Clamp `s` into the valid total-length range.
 * 2. Walk the primitive list cumulatively until the containing segment is found.
 * 3. Convert the remaining local length into a local parameter:
 *    - line: `t = localLength / segmentLength`
 *    - cubic: binary-search the `t` whose prefix length matches `localLength`
 */
export const locatePrimitiveByArcLength = (
    primitives: readonly OpenPathPrimitive[],
    s: number
): PrimitiveArcLocation => {
    if (!primitives.length) {
        throw new Error('locatePrimitiveByArcLength() requires at least one primitive.');
    }

    const totalLength = getPrimitiveListLength(primitives);
    const clampedArcLength = clamp(s, 0, totalLength);

    let traversed = 0;

    for (let i = 0; i < primitives.length; i += 1) {
        const primitive = primitives[i];
        const length = primitiveLength(primitive);
        const nextTraversed = traversed + length;

        if (clampedArcLength <= nextTraversed + EPSILON || i === primitives.length - 1) {
            if (length <= EPSILON) {
                return { primitiveIndex: i, t: 0 };
            }

            const localLength = clamp(clampedArcLength - traversed, 0, length);
            return {
                primitiveIndex: i,
                t:
                    primitive.kind === 'line'
                        ? clamp(localLength / length, 0, 1)
                        : findBezierTAtArcLength(primitive, localLength),
            };
        }

        traversed = nextTraversed;
    }

    return { primitiveIndex: primitives.length - 1, t: 1 };
};

/**
 * Measure the arc length between two primitive-local positions.
 *
 * This helper is mainly useful when later logic already knows exact `{primitiveIndex, t}`
 * endpoints and wants a consistent length value without converting back to a global `s`.
 */
export const getArcLengthBetweenPrimitiveLocations = (
    primitives: readonly OpenPathPrimitive[],
    start: PrimitiveArcLocation,
    end: PrimitiveArcLocation
) => {
    if (start.primitiveIndex === end.primitiveIndex) {
        return primitiveLength(primitives[start.primitiveIndex]) * Math.max(0, end.t - start.t);
    }

    let total = primitiveLength(primitives[start.primitiveIndex]) * (1 - start.t);

    for (let i = start.primitiveIndex + 1; i < end.primitiveIndex; i += 1) {
        total += primitiveLength(primitives[i]);
    }

    total += primitiveLength(primitives[end.primitiveIndex]) * end.t;
    return total;
};
