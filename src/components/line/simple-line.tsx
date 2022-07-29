import React from 'react';
import { LineAttributes, Line, LineComponentProps } from '../../constants/lines';

const SimpleLine = (props: LineComponentProps) => {
    const { id, attrs, handleClick } = props;
    const { color } = attrs;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <path
                d={`M ${props.x1},${props.y1} L ${props.x2},${props.y2}`}
                fill="none"
                stroke={color[2]}
                strokeWidth={5}
                strokeLinejoin="round"
                onClick={onClick}
            />
        ),
        [props.x1, props.y1, props.x2, props.y2, color[2], onClick]
    );
};

/**
 * <SimpleLine /> specific props.
 */
export interface SimpleLineAttributes extends LineAttributes {}

const defaultSimpleLineAttributes: SimpleLineAttributes = {};

const simpleLineIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,18L18,6" stroke="currentColor" fill="none" />
    </svg>
);

const simpleLine: Line<SimpleLineAttributes> = {
    component: SimpleLine,
    icon: simpleLineIcon,
    defaultAttrs: defaultSimpleLineAttributes,
    fields: [],
    tags: ['line'],
    displayName: 'panel.details.line.simple.displayName',
};

export default simpleLine;
