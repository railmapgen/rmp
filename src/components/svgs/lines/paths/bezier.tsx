import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { LinePath, LinePathAttributes, LinePathAttrsProps, PathGenerator } from '../../../../constants/lines';
import { makeCubicPath, makePoint } from '../../../../constants/path';
import {
    BezierControlAttributes,
    defaultBezierControlAttributes,
    getBezierControlPoint,
} from '../../../../util/bezier-line';
import { BezierLineOverlay } from './bezier-overlay';

/**
 * Bezier paths keep a single editable tangent-intersection point instead of two
 * independent cubic handles. Storing that point in chord-local coordinates keeps
 * the curve stable when connected nodes move, and avoids save data depending on
 * absolute control-point positions.
 */
export interface BezierPathAttributes extends LinePathAttributes, BezierControlAttributes {
    /** Position of the tangent intersection along the source-to-target chord. */
    along: number;
    /** Signed perpendicular offset, normalized by the chord length. */
    normal: number;
}

export const defaultBezierPathAttributes: BezierPathAttributes = {
    ...defaultBezierControlAttributes,
};

export const finiteBezierAttributeOr = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) ? (value as number) : fallback;

/**
 * Generate the cubic path used by every line style.
 *
 * The user-facing handle is the tangent intersection. The SVG path is still a
 * cubic curve because the rest of the rendering pipeline already works with
 * cubic OpenPath data; using the quadratic-to-cubic 2/3 conversion preserves the
 * handle as the visual tangent intersection without adding another path type.
 */
export const generateBezierPath: PathGenerator<BezierPathAttributes> = (
    x1,
    x2,
    y1,
    y2,
    attrs = defaultBezierPathAttributes
) => {
    const source = makePoint(x1, y1);
    const target = makePoint(x2, y2);
    const control = getBezierControlPoint(source, target, attrs);
    // A quadratic Bezier with control `control` is represented as a cubic so
    // styles can treat Bezier paths like all other OpenPath-based line paths.
    const c1 = makePoint(source.x + (2 / 3) * (control.x - source.x), source.y + (2 / 3) * (control.y - source.y));
    const c2 = makePoint(target.x + (2 / 3) * (control.x - target.x), target.y + (2 / 3) * (control.y - target.y));

    return makeCubicPath(source, c1, c2, target);
};

const attrsComponent = ({ id, attrs, handleAttrsUpdate }: LinePathAttrsProps<BezierPathAttributes>) => {
    const { t } = useTranslation();
    // Detail-panel edits can see imported or partially migrated data, so guard
    // each numeric field independently instead of assuming attrs are complete.
    const safeAttrs = {
        along: finiteBezierAttributeOr(attrs.along, defaultBezierPathAttributes.along),
        normal: finiteBezierAttributeOr(attrs.normal, defaultBezierPathAttributes.normal),
    };
    const update = (patch: Partial<BezierPathAttributes>) => handleAttrsUpdate(id, { ...safeAttrs, ...patch });

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.lines.bezier.along'),
            value: safeAttrs.along.toString(),
            variant: 'number',
            onChange: val => update({ along: Number(val) || 0 }),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.lines.bezier.normal'),
            value: safeAttrs.normal.toString(),
            variant: 'number',
            onChange: val => update({ normal: Number(val) || 0 }),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const bezierIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M4,17 C9,3 15,3 20,17" stroke="currentColor" fill="none" />
        <circle cx="12" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
);

const bezierPath: LinePath<BezierPathAttributes> = {
    generatePath: generateBezierPath,
    // Bezier uses the normal node-to-node creation flow. The overlay is only
    // needed after selection, where the shared tangent-intersection handle can
    // edit both cubic tangents without introducing a custom drawing behavior.
    overlayComponent: BezierLineOverlay,
    icon: bezierIcon,
    defaultAttrs: defaultBezierPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.bezier.displayName' },
};

export default bezierPath;
