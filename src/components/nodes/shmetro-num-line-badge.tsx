import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MiscNodeType, Node, NodeComponentProps } from '../../constants/nodes';
import { AttributesWithColor, ColorField } from '../panel/details/color-field';

const ShmetroNumLineBadge = (props: NodeComponentProps<ShmetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultShmetroNumLineBadgeAttributes.num, color = defaultShmetroNumLineBadgeAttributes.color } =
        attrs ?? defaultShmetroNumLineBadgeAttributes;

    const width = num >= 10 ? 17.5 : 14.5;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})scale(2)`}>
                <rect fill={color[2]} x={0} width={width} height="16" />
                <text textAnchor="middle" x={width / 2} y="14" fill={color[3]}>
                    {num}
                </text>
                <text x={width + 2} y="9" fontSize="10">
                    号线
                </text>
                <text x={width + 2} y="16" fontSize="6">
                    Line {num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x={0}
                    width={width}
                    height={10}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, num, ...color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * <ShmetroNumLineBadge /> specific props.
 */
export interface ShmetroNumLineBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultShmetroNumLineBadgeAttributes: ShmetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const ShmetroNumLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.node.shmetroNumLineBadge.num',
        value: (attrs?: ShmetroNumLineBadgeAttributes) => (attrs ?? defaultShmetroNumLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: ShmetroNumLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroNumLineBadgeAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.num = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: (
            <ColorField type={MiscNodeType.ShmetroNumLineBadge} defaultAttrs={defaultShmetroNumLineBadgeAttributes} />
        ),
    },
];

const ShmetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="10" height="16" />
        <text x="4" y="18" fill="white">
            1
        </text>
        <text x="14" y="10" fontSize="5">
            号线
        </text>
        <text x="14" y="18" fontSize="4">
            Line 1
        </text>
    </svg>
);

const shmetroNumLineBadge: Node<ShmetroNumLineBadgeAttributes> = {
    component: ShmetroNumLineBadge,
    icon: ShmetroNumLineBadgeIcon,
    defaultAttrs: defaultShmetroNumLineBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: ShmetroNumLineBadgeFields,
    metadata: {
        displayName: 'panel.details.node.shmetroNumLineBadge.displayName',
        tags: [],
    },
};

export default shmetroNumLineBadge;
