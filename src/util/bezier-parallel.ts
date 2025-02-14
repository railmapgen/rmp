import { Bezier } from 'bezier-js';
import { LinePathType, Path } from '../constants/lines';

type X = number;
type Y = number;
type Point = [X, Y];

/**
 * Make a parallel path at the distance(d) of the given path.
 *
 * Note this is not reconcile ready meaning it only handles short path.
 * Short path is a path that starts with M, goes to some L and then curves C to some place and ends with L.
 * @param path The given path.
 * @param type Check if the path is a linear line (without any curve).
 * @param d1 The distance between the given path and the paralleled path.
 * @param d2 The other distance. Will be -d1 if not given.
 * @returns Two paths that are parallel to the give path at the distance of d1 and d2.
 */
export const makeShortPathParallel = (
    path: Path,
    type: LinePathType,
    d1: number,
    d2?: number
): [Path, Path] | undefined => {
    d2 = d2 ?? -d1;

    const [m, end] = findStartAndEnd(path);
    if (!m || !end) return;

    // Check whether it is a linear line and process it specifically.
    if (
        m[0] === end[0] ||
        m[1] === end[1] ||
        (type === LinePathType.Diagonal && Math.abs(m[1] - end[1]) === Math.abs(m[0] - end[0]))
    ) {
        const d = Math.abs(d1);
        return makeStraightParallel(m, end, d);
    }

    // TODO: Check if it is a perpendicular or rotate-perpendicular line and process it specifically.

    const [l, c] = findBezierCurve(path);
    if (!l || !c) return;
    // Construct the Bezier curve in bezier-js.
    const b = new Bezier([...l, ...c]);
    // Make the parallel Bezier curves.
    const [bA, bB] = [b.scale(d1), b.scale(d2)];

    const _ = makeStartingAndEndingPointsOfParallelShortPaths(m, l, end, b, bA, bB);
    if (!_) return;
    const {
        mA: [mxA, myA],
        mB: [mxB, myB],
        endA: [endXA, endYA],
        endB: [endXB, endYB],
    } = _;

    return [
        `M ${mxA} ${myA} ${bA.toSVG().replace('M', 'L')} L ${endXA} ${endYA}`,
        `M ${mxB} ${myB} ${bB.toSVG().replace('M', 'L')} L ${endXB} ${endYB}`,
    ];
};

/**
 * Make two parallel paths at the distance(d) of the given path.
 * Also make the closing path that fill cloud be used on it.
 *
 * Note this is not reconcile ready meaning it only handles short path.
 * Short path is a path that starts with M, go to some L and then curve C to some place and end with L.
 * @param path The given path.
 * @param type Check if the path is a linear line (without any curve).
 * @param d1 The distance between the given path and the paralleled path.
 * @param d2 The other distance. Will be -d1 if not given.
 * @returns Two paths that are parallel to the give path at the distance of d1 and d2. The closing path that fill cloud be used on it.
 */
export const makeShortPathOutline = (
    path: Path,
    type: LinePathType,
    d1: number,
    d2?: number
): { outline: Path; pA: Path; pB: Path } | undefined => {
    d2 = d2 ?? -d1;

    const [m, end] = findStartAndEnd(path);
    if (!m || !end) return;

    // Check whether it is a linear line and process it specifically.
    if (m[0] === end[0] || m[1] === end[1] || Math.abs(Math.abs(m[1] - end[1]) - Math.abs(m[0] - end[0])) < 0.001) {
        const d = Math.abs(d1);
        const [pA, pB] = makeStraightParallel(m, end, d);
        return { outline: makeStraightOutline(m, end, d), pA, pB };
    }

    // TODO: Check if it is a perpendicular or rotate-perpendicular line and process it specifically.

    const [l, c] = findBezierCurve(path);
    if (!l || !c) return;
    // Construct the Bezier curve in bezier-js.
    const b = new Bezier([...l, ...c]);
    // Make the parallel Bezier curves.
    const [bA, bB] = [b.scale(d1), b.scale(d2)];

    const _ = makeStartingAndEndingPointsOfParallelShortPaths(m, l, end, b, bA, bB);
    if (!_) return;
    const {
        mA: [mxA, myA],
        mB: [mxB, myB],
        endA: [endXA, endYA],
        endB: [endXB, endYB],
    } = _;

    const [lB, cB] = findBezierCurve(bB.toSVG().replace('M', 'L') as Path);
    const [rlB, rcB] = reverseBezierCurve(lB, cB);
    const outline = `M ${mxA} ${myA} ${bA
        .toSVG()
        .replace('M', 'L')} L ${endXA} ${endYA} L ${endXB} ${endYB} L ${rlB.join(' ')} C ${rcB.join(
        ' '
    )} L ${mxB} ${myB} Z` as Path;

    return {
        outline,
        pA: `M ${mxA} ${myA} ${bA.toSVG().replace('M', 'L')} L ${endXA} ${endYA}`,
        pB: `M ${mxB} ${myB} ${bB.toSVG().replace('M', 'L')} L ${endXB} ${endYB}`,
    };
};

const findStartAndEnd = (path: Path) => {
    // Find the start point of the original path.
    const m = path
        .match(/M\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/)
        ?.at(0)
        ?.replace(/M\s*/, '')
        .split(' ')
        .map(n => Number(n));
    // Find the end point of the original path.
    const end = path
        .match(/L\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*$/)
        ?.at(0)
        ?.replace(/L\s*/, '')
        .split(' ')
        .map(n => Number(n));
    return [m as Point, end as Point];
};

const makeStraightParallel = (m: Point, end: Point, d: number): [Path, Path] => {
    const [x1, y1, x2, y2] = [m[0], m[1], end[0], end[1]];
    const k = Math.abs((y2 - y1) / (x2 - x1));
    if (k === Infinity) {
        // Vertical line
        return [`M ${x1 + d} ${y1} L ${x2 + d} ${y2}`, `M ${x1 - d} ${y1} L ${x2 - d} ${y2}`];
    } else if (k === 0) {
        // Horizontal line
        return [`M ${x1} ${y1 + d} L ${x2} ${y2 + d}`, `M ${x1} ${y1 - d} L ${x2} ${y2 - d}`];
    } else {
        const kk = 1 / k;
        const dx = d / Math.sqrt(kk * kk + 1);
        const dy = dx * kk * -Math.sign((x2 - x1) * (y2 - y1));
        return [`M ${x1 + dx} ${y1 + dy} L ${x2 + dx} ${y2 + dy}`, `M ${x1 - dx} ${y1 - dy} L ${x2 - dx} ${y2 - dy}`];
    }
};

const makeStraightOutline = (m: Point, end: Point, d: number): Path => {
    const [x1, y1, x2, y2] = [m[0], m[1], end[0], end[1]];
    const k = Math.abs((y2 - y1) / (x2 - x1));
    if (k === Infinity) {
        // Vertical line
        return `M ${x1 + d} ${y1} L ${x2 + d} ${y2} L ${x2 - d} ${y2} L ${x1 - d} ${y1} Z`;
    } else if (k === 0) {
        // Horizontal line
        return `M ${x1} ${y1 + d} L ${x2} ${y2 + d} L ${x2} ${y2 - d} L ${x1} ${y1 - d} Z`;
    } else {
        const kk = 1 / k;
        const dx = d / Math.sqrt(kk * kk + 1);
        const dy = dx * kk * -Math.sign((x2 - x1) * (y2 - y1));
        return `M ${x1 + dx} ${y1 + dy} L ${x2 + dx} ${y2 + dy} L ${x2 - dx} ${y2 - dy} L ${x1 - dx} ${y1 - dy} Z`;
    }
};

const findBezierCurve = (path: Path): [Point, [...Point, ...Point, ...Point]] => {
    // Deal with complex Bezier curve.
    // Find the start point of the Bezier curve.
    const l = path
        .match(/L\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/)
        ?.at(0)
        ?.replace(/L\s*/, '')
        .split(' ')
        .map(n => Number(n));
    // Find the end point and control points of the Bezier curve.
    const c = path
        .match(
            /C\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+\s*[+-]?([0-9]*[.])?[0-9]+/g
        )
        ?.at(0)
        ?.replace(/C\s*/, '')
        .split(' ')
        .map(n => Number(n));
    return [l as Point, c as [...Point, ...Point, ...Point]];
};

const reverseBezierCurve = (l: Point, c: [...Point, ...Point, ...Point]) => [
    [c[4], c[5]],
    [c[2], c[3], c[0], c[1], l[0], l[1]],
];

const makeStartingAndEndingPointsOfParallelShortPaths = (
    m: Point,
    l: Point,
    end: Point,
    b: Bezier,
    bA: Bezier,
    bB: Bezier
): { mA: Point; mB: Point; endA: Point; endB: Point } | undefined => {
    // Connect the curve with the first half of the linear line.
    // Find the start point of the new curve path.
    const cStartingA = [bA.points.at(0)!.x, bA.points.at(0)!.y];
    // Find the start point of the new curve path.
    const cStartingB = [bB.points.at(0)!.x, bB.points.at(0)!.y];
    if (!m) return;
    // Get the start point of the new path.
    const [mxA, myA] = find4thVertexOfAParallelogram(m[0], l[0], cStartingA[0], m[1], l[1], cStartingA[1]);
    const [mxB, myB] = find4thVertexOfAParallelogram(m[0], l[0], cStartingB[0], m[1], l[1], cStartingB[1]);

    // Connect the curve with the second half of the linear line.
    // Find the end point of the new curve path.
    const bEndingA = [bA.points.at(-1)!.x, bA.points.at(-1)!.y];
    // Find the end point of the new curve path.
    const bEndingB = [bB.points.at(-1)!.x, bB.points.at(-1)!.y];
    // Find the end point of the original curve path.
    const bEnding = [b.points.at(-1)!.x, b.points.at(-1)!.y];
    if (!end) return;
    // Get the end point of the new path.
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
