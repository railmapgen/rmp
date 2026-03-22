import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { LinePath, LinePathAttributes, LinePathAttrsProps, PathGenerator } from '../../../../constants/lines';
import { roundPathCorners } from '../../../../util/pathRounding';

type Point = { x: number; y: number };

const EPSILON = 1e-6;
const MAX_RAY_GUIDED_ANGLE = 179;
const DEFAULT_START_ANGLE = 0;
const DEFAULT_END_ANGLE = 90;
const MIN_RAY_GUIDED_ANGLE_GAP = 5;

const degToRad = (angle: number) => (angle * Math.PI) / 180;
const sanitizeCoordinate = (value: number): number => (Math.abs(value) < EPSILON ? 0 : value);

export const normalizeRayGuidedAngle = (angle: number, fallback = DEFAULT_START_ANGLE): number => {
    if (!Number.isFinite(angle)) return fallback;

    const normalized = ((angle % 180) + 180) % 180;
    const rounded = Math.round(normalized);
    return rounded > MAX_RAY_GUIDED_ANGLE ? MAX_RAY_GUIDED_ANGLE : rounded;
};

const getRayGuidedAngleDistance = (angleA: number, angleB: number) => {
    const diff = Math.abs(normalizeRayGuidedAngle(angleA) - normalizeRayGuidedAngle(angleB));
    return Math.min(diff, 180 - diff);
};

export const makeDisabledRayGuidedSliderValues = (blockedAngle: number, gap = MIN_RAY_GUIDED_ANGLE_GAP) =>
    Array.from({ length: 360 }, (_, value) => value).filter(
        value => getRayGuidedAngleDistance(value, blockedAngle) <= gap
    );

const makeDirectionVector = (angle: number): Point => {
    const rad = degToRad(normalizeRayGuidedAngle(angle));
    return { x: Math.sin(rad), y: -Math.cos(rad) };
};

const makeClockwiseNormalVector = (angle: number): Point => {
    const direction = makeDirectionVector(angle);
    return { x: -direction.y, y: direction.x };
};

const makeNormalOffsetPoint = (x: number, y: number, angle: number, offset: number): Point => {
    // Positive offsets follow the guide ray's clockwise normal in SVG coordinates.
    const normal = makeClockwiseNormalVector(angle);
    return {
        x: sanitizeCoordinate(x + normal.x * offset),
        y: sanitizeCoordinate(y + normal.y * offset),
    };
};

const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;

const getIntersection = (p1: Point, d1: Point, p2: Point, d2: Point): Point | undefined => {
    const determinant = cross(d1, d2);
    if (Math.abs(determinant) < EPSILON) return;

    const delta = { x: p2.x - p1.x, y: p2.y - p1.y };
    const t = cross(delta, d2) / determinant;

    return {
        x: sanitizeCoordinate(p1.x + d1.x * t),
        y: sanitizeCoordinate(p1.y + d1.y * t),
    };
};

export const generateRayGuidedPath: PathGenerator<RayGuidedPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: RayGuidedPathAttributes = defaultRayGuidedPathAttributes
) => {
    const startAngle = normalizeRayGuidedAngle(attrs.startAngle, DEFAULT_START_ANGLE);
    const endAngle = normalizeRayGuidedAngle(attrs.endAngle, DEFAULT_END_ANGLE);
    const offsetFrom = attrs.offsetFrom ?? defaultRayGuidedPathAttributes.offsetFrom;
    const offsetTo = attrs.offsetTo ?? defaultRayGuidedPathAttributes.offsetTo;
    const roundCornerFactor = attrs.roundCornerFactor ?? defaultRayGuidedPathAttributes.roundCornerFactor;

    const start = makeNormalOffsetPoint(x1, y1, startAngle, offsetFrom);
    const end = makeNormalOffsetPoint(x2, y2, endAngle, offsetTo);
    const middle = getIntersection(start, makeDirectionVector(startAngle), end, makeDirectionVector(endAngle));

    if (!middle) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const isDegenerateCorner =
        Math.hypot(start.x - middle.x, start.y - middle.y) < EPSILON ||
        Math.hypot(end.x - middle.x, end.y - middle.y) < EPSILON;
    if (isDegenerateCorner) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    return roundPathCorners(
        `M ${start.x} ${start.y} L ${middle.x} ${middle.y} L ${end.x} ${end.y}`,
        roundCornerFactor,
        false
    ) as `M ${string}`;
};

export interface RayGuidedPathAttributes extends LinePathAttributes {
    startAngle: number;
    endAngle: number;
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

export const defaultRayGuidedPathAttributes: RayGuidedPathAttributes = {
    startAngle: DEFAULT_START_ANGLE,
    endAngle: DEFAULT_END_ANGLE,
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 10,
};

export const makeRayGuidedPathAttributes = (): RayGuidedPathAttributes => ({ ...defaultRayGuidedPathAttributes });

const attrsComponent = (props: LinePathAttrsProps<RayGuidedPathAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const startAngle = normalizeRayGuidedAngle(attrs.startAngle, DEFAULT_START_ANGLE);
    const endAngle = normalizeRayGuidedAngle(attrs.endAngle, DEFAULT_END_ANGLE);

    const fields: RmgFieldsField[] = [
        {
            type: 'slider',
            label: t('panel.details.lines.common.startAngle'),
            value: startAngle,
            min: 0,
            max: MAX_RAY_GUIDED_ANGLE,
            step: 1,
            onChange: (value: number) => {
                const normalizedValue = normalizeRayGuidedAngle(value, DEFAULT_START_ANGLE);
                if (getRayGuidedAngleDistance(normalizedValue, endAngle) <= MIN_RAY_GUIDED_ANGLE_GAP) return;
                handleAttrsUpdate(id, {
                    ...attrs,
                    startAngle: normalizedValue,
                });
            },
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.lines.common.endAngle'),
            value: endAngle,
            min: 0,
            max: MAX_RAY_GUIDED_ANGLE,
            step: 1,
            onChange: (value: number) => {
                const normalizedValue = normalizeRayGuidedAngle(value, DEFAULT_END_ANGLE);
                if (getRayGuidedAngleDistance(normalizedValue, startAngle) <= MIN_RAY_GUIDED_ANGLE_GAP) return;
                handleAttrsUpdate(id, {
                    ...attrs,
                    endAngle: normalizedValue,
                });
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.offsetFrom'),
            value: (attrs.offsetFrom ?? defaultRayGuidedPathAttributes.offsetFrom).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                handleAttrsUpdate(id, { ...attrs, offsetFrom: Number(val) });
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.offsetTo'),
            value: (attrs.offsetTo ?? defaultRayGuidedPathAttributes.offsetTo).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                handleAttrsUpdate(id, { ...attrs, offsetTo: Number(val) });
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.common.roundCornerFactor'),
            value: (attrs.roundCornerFactor ?? defaultRayGuidedPathAttributes.roundCornerFactor).toString(),
            variant: 'number',
            onChange: val => {
                if (Number.isNaN(val) || Number(val) < 0) val = '0';
                handleAttrsUpdate(id, { ...attrs, roundCornerFactor: Number(val) });
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const rayGuidedIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,18L12,6L18,18" stroke="currentColor" fill="none" />
    </svg>
);

const rayGuidedPath: LinePath<RayGuidedPathAttributes> = {
    generatePath: generateRayGuidedPath,
    icon: rayGuidedIcon,
    defaultAttrs: defaultRayGuidedPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.rayGuided.displayName' },
    isPro: true,
};

export default rayGuidedPath;
