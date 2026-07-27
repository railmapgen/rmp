import { OpenPath, PathPoint, makeCubicPath, makePoint } from '../../../../constants/path';
import { BezierPathAttributes, defaultBezierPathAttributes } from './bezier-model';

/**
 * Convert saved chord-local attributes back to the absolute tangent
 * intersection used by the overlay and path generator.
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
): BezierPathAttributes => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    // A zero-length edge has no stable chord basis. Falling back prevents NaN
    // attributes from being saved if two connected nodes temporarily overlap.
    if (lengthSquared === 0) return { ...defaultBezierPathAttributes };

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
    const control = getBezierControlPoint(source, target, attrs);
    // A quadratic Bezier with control `control` is represented as a cubic so
    // styles can treat Bezier paths like all other OpenPath-based line paths.
    const c1 = makePoint(source.x + (2 / 3) * (control.x - source.x), source.y + (2 / 3) * (control.y - source.y));
    const c2 = makePoint(target.x + (2 / 3) * (control.x - target.x), target.y + (2 / 3) * (control.y - target.y));

    return makeCubicPath(source, c1, c2, target);
};
