import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const BerlinUBahnBadge = (props: NodeComponentProps<BerlinSBahnBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinSBahnBadgeAttributes.num, color = defaultBerlinSBahnBadgeAttributes.color } =
        attrs ?? defaultBerlinSBahnBadgeAttributes;

    const [sX, numX] = num >= 10 ? [7, 20] : [10, 20];

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
                <rect fill={color[2]} x="0" width="30" height="15" rx="8" />
                <text
                    className="rmp-name__en"
                    textAnchor="middle"
                    x={sX}
                    y="12.5"
                    fill={fgColor}
                    fontSize="14"
                    letterSpacing="0"
                    fontWeight="bold"
                >
                    S
                </text>
                <text
                    className="rmp-name__en"
                    textAnchor="middle"
                    x={numX}
                    y="12.5"
                    fill={fgColor}
                    fontSize="14"
                    letterSpacing="-0.4"
                    fontWeight="bold"
                >
                    {num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width="30"
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
export interface BerlinSBahnBadgeAttributes extends AttributesWithColor {
    num: number;
}

const defaultBerlinSBahnBadgeAttributes: BerlinSBahnBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bs1', '#DD6CA6', MonoColour.white],
};

const BerlinSBahnBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.node.berlinSBahnBadge.num',
        value: (attrs?: BerlinSBahnBadgeAttributes) => (attrs ?? defaultBerlinSBahnBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: BerlinSBahnBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBerlinSBahnBadgeAttributes;
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
        component: <ColorField type={MiscNodeType.BerlinSBahnBadge} defaultAttrs={defaultBerlinSBahnBadgeAttributes} />,
    },
];

const BerlinSBahnBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="8" />
        <text x="4.5" y="16.5" fill="white" fontSize="14">
            S1
        </text>
    </svg>
);

const berlinSBahnBadge: Node<BerlinSBahnBadgeAttributes> = {
    component: BerlinUBahnBadge,
    icon: BerlinSBahnBadgeIcon,
    defaultAttrs: defaultBerlinSBahnBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: BerlinSBahnBadgeFields,
    metadata: {
        displayName: 'panel.details.node.BerlinSBahnBadge.displayName',
        tags: [],
    },
};

export default berlinSBahnBadge;
