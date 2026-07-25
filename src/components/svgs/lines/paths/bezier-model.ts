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

const finiteBezierAttributeOr = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/**
 * Repair imported or partially migrated Bezier attributes at graph/UI
 * boundaries. Keeping the fallback here avoids scattering `Number.isFinite`
 * checks across rendering, snapping, and settings controls.
 */
export const normalizeBezierPathAttributes = (attrs: unknown): BezierPathAttributes => {
    const values =
        typeof attrs === 'object' && attrs !== null
            ? (attrs as Partial<Record<keyof BezierPathAttributes, unknown>>)
            : {};

    return {
        along: finiteBezierAttributeOr(values.along, defaultBezierPathAttributes.along),
        normal: finiteBezierAttributeOr(values.normal, defaultBezierPathAttributes.normal),
    };
};
