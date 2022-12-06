import React from 'react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import { LineAttributes, Line, LineComponentProps, GeneratePathFunction } from '../../../constants/lines';
import { roundPathCorners } from '../../../util/pathRounding';

const generatePath: GeneratePathFunction<PerpendicularLineAttributes> = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    attrs: PerpendicularLineAttributes
) => {
    // get type specific attrs with default value
    const {
        startFrom = defaultPerpendicularLineAttributes.startFrom,
        offsetFrom = defaultPerpendicularLineAttributes.offsetFrom,
        offsetTo = defaultPerpendicularLineAttributes.offsetTo,
    } = attrs;

    const [offset1, offset2] = startFrom === 'from' ? [offsetFrom, offsetTo] : [offsetTo, offsetFrom];
    const [dx1, dy1, dx2, dy2] = startFrom === 'from' ? [0, offset1, offset2, 0] : [offset1, 0, 0, offset2];

    const x = startFrom === 'from' ? x2 + dx2 : x1 + dx1;
    const y = startFrom === 'from' ? y1 + dy1 : y2 + dy2;

    return { type: 'straight', d: `M ${x1 + dx1},${y1 + dy1} L ${x},${y} L ${x2 + dx2},${y2 + dy2}` };
};

const PerpendicularLine = (props: LineComponentProps) => {
    const { id, x1, x2, y1, y2, attrs, newLine, handleClick } = props;
    const { color, perpendicular = defaultPerpendicularLineAttributes } = attrs;
    const { roundCornerFactor = defaultPerpendicularLineAttributes.roundCornerFactor } = perpendicular;

    const [path, setPath] = React.useState(generatePath(x1, x2, y1, y2, perpendicular));
    React.useEffect(
        () => setPath(generatePath(x1, x2, y1, y2, perpendicular)),
        [x1, y1, x2, y2, perpendicular.startFrom, perpendicular.offsetFrom, perpendicular.offsetTo]
    );

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return React.useMemo(
        () => (
            <path
                id={id}
                d={roundPathCorners(path.d, roundCornerFactor, false)}
                fill="none"
                stroke={color[2]}
                strokeWidth={5}
                strokeLinejoin="round"
                strokeLinecap="round"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        ),
        [path.d, roundCornerFactor, color[2], newLine, onClick]
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
    offsetFrom: number;
    offsetTo: number;
    roundCornerFactor: number;
}

const defaultPerpendicularLineAttributes: PerpendicularLineAttributes = {
    startFrom: 'from',
    offsetFrom: 0,
    offsetTo: 0,
    roundCornerFactor: 7.5,
};

const perpendicularFields = [
    {
        type: 'select',
        label: 'panel.details.line.perpendicular.startFrom',
        value: (attrs?: PerpendicularLineAttributes) =>
            attrs?.startFrom ?? defaultPerpendicularLineAttributes.startFrom,
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
    {
        type: 'input',
        label: 'panel.details.line.perpendicular.offsetFrom',
        value: (attrs?: PerpendicularLineAttributes) =>
            (attrs?.offsetFrom ?? defaultPerpendicularLineAttributes.offsetFrom).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: PerpendicularLineAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularLineAttributes;
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
        label: 'panel.details.line.perpendicular.offsetTo',
        value: (attrs?: PerpendicularLineAttributes) =>
            (attrs?.offsetTo ?? defaultPerpendicularLineAttributes.offsetTo).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: PerpendicularLineAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularLineAttributes;
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
        label: 'panel.details.line.perpendicular.roundCornerFactor',
        value: (attrs?: PerpendicularLineAttributes) =>
            (attrs?.roundCornerFactor ?? defaultPerpendicularLineAttributes.roundCornerFactor).toString(),
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: PerpendicularLineAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultPerpendicularLineAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.roundCornerFactor = Number(val);
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
    metadata: {
        displayName: 'panel.details.line.perpendicular.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default perpendicularLine;
