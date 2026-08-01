import { PathPoint, makePoint } from '../constants/path';
import { clamp } from './number';

/** Degrees to radians. */
export const degToRad = (angle: number) => (angle * Math.PI) / 180;

const EPSILON = 1e-6;

/** Snap near-zero values to exactly zero to avoid floating-point noise. */
export const sanitizeCoordinate = (value: number): number => (Math.abs(value) < EPSILON ? 0 : value);

/** Euclidean distance between two SVG points. */
export const distanceBetweenPoints = (a: PathPoint, b: PathPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Vector addition for two points treated as offsets. */
export const addPoints = (a: PathPoint, b: PathPoint): PathPoint => makePoint(a.x + b.x, a.y + b.y);

/** Subtract `b` from `a`, returning an offset in the same coordinate system. */
export const subtractPoints = (a: PathPoint, b: PathPoint): PathPoint => makePoint(a.x - b.x, a.y - b.y);

/** Scale a point or vector from the origin by a scalar. */
export const scalePoint = (point: PathPoint, factor: number): PathPoint =>
    makePoint(point.x * factor, point.y * factor);

/** Linear interpolation between two points. */
export const lerpPoint = (a: PathPoint, b: PathPoint, t: number): PathPoint =>
    makePoint(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** Return a unit vector; degenerate vectors fall back to +X so downstream normals stay finite. */
export const normalizeVector = (point: PathPoint): PathPoint => {
    const length = Math.hypot(point.x, point.y);
    return length > 0 ? makePoint(point.x / length, point.y / length) : makePoint(1, 0);
};

/** Rotate a tangent 90 degrees counter-clockwise to get its left-hand normal. */
export const normalForTangent = (tangent: PathPoint): PathPoint => makePoint(-tangent.y, tangent.x);

/**
 * Resolve normalized chord coordinates into SVG coordinates.
 *
 * `coordinates.x` follows the source-to-target chord, while `coordinates.y` follows its 90-degree rotation. Both
 * basis vectors retain the chord length so the coordinates scale and rotate with their endpoints.
 */
export const fromChordCoordinates = (coordinates: PathPoint, source: PathPoint, target: PathPoint): PathPoint => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    return makePoint(
        source.x + coordinates.x * dx - coordinates.y * dy,
        source.y + coordinates.x * dy + coordinates.y * dx
    );
};

/** Convert an SVG point back into normalized coordinates relative to the source-to-target chord. */
export const toChordCoordinates = (point: PathPoint, source: PathPoint, target: PathPoint): PathPoint | undefined => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return undefined;

    const qx = point.x - source.x;
    const qy = point.y - source.y;
    return makePoint((qx * dx + qy * dy) / lengthSquared, (-qx * dy + qy * dx) / lengthSquared);
};

export interface DistanceToSegmentResult {
    distance: number;
    point: PathPoint;
    t: number;
}

/**
 * Project a point onto a finite line segment.
 *
 * The returned `t` is clamped to `[0, 1]`, so callers can use it both for nearest-distance checks and for converting
 * local segment position back into path distance.
 */
export const distanceToSegment = (point: PathPoint, start: PathPoint, end: PathPoint): DistanceToSegmentResult => {
    const segment = subtractPoints(end, start);
    const lengthSquared = segment.x * segment.x + segment.y * segment.y;
    if (lengthSquared === 0) return { distance: distanceBetweenPoints(point, start), point: start, t: 0 };

    // Dot-product projection gives the closest point on the infinite line; clamp keeps it on the finite segment.
    const t = clamp(((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSquared, 0, 1);
    const projected = addPoints(start, scalePoint(segment, t));
    return { distance: distanceBetweenPoints(point, projected), point: projected, t };
};

/** 2D cross product (scalar). */
const cross = (a: PathPoint, b: PathPoint) => a.x * b.y - a.y * b.x;

/**
 * Find the intersection of two rays given in point+direction form.
 * Returns `undefined` when the rays are (near-)parallel.
 */
export const getRayIntersection = (
    p1: PathPoint,
    d1: PathPoint,
    p2: PathPoint,
    d2: PathPoint
): PathPoint | undefined => {
    const determinant = cross(d1, d2);
    if (Math.abs(determinant) < EPSILON) return;

    // Cramer's rule solves the scalar distance along the first ray without normalizing either direction vector.
    const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
    const t = cross(delta, d2) / determinant;

    return {
        x: sanitizeCoordinate(p1.x + d1.x * t),
        y: sanitizeCoordinate(p1.y + d1.y * t),
    };
};

/**
 * Offset a line segment perpendicularly by `d` units.
 * Positive `d` offsets to the left when walking from `start` to `end`.
 */
export const makeOffsetSegment = (start: PathPoint, end: PathPoint, d: number) => {
    const [dx, dy] = [end.x - start.x, end.y - start.y];
    const length = Math.hypot(dx, dy);
    if (length === 0) {
        return { start, end };
    }

    // This normal orientation matches the historical path utilities, where positive offsets are rendered to the left.
    const [nx, ny] = [dy / length, -dx / length];
    return {
        start: makePoint(start.x + nx * d, start.y + ny * d),
        end: makePoint(end.x + nx * d, end.y + ny * d),
    };
};

/**
 * Find the intersection of two lines, each defined by two points.
 * Uses Cramer's rule. Returns `undefined` when the lines are (near-)parallel.
 */
export const getLineIntersection = (
    a1: PathPoint,
    a2: PathPoint,
    b1: PathPoint,
    b2: PathPoint
): PathPoint | undefined => {
    const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
    if (Math.abs(denominator) < 1e-9) return;

    // Determinants keep the formula symmetric and avoid converting either input line into slope-intercept form.
    const determinantA = a1.x * a2.y - a1.y * a2.x;
    const determinantB = b1.x * b2.y - b1.y * b2.x;

    return makePoint(
        (determinantA * (b1.x - b2.x) - (a1.x - a2.x) * determinantB) / denominator,
        (determinantA * (b1.y - b2.y) - (a1.y - a2.y) * determinantB) / denominator
    );
};

/**
 * Given the coordinates of point A, B, and C,
 * find the 4th vertex of the parallelogram.
 *   D---C
 *  /   /
 * A---B
 * @returns The coordinates of point D.
 */
export const find4thVertexOfAParallelogram = (
    xa: number,
    xb: number,
    xc: number,
    ya: number,
    yb: number,
    yc: number
) => {
    const [xmid, ymid] = [xa + xc, ya + yc];
    const [xd, yd] = [xmid - xb, ymid - yb];
    return [xd, yd];
};

/** Convert a PathPoint to a `[x, y]` tuple. */
export const toPointTuple = (point: PathPoint): [number, number] => [point.x, point.y];
