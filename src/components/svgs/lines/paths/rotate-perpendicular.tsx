import { GeneratePathFunction, LinePath, LinePathAttributes } from '../../../../constants/lines';
import { roundPathCorners } from '../../../../util/pathRounding';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';

const generateRotatePerpendicularPath: GeneratePathFunction<RotatePerpendicularPathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: RotatePerpendicularPathAttributes = defaultRotatePerpendicularPathAttributes
) => {
    // get type specific attrs with default value if not provided
    const {
        startFrom = defaultRotatePerpendicularPathAttributes.startFrom,
        offsetFrom = defaultRotatePerpendicularPathAttributes.offsetFrom,
        offsetTo = defaultRotatePerpendicularPathAttributes.offsetTo,
        roundCornerFactor = defaultRotatePerpendicularPathAttributes.roundCornerFactor,
    } = attrs;

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const [dx1, dy1, dx2, dy2] = startFrom === 'from' ? [0, offset1, offset2, 0] : [offset1, 0, 0, offset2];

    // Rotate the coordinate system to 45° counter-clockwise.
    // Everything else is the same as perpendicular, note to rotate the point before any calculation!
    // reference:
    //  https://zhuanlan.zhihu.com/p/283015520
    //  https://zhuanlan.zhihu.com/p/617145721
    const [rx1, ry1, rx2, ry2] = [
        x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
        -x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
        x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
        -x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
    ];
    // get the new x1', y1', x2', y2' with offset (d) added
    const [rx1offset, ry1offset, rx2offset, ry2offset] = [rx1 + dx1, ry1 + dy1, rx2 + dx2, ry2 + dy2];
    // rotate the coordinate system back to 0°
    const [x1offset, y1offset, x2offset, y2offset] = [
        rx1offset * Math.SQRT1_2 - ry1offset * Math.SQRT1_2,
        rx1offset * Math.SQRT1_2 + ry1offset * Math.SQRT1_2,
        rx2offset * Math.SQRT1_2 - ry2offset * Math.SQRT1_2,
        rx2offset * Math.SQRT1_2 + ry2offset * Math.SQRT1_2,
    ];

    // get the middle (turing) point in the rotated 45° coordinate system
    const rx = startFrom === 'from' ? rx2 + dx2 : rx1 + dx1;
    const ry = startFrom === 'from' ? ry1 + dy1 : ry2 + dy2;
    // rotate the coordinate system back to 0° for the middle (turing) point
    const [x, y] = [rx * Math.SQRT1_2 - ry * Math.SQRT1_2, rx * Math.SQRT1_2 + ry * Math.SQRT1_2];

    const path = roundPathCorners(
        `M ${x1offset},${y1offset} L ${x},${y} L ${x2offset},${y2offset}`,
        roundCornerFactor,
        false
    ) as `M ${string}`;

    return path;
};

/**
 * Rotate perpendicular specific props.
 */
export interface RotatePerpendicularPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *        b
     *         \
     *         /
     *        /
     *       a
     * e.g. to
     *        b
     *       /
     *      /
     *      \
     *       a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultRotatePerpendicularPathAttributes: RotatePerpendicularPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 18.33,
};

const rotatePerpendicularFields = [
    {
        type: 'select',
        label: 'panel.details.lines.common.startFrom',
        value: (attrs?: RotatePerpendicularPathAttributes) =>
            attrs?.startFrom ?? defaultRotatePerpendicularPathAttributes.startFrom,
        options: { from: 'from', to: 'to' },
        onChange: (val: string | number, attrs_: RotatePerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultRotatePerpendicularPathAttributes;
            // set value
            attrs.startFrom = val as 'from' | 'to';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.lines.common.offsetFrom',
        value: (attrs?: RotatePerpendicularPathAttributes) =>
            (attrs?.offsetFrom ?? defaultRotatePerpendicularPathAttributes.offsetFrom).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: RotatePerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultRotatePerpendicularPathAttributes;
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
        value: (attrs?: RotatePerpendicularPathAttributes) =>
            (attrs?.offsetTo ?? defaultRotatePerpendicularPathAttributes.offsetTo).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: RotatePerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultRotatePerpendicularPathAttributes;
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
        value: (attrs?: RotatePerpendicularPathAttributes) =>
            (attrs?.roundCornerFactor ?? defaultRotatePerpendicularPathAttributes.roundCornerFactor).toString(),
        validator: (val: string) => !Number.isNaN(val) && Number(val) >= 0,
        onChange: (val: string | number, attrs_: RotatePerpendicularPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultRotatePerpendicularPathAttributes;
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
        fields={rotatePerpendicularFields as RmgFieldsFieldDetail<RotatePerpendicularPathAttributes>}
    />
);

const rotatePerpendicularIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M9,6L15,12L9,18" stroke="currentColor" fill="none" />
    </svg>
);

const rotatePerpendicularPath: LinePath<RotatePerpendicularPathAttributes> = {
    generatePath: generateRotatePerpendicularPath,
    icon: rotatePerpendicularIcon,
    defaultAttrs: defaultRotatePerpendicularPathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.rotatePerpendicular.displayName' },
};

export default rotatePerpendicularPath;
