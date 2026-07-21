import { PathPoint, makePoint } from '../constants/path';

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

export const getBezierControlPoint = (
    source: PathPoint,
    target: PathPoint,
    attrs: BezierControlAttributes = defaultBezierControlAttributes
): PathPoint => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const along = finiteOr(attrs.along, defaultBezierControlAttributes.along);
    const normal = finiteOr(attrs.normal, defaultBezierControlAttributes.normal);

    return makePoint(source.x + along * dx - normal * dy, source.y + along * dy + normal * dx);
};

export const getBezierLocalCoordinates = (
    source: PathPoint,
    target: PathPoint,
    control: PathPoint
): BezierControlAttributes => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return { ...defaultBezierControlAttributes };

    const qx = control.x - source.x;
    const qy = control.y - source.y;
    return {
        along: (qx * dx + qy * dy) / lengthSquared,
        normal: (-qx * dy + qy * dx) / lengthSquared,
    };
};
