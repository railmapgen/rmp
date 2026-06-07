import { OpenPath, OpenPathCommands, PathPoint, lineTo, makePoint, moveTo } from '../constants/path';
import { makeOpenPathFromCommands } from './path';

export type FreeformStartCap = 'round' | 'flat';
export type FreeformEndCap = 'round' | 'flat' | 'arrow';

export interface FreeformPoint {
    id: string;
    x: number;
    y: number;
}

export interface FreeformWidthStop {
    id: string;
    t: number;
    width: number;
}

export interface FreeformPathAttributes {
    version: 1;
    points: FreeformPoint[];
    widthStops: FreeformWidthStop[];
    smoothing: number;
    startCap: FreeformStartCap;
    endCap: FreeformEndCap;
    arrow?: {
        length: number;
        width: number;
    };
}

interface FreeformCreateOptions {
    minPointDistance?: number;
    simplifyTolerance?: number;
    defaultWidth?: number;
}

const MIN_PATH_LENGTH = 4;
const MIN_WIDTH = 0.5;
const DEFAULT_WIDTH = 5;
const DEFAULT_SMOOTHING = 0.65;
const EPSILON = 1e-6;

const DEFAULT_TARGET_RELATIVE: PathPoint = { x: 100, y: 0 };

export const defaultFreeformPathAttributes: FreeformPathAttributes = {
    version: 1,
    points: [
        { id: 'point_start', x: 0, y: 0 },
        { id: 'point_end', x: DEFAULT_TARGET_RELATIVE.x, y: DEFAULT_TARGET_RELATIVE.y },
    ],
    widthStops: [
        { id: 'width_start', t: 0, width: DEFAULT_WIDTH },
        { id: 'width_end', t: 1, width: DEFAULT_WIDTH },
    ],
    smoothing: DEFAULT_SMOOTHING,
    startCap: 'round',
    endCap: 'round',
    arrow: { length: DEFAULT_WIDTH * 2.4, width: DEFAULT_WIDTH * 2 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const formatNumber = (value: number): string => {
    const rounded = Math.round(value * 1000) / 1000;
    return Object.is(rounded, -0) ? '0' : String(rounded);
};

const distance = (a: PathPoint, b: PathPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const add = (a: PathPoint, b: PathPoint): PathPoint => ({ x: a.x + b.x, y: a.y + b.y });
const subtract = (a: PathPoint, b: PathPoint): PathPoint => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (point: PathPoint, factor: number): PathPoint => ({ x: point.x * factor, y: point.y * factor });
const lerp = (a: PathPoint, b: PathPoint, t: number): PathPoint => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
});

const normalizeVector = (point: PathPoint): PathPoint => {
    const length = Math.hypot(point.x, point.y);
    return length > 0 ? { x: point.x / length, y: point.y / length } : { x: 1, y: 0 };
};

const normalForTangent = (tangent: PathPoint): PathPoint => ({ x: -tangent.y, y: tangent.x });

const distanceToSegment = (
    point: PathPoint,
    start: PathPoint,
    end: PathPoint
): { distance: number; point: PathPoint; t: number } => {
    const segment = subtract(end, start);
    const lengthSquared = segment.x * segment.x + segment.y * segment.y;
    if (lengthSquared === 0) return { distance: distance(point, start), point: start, t: 0 };

    const t = clamp(((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSquared, 0, 1);
    const projected = add(start, scale(segment, t));
    return { distance: distance(point, projected), point: projected, t };
};

const polylineLength = (points: PathPoint[]): number =>
    points.reduce((total, point, index) => (index === 0 ? 0 : total + distance(points[index - 1], point)), 0);

const perpendicularDistance = (point: PathPoint, start: PathPoint, end: PathPoint): number =>
    distanceToSegment(point, start, end).distance;

const rdpSimplify = (points: PathPoint[], tolerance: number): PathPoint[] => {
    if (points.length <= 2 || tolerance <= 0) return points;

    let maxDistance = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i += 1) {
        const pointDistance = perpendicularDistance(points[i], start, end);
        if (pointDistance > maxDistance) {
            maxDistance = pointDistance;
            index = i;
        }
    }

    if (maxDistance <= tolerance) return [start, end];

    const before = rdpSimplify(points.slice(0, index + 1), tolerance);
    const after = rdpSimplify(points.slice(index), tolerance);
    return before.slice(0, -1).concat(after);
};

const normalizeInputPoints = (
    points: PathPoint[],
    minPointDistance: number,
    simplifyTolerance: number
): PathPoint[] => {
    const finitePoints = points.filter(point => isFiniteNumber(point.x) && isFiniteNumber(point.y));
    if (finitePoints.length < 2) return [];

    const filtered = finitePoints.reduce<PathPoint[]>((acc, point) => {
        const previous = acc[acc.length - 1];
        if (!previous || distance(previous, point) >= minPointDistance) acc.push(point);
        return acc;
    }, []);

    const lastFinitePoint = finitePoints[finitePoints.length - 1];
    const lastFilteredPoint = filtered[filtered.length - 1];
    if (lastFilteredPoint && distance(lastFilteredPoint, lastFinitePoint) > EPSILON) {
        filtered.push(lastFinitePoint);
    }

    const simplified = rdpSimplify(filtered, simplifyTolerance);
    return polylineLength(simplified) >= MIN_PATH_LENGTH ? simplified : [];
};

const normalizeWidthStops = (widthStops: FreeformWidthStop[] | undefined, fallbackWidth = DEFAULT_WIDTH) => {
    const safeStops = (widthStops ?? [])
        .filter(stop => isFiniteNumber(stop.t) && isFiniteNumber(stop.width))
        .map((stop, index) => ({
            id: stop.id || `width_${index}`,
            t: clamp(stop.t, 0, 1),
            width: Math.max(MIN_WIDTH, stop.width),
        }))
        .sort((a, b) => a.t - b.t);

    return safeStops.length > 0 ? safeStops : [{ id: 'width_default', t: 0.5, width: fallbackWidth }];
};

const resolveTargetRelative = (points: FreeformPoint[], targetRelative?: PathPoint): PathPoint => {
    if (targetRelative && isFiniteNumber(targetRelative.x) && isFiniteNumber(targetRelative.y)) {
        return targetRelative;
    }
    const lastPoint = points.at(-1);
    if (lastPoint && isFiniteNumber(lastPoint.x) && isFiniteNumber(lastPoint.y)) {
        return { x: lastPoint.x, y: lastPoint.y };
    }
    return DEFAULT_TARGET_RELATIVE;
};

export const normalizeFreeformPathAttributes = (
    value: unknown,
    targetRelative?: PathPoint
): FreeformPathAttributes | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as Partial<FreeformPathAttributes>;
    const inputPoints = Array.isArray(candidate.points)
        ? candidate.points
              .filter(point => isFiniteNumber(point.x) && isFiniteNumber(point.y))
              .map((point, index) => ({
                  id: point.id || `point_${index}`,
                  x: point.x,
                  y: point.y,
              }))
        : [];
    const target = resolveTargetRelative(inputPoints, targetRelative);

    if (distance({ x: 0, y: 0 }, target) < EPSILON) return undefined;

    const middlePoints = inputPoints
        .slice(1, -1)
        .filter(point => distance(point, { x: 0, y: 0 }) > EPSILON && distance(point, target) > EPSILON);
    const startId = inputPoints[0]?.id || 'point_start';
    const endId = inputPoints.at(-1)?.id || 'point_end';

    const startCap = candidate.startCap === 'flat' || candidate.startCap === 'round' ? candidate.startCap : 'round';
    const endCap =
        candidate.endCap === 'flat' || candidate.endCap === 'arrow' || candidate.endCap === 'round'
            ? candidate.endCap
            : 'round';
    const smoothing = isFiniteNumber(candidate.smoothing) ? clamp(candidate.smoothing, 0, 1) : DEFAULT_SMOOTHING;
    const widthStops = normalizeWidthStops(candidate.widthStops);
    const endWidth = widthStops[widthStops.length - 1]?.width ?? DEFAULT_WIDTH;

    return {
        version: 1,
        points: [{ id: startId, x: 0, y: 0 }, ...middlePoints, { id: endId, x: target.x, y: target.y }],
        widthStops,
        smoothing,
        startCap,
        endCap,
        arrow: {
            length: Math.max(MIN_WIDTH, candidate.arrow?.length ?? endWidth * 2.4),
            width: Math.max(MIN_WIDTH, candidate.arrow?.width ?? endWidth * 2),
        },
    };
};

export const createFreeformPathAttributes = (
    inputPoints: PathPoint[],
    source: PathPoint,
    target: PathPoint,
    createId: () => string,
    options: FreeformCreateOptions = {}
): FreeformPathAttributes | undefined => {
    const seededPoints = [source, ...inputPoints, target];
    const normalized = normalizeInputPoints(
        seededPoints,
        options.minPointDistance ?? 2,
        options.simplifyTolerance ?? 1
    );
    if (normalized.length < 2) return undefined;

    normalized[0] = source;
    normalized[normalized.length - 1] = target;
    const targetRelative = subtract(target, source);
    const defaultWidth = options.defaultWidth ?? DEFAULT_WIDTH;
    const points = normalized.map((point, index) => ({
        id: createId(),
        x: index === 0 ? 0 : index === normalized.length - 1 ? targetRelative.x : point.x - source.x,
        y: index === 0 ? 0 : index === normalized.length - 1 ? targetRelative.y : point.y - source.y,
    }));

    return normalizeFreeformPathAttributes(
        {
            version: 1,
            points,
            widthStops: normalizeWidthStops(undefined, defaultWidth).map(stop => ({ ...stop, id: createId() })),
            smoothing: DEFAULT_SMOOTHING,
            startCap: 'round',
            endCap: 'round',
            arrow: { length: defaultWidth * 2.4, width: defaultWidth * 2 },
        },
        targetRelative
    );
};

const catmullRomPoint = (p0: PathPoint, p1: PathPoint, p2: PathPoint, p3: PathPoint, t: number): PathPoint => {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x:
            0.5 *
            (2 * p1.x +
                (-p0.x + p2.x) * t +
                (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
            0.5 *
            (2 * p1.y +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
};

export const getFreeformControlPoints = (attrs: FreeformPathAttributes, targetRelative?: PathPoint): FreeformPoint[] =>
    normalizeFreeformPathAttributes(attrs, targetRelative)?.points ?? [];

export const getFreeformCenterline = (
    attrs: FreeformPathAttributes,
    targetRelative?: PathPoint,
    origin: PathPoint = { x: 0, y: 0 }
): PathPoint[] => {
    const safeAttrs = normalizeFreeformPathAttributes(attrs, targetRelative);
    if (!safeAttrs) return [];

    const { points, smoothing } = safeAttrs;
    const output: PathPoint[] = [];

    for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        const steps = clamp(Math.ceil(distance(p1, p2) / 8), 8, 28);

        for (let step = 0; step <= steps; step += 1) {
            if (i > 0 && step === 0) continue;
            const t = step / steps;
            const linear = lerp(p1, p2, t);
            const curved = catmullRomPoint(p0, p1, p2, p3, t);
            output.push(add(origin, lerp(linear, curved, smoothing)));
        }
    }

    return output;
};

const getPolylineMetrics = (points: PathPoint[]) => {
    const cumulative: number[] = [0];
    for (let i = 1; i < points.length; i += 1) {
        cumulative[i] = cumulative[i - 1] + distance(points[i - 1], points[i]);
    }
    return { cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
};

const pointAtDistance = (points: PathPoint[], targetDistance: number): PathPoint => {
    const metrics = getPolylineMetrics(points);
    const safeDistance = clamp(targetDistance, 0, metrics.total);
    if (metrics.total === 0) return points[0] ?? { x: 0, y: 0 };

    for (let i = 0; i < points.length - 1; i += 1) {
        const startDistance = metrics.cumulative[i];
        const endDistance = metrics.cumulative[i + 1];
        if (safeDistance >= startDistance && safeDistance <= endDistance) {
            const segmentLength = Math.max(0.0001, endDistance - startDistance);
            return lerp(points[i], points[i + 1], (safeDistance - startDistance) / segmentLength);
        }
    }

    return points[points.length - 1];
};

const tangentAtDistance = (points: PathPoint[], targetDistance: number): PathPoint => {
    const metrics = getPolylineMetrics(points);
    const delta = Math.max(0.1, Math.min(4, metrics.total / 50));
    const before = pointAtDistance(points, targetDistance - delta);
    const after = pointAtDistance(points, targetDistance + delta);
    return normalizeVector(subtract(after, before));
};

const trimPolylineAtDistance = (points: PathPoint[], targetDistance: number): PathPoint[] => {
    const metrics = getPolylineMetrics(points);
    const safeDistance = clamp(targetDistance, 0, metrics.total);
    const output: PathPoint[] = [points[0]];

    for (let i = 1; i < points.length; i += 1) {
        if (metrics.cumulative[i] < safeDistance) {
            output.push(points[i]);
        } else {
            output.push(pointAtDistance(points, safeDistance));
            break;
        }
    }

    return output.length >= 2 ? output : [points[0], pointAtDistance(points, safeDistance)];
};

export const getFreeformPointAtT = (attrs: FreeformPathAttributes, targetRelative: PathPoint, t: number): PathPoint => {
    const centerline = getFreeformCenterline(attrs, targetRelative);
    const metrics = getPolylineMetrics(centerline);
    return pointAtDistance(centerline, metrics.total * clamp(t, 0, 1));
};

export const getNearestFreeformCenterlineT = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    point: PathPoint
): number => {
    const centerline = getFreeformCenterline(attrs, targetRelative);
    const metrics = getPolylineMetrics(centerline);
    if (metrics.total === 0) return 0;

    let bestDistance = Number.POSITIVE_INFINITY;
    let bestPathDistance = 0;

    for (let i = 0; i < centerline.length - 1; i += 1) {
        const projection = distanceToSegment(point, centerline[i], centerline[i + 1]);
        if (projection.distance < bestDistance) {
            bestDistance = projection.distance;
            bestPathDistance = metrics.cumulative[i] + distance(centerline[i], centerline[i + 1]) * projection.t;
        }
    }

    return clamp(bestPathDistance / metrics.total, 0, 1);
};

export const getFreeformCenterlineD = (attrs: FreeformPathAttributes, targetRelative: PathPoint): string => {
    const centerline = getFreeformCenterline(attrs, targetRelative);
    if (centerline.length < 2) return '';
    return centerline
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${formatNumber(point.x)} ${formatNumber(point.y)}`)
        .join(' ');
};

export const getWidthAtT = (attrs: FreeformPathAttributes, t: number): number => {
    const stops = normalizeWidthStops(attrs.widthStops);
    const safeT = clamp(t, 0, 1);
    if (safeT <= stops[0].t) return stops[0].width;
    if (safeT >= stops[stops.length - 1].t) return stops[stops.length - 1].width;

    for (let i = 0; i < stops.length - 1; i += 1) {
        const start = stops[i];
        const end = stops[i + 1];
        if (safeT >= start.t && safeT <= end.t) {
            const span = Math.max(0.0001, end.t - start.t);
            return start.width + (end.width - start.width) * ((safeT - start.t) / span);
        }
    }

    return stops[stops.length - 1].width;
};

export const getFreeformWidthStopGeometry = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    stopId: string
) => {
    const stop = attrs.widthStops.find(item => item.id === stopId);
    if (!stop) return undefined;

    const centerline = getFreeformCenterline(attrs, targetRelative);
    const metrics = getPolylineMetrics(centerline);
    const pathDistance = metrics.total * clamp(stop.t, 0, 1);
    const center = pointAtDistance(centerline, pathDistance);
    const normal = normalForTangent(tangentAtDistance(centerline, pathDistance));
    const width = Math.max(MIN_WIDTH, stop.width);

    return {
        center,
        normal,
        width,
        start: add(center, scale(normal, width / 2)),
        end: add(center, scale(normal, -width / 2)),
    };
};

export const makeFreeformCenterlinePath = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    origin: PathPoint = { x: 0, y: 0 }
): OpenPath => {
    const centerline = getFreeformCenterline(attrs, targetRelative, origin);
    const fallbackEnd = add(origin, targetRelative);
    const points = centerline.length >= 2 ? centerline : [origin, fallbackEnd];
    const drawCommands = points.slice(1).map(point => lineTo(makePoint(point.x, point.y)));
    return makeOpenPathFromCommands([
        moveTo(makePoint(points[0].x, points[0].y)),
        drawCommands[0]!,
        ...drawCommands.slice(1),
    ] as OpenPathCommands);
};

export const generateFreeformAreaPathD = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    origin: PathPoint = { x: 0, y: 0 }
): string => {
    const safeAttrs = normalizeFreeformPathAttributes(attrs, targetRelative);
    if (!safeAttrs) return '';

    const centerline = getFreeformCenterline(safeAttrs, targetRelative);
    const fullMetrics = getPolylineMetrics(centerline);
    if (centerline.length < 2 || fullMetrics.total < MIN_PATH_LENGTH) return '';

    const usesArrow = safeAttrs.endCap === 'arrow';
    const arrowLength = usesArrow
        ? clamp(safeAttrs.arrow?.length ?? DEFAULT_WIDTH * 2.4, MIN_WIDTH, fullMetrics.total * 0.75)
        : 0;
    const bodyEndDistance = usesArrow ? fullMetrics.total - arrowLength : fullMetrics.total;
    const bodyLine = usesArrow ? trimPolylineAtDistance(centerline, bodyEndDistance) : centerline;
    const bodyMetrics = getPolylineMetrics(bodyLine);
    if (bodyLine.length < 2 || bodyMetrics.total <= 0) return '';

    const edges = bodyLine.map((point, index) => {
        const previous = bodyLine[Math.max(0, index - 1)];
        const next = bodyLine[Math.min(bodyLine.length - 1, index + 1)];
        const tangent = normalizeVector(subtract(next, previous));
        const normal = normalForTangent(tangent);
        const t = fullMetrics.total > 0 ? clamp(bodyMetrics.cumulative[index] / fullMetrics.total, 0, 1) : 0;
        const halfWidth = getWidthAtT(safeAttrs, t) / 2;
        return {
            point,
            normal,
            width: halfWidth * 2,
            left: add(point, scale(normal, halfWidth)),
            right: add(point, scale(normal, -halfWidth)),
        };
    });

    const withOrigin = (point: PathPoint) => add(origin, point);
    const commandFor = (prefix: 'M' | 'L', point: PathPoint) => {
        const absolutePoint = withOrigin(point);
        return `${prefix} ${formatNumber(absolutePoint.x)} ${formatNumber(absolutePoint.y)}`;
    };
    const commands: string[] = [commandFor('M', edges[0].left)];

    edges.slice(1).forEach(edge => commands.push(commandFor('L', edge.left)));

    if (usesArrow) {
        const base = pointAtDistance(centerline, bodyEndDistance);
        const tip = centerline[centerline.length - 1];
        const endNormal = normalForTangent(tangentAtDistance(centerline, bodyEndDistance));
        const arrowHalfWidth = Math.max(MIN_WIDTH, safeAttrs.arrow?.width ?? DEFAULT_WIDTH * 2) / 2;
        const baseLeft = add(base, scale(endNormal, arrowHalfWidth));
        const baseRight = add(base, scale(endNormal, -arrowHalfWidth));
        commands.push(commandFor('L', baseLeft));
        commands.push(commandFor('L', tip));
        commands.push(commandFor('L', baseRight));
        commands.push(commandFor('L', edges[edges.length - 1].right));
    } else if (safeAttrs.endCap === 'round') {
        const end = edges[edges.length - 1];
        const radius = Math.max(MIN_WIDTH, end.width / 2);
        const endRight = withOrigin(end.right);
        commands.push(
            `A ${formatNumber(radius)} ${formatNumber(radius)} 0 0 0 ${formatNumber(endRight.x)} ${formatNumber(
                endRight.y
            )}`
        );
    } else {
        commands.push(commandFor('L', edges[edges.length - 1].right));
    }

    for (let i = edges.length - 2; i >= 0; i -= 1) {
        commands.push(commandFor('L', edges[i].right));
    }

    if (safeAttrs.startCap === 'round') {
        const start = edges[0];
        const radius = Math.max(MIN_WIDTH, start.width / 2);
        const startLeft = withOrigin(start.left);
        commands.push(
            `A ${formatNumber(radius)} ${formatNumber(radius)} 0 0 0 ${formatNumber(startLeft.x)} ${formatNumber(
                startLeft.y
            )}`
        );
    } else {
        commands.push(commandFor('L', edges[0].left));
    }

    commands.push('Z');
    return commands.join(' ');
};

export const insertFreeformControlPointAtNearestSegment = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    point: PathPoint,
    createId: () => string
): FreeformPathAttributes => {
    const safeAttrs = normalizeFreeformPathAttributes(attrs, targetRelative) ?? attrs;
    let bestDistance = Number.POSITIVE_INFINITY;
    let insertIndex = 1;

    for (let i = 0; i < safeAttrs.points.length - 1; i += 1) {
        const projection = distanceToSegment(point, safeAttrs.points[i], safeAttrs.points[i + 1]);
        if (projection.distance < bestDistance) {
            bestDistance = projection.distance;
            insertIndex = i + 1;
        }
    }

    return normalizeFreeformPathAttributes(
        {
            ...safeAttrs,
            points: [
                ...safeAttrs.points.slice(0, insertIndex),
                { id: createId(), x: point.x, y: point.y },
                ...safeAttrs.points.slice(insertIndex),
            ],
        },
        targetRelative
    )!;
};

export const moveFreeformControlPoint = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    pointId: string,
    point: PathPoint
): FreeformPathAttributes =>
    normalizeFreeformPathAttributes(
        {
            ...attrs,
            points: attrs.points.map((item, index) =>
                index === 0 || index === attrs.points.length - 1 || item.id !== pointId
                    ? item
                    : { ...item, x: point.x, y: point.y }
            ),
        },
        targetRelative
    )!;

export const removeFreeformControlPoint = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    pointId: string
): FreeformPathAttributes =>
    normalizeFreeformPathAttributes(
        {
            ...attrs,
            points: attrs.points.filter((point, index) => {
                if (index === 0 || index === attrs.points.length - 1) return true;
                return point.id !== pointId;
            }),
        },
        targetRelative
    )!;

export const moveFreeformWidthStop = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    stopId: string,
    t: number
): FreeformPathAttributes =>
    normalizeFreeformPathAttributes(
        {
            ...attrs,
            widthStops: normalizeWidthStops(
                attrs.widthStops.map(stop => (stop.id === stopId ? { ...stop, t: clamp(t, 0, 1) } : stop))
            ),
        },
        targetRelative
    )!;

export const resizeFreeformWidthStop = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    stopId: string,
    width: number
): FreeformPathAttributes =>
    normalizeFreeformPathAttributes(
        {
            ...attrs,
            widthStops: normalizeWidthStops(
                attrs.widthStops.map(stop =>
                    stop.id === stopId ? { ...stop, width: Math.max(MIN_WIDTH, width) } : stop
                )
            ),
        },
        targetRelative
    )!;

export const addFreeformWidthStop = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    createId: () => string,
    t = 0.5
): FreeformPathAttributes =>
    normalizeFreeformPathAttributes(
        {
            ...attrs,
            widthStops: normalizeWidthStops([
                ...attrs.widthStops,
                { id: createId(), t: clamp(t, 0, 1), width: getWidthAtT(attrs, t) },
            ]),
        },
        targetRelative
    )!;

export const removeFreeformWidthStop = (
    attrs: FreeformPathAttributes,
    targetRelative: PathPoint,
    stopId: string
): FreeformPathAttributes =>
    attrs.widthStops.length <= 1
        ? attrs
        : normalizeFreeformPathAttributes(
              { ...attrs, widthStops: normalizeWidthStops(attrs.widthStops.filter(stop => stop.id !== stopId)) },
              targetRelative
          )!;
