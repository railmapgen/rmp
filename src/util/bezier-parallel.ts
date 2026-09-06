import { Bezier } from 'bezier-js';
import {
    ClosedAreaPath,
    CubicTo,
    LineTo,
    MultiSegmentOpenPathCommands,
    OpenPath,
    OpenPathCommands,
    OpenPathDrawCommand,
    PathPoint,
    cubicTo,
    lineTo,
    makeClosedAreaPathFromOpenCommands,
    makePoint,
    moveTo,
} from '../constants/path';
import { getLineIntersection, makeOffsetSegment } from './geometry';
import { dropInitialMoveTo, getEndPoint, getStartPoint, makeOpenPathFromCommands } from './path';

type OffsetDrawCommand = {
    /** Original segment start is needed later to repair joins after offsetting. */
    originalStart: PathPoint;
    /** Original segment end is the next segment's original start. */
    originalEnd: PathPoint;
    /** Cubic offsets can shift their start point, so keep it separately from the generated command. */
    offsetStart: PathPoint;
    command: LineTo | CubicTo;
};

const EPSILON = 1e-6;

const isLineTo = (command: OpenPathDrawCommand): command is LineTo => command.cmd === 'L';
const isCubicTo = (command: OpenPathDrawCommand): command is CubicTo => command.cmd === 'C';

const arePointsEqual = (a: PathPoint, b: PathPoint, epsilon = EPSILON) =>
    Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;

const toPathPoint = (point: { x: number; y: number }): PathPoint => makePoint(point.x, point.y);
const translatePointByVector = (point: PathPoint, dx: number, dy: number): PathPoint =>
    makePoint(point.x + dx, point.y + dy);

/**
 * Offset every draw command independently while retaining enough original
 * geometry to reconnect the pieces afterwards.
 *
 * Lines use our existing segment offset helper. Cubics use bezier-js because a
 * reliable cubic offset is not just a parallel translation of the two control
 * points.
 */
const makeOffsetDrawCommands = (path: OpenPath, d: number): [OffsetDrawCommand, ...OffsetDrawCommand[]] => {
    let start = getStartPoint(path);
    const offsetCommands = dropInitialMoveTo(path).map(command => {
        const originalStart = start;
        const originalEnd = command.to;
        const result = isLineTo(command)
            ? (() => {
                  // Straight segments can be offset exactly by translating both
                  // endpoints along the segment normal.
                  const offset = makeOffsetSegment(originalStart, originalEnd, d);
                  return {
                      originalStart,
                      originalEnd,
                      offsetStart: offset.start,
                      command: lineTo(offset.end),
                  };
              })()
            : (() => {
                  // A cubic's offset endpoints and controls depend on curve
                  // curvature, so defer that calculation to bezier-js.
                  const bezier = new Bezier([
                      originalStart.x,
                      originalStart.y,
                      command.c1.x,
                      command.c1.y,
                      command.c2.x,
                      command.c2.y,
                      command.to.x,
                      command.to.y,
                  ]);
                  const scaled = bezier.scale(d);
                  return {
                      originalStart,
                      originalEnd,
                      offsetStart: toPathPoint(scaled.points[0]),
                      command: cubicTo(
                          toPathPoint(scaled.points[1]),
                          toPathPoint(scaled.points[2]),
                          toPathPoint(scaled.points[3])
                      ),
                  };
              })();

        start = command.to;
        return result;
    });

    if (!offsetCommands.length) {
        throw new Error('Open path must contain at least one draw command.');
    }

    return offsetCommands as [OffsetDrawCommand, ...OffsetDrawCommand[]];
};

/**
 * Re-anchor straight offset segments that touch cubics.
 *
 * bezier-js can move the offset cubic's endpoints. If an adjacent straight
 * segment keeps its independently offset endpoints, the composed path can show a
 * small gap or kink. Anchoring the line to the cubic offset endpoint preserves
 * continuity while keeping the straight segment's original direction.
 */
const anchorOffsetLinesAroundCubicJoins = (
    commands: [OffsetDrawCommand, ...OffsetDrawCommand[]]
): [OffsetDrawCommand, ...OffsetDrawCommand[]] =>
    commands.map((command, index, allCommands) => {
        if (!isLineTo(command.command)) {
            return command;
        }

        const previous = allCommands[index - 1];
        const next = allCommands[index + 1];
        const [dx, dy] = [
            command.originalEnd.x - command.originalStart.x,
            command.originalEnd.y - command.originalStart.y,
        ];
        const hasPreviousCubic = Boolean(previous && isCubicTo(previous.command));
        const hasNextCubic = Boolean(next && isCubicTo(next.command));

        let offsetStart = command.offsetStart;
        let offsetEnd = command.command.to;

        if (previous && isCubicTo(previous.command)) {
            offsetStart = previous.command.to;
        }
        if (next && isCubicTo(next.command)) {
            offsetEnd = next.offsetStart;
        }

        // When the line touches a cubic on only one side, preserve the original
        // line vector from the anchored endpoint. This avoids changing a straight
        // connector's length just because the cubic offset endpoint moved.
        if (hasPreviousCubic && !hasNextCubic) {
            offsetEnd = translatePointByVector(offsetStart, dx, dy);
        } else if (!hasPreviousCubic && hasNextCubic) {
            offsetStart = translatePointByVector(offsetEnd, -dx, -dy);
        }

        return {
            ...command,
            offsetStart,
            command: lineTo(offsetEnd),
        };
    }) as [OffsetDrawCommand, ...OffsetDrawCommand[]];

/**
 * Reverse an open path while preserving its visual shape.
 *
 * Cubic controls must be swapped when reversing a segment; otherwise the
 * endpoint tangents would point in the wrong direction.
 */
const reverseOpenPath = (path: OpenPath): OpenPath => {
    let start = getStartPoint(path);
    const reversedDrawCommands = dropInitialMoveTo(path)
        .map(command => {
            const pair = { start, command };
            start = command.to;
            return pair;
        })
        .reverse()
        .map(({ start: commandStart, command }) =>
            isLineTo(command) ? lineTo(commandStart) : cubicTo(command.c2, command.c1, commandStart)
        );

    const reversedCommands = [
        moveTo(getEndPoint(path)),
        reversedDrawCommands[0]!,
        ...reversedDrawCommands.slice(1),
    ] satisfies OpenPathCommands;
    return makeOpenPathFromCommands(reversedCommands);
};

/**
 * Build one offset open path and reconnect neighbouring offset segments.
 *
 * Adjacent offset lines meet at their mathematical intersection. Cubic joins are
 * connected with short line segments when necessary, because a cubic offset can
 * start or end at a point that does not exactly match the previous command.
 */
const makeOffsetPath = (path: OpenPath, d: number): OpenPath => {
    const offsetCommands = anchorOffsetLinesAroundCubicJoins(makeOffsetDrawCommands(path, d));
    const commands: [ReturnType<typeof moveTo>, ...OpenPathDrawCommand[]] = [moveTo(offsetCommands[0].offsetStart)];

    let currentPoint = offsetCommands[0].offsetStart;
    for (let i = 0; i < offsetCommands.length; i += 1) {
        const current = offsetCommands[i];
        const next = offsetCommands[i + 1];

        if (isLineTo(current.command)) {
            let end = current.command.to;
            if (next) {
                // Line-line joins should meet at the miter point. If nearly
                // parallel lines do not intersect numerically, fall back to the
                // next segment's start to keep the path connected.
                end = isLineTo(next.command)
                    ? (getLineIntersection(currentPoint, current.command.to, next.offsetStart, next.command.to) ??
                      next.offsetStart)
                    : current.command.to;
            }

            commands.push(lineTo(end));
            currentPoint = end;
            continue;
        }

        // Cubic offsets may not begin exactly at the current point, especially
        // after line joins were repaired. Insert a connector instead of moving,
        // so the resulting open path remains continuous for styling/outline use.
        if (!arePointsEqual(currentPoint, current.offsetStart)) {
            commands.push(lineTo(current.offsetStart));
            currentPoint = current.offsetStart;
        }

        commands.push(cubicTo(current.command.c1, current.command.c2, current.command.to));
        currentPoint = current.command.to;
    }

    const offsetPathCommands = [commands[0], commands[1]!, ...commands.slice(2)] as OpenPathCommands;
    return makeOpenPathFromCommands(offsetPathCommands);
};

/**
 * Make a parallel path pair at distances `d1` and `d2` from the given open path.
 *
 * If `d2` is omitted, use the opposite side of the source path so styles can ask
 * for a symmetric outline around a centerline with a single width value.
 */
export const makeOpenPathParallel = (path: OpenPath, d1: number, d2?: number): [OpenPath, OpenPath] => {
    const secondOffset = d2 ?? -d1;
    return [makeOffsetPath(path, d1), makeOffsetPath(path, secondOffset)];
};

/**
 * Make two parallel paths and the closed outline between them.
 *
 * The second offset path is reversed before closing so the outline winds around
 * the stroke perimeter instead of drawing both sides in the same direction.
 */
export const makeOpenPathOutline = (
    path: OpenPath,
    d1: number,
    d2?: number
): { outline: ClosedAreaPath; pA: OpenPath; pB: OpenPath } => {
    const [pA, pB] = makeOpenPathParallel(path, d1, d2);
    const reversedPathB = reverseOpenPath(pB);
    const drawCommands = [...dropInitialMoveTo(pA)];

    const reversedStart = getStartPoint(reversedPathB);
    if (!arePointsEqual(getEndPoint(pA), reversedStart)) {
        drawCommands.push(lineTo(reversedStart));
    }
    drawCommands.push(...dropInitialMoveTo(reversedPathB));

    const outlineCommands = [
        moveTo(getStartPoint(pA)),
        drawCommands[0]!,
        drawCommands[1]!,
        ...drawCommands.slice(2),
    ] satisfies MultiSegmentOpenPathCommands;

    return {
        outline: makeClosedAreaPathFromOpenCommands(outlineCommands),
        pA,
        pB,
    };
};
