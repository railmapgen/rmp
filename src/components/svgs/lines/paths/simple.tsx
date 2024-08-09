import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';
import { LinePath, LinePathAttributes, PathGenerator } from '../../../../constants/lines';

const generateSimplePath: PathGenerator<SimplePathAttributes> = (
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
        return `M ${x1 + offset} ${y1} L ${x2 + offset} ${y2}`;
    } else if (k === 0) {
        // Horizontal line
        return `M ${x1} ${y1 + offset} L ${x2} ${y2 + offset}`;
    } else {
        // Others
        const kk = 1 / k;
        const dx = offset / Math.sqrt(kk * kk + 1);
        const dy = dx * kk * -Math.sign((x2 - x1) * (y2 - y1));
        return `M ${x1 + dx} ${y1 + dy} L ${x2 + dx} ${y2 + dy}`;
    }
};

export interface SimplePathAttributes extends LinePathAttributes {
    offset: number;
}

const defaultSimplePathAttributes = {
    offset: 0,
};

const attrsComponent = (props: AttrsProps<SimplePathAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.lines.simple.offset'),
            value: (attrs.offset ?? defaultSimplePathAttributes.offset).toString(),
            variant: 'number',
            onChange: val => {
                attrs.offset = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

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
