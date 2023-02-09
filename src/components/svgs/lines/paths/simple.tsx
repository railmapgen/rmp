import { GeneratePathFunction, LinePathAttributes, LinePath, LinePathType } from '../../../../constants/lines';

const generateSimplePath: GeneratePathFunction<SimplePathAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: SimplePathAttributes = defaultSimplePathAttributes
) => `M ${x1},${y1} L ${x2},${y2}`;

export interface SimplePathAttributes extends LinePathAttributes {}

const defaultSimplePathAttributes = {};

const simpleLineIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,18L18,6" stroke="currentColor" fill="none" />
    </svg>
);

const simplePath: LinePath<SimplePathAttributes> = {
    generatePath: generateSimplePath,
    icon: simpleLineIcon,
    defaultAttrs: defaultSimplePathAttributes,
    fields: [],
    metadata: { displayName: 'panel.details.line.simple.displayName' },
};

export default simplePath;
