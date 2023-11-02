import { GeneratePathFunction, LinePath, LinePathAttributes } from '../../../../constants/lines';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';

const generateSimplePath: GeneratePathFunction<SimplePathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: SimplePathAttributes = defaultSimplePathAttributes
) => {
    const { offset = defaultSimplePathAttributes.offset } = attrs;
    const k = Math.abs((y2 - y1) / (x2 - x1));
    if (k === Infinity) {
        // Vertical line
        return `M ${x1 + offset},${y1} L ${x2 + offset},${y2}`;
    } else if (k === 0) {
        // Horizontal line
        return `M ${x1},${y1 + offset} L ${x2},${y2 + offset}`;
    } else {
        // Others
        const kk = 1 / k;
        const dx = offset / Math.sqrt(kk * kk + 1);
        const dy = dx * kk * -Math.sign((x2 - x1) * (y2 - y1));
        return `M ${x1 + dx},${y1 + dy} L ${x2 + dx},${y2 + dy}`;
    }
};

export interface SimplePathAttributes extends LinePathAttributes {
    offset: number;
}

const defaultSimplePathAttributes = {
    offset: 0,
};

const simpleFields = [
    {
        type: 'input',
        label: 'panel.details.lines.simple.offset',
        value: (attrs?: SimplePathAttributes) => (attrs?.offset ?? defaultSimplePathAttributes.offset).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: SimplePathAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSimplePathAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.offset = Number(val);
            // return modified attrs
            return attrs;
        },
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes fields={simpleFields as RmgFieldsFieldDetail<SimplePathAttributes>} />
);

const simpleLineIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,18L18,6" stroke="currentColor" fill="none" />
    </svg>
);

const simplePath: LinePath<SimplePathAttributes> = {
    generatePath: generateSimplePath,
    icon: simpleLineIcon,
    defaultAttrs: defaultSimplePathAttributes,
    attrsComponent,
    metadata: { displayName: 'panel.details.lines.simple.displayName' },
};

export default simplePath;
