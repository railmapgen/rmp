import { OpenPath, PathPoint, makeCubicPath, makePoint } from '../../../../constants/path';
import { fromChordCoordinates, toChordCoordinates } from '../../../../util/geometry';
import { BezierPathAttributes, defaultBezierPathAttributes } from './bezier-model';

/**
 * Convert saved chord-local attributes back to the absolute tangent
 * intersection used by the overlay and path generator.
 */
export const getBezierControlPoint = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierPathAttributes = defaultBezierPathAttributes
): PathPoint => fromChordCoordinates(makePoint(attrs.along, attrs.normal), source, target);

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
    const coordinates = toChordCoordinates(control, source, target);
    // A zero-length edge has no stable chord basis. Falling back prevents NaN
    // attributes from being saved if two connected nodes temporarily overlap.
    if (!coordinates) return { ...defaultBezierPathAttributes };

    return {
        along: coordinates.x,
        normal: coordinates.y,
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
