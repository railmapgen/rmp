import { Bezier } from 'bezier-js';
import {
    ClosedSubpathCommands,
    OpenPathDrawCommand,
    PathPoint,
    closePath,
    cubicTo,
    lineTo,
    makePoint,
    moveTo,
} from '../constants/path';
import { OpenPathPrimitive, primitiveLength, primitiveToBezier } from './open-path-primitives';

const EPSILON = 1e-6;

const arePointsEqual = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON;

const normalizeCurve = (curve: Bezier) => {
    if (curve.order === 1 || curve.order === 3) return curve;
    if (curve.order === 2) return curve.raise();
    throw new Error(`Unsupported Bezier order ${curve.order}.`);
};

const bezierPointToPathPoint = (point: { x: number; y: number }): PathPoint => makePoint(point.x, point.y);

const bezierToDrawCommand = (curve: Bezier): OpenPathDrawCommand => {
    const normalized = normalizeCurve(curve);

    if (normalized.order === 1) {
        return lineTo(bezierPointToPathPoint(normalized.points[1]));
    }

    return cubicTo(
        bezierPointToPathPoint(normalized.points[1]),
        bezierPointToPathPoint(normalized.points[2]),
        bezierPointToPathPoint(normalized.points[3])
    );
};

export interface OutlineSideChain {
    left: Bezier[];
    right: Bezier[];
}

const interpolate = (start: number, end: number, t: number) => start + (end - start) * t;

export const getSymmetricOutlineSides = (
    curve: Bezier,
    startHalfWidth: number,
    endHalfWidth = startHalfWidth
): OutlineSideChain => {
    const outline = curve.outline(startHalfWidth, startHalfWidth, endHalfWidth, endHalfWidth);
    const forwardCount = curve.order === 1 ? 1 : curve.reduce().length;

    return {
        left: outline.curves.slice(1, 1 + forwardCount).map(normalizeCurve),
        right: outline.curves.slice(2 + forwardCount).map(normalizeCurve),
    };
};

export const buildSymmetricOutlineSideChains = (
    primitives: readonly OpenPathPrimitive[],
    startHalfWidth: number,
    endHalfWidth = startHalfWidth
): OutlineSideChain => {
    if (!primitives.length) return { left: [], right: [] };

    const totalLength = primitives.reduce((sum, primitive) => sum + primitiveLength(primitive), 0);
    if (totalLength <= EPSILON) return { left: [], right: [] };

    let traversed = 0;
    const left: Bezier[] = [];
    const rightPerPrimitive: Bezier[][] = [];

    for (const primitive of primitives) {
        const length = primitiveLength(primitive);
        if (length <= EPSILON) continue;

        const segmentStartWidth = interpolate(startHalfWidth, endHalfWidth, traversed / totalLength);
        traversed += length;
        const segmentEndWidth = interpolate(startHalfWidth, endHalfWidth, traversed / totalLength);

        const sides = getSymmetricOutlineSides(primitiveToBezier(primitive), segmentStartWidth, segmentEndWidth);
        left.push(...sides.left);
        rightPerPrimitive.push(sides.right);
    }

    return {
        left,
        right: rightPerPrimitive.reverse().flat(),
    };
};

export const buildClosedBezierChainPathD = (left: readonly Bezier[], right: readonly Bezier[]) => {
    const subpath = makeClosedBezierChainCommandsWithAnchor(
        bezierPointToPathPoint(left[0]?.points[0] ?? right[0]?.points[0]),
        left,
        right
    );
    if (!subpath) return '';

    return subpath
        .map(command => {
            switch (command.cmd) {
                case 'M':
                    return `M ${command.to.x} ${command.to.y}`;
                case 'L':
                    return `L ${command.to.x} ${command.to.y}`;
                case 'C':
                    return `C ${command.c1.x} ${command.c1.y} ${command.c2.x} ${command.c2.y} ${command.to.x} ${command.to.y}`;
                case 'Z':
                    return 'Z';
            }
        })
        .join(' ');
};

export const makeClosedBezierChainCommandsWithAnchor = (
    anchor: PathPoint | undefined,
    left: readonly Bezier[],
    right: readonly Bezier[]
): ClosedSubpathCommands | undefined => {
    const curves = [...left, ...right];
    if (!anchor || !curves.length) return undefined;

    const commands: [ReturnType<typeof moveTo>, ...OpenPathDrawCommand[]] = [moveTo(anchor)];
    let current = anchor;

    for (const curve of curves) {
        const start = bezierPointToPathPoint(curve.points[0]);
        if (!arePointsEqual(current, start)) {
            commands.push(lineTo(start));
        }

        commands.push(bezierToDrawCommand(curve));
        current = bezierPointToPathPoint(curve.points.at(-1)!);
    }

    return [...commands, closePath()] as unknown as ClosedSubpathCommands;
};
