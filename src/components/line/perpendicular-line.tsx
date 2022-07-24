import React from 'react';
import { LineAttributes, Line, LineComponentProps } from '../../constants/lines';

const PerpendicularLine = (props: LineComponentProps) => {
    const { id, x1, x2, y1, y2, attrs, handleClick } = props;
    const { color, perpendicular = defaultPerpendicularLineAttributes } = attrs;
    // get type specific attrs with default value
    const { startFrom = defaultPerpendicularLineAttributes.startFrom } = perpendicular;

    const x = startFrom === 'from' ? x2 : x1;
    const y = startFrom === 'from' ? y1 : y2;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <path
                d={`M ${x1},${y1} L ${x},${y} L ${x2},${y2}`}
                fill="none"
                stroke={color[2]}
                strokeWidth={5}
                strokeLinejoin="round"
                onClick={onClick}
            />
        ),
        [x1, y1, x, y, x2, y2, color[2], onClick]
    );
};

/**
 * <PerpendicularLine /> specific props.
 */
export interface PerpendicularLineAttributes extends LineAttributes {
    /**
     * Change the drawing direction of line.
     * e.g. from
     *        b
     *        |
     *      a-
     * e.g. to
     *       -b
     *      |
     *      a
     */
    startFrom: 'from' | 'to';
}

const defaultPerpendicularLineAttributes: PerpendicularLineAttributes = { startFrom: 'from' };

const perpendicularIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path d="M6,6H18V18" stroke="currentColor" fill="none" />
    </svg>
);

const perpendicularLine: Line<PerpendicularLineAttributes> = {
    component: PerpendicularLine,
    icon: perpendicularIcon,
    defaultAttrs: defaultPerpendicularLineAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: [],
};

export default perpendicularLine;
