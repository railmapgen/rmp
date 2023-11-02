import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const ShmetroNumLineBadge = (props: NodeComponentProps<ShmetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultShmetroNumLineBadgeAttributes.num, color = defaultShmetroNumLineBadgeAttributes.color } =
        attrs ?? defaultShmetroNumLineBadgeAttributes;

    const [width, numX] = num >= 10 ? [22.67, 10.75] : [21, 10];

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
            <g id={id} transform={`translate(${x}, ${y})`}>
                <rect fill={color[2]} width={width} height="22.67" />
                <text
                    className="rmp-name__zh"
                    textAnchor="middle"
                    x={numX}
                    y="19"
                    fill={color[3]}
                    fontSize="21.33"
                    letterSpacing="-1.75"
                >
                    {num}
                </text>
                <text className="rmp-name__zh" x={width + 2} y="12" fontSize="14.67">
                    号线
                </text>
                <text className="rmp-name__en" x={width + 4} y="21.5" fontSize="8">
                    Line {num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    width={width}
                    height="22.67"
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
 * ShmetroNumLineBadge specific props.
 */
export interface ShmetroNumLineBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultShmetroNumLineBadgeAttributes: ShmetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const shmetroNumLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.num',
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
        label: 'color',
        component: (
            <ColorField
                type={MiscNodeType.ShmetroNumLineBadge}
                defaultTheme={defaultShmetroNumLineBadgeAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={shmetroNumLineBadgeFields as RmgFieldsFieldDetail<ShmetroNumLineBadgeAttributes>}
    />
);

const shmetroNumLineBadgeIcon = (
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
    icon: shmetroNumLineBadgeIcon,
    defaultAttrs: defaultShmetroNumLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.shmetroNumLineBadge.displayName',
        tags: [],
    },
};

export default shmetroNumLineBadge;
