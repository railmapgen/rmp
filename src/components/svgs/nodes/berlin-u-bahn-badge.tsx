import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const BerlinUBahnBadge = (props: NodeComponentProps<BerlinUBahnBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinUBahnBadgeAttributes.num, color = defaultBerlinUBahnBadgeAttributes.color } =
        attrs ?? defaultBerlinUBahnBadgeAttributes;

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
                    className="rmp-name__en"
                    textAnchor="middle"
                    x="12.5"
                    y="13.3"
                    fill={fgColor}
                    fontSize="16.5"
                    letterSpacing="0"
                    fontWeight="bold"
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
 * BjsubwayNumLineBadge specific props.
 */
export interface BerlinUBahnBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultBerlinUBahnBadgeAttributes: BerlinUBahnBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bu1', '#62AD2D', MonoColour.white],
};

const BerlinUBahnBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.node.berlinUBahnBadge.num',
        value: (attrs?: BerlinUBahnBadgeAttributes) => (attrs ?? defaultBerlinUBahnBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: BerlinUBahnBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBerlinUBahnBadgeAttributes;
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
        component: <ColorField type={MiscNodeType.BerlinUBahnBadge} defaultAttrs={defaultBerlinUBahnBadgeAttributes} />,
    },
];

const BerlinUBahnBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" />
        <text x="4" y="17" fill="white" fontSize="14">
            U1
        </text>
    </svg>
);

const berlinUBahnBadge: Node<BerlinUBahnBadgeAttributes> = {
    component: BerlinUBahnBadge,
    icon: BerlinUBahnBadgeIcon,
    defaultAttrs: defaultBerlinUBahnBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: BerlinUBahnBadgeFields,
    metadata: {
        displayName: 'panel.details.node.BerlinUBahnBadge.displayName',
        tags: [],
    },
};

export default berlinUBahnBadge;
