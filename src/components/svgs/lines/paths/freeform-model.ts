import { PathPoint } from '../../../../constants/path';
import { distanceBetweenPoints as distance, fromChordCoordinates, toChordCoordinates } from '../../../../util/geometry';
import { clamp, isFiniteNumber } from '../../../../util/number';

export type FreeformStartCap = 'round' | 'flat';
export type FreeformEndCap = 'round' | 'flat' | 'arrow';

/**
 * A persisted control point in the source-to-target chord coordinate system.
 *
 * `x` follows the chord and `y` follows its perpendicular. Both are normalized by the chord length, so `(0, 0)` is
 * the source and `(1, 0)` is the target regardless of SVG user units.
 */
export interface FreeformPoint {
    /** Stable identity used to preserve handle selection when points are inserted or removed. */
    id: string;
    /** Offset along the source-to-target chord, as a proportion of chord length. */
    x: number;
    /** Signed perpendicular offset, as a proportion of chord length. */
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
 * Consumers should normalize persisted values, then resolve their point percentages against the current graph
 * endpoints before generating geometry.
 */
export interface FreeformPathAttributes {
    /** Schema version for future changes to the persisted freeform representation. */
    version: 1;
    /** Chord-relative control points, including the two node-owned endpoints. */
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

/**
 * Runtime-only freeform geometry after persisted percentages have been resolved into source-local SVG coordinates.
 */
export type ResolvedFreeformPathAttributes = FreeformPathAttributes;

export const MIN_FREEFORM_PATH_LENGTH = 4;
export const MIN_FREEFORM_WIDTH = 0.5;
export const DEFAULT_FREEFORM_WIDTH = 5;
export const DEFAULT_FREEFORM_SMOOTHING = 0.65;
export const FREEFORM_EPSILON = 1e-6;

const FREEFORM_SOURCE = { x: 0, y: 0 };

export const defaultFreeformPathAttributes: FreeformPathAttributes = {
    version: 1,
    points: [
        { id: 'point_start', x: 0, y: 0 },
        { id: 'point_end', x: 1, y: 0 },
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
 * Convert unknown persisted data into the canonical chord-relative shape stored on graph edges.
 *
 * The canonical form deliberately pins the first and last control points to the connected nodes, because those points
 * describe graph connectivity rather than user-owned handles.
 */
export const normalizeFreeformPathAttributes = (value: unknown): FreeformPathAttributes | undefined => {
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

    // Middle points that coincide with either endpoint would create zero-length handles and unstable normals.
    const middlePoints = inputPoints
        .slice(1, -1)
        .filter(
            point =>
                distance(point, { x: 0, y: 0 }) > FREEFORM_EPSILON && distance(point, { x: 1, y: 0 }) > FREEFORM_EPSILON
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
        points: [{ id: startId, x: 0, y: 0 }, ...middlePoints, { id: endId, x: 1, y: 0 }],
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

/**
 * Resolve one persisted percentage point into source-local SVG coordinates.
 *
 * The source-to-target vector is the local x basis and its 90-degree rotation is the local y basis. Because both
 * basis vectors have the chord length, persisted coordinates scale and rotate with the connected endpoints.
 */
export const resolveFreeformPoint = (point: PathPoint, targetRelative: PathPoint): PathPoint =>
    fromChordCoordinates(point, FREEFORM_SOURCE, targetRelative);

/** Convert one source-local SVG point back into the persisted chord-relative percentage coordinate system. */
export const persistFreeformPoint = (point: PathPoint, targetRelative: PathPoint): PathPoint | undefined => {
    const lengthSquared = targetRelative.x * targetRelative.x + targetRelative.y * targetRelative.y;
    if (lengthSquared < FREEFORM_EPSILON * FREEFORM_EPSILON) return undefined;

    return toChordCoordinates(point, FREEFORM_SOURCE, targetRelative);
};

/**
 * Resolve persisted freeform attributes into source-local SVG geometry.
 *
 * This is intentionally separate from persisted-data normalization so graph attributes never need to contain SVG-unit
 * control points.
 */
export const resolveFreeformPathAttributes = (
    value: unknown,
    targetRelative: PathPoint
): ResolvedFreeformPathAttributes | undefined => {
    const attrs = normalizeFreeformPathAttributes(value);
    if (!attrs || distance(FREEFORM_SOURCE, targetRelative) < FREEFORM_EPSILON) return undefined;

    return {
        ...attrs,
        points: attrs.points.map(point => ({ ...point, ...resolveFreeformPoint(point, targetRelative) })),
    };
};

/** Convert source-local editable geometry back into the chord-relative representation stored on the graph edge. */
export const persistFreeformPathAttributes = (
    attrs: ResolvedFreeformPathAttributes,
    targetRelative: PathPoint
): FreeformPathAttributes | undefined => {
    const points = attrs.points.map(point => {
        const persisted = persistFreeformPoint(point, targetRelative);
        return persisted ? { ...point, ...persisted } : undefined;
    });
    if (points.some(point => !point)) return undefined;

    return normalizeFreeformPathAttributes({ ...attrs, points });
};
