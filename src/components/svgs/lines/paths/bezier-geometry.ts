import { OpenPath, PathPoint, makeCubicPath, makePoint } from '../../../../constants/path';
import { BezierPathAttributes, defaultBezierPathAttributes } from './bezier-model';

/**
 * Resolve graph-node coordinates into the visual endpoints persisted by a Bezier.
 *
 * Offsets are station-relative and optional at runtime so Beziers from older saves remain valid.
 */
export const getBezierEffectiveEndpoints = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierPathAttributes = defaultBezierPathAttributes
): { source: PathPoint; target: PathPoint } => {
    const sourceOffset = attrs.sourceOffset ?? defaultBezierPathAttributes.sourceOffset;
    const targetOffset = attrs.targetOffset ?? defaultBezierPathAttributes.targetOffset;
    return {
        source: makePoint(source.x + sourceOffset.x, source.y + sourceOffset.y),
        target: makePoint(target.x + targetOffset.x, target.y + targetOffset.y),
    };
};

/**
 * Convert saved chord-local attributes back to the absolute tangent intersection.
 *
 * `source` and `target` are the effective visual endpoints; endpoint offsets must already be applied.
 */
export const getBezierControlPoint = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierPathAttributes = defaultBezierPathAttributes
): PathPoint => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;

    // Rotate the chord vector 90 degrees for the normal axis, then scale both
    // axes by the same chord length implicit in dx/dy so attributes stay
    // normalized instead of depending on absolute canvas coordinates.
    return makePoint(source.x + attrs.along * dx - attrs.normal * dy, source.y + attrs.along * dy + attrs.normal * dx);
};

/**
 * Convert the dragged absolute tangent intersection into save attributes.
 *
 * This is the inverse of `getBezierControlPoint`, using dot products against the
 * chord basis so dragging remains independent of the canvas coordinate system.
 */
export const getBezierLocalCoordinates = (
    source: PathPoint,
    target: PathPoint,
    control: PathPoint
): Pick<BezierPathAttributes, 'along' | 'normal'> => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    // A zero-length edge has no stable chord basis. Falling back prevents NaN
    // attributes from being saved if two connected nodes temporarily overlap.
    if (lengthSquared === 0) {
        return {
            along: defaultBezierPathAttributes.along,
            normal: defaultBezierPathAttributes.normal,
        };
    }

    const qx = control.x - source.x;
    const qy = control.y - source.y;
    return {
        // Projection onto the chord gives the along component.
        along: (qx * dx + qy * dy) / lengthSquared,
        // Projection onto the rotated chord gives the signed perpendicular side.
        normal: (-qx * dy + qy * dx) / lengthSquared,
    };
};

/**
 * Build the cubic OpenPath consumed by existing line styles.
 *
 * The user-facing handle is the tangent intersection. Rendering still uses a
 * cubic curve because the rest of the pipeline already works with cubic
 * OpenPath data; the quadratic-to-cubic 2/3 conversion preserves that handle as
 * the visual tangent intersection without introducing another path kind.
 */
export const makeBezierPath = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierPathAttributes = defaultBezierPathAttributes
): OpenPath => {
    const effective = getBezierEffectiveEndpoints(source, target, attrs);
    const control = getBezierControlPoint(effective.source, effective.target, attrs);
    // A quadratic Bezier with control `control` is represented as a cubic so
    // styles can treat Bezier paths like all other OpenPath-based line paths.
    const c1 = makePoint(
        effective.source.x + (2 / 3) * (control.x - effective.source.x),
        effective.source.y + (2 / 3) * (control.y - effective.source.y)
    );
    const c2 = makePoint(
        effective.target.x + (2 / 3) * (control.x - effective.target.x),
        effective.target.y + (2 / 3) * (control.y - effective.target.y)
    );

    return makeCubicPath(effective.source, c1, c2, effective.target);
};
