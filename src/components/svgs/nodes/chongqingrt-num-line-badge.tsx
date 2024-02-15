import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const ChongqingRTNumLineBadge = (props: NodeComponentProps<ChongqingRTNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultChongqingRTNumLineBadgeAttributes.num,
        color = defaultChongqingRTNumLineBadgeAttributes.color,
    } = attrs ?? defaultChongqingRTNumLineBadgeAttributes;

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

    const fgColor = color[3];
    const fontSize = !Number.isInteger(num) ? 15 : 16;
    const [letterSpacing, sX] = Number.isInteger(num) ? (Number(num) >= 10 ? [-1.2, 1.5] : [0, 5.5]) : [0, 2.55];

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width="20" height="20" rx="10" ry="10" />
            <text
                className="rmp-name__zh"
                textAnchor="left"
                x={sX}
                y="10"
                fill={fgColor}
                fontSize={fontSize}
                letterSpacing={letterSpacing}
                dominantBaseline="central"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * BerlinUBahnLineBadge specific props.
 */
export interface ChongqingRTNumLineBadgeAttributes extends AttributesWithColor {
    num: number | string;
}

const defaultChongqingRTNumLineBadgeAttributes: ChongqingRTNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
};

const chongqingRTNumLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.num',
        value: (attrs?: ChongqingRTNumLineBadgeAttributes) => (attrs ?? defaultChongqingRTNumLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: ChongqingRTNumLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultChongqingRTNumLineBadgeAttributes;
            // set value
            if (Number.isNaN(Number(val))) {
                attrs.num = val;
            } else {
                attrs.num = Number(val);
            }
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        label: 'color',
        component: (
            <ColorField
                type={MiscNodeType.ChongqingRTNumLineBadge}
                defaultTheme={defaultChongqingRTNumLineBadgeAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={chongqingRTNumLineBadgeFields as RmgFieldsFieldDetail<ChongqingRTNumLineBadgeAttributes>}
    />
);

const chongqingRTNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="8" y="18" fill="white" fontSize="18">
            1
        </text>
    </svg>
);

const chongqingRTNumLineBadge: Node<ChongqingRTNumLineBadgeAttributes> = {
    component: ChongqingRTNumLineBadge,
    icon: chongqingRTNumLineBadgeIcon,
    defaultAttrs: defaultChongqingRTNumLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRTNumLineBadge.displayName',
        tags: [],
    },
};

export default chongqingRTNumLineBadge;
