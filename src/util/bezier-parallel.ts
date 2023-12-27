import { Bezier } from 'bezier-js';
import { LinePathType } from '../constants/lines';

// Note this is not reconcile ready meaning it only handles short path.
export const makeShortPathParallel = (
    path: `${'m' | 'M'}${string}`,
    type: LinePathType,
    d1: number,
    d2?: number
): [`${'m' | 'M'}${string}`, `${'m' | 'M'}${string}`] | undefined => {
    d2 = d2 ?? -d1;

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
    if (!m || !end) return;

    // Check whether it is a linear line and process it specifically.
    if (
        m[0] === end[0] ||
        m[1] === end[1] ||
        (type === LinePathType.Diagonal && Math.abs(m[1] - end[1]) === Math.abs(m[0] - end[0]))
    ) {
        const [x1, y1, x2, y2] = [m[0], m[1], end[0], end[1]];
        const k = Math.abs((y2 - y1) / (x2 - x1));
        if (k === Infinity) {
            // Vertical line
            return [`M ${x1 + 1.25},${y1} L ${x2 + 1.25},${y2}`, `M ${x1 - 1.25},${y1} L ${x2 - 1.25},${y2}`];
        } else if (k === 0) {
            // Horizontal line
            return [`M ${x1},${y1 + 1.25} L ${x2},${y2 + 1.25}`, `M ${x1},${y1 - 1.25} L ${x2},${y2 - 1.25}`];
        } else {
            const kk = 1 / k;
            const dx = 1.25 / Math.sqrt(kk * kk + 1);
            const dy = dx * kk * -Math.sign((x2 - x1) * (y2 - y1));
            return [
                `M ${x1 + dx},${y1 + dy} L ${x2 + dx},${y2 + dy}`,
                `M ${x1 - dx},${y1 - dy} L ${x2 - dx},${y2 - dy}`,
            ];
        }
    }

    // TODO: Check if it is a perpendicular or rotate-perpendicular line and process it specifically.

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
    if (!l || !c) return;
    // Construct the Bezier curve in bezier-js.
    const b = new Bezier([...l, ...c]);
    // Make the parallel Bezier curves.
    const [cA, cB] = [b.scale(d1), b.scale(d2)];

    // Connect the curve with the first half of the linear line.
    // Find the start point of the new curve path.
    const cStartingA = [cA.points.at(0)!.x, cA.points.at(0)!.y];
    // Find the start point of the new curve path.
    const cStartingB = [cB.points.at(0)!.x, cB.points.at(0)!.y];
    if (!m) return;
    // Get the start point of the new path.
    const [mxA, myA] = find4thVertexOfAParallelogram(m[0], l[0], cStartingA[0], m[1], l[1], cStartingA[1]);
    const [mxB, myB] = find4thVertexOfAParallelogram(m[0], l[0], cStartingB[0], m[1], l[1], cStartingB[1]);

    // Connect the curve with the second half of the linear line.
    // Find the end point of the new curve path.
    const cEndingA = [cA.points.at(-1)!.x, cA.points.at(-1)!.y];
    // Find the end point of the new curve path.
    const cEndingB = [cB.points.at(-1)!.x, cB.points.at(-1)!.y];
    // Find the end point of the original curve path.
    const cEnding = [b.points.at(-1)!.x, b.points.at(-1)!.y];
    if (!end) return;
    // Get the end point of the new path.
    const [endXA, endYA] = find4thVertexOfAParallelogram(
        cEndingA[0],
        cEnding[0],
        end[0],
        cEndingA[1],
        cEnding[1],
        end[1]
    );
    const [endXB, endYB] = find4thVertexOfAParallelogram(
        cEndingB[0],
        cEnding[0],
        end[0],
        cEndingB[1],
        cEnding[1],
        end[1]
    );

    return [
        `M ${mxA},${myA} ${cA.toSVG().replace('M', 'L')} L ${endXA},${endYA}`,
        `M ${mxB},${myB} ${cB.toSVG().replace('M', 'L')} L ${endXB},${endYB}`,
    ];
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
