import { makePoint, PathPoint } from '../constants/path';
import { locatePrimitiveByArcLength, getPrimitiveListLength } from './open-path-length';
import { OpenPathPrimitive, primitiveLength, primitiveToBezier } from './open-path-primitives';

/**
 * Arc-length slicing for primitive lists.
 *
 * This file answers the question:
 *   "Given an authored path and two distances along it, which exact sub-segments lie between them?"
 *
 * The output stays in primitive form, so curved pieces remain cubic Beziers and straight pieces
 * remain lines. No polyline approximation is introduced here.
 */

const EPSILON = 1e-6;

/** Clamp helper for arc-length ranges. */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Linear interpolation used when trimming line primitives. */
const lerpPoint = (a: PathPoint, b: PathPoint, t: number): PathPoint =>
    makePoint(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/**
 * Trim one primitive to a local parameter range `[t0, t1]`.
 *
 * - Lines are trimmed by direct endpoint interpolation.
 * - Cubics are trimmed by `Bezier.split(t0, t1)`, which returns the exact sub-curve
 *   for that parameter interval.
 *
 * Degenerate ranges are rejected as `undefined`.
 */
const trimPrimitive = (primitive: OpenPathPrimitive, t0: number, t1: number): OpenPathPrimitive | undefined => {
    if (t1 - t0 <= EPSILON) return undefined;

    if (primitive.kind === 'line') {
        return {
            kind: 'line',
            start: lerpPoint(primitive.start, primitive.end, t0),
            end: lerpPoint(primitive.start, primitive.end, t1),
        };
    }

    const curve = primitiveToBezier(primitive).split(t0, t1);
    const [start, c1, c2, end] = curve.points;

    return {
        kind: 'cubic',
        start: makePoint(start.x, start.y),
        c1: makePoint(c1.x, c1.y),
        c2: makePoint(c2.x, c2.y),
        end: makePoint(end.x, end.y),
    };
};

/**
 * Slice a primitive list by global arc-length endpoints.
 *
 * Algorithm:
 * 1. Normalize and clamp `[s0, s1]` into the valid total-length interval.
 * 2. Convert both arc-length endpoints into primitive-local locations.
 * 3. Iterate the covered primitive range.
 * 4. For each touched primitive, trim only the needed local interval.
 * 5. Drop zero-length artifacts.
 *
 * The returned list can therefore contain:
 * - a partial first primitive
 * - zero or more untouched middle primitives
 * - a partial last primitive
 *
 * and still preserves the original segment types.
 */
export const slicePrimitivesByArcLength = (
    primitives: readonly OpenPathPrimitive[],
    s0: number,
    s1: number
): OpenPathPrimitive[] => {
    if (!primitives.length) return [];

    const totalLength = getPrimitiveListLength(primitives);
    const startArcLength = clamp(Math.min(s0, s1), 0, totalLength);
    const endArcLength = clamp(Math.max(s0, s1), 0, totalLength);

    if (endArcLength - startArcLength <= EPSILON) return [];

    const startLocation = locatePrimitiveByArcLength(primitives, startArcLength);
    const endLocation = locatePrimitiveByArcLength(primitives, endArcLength);

    const trimmed: OpenPathPrimitive[] = [];

    for (let i = startLocation.primitiveIndex; i <= endLocation.primitiveIndex; i += 1) {
        const primitive = primitives[i];
        const t0 = i === startLocation.primitiveIndex ? startLocation.t : 0;
        const t1 = i === endLocation.primitiveIndex ? endLocation.t : 1;
        const piece = trimPrimitive(primitive, t0, t1);

        if (piece && primitiveLength(piece) > EPSILON) {
            trimmed.push(piece);
        }
    }

    return trimmed;
};
