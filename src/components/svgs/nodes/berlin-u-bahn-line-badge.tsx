import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const BerlinUBahnLineBadge = (props: NodeComponentProps<BerlinUBahnLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinUBahnLineBadgeAttributes.num, color = defaultBerlinUBahnLineBadgeAttributes.color } =
        attrs ?? defaultBerlinUBahnLineBadgeAttributes;

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

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <rect fill={color[2]} x="0" width="25" height="15" />
                <text
                    className="rmp-name__berlin"
                    textAnchor="middle"
                    x="12.5"
                    y="12.5"
                    fill={fgColor}
                    fontSize="14"
                    letterSpacing="1"
                >
                    U{num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width="25"
                    height="15"
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
 * BerlinUBahnLineBadge specific props.
 */
export interface BerlinUBahnLineBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultBerlinUBahnLineBadgeAttributes: BerlinUBahnLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bu1', '#62AD2D', MonoColour.white],
};

const BerlinUBahnLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.num',
        value: (attrs?: BerlinUBahnLineBadgeAttributes) => (attrs ?? defaultBerlinUBahnLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: BerlinUBahnLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBerlinUBahnLineBadgeAttributes;
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
            <ColorField type={MiscNodeType.BerlinUBahnLineBadge} defaultAttrs={defaultBerlinUBahnLineBadgeAttributes} />
        ),
    },
];

const BerlinUBahnLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" />
        <text x="4" y="17" fill="white" fontSize="14">
            U1
        </text>
    </svg>
);

const berlinUBahnLineBadge: Node<BerlinUBahnLineBadgeAttributes> = {
    component: BerlinUBahnLineBadge,
    icon: BerlinUBahnLineBadgeIcon,
    defaultAttrs: defaultBerlinUBahnLineBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: BerlinUBahnLineBadgeFields,
    metadata: {
        displayName: 'panel.details.nodes.berlinUBahnLineBadge.displayName',
        tags: [],
    },
};

export default berlinUBahnLineBadge;
