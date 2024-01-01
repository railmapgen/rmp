import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const BerlinUBahnLineBadge = (props: NodeComponentProps<BerlinSBahnLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinSBahnLineBadgeAttributes.num, color = defaultBerlinSBahnLineBadgeAttributes.color } =
        attrs ?? defaultBerlinSBahnLineBadgeAttributes;

    const [sX, numX] = num >= 10 ? [6, 19.75] : [10, 20];

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

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width="30" height="15" rx="8" />
            <text
                className="rmp-name__berlin"
                textAnchor="middle"
                x={sX}
                y="12.5"
                fill={fgColor}
                fontSize="14"
                letterSpacing="0"
            >
                S
            </text>
            <text
                className="rmp-name__berlin"
                textAnchor="middle"
                x={numX}
                y="12.5"
                fill={fgColor}
                fontSize="14"
                letterSpacing="-0.2"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * BerlinSBahnLineBadge specific props.
 */
export interface BerlinSBahnLineBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultBerlinSBahnLineBadgeAttributes: BerlinSBahnLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bs1', '#DD6CA6', MonoColour.white],
};

const berlinSBahnLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.num',
        value: (attrs?: BerlinSBahnLineBadgeAttributes) => (attrs ?? defaultBerlinSBahnLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: BerlinSBahnLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBerlinSBahnLineBadgeAttributes;
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
                type={MiscNodeType.BerlinSBahnLineBadge}
                defaultTheme={defaultBerlinSBahnLineBadgeAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={berlinSBahnLineBadgeFields as RmgFieldsFieldDetail<BerlinSBahnLineBadgeAttributes>}
    />
);

const berlinSBahnLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="8" />
        <text x="4.5" y="16.5" fill="white" fontSize="14">
            S1
        </text>
    </svg>
);

const berlinSBahnLineBadge: Node<BerlinSBahnLineBadgeAttributes> = {
    component: BerlinUBahnLineBadge,
    icon: berlinSBahnLineBadgeIcon,
    defaultAttrs: defaultBerlinSBahnLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.berlinSBahnLineBadge.displayName',
        tags: [],
    },
};

export default berlinSBahnLineBadge;
