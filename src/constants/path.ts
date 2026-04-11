/** Cartesian point shared by the structured path model and geometry helpers. */
export interface PathPoint {
    x: number;
    y: number;
}

/** SVG move command used to establish the path start point. */
export interface MoveTo {
    cmd: 'M';
    to: PathPoint;
}

/** Straight SVG segment ending at `to`. */
export interface LineTo {
    cmd: 'L';
    to: PathPoint;
}

/** Cubic Bezier SVG segment with two control points and one end point. */
export interface CubicTo {
    cmd: 'C';
    c1: PathPoint;
    c2: PathPoint;
    to: PathPoint;
}

/** SVG close-path command for filled outlines. */
export interface ClosePath {
    cmd: 'Z';
}

/** Drawable commands allowed after the initial `M` in an open path. */
export type OpenPathDrawCommand = LineTo | CubicTo;
/** Minimal SVG command subset used by RailMapPainter path utilities. */
export type PathCommand = MoveTo | OpenPathDrawCommand | ClosePath;

/**
 * Structured path model used across the renderer.
 *
 * `kind` is the coarse geometry classification consumed by style/path helpers,
 * while `commands` keeps the precise command sequence and `d` is the serialized SVG path data.
 */
interface BasePath<C extends readonly PathCommand[]> {
    readonly kind: string;
    readonly commands: C;
    readonly d: string;
}

/** Straight open path: `M L`. */
export interface LinearPath extends BasePath<readonly [MoveTo, LineTo]> {
    readonly kind: 'ml';
}

/** Sharp corner open path: `M L L`. */
export interface SharpTurnPath extends BasePath<readonly [MoveTo, LineTo, LineTo]> {
    readonly kind: 'mll';
}

/** Rounded corner open path: `M L C L`. */
export interface RoundedTurnPath extends BasePath<readonly [MoveTo, LineTo, CubicTo, LineTo]> {
    readonly kind: 'mlcl';
}

/** Catch-all for longer open paths that do not match the short-path special cases above. */
export interface ComplexOpenPath
    extends BasePath<readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]> {
    readonly kind: 'complex-open';
}

/** Closed filled geometry, typically derived from offset/outline helpers. */
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

/** Keep number stringification in one place so every serialized path uses the same formatting. */
const formatNumber = (value: number) => `${value}`;

/** Convert a structured command back into the corresponding SVG `d` fragment. */
const serializeCommand = (command: PathCommand): string => {
    switch (command.cmd) {
        case 'M':
            return `M ${formatNumber(command.to.x)} ${formatNumber(command.to.y)}`;
        case 'L':
            return `L ${formatNumber(command.to.x)} ${formatNumber(command.to.y)}`;
        case 'C':
            return `C ${formatNumber(command.c1.x)} ${formatNumber(command.c1.y)} ${formatNumber(command.c2.x)} ${formatNumber(
                command.c2.y
            )} ${formatNumber(command.to.x)} ${formatNumber(command.to.y)}`;
        case 'Z':
            return 'Z';
    }
};

/** Build a path object once so `kind`, `commands`, and serialized `d` never drift apart. */
const makeBasePath = <TKind extends Path['kind'], TCommands extends readonly PathCommand[]>(
    kind: TKind,
    commands: TCommands
) =>
    ({
        kind,
        commands,
        d: commands.map(serializeCommand).join(' '),
    }) as Extract<Path, { kind: TKind }> & { commands: TCommands };

/** Convenience constructors keep the structured shape and serialized SVG path in sync. */
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

export const makeComplexOpenPath = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): ComplexOpenPath => makeBasePath('complex-open', commands);

export const makeClosedAreaPath = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[], ClosePath]
): ClosedAreaPath => makeBasePath('closed-area', commands);

/** Close an existing open outline by appending `Z` without rebuilding its drawable commands. */
export const makeClosedAreaPathFromOpenCommands = (
    commands: readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]
): ClosedAreaPath => makeClosedAreaPath([...commands, closePath()] as const);
