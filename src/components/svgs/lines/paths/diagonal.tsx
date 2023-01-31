import { GeneratePathFunction, LinePathAttributes, LinePath, LinePathType } from '../../../../constants/lines';
import { roundPathCorners } from '../../../../util/pathRounding';

const generateDiagonalPath: GeneratePathFunction<DiagonalPathAttributes> = (
    propsx1: number,
    propsx2: number,
    propsy1: number,
    propsy2: number,
    attrs: DiagonalPathAttributes = defaultDiagonalPathAttributes
) => {
    const {
        startFrom = defaultDiagonalPathAttributes.startFrom,
        offsetFrom = defaultDiagonalPathAttributes.offsetFrom,
        offsetTo = defaultDiagonalPathAttributes.offsetTo,
        roundCornerFactor = defaultDiagonalPathAttributes.roundCornerFactor,
    } = attrs;

    const x1_ = startFrom === 'from' ? propsx1 : propsx2;
    const x2_ = startFrom === 'from' ? propsx2 : propsx1;
    const y1_ = startFrom === 'from' ? propsy1 : propsy2;
    const y2_ = startFrom === 'from' ? propsy2 : propsy1;

    // indicate the line angle start from x1, y1
    const horizontalOrVertical = Math.abs(x2_ - x1_) > Math.abs(y2_ - y1_) ? 'vertical' : 'horizontal';

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const dx1 = horizontalOrVertical === 'vertical' ? 0 : offset1;
    const dy1 = horizontalOrVertical === 'vertical' ? offset1 : 0;
    const dx2 = offset2 * Math.SQRT1_2;
    const dy2 = offset2 * Math.SQRT1_2;

    const [x1, y1, x2, y2] = [x1_ + dx1, y1_ + dy1, x2_ + dx2, y2_ + dy2];

    const x = horizontalOrVertical === 'vertical' ? x2 + Math.abs(y2 - y1) * (x2 - x1 > 0 ? -1 : 1) : x1;
    const y = horizontalOrVertical === 'vertical' ? y1 : y2 + Math.abs(x2 - x1) * (y2 - y1 > 0 ? -1 : 1);

    const path = roundPathCorners(`M ${x1},${y1} L ${x},${y} L ${x2},${y2}`, roundCornerFactor, false);

    return { type: LinePathType.Diagonal, d: path };
};

/**
 * Diagonal specific props.
 */
export interface DiagonalPathAttributes extends LinePathAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *         b
     *        /
     *      a-
     * e.g. to
     *        -b
     *       /
     *      a
     */
    startFrom: 'from' | 'to';
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultDiagonalPathAttributes: DiagonalPathAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 7.5,
};

const diagonalFields = [
    {
        type: 'select',
        label: 'panel.details.line.diagonal.startFrom',
        value: (attrs?: DiagonalPathAttributes) => attrs?.startFrom ?? defaultDiagonalPathAttributes.startFrom,
        options: { from: 'from', to: 'to' },
        onChange: (val: string | number, attrs_: DiagonalPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultDiagonalPathAttributes;
            // set value
            attrs.startFrom = val as 'from' | 'to';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.line.diagonal.offsetFrom',
        value: (attrs?: DiagonalPathAttributes) =>
            (attrs?.offsetFrom ?? defaultDiagonalPathAttributes.offsetFrom).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: DiagonalPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultDiagonalPathAttributes;
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
        label: 'panel.details.line.diagonal.offsetTo',
        value: (attrs?: DiagonalPathAttributes) =>
            (attrs?.offsetTo ?? defaultDiagonalPathAttributes.offsetTo).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: DiagonalPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultDiagonalPathAttributes;
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
        label: 'panel.details.line.diagonal.roundCornerFactor',
        value: (attrs?: DiagonalPathAttributes) =>
            (attrs?.roundCornerFactor ?? defaultDiagonalPathAttributes.roundCornerFactor).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: DiagonalPathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultDiagonalPathAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.roundCornerFactor = Number(val);
            // return modified attrs
            return attrs;
        },
    },
];

const diagonalIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M9,18V12L15,6" stroke="currentColor" fill="none" />
    </svg>
);

const diagonalPath: LinePath<DiagonalPathAttributes> = {
    generatePath: generateDiagonalPath,
    icon: diagonalIcon,
    defaultAttrs: defaultDiagonalPathAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: diagonalFields,
    metadata: { displayName: 'panel.details.line.diagonal.displayName' },
};

export default diagonalPath;
