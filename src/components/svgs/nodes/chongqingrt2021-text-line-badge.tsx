import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';
import { MultilineText } from '../common/multiline-text';

const ChongqingRT2021TextLineBadge = (props: NodeComponentProps<ChongqingRT2021TextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultChongqingRT2021TextLineBadgeAttributes.names,
        color = defaultChongqingRT2021TextLineBadgeAttributes.color,
        isRapid = defaultChongqingRT2021TextLineBadgeAttributes.isRapid,
    } = attrs ?? defaultChongqingRT2021TextLineBadgeAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);

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
    const width = isRapid ? 42 : 21;
    const height = 21;
    return (
        <g
            id={id}
            transform={`translate(${x - width / 2}, ${y - height / 2})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width={width} height={height} rx="3" ry="3" />
            <rect
                strokeWidth="1.5"
                stroke="white"
                fill="none"
                x="1.5"
                y="1.5"
                width={width - 3}
                height={height - 3}
                rx="2"
                ry="2"
            />
            <text
                className="rmp-name__zh"
                textAnchor="middle"
                x={width / 2}
                y={height / 2 + 0.5}
                fill={fgColor}
                fontSize={isRapid ? 8 : 5}
                letterSpacing="0"
            >
                {names[0]}
            </text>
            <MultilineText
                ref={textLineEl}
                text={names[1].split('\n')}
                className="rmp-name__en"
                textAnchor="middle"
                x={width / 2}
                y={height / 2 - Number(!isRapid) * 0.75}
                fill={fgColor}
                fontSize={isRapid ? 4 : 2.2}
                letterSpacing="0"
                lineHeight={2.25}
                grow={'down'}
            />
        </g>
    );
};

/**
 * BerlinUBahnLineBadge specific props.
 */
export interface ChongqingRT2021TextLineBadgeAttributes extends AttributesWithColor {
    names: [string, string];
    isRapid: boolean;
}

const defaultChongqingRT2021TextLineBadgeAttributes: ChongqingRT2021TextLineBadgeAttributes = {
    names: ['空港线', 'Konggang Line'],
    color: [CityCode.Chongqing, 'cq3', '#003da5', MonoColour.white],
    isRapid: false,
};

const chongqingRT2021TextLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameZh',
        value: (attrs?: ChongqingRT2021TextLineBadgeAttributes) =>
            (attrs ?? defaultChongqingRT2021TextLineBadgeAttributes).names[0],
        onChange: (val: string | number, attrs_: ChongqingRT2021TextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultChongqingRT2021TextLineBadgeAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.nodes.common.nameEn',
        value: (attrs?: ChongqingRT2021TextLineBadgeAttributes) =>
            (attrs ?? defaultChongqingRT2021TextLineBadgeAttributes).names[1],
        onChange: (val: string | number, attrs_: ChongqingRT2021TextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultChongqingRT2021TextLineBadgeAttributes;
            // return if invalid
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        label: 'color',
        component: (
            <ColorField
                type={MiscNodeType.ChongqingRT2021TextLineBadge}
                defaultTheme={defaultChongqingRT2021TextLineBadgeAttributes.color}
            />
        ),
    },
    {
        type: 'switch',
        label: 'panel.details.nodes.chongqingRT2021TextLineBadge.isRapid',
        value: (attrs?: ChongqingRT2021TextLineBadgeAttributes) =>
            (attrs ?? defaultChongqingRT2021TextLineBadgeAttributes).isRapid,
        onChange: (val: boolean, attrs_: ChongqingRT2021TextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultChongqingRT2021TextLineBadgeAttributes;
            // set value
            attrs.isRapid = val;
            // return modified attrs
            return attrs;
        },
        oneLine: true,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={chongqingRT2021TextLineBadgeFields as RmgFieldsFieldDetail<ChongqingRT2021TextLineBadgeAttributes>}
    />
);

const chongqingRT2021TextLineBadgeIcon = (
    <svg viewBox="0 0 21 21" height={40} width={40} focusable={false} style={{ padding: 3 }}>
        <rect fill="currentColor" x="0" width="21" height="21" rx="3" ry="3" />
        <rect strokeWidth="1.5" stroke="white" fill="none" x="1.5" y="1.5" width="18" height="18" rx="2" ry="2" />
        <text className="rmp-name__zh" textAnchor="middle" x="10.5" y="11" fill="white" fontSize="5" letterSpacing="0">
            空港线
        </text>
        <text
            className="rmp-name__en"
            textAnchor="middle"
            x="10.5"
            y="13.75"
            fill="white"
            fontSize="2"
            letterSpacing="0"
        >
            Konggang Line
        </text>
    </svg>
);

const chongqingRT2021TextLineBadge: Node<ChongqingRT2021TextLineBadgeAttributes> = {
    component: ChongqingRT2021TextLineBadge,
    icon: chongqingRT2021TextLineBadgeIcon,
    defaultAttrs: defaultChongqingRT2021TextLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRT2021TextLineBadge.displayName',
        tags: [],
    },
};

export default chongqingRT2021TextLineBadge;
