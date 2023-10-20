import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const MIN_WIDTH = 28.84375;

const BjsubwayTextLineBadge = (props: NodeComponentProps<BjsubwayTextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultBjsubwayTextLineBadgeAttributes.names,
        color = defaultBjsubwayTextLineBadgeAttributes.color,
    } = attrs ?? defaultBjsubwayTextLineBadgeAttributes;

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

    const width = Math.max(MIN_WIDTH, bBox.width);
    const fgColor = color[3] === MonoColour.black ? '#003670' : MonoColour.white;

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <rect fill={color[2]} x="0" width={width + 4} height="16" rx="2" />
                <g ref={textLineEl}>
                    <text
                        className="rmp-name__zh"
                        textAnchor="middle"
                        x={(width + 4) / 2}
                        y="8"
                        fontSize="7"
                        fill={fgColor}
                    >
                        {names[0]}
                    </text>
                    <text
                        className="rmp-name__en"
                        textAnchor="middle"
                        x={(width + 4) / 2}
                        y="13.5"
                        fontSize="4"
                        fill={fgColor}
                    >
                        {names[1]}
                    </text>
                </g>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width={width + 3}
                    height="16"
                    rx="2"
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
 * BjsubwayTextLineBadge specific props.
 */
export interface BjsubwayTextLineBadgeAttributes extends AttributesWithColor {
    names: [string, string];
}

const defaultBjsubwayTextLineBadgeAttributes: BjsubwayTextLineBadgeAttributes = {
    names: ['八通线', 'Batong Line'],
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const bjSubwayTextLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameZh',
        value: (attrs?: BjsubwayTextLineBadgeAttributes) => (attrs ?? defaultBjsubwayTextLineBadgeAttributes).names[0],
        onChange: (val: string | number, attrs_: BjsubwayTextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayTextLineBadgeAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameEn',
        value: (attrs?: BjsubwayTextLineBadgeAttributes) => (attrs ?? defaultBjsubwayTextLineBadgeAttributes).names[1],
        onChange: (val: string | number, attrs_: BjsubwayTextLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultBjsubwayTextLineBadgeAttributes;
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
                type={MiscNodeType.BjsubwayTextLineBadge}
                defaultTheme={defaultBjsubwayTextLineBadgeAttributes.color}
            />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={bjSubwayTextLineBadgeFields as RmgFieldsFieldDetail<BjsubwayTextLineBadgeAttributes>}
    />
);

const bjSubwayTextLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" width="20" height="12" rx="2" />
        <text x="3" y="12" fontSize="6" fill="white">
            八通线
        </text>
        <text x="3" y="16" fontSize="3.2" fill="white">
            Batong Line
        </text>
    </svg>
);

const bjsubwayTextLineBadge: Node<BjsubwayTextLineBadgeAttributes> = {
    component: BjsubwayTextLineBadge,
    icon: bjSubwayTextLineBadgeIcon,
    defaultAttrs: defaultBjsubwayTextLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.bjsubwayTextLineBadge.displayName',
        tags: [],
    },
};

export default bjsubwayTextLineBadge;
