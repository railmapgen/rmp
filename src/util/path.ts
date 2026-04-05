export interface PathPoint {
    x: number;
    y: number;
}

interface MoveTo {
    cmd: 'M';
    to: PathPoint;
}

interface LineTo {
    cmd: 'L';
    to: PathPoint;
}

interface CubicTo {
    cmd: 'C';
    c1: PathPoint;
    c2: PathPoint;
    to: PathPoint;
}

interface ClosePath {
    cmd: 'Z';
}

type OpenPathDrawCommand = LineTo | CubicTo;
type PathCommand = MoveTo | OpenPathDrawCommand | ClosePath;

interface BasePath<C extends readonly PathCommand[]> {
    readonly kind: string;
    readonly commands: C;
    readonly d: string;
}

export interface LinearPath extends BasePath<readonly [MoveTo, LineTo]> {
    readonly kind: 'ml';
}

export interface SharpTurnPath extends BasePath<readonly [MoveTo, LineTo, LineTo]> {
    readonly kind: 'mll';
}

export interface RoundedTurnPath extends BasePath<readonly [MoveTo, LineTo, CubicTo, LineTo]> {
    readonly kind: 'mlcl';
}

export interface ComplexOpenPath
    extends BasePath<readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]> {
    readonly kind: 'complex-open';
}

export interface ClosedAreaPath
    extends BasePath<readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[], ClosePath]> {
    readonly kind: 'closed-area';
}

export type OpenPath = LinearPath | SharpTurnPath | RoundedTurnPath | ComplexOpenPath;

export type Path = OpenPath | ClosedAreaPath;

export type ShortOpenPath = LinearPath | SharpTurnPath | RoundedTurnPath;

export const makePoint = (x: number, y: number): PathPoint => ({ x, y });

export const moveTo = (to: PathPoint): MoveTo => ({ cmd: 'M', to });

export const lineTo = (to: PathPoint): LineTo => ({ cmd: 'L', to });

export const cubicTo = (c1: PathPoint, c2: PathPoint, to: PathPoint): CubicTo => ({ cmd: 'C', c1, c2, to });

export const closePath = (): ClosePath => ({ cmd: 'Z' });

const formatNumber = (value: number) => `${value}`;

const serializeCommand = (command: PathCommand): string => {
    switch (command.cmd) {
        case 'M':
        case 'L':
            return `${command.cmd} ${formatNumber(command.to.x)} ${formatNumber(command.to.y)}`;
        case 'C':
            return `C ${formatNumber(command.c1.x)} ${formatNumber(command.c1.y)} ${formatNumber(command.c2.x)} ${formatNumber(
                command.c2.y
            )} ${formatNumber(command.to.x)} ${formatNumber(command.to.y)}`;
        case 'Z':
            return 'Z';
    }
};

const isLineTo = (command: PathCommand): command is LineTo => command.cmd === 'L';
const isCubicTo = (command: PathCommand): command is CubicTo => command.cmd === 'C';
const isClosePath = (command: PathCommand): command is ClosePath => command.cmd === 'Z';

const makeBasePath = <TKind extends Path['kind'], TCommands extends readonly PathCommand[]>(
    kind: TKind,
    commands: TCommands
) =>
    ({
        kind,
        commands,
        d: commands.map(serializeCommand).join(' '),
    }) as Extract<Path, { kind: TKind }> & { commands: TCommands };

export const makeLinearPath = (start: PathPoint, end: PathPoint): LinearPath =>
    makeBasePath('ml', [moveTo(start), lineTo(end)] as const);

export const makeSharpTurnPath = (start: PathPoint, corner: PathPoint, end: PathPoint): SharpTurnPath =>
    makeBasePath('mll', [moveTo(start), lineTo(corner), lineTo(end)] as const);

export const makeRoundedTurnPath = (
    start: PathPoint,
    lineEnd: PathPoint,
    c1: PathPoint,
    c2: PathPoint,
    curveEnd: PathPoint,
    end: PathPoint
): RoundedTurnPath =>
    makeBasePath('mlcl', [moveTo(start), lineTo(lineEnd), cubicTo(c1, c2, curveEnd), lineTo(end)] as const);

const makeComplexOpenPath = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): ComplexOpenPath => makeBasePath('complex-open', commands);

export const makeClosedAreaPath = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[], ClosePath]
): ClosedAreaPath => makeBasePath('closed-area', commands);

export const makeClosedAreaPathFromOpenCommands = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): ClosedAreaPath => makeClosedAreaPath([...commands, closePath()] as const);

const makeOpenPathFromCommands = (
    commands: readonly [MoveTo, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): OpenPath => {
    if (commands.length === 2 && isLineTo(commands[1])) {
        return makeLinearPath(commands[0].to, commands[1].to);
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

const extractPathNumbers = (pathD: string, expectedCount: number): number[] => {
    const numbers = pathD.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    if (numbers.length !== expectedCount || numbers.some(value => !Number.isFinite(value))) {
        throw new Error(`Expected ${expectedCount} numeric values in path string, got ${numbers.length}.`);
    }
    return numbers;
};

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

export const getStartPoint = (path: Path): PathPoint => path.commands[0].to;

export const getEndPoint = (path: Path): PathPoint => {
    const lastCommand = path.kind === 'closed-area' ? path.commands.at(-2) : path.commands.at(-1);
    if (!lastCommand || isClosePath(lastCommand)) {
        throw new Error('Path does not have a drawable endpoint.');
    }
    return lastCommand.to;
};

export const dropInitialMoveTo = (path: OpenPath): readonly OpenPathDrawCommand[] =>
    path.commands.slice(1) as OpenPathDrawCommand[];

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

export const splitLinearPath = (path: LinearPath): [LinearPath, LinearPath] => {
    const [start, end] = [path.commands[0].to, path.commands[1].to];
    const middle = makePoint((start.x + end.x) / 2, (start.y + end.y) / 2);
    return [makeLinearPath(start, middle), makeLinearPath(middle, end)];
};

export const isLinearPath = (path: OpenPath): path is LinearPath => path.kind === 'ml';

export const isShortOpenPath = (path: OpenPath): path is ShortOpenPath =>
    path.kind === 'ml' || path.kind === 'mll' || path.kind === 'mlcl';
