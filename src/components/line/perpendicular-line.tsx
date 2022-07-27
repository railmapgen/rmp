import React from 'react';
import { LineAttributes, Line, LineComponentProps, generatePathFunction } from '../../constants/lines';
import { roundPathCorners } from '../../util/pathRounding';

const generatePath: generatePathFunction<PerpendicularLineAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: PerpendicularLineAttributes
) => {
    // get type specific attrs with default value
    const { startFrom = defaultPerpendicularLineAttributes.startFrom } = attrs;

    const x = startFrom === 'from' ? x2 : x1;
    const y = startFrom === 'from' ? y1 : y2;

    return { type: 'straight', d: `M ${x1},${y1} L ${x},${y} L ${x2},${y2}` };
};

const PerpendicularLine = (props: LineComponentProps) => {
    const { id, x1, x2, y1, y2, attrs, handleClick } = props;
    const { color, perpendicular = defaultPerpendicularLineAttributes } = attrs;

    const path = generatePath(x1, x2, y1, y2, perpendicular);

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <path
                d={roundPathCorners(path.d, 7.5, false)}
                fill="none"
                stroke={color[2]}
                strokeWidth={5}
                strokeLinejoin="round"
                onClick={onClick}
            />
        ),
        [x1, y1, x2, y2, perpendicular.startFrom, color[2], onClick]
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

const perpendicularFields = [
    {
        type: 'select',
        label: 'panel.details.line.perpendicular.startFrom',
        value: (attrs?: PerpendicularLineAttributes) => (attrs ?? defaultPerpendicularLineAttributes).startFrom,
        options: { from: 'from', to: 'to' },
        onChange: (val: string | number, attrs_: PerpendicularLineAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularLineAttributes;
            // set value
            attrs.startFrom = val as 'from' | 'to';
            // return modified attrs
            return attrs;
        },
    },
];

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
    fields: perpendicularFields,
    generatePath,
};

export default perpendicularLine;
