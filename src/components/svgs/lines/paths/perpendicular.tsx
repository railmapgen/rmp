import { LinePath, LinePathAttributes, PathGenerator } from '../../../../constants/lines';
import { roundPathCorners } from '../../../../util/pathRounding';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';

const generatePerpendicularPath: PathGenerator<PerpendicularPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: PerpendicularPathAttributes = defaultPerpendicularPathAttributes
) => {
    // get type specific attrs with default value
    const {
        startFrom = defaultPerpendicularPathAttributes.startFrom,
        offsetFrom = defaultPerpendicularPathAttributes.offsetFrom,
        offsetTo = defaultPerpendicularPathAttributes.offsetTo,
        roundCornerFactor = defaultPerpendicularPathAttributes.roundCornerFactor,
    } = attrs;

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const [dx1, dy1, dx2, dy2] = startFrom === 'from' ? [0, offset1, offset2, 0] : [offset1, 0, 0, offset2];

    const x = startFrom === 'from' ? x2 + dx2 : x1 + dx1;
    const y = startFrom === 'from' ? y1 + dy1 : y2 + dy2;

    const path = roundPathCorners(
        `M ${x1 + dx1} ${y1 + dy1} L ${x} ${y} L ${x2 + dx2} ${y2 + dy2}`,
        roundCornerFactor,
        false
    ) as `M ${string}`;

    return path;
};

/**
 * Perpendicular specific props.
 */
export interface PerpendicularPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *        b
     *        |
     *      a-┘
     * e.g. to
     *      ┌-b
     *      |
     *      a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultPerpendicularPathAttributes: PerpendicularPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 18.33,
};

const perpendicularFields = [
    {
        type: 'select',
        label: 'panel.details.lines.common.startFrom',
        value: (attrs?: PerpendicularPathAttributes) =>
            attrs?.startFrom ?? defaultPerpendicularPathAttributes.startFrom,
        options: { from: 'from', to: 'to' },
        onChange: (val: string | number, attrs_: PerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularPathAttributes;
            // set value
            attrs.startFrom = val as 'from' | 'to';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.lines.common.offsetFrom',
        value: (attrs?: PerpendicularPathAttributes) =>
            (attrs?.offsetFrom ?? defaultPerpendicularPathAttributes.offsetFrom).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: PerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularPathAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.offsetFrom = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.lines.common.offsetTo',
        value: (attrs?: PerpendicularPathAttributes) =>
            (attrs?.offsetTo ?? defaultPerpendicularPathAttributes.offsetTo).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: PerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularPathAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.offsetTo = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.lines.common.roundCornerFactor',
        value: (attrs?: PerpendicularPathAttributes) =>
            (attrs?.roundCornerFactor ?? defaultPerpendicularPathAttributes.roundCornerFactor).toString(),
        validator: (val: string) => !Number.isNaN(val) && Number(val) >= 0,
        onChange: (val: string | number, attrs_: PerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularPathAttributes;
            // return if invalid
            if (Number.isNaN(val) || Number(val) < 0) return attrs;
            // set value
            attrs.roundCornerFactor = Number(val);
            // return modified attrs
            return attrs;
        },
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={perpendicularFields as RmgFieldsFieldDetail<PerpendicularPathAttributes>}
    />
);

const perpendicularIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,6H18V18" stroke="currentColor" fill="none" />
    </svg>
);

const perpendicularPath: LinePath<PerpendicularPathAttributes> = {
    generatePath: generatePerpendicularPath,
    icon: perpendicularIcon,
    defaultAttrs: defaultPerpendicularPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.perpendicular.displayName' },
};

export default perpendicularPath;
