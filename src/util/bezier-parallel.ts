import { Bezier } from 'bezier-js';
import {
    ClosedAreaPath,
    LinearPath,
    OpenPath,
    PathPoint,
    RoundedTurnPath,
    SharpTurnPath,
    ShortOpenPath,
    closePath,
    cubicTo,
    getEndPoint,
    getStartPoint,
    lineTo,
    makeClosedAreaPath,
    makeLinearPath,
    makePoint,
    makeRoundedTurnPath,
    makeSharpTurnPath,
    moveTo,
} from './path';

type X = number;
type Y = number;
type Point = [X, Y];

/**
 * Make a parallel path at the distance(d) of the given path.
 *
 * This helper only handles short open paths:
 * - `M L`
 * - `M L L`
 * - `M L C L`
 */
export const makeShortPathParallel = (
    path: ShortOpenPath,
    d1: number,
    d2?: number
): [OpenPath, OpenPath] | undefined => {
    d2 = d2 ?? -d1;

    if (path.kind === 'ml') {
        return [makeOffsetLinearPath(path, d1), makeOffsetLinearPath(path, d2)];
    }

    if (path.kind === 'mll') {
        const pA = makeOffsetSharpTurnPath(path, d1);
        const pB = makeOffsetSharpTurnPath(path, d2);
        if (!pA || !pB) return;
        return [pA, pB];
    }

    return makeRoundedTurnParallel(path, d1, d2);
};

/**
 * Make two parallel paths at the distance(d) of the given path and
 * also return the closed outline between them.
 */
export const makeShortPathOutline = (
    path: ShortOpenPath,
    d1: number,
    d2?: number
): { outline: ClosedAreaPath; pA: OpenPath; pB: OpenPath } | undefined => {
    d2 = d2 ?? -d1;

    if (path.kind === 'ml') {
        const pA = makeOffsetLinearPath(path, d1);
        const pB = makeOffsetLinearPath(path, d2);
        return { outline: makePolylineOutline(pA, pB), pA, pB };
    }

    if (path.kind === 'mll') {
        const pA = makeOffsetSharpTurnPath(path, d1);
        const pB = makeOffsetSharpTurnPath(path, d2);
        if (!pA || !pB) return;
        return { outline: makePolylineOutline(pA, pB), pA, pB };
    }

    return makeRoundedTurnOutline(path, d1, d2);
};

const toPointTuple = (point: PathPoint): Point => [point.x, point.y];

const makeOffsetLinearPath = (path: LinearPath, d: number): LinearPath => {
    const start = getStartPoint(path);
    const end = getEndPoint(path);
    const offset = makeOffsetSegment(start, end, d);
    return makeLinearPath(offset.start, offset.end);
};

const makeOffsetSharpTurnPath = (path: SharpTurnPath, d: number): SharpTurnPath | undefined => {
    const [start, corner, end] = [path.commands[0].to, path.commands[1].to, path.commands[2].to];
    const segmentA = makeOffsetSegment(start, corner, d);
    const segmentB = makeOffsetSegment(corner, end, d);
    const offsetCorner = getLineIntersection(segmentA.start, segmentA.end, segmentB.start, segmentB.end);
    if (!offsetCorner) return;

    return makeSharpTurnPath(segmentA.start, offsetCorner, segmentB.end);
};

const makeRoundedTurnParallel = (
    path: RoundedTurnPath,
    d1: number,
    d2: number
): [RoundedTurnPath, RoundedTurnPath] | undefined => {
    const [m, l, c, end] = [path.commands[0].to, path.commands[1].to, path.commands[2], path.commands[3].to];
    const b = new Bezier([l.x, l.y, c.c1.x, c.c1.y, c.c2.x, c.c2.y, c.to.x, c.to.y]);
    const [bA, bB] = [b.scale(d1), b.scale(d2)];

    const endpoints = makeStartingAndEndingPointsOfParallelShortPaths(
        toPointTuple(m),
        toPointTuple(l),
        toPointTuple(end),
        b,
        bA,
        bB
    );
    if (!endpoints) return;

    const {
        mA: [mxA, myA],
        mB: [mxB, myB],
        endA: [endXA, endYA],
        endB: [endXB, endYB],
    } = endpoints;

    const pathA = makeRoundedTurnPath(
        makePoint(mxA, myA),
        makePoint(bA.points[0].x, bA.points[0].y),
        makePoint(bA.points[1].x, bA.points[1].y),
        makePoint(bA.points[2].x, bA.points[2].y),
        makePoint(bA.points[3].x, bA.points[3].y),
        makePoint(endXA, endYA)
    );
    const pathB = makeRoundedTurnPath(
        makePoint(mxB, myB),
        makePoint(bB.points[0].x, bB.points[0].y),
        makePoint(bB.points[1].x, bB.points[1].y),
        makePoint(bB.points[2].x, bB.points[2].y),
        makePoint(bB.points[3].x, bB.points[3].y),
        makePoint(endXB, endYB)
    );

    return [pathA, pathB];
};

const makeRoundedTurnOutline = (
    path: RoundedTurnPath,
    d1: number,
    d2: number
): { outline: ClosedAreaPath; pA: RoundedTurnPath; pB: RoundedTurnPath } | undefined => {
    const parallels = makeRoundedTurnParallel(path, d1, d2);
    if (!parallels) return;
    const [pA, pB] = parallels;

    const curveA = pA.commands[2];
    const curveB = pB.commands[2];
    const outline = makeClosedAreaPath([
        moveTo(pA.commands[0].to),
        lineTo(pA.commands[1].to),
        cubicTo(curveA.c1, curveA.c2, curveA.to),
        lineTo(pA.commands[3].to),
        lineTo(pB.commands[3].to),
        lineTo(curveB.to),
        cubicTo(curveB.c2, curveB.c1, pB.commands[1].to),
        lineTo(pB.commands[0].to),
        closePath(),
    ]);

    return { outline, pA, pB };
};

const makePolylineOutline = (pA: LinearPath | SharpTurnPath, pB: LinearPath | SharpTurnPath) => {
    const pointsA = getPolylinePoints(pA);
    const pointsB = getPolylinePoints(pB).reverse();
    const outlinePoints = [...pointsA, ...pointsB];

    const commands = [
        moveTo(outlinePoints[0]),
        ...outlinePoints.slice(1).map(point => lineTo(point)),
        closePath(),
    ] as const;

    return makeClosedAreaPath(
        commands as unknown as [
            ReturnType<typeof moveTo>,
            ReturnType<typeof lineTo>,
            ReturnType<typeof lineTo>,
            ...ReturnType<typeof lineTo>[],
            ReturnType<typeof closePath>,
        ]
    );
};

const getPolylinePoints = (path: LinearPath | SharpTurnPath): PathPoint[] => {
    if (path.kind === 'ml') {
        return [path.commands[0].to, path.commands[1].to];
    }
    return [path.commands[0].to, path.commands[1].to, path.commands[2].to];
};

const makeOffsetSegment = (start: PathPoint, end: PathPoint, d: number) => {
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

const getLineIntersection = (a1: PathPoint, a2: PathPoint, b1: PathPoint, b2: PathPoint): PathPoint | undefined => {
    const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
    if (Math.abs(denominator) < 1e-9) return;

    const determinantA = a1.x * a2.y - a1.y * a2.x;
    const determinantB = b1.x * b2.y - b1.y * b2.x;

    return makePoint(
        (determinantA * (b1.x - b2.x) - (a1.x - a2.x) * determinantB) / denominator,
        (determinantA * (b1.y - b2.y) - (a1.y - a2.y) * determinantB) / denominator
    );
};

const makeStartingAndEndingPointsOfParallelShortPaths = (
    m: Point,
    l: Point,
    end: Point,
    b: Bezier,
    bA: Bezier,
    bB: Bezier
): { mA: Point; mB: Point; endA: Point; endB: Point } | undefined => {
    const cStartingA = [bA.points.at(0)!.x, bA.points.at(0)!.y];
    const cStartingB = [bB.points.at(0)!.x, bB.points.at(0)!.y];

    const [mxA, myA] = find4thVertexOfAParallelogram(m[0], l[0], cStartingA[0], m[1], l[1], cStartingA[1]);
    const [mxB, myB] = find4thVertexOfAParallelogram(m[0], l[0], cStartingB[0], m[1], l[1], cStartingB[1]);

    const bEndingA = [bA.points.at(-1)!.x, bA.points.at(-1)!.y];
    const bEndingB = [bB.points.at(-1)!.x, bB.points.at(-1)!.y];
    const bEnding = [b.points.at(-1)!.x, b.points.at(-1)!.y];

    const [endXA, endYA] = find4thVertexOfAParallelogram(
        bEndingA[0],
        bEnding[0],
        end[0],
        bEndingA[1],
        bEnding[1],
        end[1]
    );
    const [endXB, endYB] = find4thVertexOfAParallelogram(
        bEndingB[0],
        bEnding[0],
        end[0],
        bEndingB[1],
        bEnding[1],
        end[1]
    );

    return { mA: [mxA, myA], mB: [mxB, myB], endA: [endXA, endYA], endB: [endXB, endYB] };
};

/**
 * Given the coordinates of point A, B, and C,
 * this helper function find the 4th vertex of the parallelogram.
 *   D---C
 *  /   /
 * A---B
 * @returns The coordinates of point D.
 */
const find4thVertexOfAParallelogram = (xa: number, xb: number, xc: number, ya: number, yb: number, yc: number) => {
    const [xmid, ymid] = [xa + xc, ya + yc];
    const [xd, yd] = [xmid - xb, ymid - yb];
    return [xd, yd];
};
