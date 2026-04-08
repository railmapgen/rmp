import { PathPoint, makePoint } from './path';

/** Degrees to radians. */
export const degToRad = (angle: number) => (angle * Math.PI) / 180;

const EPSILON = 1e-6;

/** Snap near-zero values to exactly zero to avoid floating-point noise. */
export const sanitizeCoordinate = (value: number): number => (Math.abs(value) < EPSILON ? 0 : value);

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
