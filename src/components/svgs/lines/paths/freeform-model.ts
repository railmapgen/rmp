import { PathPoint } from '../../../../constants/path';
import { distanceBetweenPoints as distance } from '../../../../util/geometry';
import { clamp, isFiniteNumber } from '../../../../util/number';

export type FreeformStartCap = 'round' | 'flat';
export type FreeformEndCap = 'round' | 'flat' | 'arrow';

/**
 * A control point in the source node's local coordinate system.
 *
 * The first and last points are connection anchors rather than freely editable handles. Normalisation pins them to
 * `(0, 0)` and the current target position so moving either connected node cannot detach the stored shape.
 */
export interface FreeformPoint {
    /** Stable identity used to preserve handle selection when points are inserted or removed. */
    id: string;
    /** Horizontal offset from the source node, in SVG user units. */
    x: number;
    /** Vertical offset from the source node, in SVG user units. */
    y: number;
}

/**
 * A width sample positioned by normalised distance along the smoothed centerline.
 *
 * Using arc length instead of a control-point index keeps width transitions attached to the visible curve even when
 * control points are unevenly spaced.
 */
export interface FreeformWidthStop {
    /** Stable identity used by the overlay while stops are reordered by position. */
    id: string;
    /** Position from source (`0`) to target (`1`); values are clamped and sorted during normalisation. */
    t: number;
    /** Full outline width across the centerline, in SVG user units. */
    width: number;
}

/**
 * Persisted path-specific state for a freeform edge.
 *
 * Consumers should normalise this value before generating geometry because node moves and imported saves can leave
 * endpoints or optional values out of date.
 */
export interface FreeformPathAttributes {
    /** Schema version for future changes to the persisted freeform representation. */
    version: 1;
    /** Source-relative control points, including the two node-owned endpoints. */
    points: FreeformPoint[];
    /** Width samples interpolated by arc length along the generated centerline. */
    widthStops: FreeformWidthStop[];
    /** Blend from the straight control polygon (`0`) to the Catmull-Rom curve (`1`). */
    smoothing: number;
    /** Shape used to close the outline at the source node. */
    startCap: FreeformStartCap;
    /** Shape used to close the outline at the target node. */
    endCap: FreeformEndCap;
    /** Arrowhead dimensions, used only when `endCap` is `arrow`. */
    arrow?: {
        /** Distance reserved from the end of the centerline for the arrowhead. */
        length: number;
        /** Full width of the arrowhead at its base. */
        width: number;
    };
}

export const MIN_FREEFORM_PATH_LENGTH = 4;
export const MIN_FREEFORM_WIDTH = 0.5;
export const DEFAULT_FREEFORM_WIDTH = 5;
export const DEFAULT_FREEFORM_SMOOTHING = 0.65;
export const FREEFORM_EPSILON = 1e-6;

const DEFAULT_TARGET_RELATIVE: PathPoint = { x: 100, y: 0 };

export const defaultFreeformPathAttributes: FreeformPathAttributes = {
    version: 1,
    points: [
        { id: 'point_start', x: 0, y: 0 },
        { id: 'point_end', x: DEFAULT_TARGET_RELATIVE.x, y: DEFAULT_TARGET_RELATIVE.y },
    ],
    widthStops: [
        { id: 'width_start', t: 0, width: DEFAULT_FREEFORM_WIDTH },
        { id: 'width_end', t: 1, width: DEFAULT_FREEFORM_WIDTH },
    ],
    smoothing: DEFAULT_FREEFORM_SMOOTHING,
    startCap: 'round',
    endCap: 'round',
    arrow: { length: DEFAULT_FREEFORM_WIDTH * 2.4, width: DEFAULT_FREEFORM_WIDTH * 2 },
};

/**
 * Repair width stops from persisted data before geometry reads them.
 *
 * Width interpolation assumes stops are finite and sorted by `t`; doing that once at the boundary lets rendering code
 * stay focused on geometry instead of repeatedly defending against imported or older saves.
 */
export const normalizeFreeformWidthStops = (
    widthStops: FreeformWidthStop[] | undefined,
    fallbackWidth = DEFAULT_FREEFORM_WIDTH
) => {
    const safeStops = (widthStops ?? [])
        .filter(stop => isFiniteNumber(stop.t) && isFiniteNumber(stop.width))
        .map((stop, index) => ({
            id: stop.id || `width_${index}`,
            // Stops are stored as normalized arc-length positions, so out-of-range input should attach to an endpoint.
            t: clamp(stop.t, 0, 1),
            width: Math.max(MIN_FREEFORM_WIDTH, stop.width),
        }))
        .sort((a, b) => a.t - b.t);

    // A single middle stop is enough for a constant-width path and avoids special cases in interpolation.
    return safeStops.length > 0 ? safeStops : [{ id: 'width_default', t: 0.5, width: fallbackWidth }];
};

/**
 * Choose the target endpoint used while normalising source-relative points.
 *
 * The live node positions win because dragging either connected node should update the endpoint immediately; the
 * persisted last point is only a fallback for defaults or tests that do not know the current graph edge.
 */
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

/**
 * Convert unknown persisted data into the canonical freeform shape used by rendering and editing.
 *
 * The canonical form deliberately pins the first and last control points to the connected nodes, because those points
 * describe graph connectivity rather than user-owned handles.
 */
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

    // A freeform edge cannot produce a useful outline when both graph endpoints collapse to the same point.
    if (distance({ x: 0, y: 0 }, target) < FREEFORM_EPSILON) return undefined;

    // Middle points that coincide with either endpoint would create zero-length handles and unstable normals.
    const middlePoints = inputPoints
        .slice(1, -1)
        .filter(
            point => distance(point, { x: 0, y: 0 }) > FREEFORM_EPSILON && distance(point, target) > FREEFORM_EPSILON
        );
    const startId = inputPoints[0]?.id || 'point_start';
    const endId = inputPoints.at(-1)?.id || 'point_end';

    const startCap = candidate.startCap === 'flat' || candidate.startCap === 'round' ? candidate.startCap : 'round';
    const endCap =
        candidate.endCap === 'flat' || candidate.endCap === 'arrow' || candidate.endCap === 'round'
            ? candidate.endCap
            : 'round';
    const smoothing = isFiniteNumber(candidate.smoothing)
        ? clamp(candidate.smoothing, 0, 1)
        : DEFAULT_FREEFORM_SMOOTHING;
    const widthStops = normalizeFreeformWidthStops(candidate.widthStops);
    const endWidth = widthStops[widthStops.length - 1]?.width ?? DEFAULT_FREEFORM_WIDTH;

    return {
        version: 1,
        // Preserve endpoint ids when possible so active overlay selections do not flicker after normalisation.
        points: [{ id: startId, x: 0, y: 0 }, ...middlePoints, { id: endId, x: target.x, y: target.y }],
        widthStops,
        smoothing,
        startCap,
        endCap,
        arrow: {
            length: Math.max(MIN_FREEFORM_WIDTH, candidate.arrow?.length ?? endWidth * 2.4),
            width: Math.max(MIN_FREEFORM_WIDTH, candidate.arrow?.width ?? endWidth * 2),
        },
    };
};
