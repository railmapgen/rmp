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

    // flip x and y if startFrom === 'to'
    const [x1a, x2a, y1a, y2a] =
        startFrom === 'from' ? [propsx1, propsx2, propsy1, propsy2] : [propsx2, propsx1, propsy2, propsy1];

    // indicate the line angle start from x1, y1
    const horizontalOrVertical = Math.abs(x2a - x1a) > Math.abs(y2a - y1a) ? 'vertical' : 'horizontal';

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const dx1 = horizontalOrVertical === 'vertical' ? 0 : offset1;
    const dy1 = horizontalOrVertical === 'vertical' ? offset1 : 0;
    const dx2 = offset2 * Math.SQRT1_2;
    const dy2 = offset2 * Math.SQRT1_2;

    const [x1b, y1b, x2b, y2b] = [x1a + dx1, y1a + dy1, x2a + dx2, y2a + dy2];

    const x = horizontalOrVertical === 'vertical' ? x2b + Math.abs(y2b - y1b) * (x2b - x1b > 0 ? -1 : 1) : x1b;
    const y = horizontalOrVertical === 'vertical' ? y1b : y2b + Math.abs(x2b - x1b) * (y2b - y1b > 0 ? -1 : 1);

    // flip back x and y if startFrom === 'to'
    const [x1, y1, x2, y2] = startFrom === 'from' ? [x1b, y1b, x2b, y2b] : [x2b, y2b, x1b, y1b];

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
