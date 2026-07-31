import {
    AreaPathDrawCommand,
    ClosedAreaCommands,
    ClosedAreaPath,
    EmptyOpenPath,
    PathPoint,
    arcTo,
    closePath,
    lineTo,
    makeClosedAreaPath,
    makeEmptyOpenPath,
    moveTo,
} from '../../../../constants/path';
import {
    addPoints as add,
    distanceBetweenPoints as distance,
    distanceToSegment,
    lerpPoint as lerp,
    normalForTangent,
    normalizeVector,
    scalePoint as scale,
    subtractPoints as subtract,
} from '../../../../util/geometry';
import { clamp, formatNumber, isFiniteNumber } from '../../../../util/number';
import {
    DEFAULT_FREEFORM_SMOOTHING,
    DEFAULT_FREEFORM_WIDTH,
    FREEFORM_EPSILON,
    FreeformPathAttributes,
    MIN_FREEFORM_PATH_LENGTH,
    MIN_FREEFORM_WIDTH,
    ResolvedFreeformPathAttributes,
    persistFreeformPoint,
} from './freeform-model';

/**
 * Controls how a raw pointer stream is reduced into persisted freeform geometry.
 *
 * Preview and commit use different values: previews favour immediate visual fidelity, while committed paths favour a
 * smaller representation that stays responsive during later editing.
 */
export interface FreeformCreateOptions {
    /** Minimum distance between retained pointer samples, in SVG user units. */
    minPointDistance?: number;
    /** Ramer-Douglas-Peucker tolerance applied after distance filtering, in SVG user units. */
    simplifyTolerance?: number;
    /** Constant width assigned when the newly drawn path has no explicit width stops. */
    defaultWidth?: number;
}

/** Measure a sampled polyline without building a reusable metrics object. */
const polylineLength = (points: PathPoint[]): number =>
    points.reduce((total, point, index) => (index === 0 ? 0 : total + distance(points[index - 1], point)), 0);

/**
 * Reduce noisy pointer samples while preserving the visible bend shape.
 *
 * Ramer-Douglas-Peucker keeps the point that deviates most from the straight chord, then recurses on both sides. This
 * is a better fit for drawn curves than dropping every nth point because it preserves intentional corners.
 */
const rdpSimplify = (points: PathPoint[], tolerance: number): PathPoint[] => {
    if (points.length <= 2 || tolerance <= 0) return points;

    let maxDistance = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];

    // The farthest point is the one most responsible for the current segment's shape.
    for (let i = 1; i < points.length - 1; i += 1) {
        const pointDistance = distanceToSegment(points[i], start, end).distance;
        if (pointDistance > maxDistance) {
            maxDistance = pointDistance;
            index = i;
        }
    }

    if (maxDistance <= tolerance) return [start, end];

    // Keep the shared split point only once when joining the two simplified halves.
    const before = rdpSimplify(points.slice(0, index + 1), tolerance);
    const after = rdpSimplify(points.slice(index), tolerance);
    return before.slice(0, -1).concat(after);
};

/**
 * Turn a raw pointer stream into a finite, minimum-length polyline ready to persist.
 *
 * This is intentionally separate from persisted-attribute normalisation: drawing starts with absolute canvas samples,
 * while persisted attributes are chord-relative and already know their endpoints.
 */
const normalizeInputPoints = (
    points: PathPoint[],
    minPointDistance: number,
    simplifyTolerance: number
): PathPoint[] => {
    const finitePoints = points.filter(point => isFiniteNumber(point.x) && isFiniteNumber(point.y));
    if (finitePoints.length < 2) return [];

    // Distance filtering removes high-frequency pointer noise before the more expensive RDP pass.
    const filtered = finitePoints.reduce<PathPoint[]>((acc, point) => {
        const previous = acc[acc.length - 1];
        if (!previous || distance(previous, point) >= minPointDistance) acc.push(point);
        return acc;
    }, []);

    const lastFinitePoint = finitePoints[finitePoints.length - 1];
    const lastFilteredPoint = filtered[filtered.length - 1];
    // Always preserve the actual final sample so the committed path connects to the user-selected target.
    if (lastFilteredPoint && distance(lastFilteredPoint, lastFinitePoint) > FREEFORM_EPSILON) {
        filtered.push(lastFinitePoint);
    }

    const simplified = rdpSimplify(filtered, simplifyTolerance);
    return polylineLength(simplified) >= MIN_FREEFORM_PATH_LENGTH ? simplified : [];
};

/**
 * Build canonical persisted attributes from a new freeform drawing gesture.
 *
 * The drawing path is created directly in canonical form instead of calling the persisted-data normaliser again, so
 * preview rendering does not repeatedly repair values that were just produced.
 */
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

    // The graph edge owns the endpoints; pin them after simplification so RDP cannot move either anchor.
    normalized[0] = source;
    normalized[normalized.length - 1] = target;
    const targetRelative = subtract(target, source);
    if (distance(source, target) < FREEFORM_EPSILON) return undefined;
    const requestedWidth = options.defaultWidth ?? DEFAULT_FREEFORM_WIDTH;
    const defaultWidth = Number.isFinite(requestedWidth)
        ? Math.max(MIN_FREEFORM_WIDTH, requestedWidth)
        : DEFAULT_FREEFORM_WIDTH;
    // Persist each source-local sample in the normalized chord basis so later endpoint moves rotate and scale the shape.
    const points = normalized.map((point, index) => {
        const persisted =
            index === 0
                ? { x: 0, y: 0 }
                : index === normalized.length - 1
                  ? { x: 1, y: 0 }
                  : persistFreeformPoint(subtract(point, source), targetRelative)!;
        return { id: createId() || `point_${index}`, ...persisted };
    });

    return {
        version: 1,
        points,
        widthStops: [{ id: createId() || 'width_default', t: 0.5, width: defaultWidth }],
        smoothing: DEFAULT_FREEFORM_SMOOTHING,
        startCap: 'round',
        endCap: 'round',
        arrow: { length: defaultWidth * 2.4, width: defaultWidth * 2 },
    };
};

/**
 * Evaluate the Catmull-Rom curve segment passing through `p1` and `p2`.
 *
 * Catmull-Rom is used here because authored control points stay on the visible centerline, which makes editing more
 * predictable than Bezier handles for a hand-drawn freeform path.
 */
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

/**
 * Geometry functions receive canonical attributes from the generator or editor boundary.
 * Keeping normalisation out of this layer prevents nested geometry calls from repeatedly repairing the same value.
 */
export const getFreeformCenterline = (attrs: ResolvedFreeformPathAttributes): PathPoint[] => {
    const { points, smoothing } = attrs;
    const output: PathPoint[] = [];

    for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        // Sample density scales with segment length, but is capped so very long strokes do not explode DOM path size.
        const steps = clamp(Math.ceil(distance(p1, p2) / 8), 8, 28);

        for (let step = 0; step <= steps; step += 1) {
            // Adjacent segments share endpoints; skipping duplicate starts keeps arc-length metrics stable.
            if (i > 0 && step === 0) continue;
            const t = step / steps;
            const linear = lerp(p1, p2, t);
            const curved = catmullRomPoint(p0, p1, p2, p3, t);
            // Smoothing blends back toward the straight polygon so users can reduce overshoot without changing points.
            output.push(lerp(linear, curved, smoothing));
        }
    }

    return output;
};

/** Precompute cumulative arc lengths so later queries can convert between distance and sampled points. */
const getPolylineMetrics = (points: PathPoint[]) => {
    const cumulative: number[] = [0];
    for (let i = 1; i < points.length; i += 1) {
        cumulative[i] = cumulative[i - 1] + distance(points[i - 1], points[i]);
    }
    return { cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
};

/** Find the sampled-polyline point at an arc-length distance from the start. */
const pointAtDistance = (points: PathPoint[], targetDistance: number): PathPoint => {
    const metrics = getPolylineMetrics(points);
    const safeDistance = clamp(targetDistance, 0, metrics.total);
    if (metrics.total === 0) return points[0] ?? { x: 0, y: 0 };

    for (let i = 0; i < points.length - 1; i += 1) {
        const startDistance = metrics.cumulative[i];
        const endDistance = metrics.cumulative[i + 1];
        if (safeDistance >= startDistance && safeDistance <= endDistance) {
            // Degenerate spans can appear after very short samples; keep division finite and return a nearby point.
            const segmentLength = Math.max(0.0001, endDistance - startDistance);
            return lerp(points[i], points[i + 1], (safeDistance - startDistance) / segmentLength);
        }
    }

    return points[points.length - 1];
};

/** Estimate the local tangent by sampling a short distance before and after the query position. */
const tangentAtDistance = (points: PathPoint[], targetDistance: number): PathPoint => {
    const metrics = getPolylineMetrics(points);
    // The window needs to be large enough to smooth sampling noise but small enough to follow tight bends.
    const delta = Math.max(0.1, Math.min(4, metrics.total / 50));
    const before = pointAtDistance(points, targetDistance - delta);
    const after = pointAtDistance(points, targetDistance + delta);
    return normalizeVector(subtract(after, before));
};

/** Keep the prefix of a polyline up to a target arc length, including an interpolated endpoint. */
const trimPolylineAtDistance = (points: PathPoint[], targetDistance: number): PathPoint[] => {
    const metrics = getPolylineMetrics(points);
    const safeDistance = clamp(targetDistance, 0, metrics.total);
    const output: PathPoint[] = [points[0]];

    for (let i = 1; i < points.length; i += 1) {
        if (metrics.cumulative[i] < safeDistance) {
            output.push(points[i]);
        } else {
            // Insert the exact cut point so arrow bases and body outlines meet without a visual gap.
            output.push(pointAtDistance(points, safeDistance));
            break;
        }
    }

    return output.length >= 2 ? output : [points[0], pointAtDistance(points, safeDistance)];
};

/**
 * Convert a local canvas point to normalized distance along the visible freeform centerline.
 *
 * Width stops use this value so dragging a stop follows the rendered curve rather than the raw control polygon.
 */
export const getNearestFreeformCenterlineT = (attrs: ResolvedFreeformPathAttributes, point: PathPoint): number => {
    const centerline = getFreeformCenterline(attrs);
    const metrics = getPolylineMetrics(centerline);
    if (metrics.total === 0) return 0;

    let bestDistance = Number.POSITIVE_INFINITY;
    let bestPathDistance = 0;

    for (let i = 0; i < centerline.length - 1; i += 1) {
        const projection = distanceToSegment(point, centerline[i], centerline[i + 1]);
        if (projection.distance < bestDistance) {
            bestDistance = projection.distance;
            // Convert segment-local `t` back into total path distance for stable width-stop storage.
            bestPathDistance = metrics.cumulative[i] + distance(centerline[i], centerline[i + 1]) * projection.t;
        }
    }

    return clamp(bestPathDistance / metrics.total, 0, 1);
};

/** Pick the control-polygon segment that should receive an inserted editable point. */
export const getNearestFreeformControlSegmentIndex = (
    attrs: ResolvedFreeformPathAttributes,
    point: PathPoint
): number => {
    const points = attrs.points;
    let bestDistance = Number.POSITIVE_INFINITY;
    let insertIndex = 1;

    for (let i = 0; i < points.length - 1; i += 1) {
        const projection = distanceToSegment(point, points[i], points[i + 1]);
        if (projection.distance < bestDistance) {
            bestDistance = projection.distance;
            insertIndex = i + 1;
        }
    }

    return insertIndex;
};

/** Build an SVG `d` string for the editable centerline overlay. */
export const getFreeformCenterlineD = (attrs: ResolvedFreeformPathAttributes): string => {
    const centerline = getFreeformCenterline(attrs);
    if (centerline.length < 2) return '';
    return centerline
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${formatNumber(point.x)} ${formatNumber(point.y)}`)
        .join(' ');
};

/** Interpolate the rendered outline width at a normalized centerline position. */
export const getWidthAtT = (attrs: ResolvedFreeformPathAttributes, t: number): number => {
    const stops = attrs.widthStops;
    const safeT = clamp(t, 0, 1);
    if (safeT <= stops[0].t) return stops[0].width;
    if (safeT >= stops[stops.length - 1].t) return stops[stops.length - 1].width;

    for (let i = 0; i < stops.length - 1; i += 1) {
        const start = stops[i];
        const end = stops[i + 1];
        if (safeT >= start.t && safeT <= end.t) {
            // Width stops may share a position after user edits; keep the denominator finite for predictable output.
            const span = Math.max(0.0001, end.t - start.t);
            return start.width + (end.width - start.width) * ((safeT - start.t) / span);
        }
    }

    return stops[stops.length - 1].width;
};

/** Compute the center and side handles used by the width-stop overlay controls. */
export const getFreeformWidthStopGeometry = (attrs: ResolvedFreeformPathAttributes, stopId: string) => {
    const stop = attrs.widthStops.find(item => item.id === stopId);
    if (!stop) return undefined;

    const centerline = getFreeformCenterline(attrs);
    const metrics = getPolylineMetrics(centerline);
    const pathDistance = metrics.total * clamp(stop.t, 0, 1);
    const center = pointAtDistance(centerline, pathDistance);
    // Width handles sit on the normal so dragging either side changes total outline width symmetrically.
    const normal = normalForTangent(tangentAtDistance(centerline, pathDistance));
    const width = Math.max(MIN_FREEFORM_WIDTH, stop.width);

    return {
        center,
        normal,
        width,
        start: add(center, scale(normal, width / 2)),
        end: add(center, scale(normal, -width / 2)),
    };
};

/**
 * Convert canonical freeform attributes into a closed filled area path.
 *
 * Freeform currently renders as a variable-width outline area, not as a stroke along an open centerline. The style
 * layer can then fill that area exactly like other closed path outputs.
 */
export const makeFreeformAreaPath = (
    attrs: ResolvedFreeformPathAttributes,
    origin: PathPoint = { x: 0, y: 0 }
): ClosedAreaPath | EmptyOpenPath => {
    const centerline = getFreeformCenterline(attrs);
    const fullMetrics = getPolylineMetrics(centerline);
    if (centerline.length < 2 || fullMetrics.total < MIN_FREEFORM_PATH_LENGTH) return makeEmptyOpenPath();

    const usesArrow = attrs.endCap === 'arrow';
    // Reserve part of the centerline for the arrowhead; capping at 75% keeps a visible body before the tip.
    const arrowLength = usesArrow
        ? clamp(attrs.arrow?.length ?? DEFAULT_FREEFORM_WIDTH * 2.4, MIN_FREEFORM_WIDTH, fullMetrics.total * 0.75)
        : 0;
    const bodyEndDistance = usesArrow ? fullMetrics.total - arrowLength : fullMetrics.total;
    const bodyLine = usesArrow ? trimPolylineAtDistance(centerline, bodyEndDistance) : centerline;
    const bodyMetrics = getPolylineMetrics(bodyLine);
    if (bodyLine.length < 2 || bodyMetrics.total <= 0) return makeEmptyOpenPath();

    const edges = bodyLine.map((point, index) => {
        const previous = bodyLine[Math.max(0, index - 1)];
        const next = bodyLine[Math.min(bodyLine.length - 1, index + 1)];
        const tangent = normalizeVector(subtract(next, previous));
        const normal = normalForTangent(tangent);
        // Width stops are stored against the full centerline, so map body samples back to full-path `t`.
        const t = fullMetrics.total > 0 ? clamp(bodyMetrics.cumulative[index] / fullMetrics.total, 0, 1) : 0;
        const halfWidth = getWidthAtT(attrs, t) / 2;
        return {
            point,
            normal,
            width: halfWidth * 2,
            left: add(point, scale(normal, halfWidth)),
            right: add(point, scale(normal, -halfWidth)),
        };
    });

    /** Convert source-relative geometry back into absolute SVG coordinates for the final path. */
    const withOrigin = (point: PathPoint) => add(origin, point);
    const drawCommands: AreaPathDrawCommand[] = [];

    // Walk down the left edge first, then close back along the right edge in reverse order.
    edges.slice(1).forEach(edge => drawCommands.push(lineTo(withOrigin(edge.left))));

    if (usesArrow) {
        const base = pointAtDistance(centerline, bodyEndDistance);
        const tip = centerline[centerline.length - 1];
        const endNormal = normalForTangent(tangentAtDistance(centerline, bodyEndDistance));
        const arrowHalfWidth = Math.max(MIN_FREEFORM_WIDTH, attrs.arrow?.width ?? DEFAULT_FREEFORM_WIDTH * 2) / 2;
        const baseLeft = add(base, scale(endNormal, arrowHalfWidth));
        const baseRight = add(base, scale(endNormal, -arrowHalfWidth));
        // The arrowhead replaces the body end cap and rejoins the right edge at the trimmed body endpoint.
        drawCommands.push(lineTo(withOrigin(baseLeft)));
        drawCommands.push(lineTo(withOrigin(tip)));
        drawCommands.push(lineTo(withOrigin(baseRight)));
        drawCommands.push(lineTo(withOrigin(edges[edges.length - 1].right)));
    } else if (attrs.endCap === 'round') {
        const end = edges[edges.length - 1];
        const radius = Math.max(MIN_FREEFORM_WIDTH, end.width / 2);
        drawCommands.push(arcTo(radius, radius, 0, false, false, withOrigin(end.right)));
    } else {
        drawCommands.push(lineTo(withOrigin(edges[edges.length - 1].right)));
    }

    for (let i = edges.length - 2; i >= 0; i -= 1) {
        drawCommands.push(lineTo(withOrigin(edges[i].right)));
    }

    if (attrs.startCap === 'round') {
        const start = edges[0];
        const radius = Math.max(MIN_FREEFORM_WIDTH, start.width / 2);
        drawCommands.push(arcTo(radius, radius, 0, false, false, withOrigin(start.left)));
    } else {
        drawCommands.push(lineTo(withOrigin(edges[0].left)));
    }

    return makeClosedAreaPath([
        moveTo(withOrigin(edges[0].left)),
        // At this point the body has at least two samples, so the left edge contributed at least one command.
        drawCommands[0]!,
        drawCommands[1]!,
        ...drawCommands.slice(2),
        closePath(),
    ] as ClosedAreaCommands);
};
