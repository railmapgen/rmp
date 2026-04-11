import {
    ClosePath,
    CubicTo,
    LineTo,
    LinearPath,
    MoveTo,
    OpenPath,
    OpenPathDrawCommand,
    Path,
    PathCommand,
    PathPoint,
    RoundedTurnPath,
    ShortOpenPath,
    makeComplexOpenPath,
    makeLinearPath,
    makePoint,
    makeRoundedTurnPath,
    makeSharpTurnPath,
} from '../constants/path';

/** Narrow raw commands back to the small SVG subset used by the structured path model. */
const isLineTo = (command: PathCommand): command is LineTo => command.cmd === 'L';
const isCubicTo = (command: PathCommand): command is CubicTo => command.cmd === 'C';
const isClosePath = (command: PathCommand): command is ClosePath => command.cmd === 'Z';
const isLineOnlyOpenPath = (
    commands: readonly [MoveTo, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): commands is readonly [MoveTo, LineTo, ...LineTo[]] => commands.slice(1).every(isLineTo);

/**
 * Reconstruct the narrowest path kind from a command list.
 *
 * This keeps downstream helpers working on geometry semantics rather than raw command counts.
 * For example, concatenating collinear `M L` segments should still produce a single `ml` path,
 * not a synthetic `mll` corner.
 */
const makeOpenPathFromCommands = (
    commands: readonly [MoveTo, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): OpenPath => {
    if (commands.length === 2 && isLineTo(commands[1])) {
        return makeLinearPath(commands[0].to, commands[1].to);
    }

    if (isLineOnlyOpenPath(commands) && arePointsCollinear(commands.map(command => command.to))) {
        // Collapsing a collinear chain that reverses direction would change the rendered geometry,
        // but the path generators used in this project do not emit those non-monotonic cases.
        // non-monotonic example: A(0) -> B(10) -> C(5)
        return makeLinearPath(commands[0].to, commands.at(-1)!.to);
    }

    if (commands.length === 3 && isLineTo(commands[1]) && isLineTo(commands[2])) {
        return makeSharpTurnPath(commands[0].to, commands[1].to, commands[2].to);
    }

    if (commands.length === 4 && isLineTo(commands[1]) && isCubicTo(commands[2]) && isLineTo(commands[3])) {
        return makeRoundedTurnPath(
            commands[0].to,
            commands[1].to,
            commands[2].c1,
            commands[2].c2,
            commands[2].to,
            commands[3].to
        );
    }

    if (commands.length >= 3) {
        return makeComplexOpenPath(
            commands as readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
        );
    }

    throw new Error('Open path must contain at least one draw command.');
};

/** Treat points within a small epsilon as collinear so reconciled straight paths stay linear. */
const arePointsCollinear = (points: readonly PathPoint[]) => {
    if (points.length < 3) {
        return true;
    }

    const anchor = points[0];
    const directionPoint = points.find(
        point => Math.abs(point.x - anchor.x) > 1e-9 || Math.abs(point.y - anchor.y) > 1e-9
    );
    if (!directionPoint) {
        return true;
    }

    const [dx, dy] = [directionPoint.x - anchor.x, directionPoint.y - anchor.y];
    return points.every(point => Math.abs((point.x - anchor.x) * dy - (point.y - anchor.y) * dx) <= 1e-9);
};

/** Extract numeric operands from a serialized SVG path and validate the expected arity eagerly. */
const extractPathNumbers = (pathD: string, expectedCount: number): number[] => {
    const numbers = pathD.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    if (numbers.length !== expectedCount || numbers.some(value => !Number.isFinite(value))) {
        throw new Error(`Expected ${expectedCount} numeric values in path string, got ${numbers.length}.`);
    }
    return numbers;
};

/** Parse the exact six-point `M L C L` shape emitted by rounded-turn generators back into structured form. */
export const parseRoundedTurnPath = (pathD: string): RoundedTurnPath => {
    const numbers = extractPathNumbers(pathD, 12);
    return makeRoundedTurnPath(
        makePoint(numbers[0], numbers[1]),
        makePoint(numbers[2], numbers[3]),
        makePoint(numbers[4], numbers[5]),
        makePoint(numbers[6], numbers[7]),
        makePoint(numbers[8], numbers[9]),
        makePoint(numbers[10], numbers[11])
    );
};

/** Every supported path starts with `M`, so the first command endpoint is always the start point. */
export const getStartPoint = (path: Path): PathPoint => path.commands[0].to;

/** For closed areas, ignore the trailing `Z` and return the last drawable endpoint instead. */
export const getEndPoint = (path: Path): PathPoint => {
    const lastCommand = path.kind === 'closed-area' ? path.commands.at(-2) : path.commands.at(-1);
    if (!lastCommand || isClosePath(lastCommand)) {
        throw new Error('Path does not have a drawable endpoint.');
    }
    return lastCommand.to;
};

/** Drop the leading `M` so multiple open paths can be stitched into one command stream. */
export const dropInitialMoveTo = (path: OpenPath): readonly OpenPathDrawCommand[] =>
    path.commands.slice(1) as OpenPathDrawCommand[];

/**
 * Concatenate already-connected open paths and then normalize the result back to the most specific kind.
 *
 * This is used by reconciliation, so preserving straight-vs-corner semantics matters more than
 * preserving the original command grouping.
 */
export const concatOpenPaths = (paths: readonly [OpenPath, ...OpenPath[]] | readonly OpenPath[]): OpenPath => {
    if (!paths.length) {
        throw new Error('concatOpenPaths() requires at least one path.');
    }

    const commands: [MoveTo, ...OpenPathDrawCommand[]] = [paths[0].commands[0], ...dropInitialMoveTo(paths[0])];
    for (let i = 1; i < paths.length; i += 1) {
        commands.push(...dropInitialMoveTo(paths[i]));
    }

    return makeOpenPathFromCommands(commands as [MoveTo, OpenPathDrawCommand, ...OpenPathDrawCommand[]]);
};

/** Split a straight segment at its midpoint for styles that render each half independently. */
export const splitLinearPath = (path: LinearPath): [LinearPath, LinearPath] => {
    const [start, end] = [path.commands[0].to, path.commands[1].to];
    const middle = makePoint((start.x + end.x) / 2, (start.y + end.y) / 2);
    return [makeLinearPath(start, middle), makeLinearPath(middle, end)];
};

/** Small helper for style code that only handles straight segments. */
export const isLinearPath = (path: OpenPath): path is LinearPath => path.kind === 'ml';

/** Short open paths have dedicated render/offset logic and are worth detecting explicitly. */
export const isShortOpenPath = (path: OpenPath): path is ShortOpenPath =>
    path.kind === 'ml' || path.kind === 'mll' || path.kind === 'mlcl';
