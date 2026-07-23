import { PathPoint, makePoint } from '../constants/path';

/**
 * Chord-local coordinates for Bezier's single editable tangent intersection.
 *
 * `along` follows the source-to-target chord, while `normal` follows the chord's
 * perpendicular. Both are normalized by chord length so the saved shape scales
 * naturally when users move the connected nodes farther apart or closer
 * together.
 */
export interface BezierControlAttributes {
    along: number;
    normal: number;
}

export const defaultBezierControlAttributes: BezierControlAttributes = {
    along: 0.5,
    normal: -0.35,
};

const finiteOr = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) ? (value as number) : fallback;

/**
 * Convert saved chord-local attributes back to the absolute tangent
 * intersection used by the overlay and path generator.
 */
export const getBezierControlPoint = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierControlAttributes = defaultBezierControlAttributes
): PathPoint => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const along = finiteOr(attrs.along, defaultBezierControlAttributes.along);
    const normal = finiteOr(attrs.normal, defaultBezierControlAttributes.normal);

    // Rotate the chord vector 90° for the normal axis, then scale both axes by
    // the same chord length implicit in dx/dy so the attributes stay normalized.
    return makePoint(source.x + along * dx - normal * dy, source.y + along * dy + normal * dx);
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
): BezierControlAttributes => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    // A zero-length edge has no stable chord basis. Falling back prevents NaN
    // attributes from being saved if two connected nodes temporarily overlap.
    if (lengthSquared === 0) return { ...defaultBezierControlAttributes };

    const qx = control.x - source.x;
    const qy = control.y - source.y;
    return {
        // Projection onto the chord gives the along component.
        along: (qx * dx + qy * dy) / lengthSquared,
        // Projection onto the rotated chord gives the signed perpendicular side.
        normal: (-qx * dy + qy * dx) / lengthSquared,
    };
};
