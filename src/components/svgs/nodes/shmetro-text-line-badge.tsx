import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const ShmetroTextLineBadge = (props: NodeComponentProps<ShmetroTextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { names = defaultShmetroTextLineBadgeAttributes.names, color = defaultShmetroTextLineBadgeAttributes.color } =
        attrs ?? defaultShmetroTextLineBadgeAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 12 } as DOMRect);
    React.useEffect(() => setBBox(textLineEl.current!.getBBox()), [...names, setBBox, textLineEl]);

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
                <rect fill={color[2]} x="0" width={bBox.width + 7} height="21" />
                <g ref={textLineEl}>
                    <text
                        className="rmp-name__zh"
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        x={(bBox.width + 7) / 2}
                        y="4"
                        fontSize="10"
                        fill={color[3]}
                        letterSpacing="-0.25"
                    >
                        {names[0]}
                    </text>
                    <text
                        className="rmp-name__en"
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        x={(bBox.width + 7) / 2}
                        y="13"
                        fontSize="5"
                        fill={color[3]}
                        letterSpacing="-0.25"
                    >
                        {names[1]}
                    </text>
                </g>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width={bBox.width + 7}
                    height="21"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, ...names, bBox, ...color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * ShmetroTextLineBadge specific props.
 */
export interface ShmetroTextLineBadgeAttributes extends AttributesWithColor {
    names: [string, string];
}

const defaultShmetroTextLineBadgeAttributes: ShmetroTextLineBadgeAttributes = {
    names: ['浦江线', 'Pujiang Line'],
    color: [CityCode.Shanghai, 'pjl', '#B5B5B6', MonoColour.white],
};

const shmetroTextLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameZh',
        value: (attrs?: ShmetroTextLineBadgeAttributes) => (attrs ?? defaultShmetroTextLineBadgeAttributes).names[0],
        onChange: (val: string | number, attrs_: ShmetroTextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroTextLineBadgeAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameEn',
        value: (attrs?: ShmetroTextLineBadgeAttributes) => (attrs ?? defaultShmetroTextLineBadgeAttributes).names[1],
        onChange: (val: string | number, attrs_: ShmetroTextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroTextLineBadgeAttributes;
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
                type={MiscNodeType.ShmetroTextLineBadge}
                defaultTheme={defaultShmetroTextLineBadgeAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={shmetroTextLineBadgeFields as RmgFieldsFieldDetail<ShmetroTextLineBadgeAttributes>}
    />
);

const shmetroTextLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" width="20" height="12" />
        <text x="5" y="11" fontSize="5" fill="white">
            浦江线
        </text>
        <text x="3" y="16" fontSize="4" fill="white">
            Pujiang Line
        </text>
    </svg>
);

const shmetroTextLineBadge: Node<ShmetroTextLineBadgeAttributes> = {
    component: ShmetroTextLineBadge,
    icon: shmetroTextLineBadgeIcon,
    defaultAttrs: defaultShmetroTextLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.shmetroTextLineBadge.displayName',
        tags: [],
    },
};

export default shmetroTextLineBadge;
