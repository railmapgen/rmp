/**
 * Saved attributes for Bezier's single editable tangent intersection.
 *
 * `along` follows the source-to-target chord, while `normal` follows the chord's
 * perpendicular. Both are normalized by chord length so the saved shape scales
 * naturally when users move the connected nodes farther apart or closer
 * together.
 */
export interface BezierPathAttributes {
    /** Position of the tangent intersection along the source-to-target chord. */
    along: number;
    /** Signed perpendicular offset, normalized by the chord length. */
    normal: number;
}

export const defaultBezierPathAttributes: BezierPathAttributes = {
    along: 0.5,
    normal: -0.35,
};

/**
 * Identify the one collinear control range whose visible geometry is exactly
 * the endpoint segment. Collinear controls outside this range overshoot an
 * endpoint and turn back, so they must remain Bezier paths.
 */
export const isStraightBezierPathAttributes = ({ along, normal }: BezierPathAttributes): boolean =>
    normal === 0 && Number.isFinite(along) && along >= 0 && along <= 1;
