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
    const c1 = makePoint(source.x + (2 / 3) * (control.x - source.x), source.y + (2 / 3) * (control.y - source.y));
    const c2 = makePoint(target.x + (2 / 3) * (control.x - target.x), target.y + (2 / 3) * (control.y - target.y));

    return makeCubicPath(source, c1, c2, target);
};

const attrsComponent = ({ id, attrs, handleAttrsUpdate }: LinePathAttrsProps<BezierPathAttributes>) => {
    const { t } = useTranslation();
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
    overlayComponent: BezierLineOverlay,
    icon: bezierIcon,
    defaultAttrs: defaultBezierPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.bezier.displayName' },
};

export default bezierPath;
