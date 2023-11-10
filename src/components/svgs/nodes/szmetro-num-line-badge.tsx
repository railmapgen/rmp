import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { RmgFieldsFieldDetail, RmgFieldsFieldSpecificAttributes } from '../../panels/details/rmg-field-specific-attrs';

const NUM_WIDTH = 11.84375;

const SzmetroNumLineBadge = (props: NodeComponentProps<SzmetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultSzmetroNumLineBadgeAttributes.num,
        color = defaultSzmetroNumLineBadgeAttributes.color,
        isBranch = defaultSzmetroNumLineBadgeAttributes.isBranch,
    } = attrs ?? defaultSzmetroNumLineBadgeAttributes;

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

    const fgColor = color[3] === MonoColour.black ? '#003670' : MonoColour.white;
    const chWidth = isBranch ? 10 : NUM_WIDTH + (num > 9 ? 5.5 : 2);
    const enWidth = isBranch ? 10 : NUM_WIDTH + (num > 9 ? 6 : 2.5);

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <rect fill={color[2]} x="0" width={NUM_WIDTH + 21} height="16" rx="2" />
                <text
                    className="rmp-name__zh"
                    textAnchor="middle"
                    x={NUM_WIDTH / 2 + 3}
                    y="13.5"
                    fill={fgColor}
                    fontSize="15"
                    letterSpacing="-1"
                >
                    {num}
                </text>
                <text className="rmp-name__zh" x={chWidth} y="10" fontSize="6.5" fill={fgColor}>
                    号线
                </text>
                <text className="rmp-name__en" x={enWidth} y="13.5" fontSize="3" fill={fgColor}>
                    Line {num}
                </text>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width={NUM_WIDTH + 23}
                    height="16"
                    rx="2"
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
export interface SzmetroNumLineBadgeAttributes extends AttributesWithColor {
    num: number;
    isBranch: boolean;
}

const defaultSzmetroNumLineBadgeAttributes: SzmetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
    isBranch: false,
};

const szmetroNumLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.num',
        value: (attrs?: SzmetroNumLineBadgeAttributes) => (attrs ?? defaultSzmetroNumLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: SzmetroNumLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSzmetroNumLineBadgeAttributes;
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
                type={MiscNodeType.SzmetroNumLineBadge}
                defaultTheme={defaultSzmetroNumLineBadgeAttributes.color}
            />
        ),
    },
    {
        type: 'switch',
        label: 'panel.details.stations.bjsubwayBasic.open',
        oneLine: true,
        isChecked: (attrs?: SzmetroNumLineBadgeAttributes) => (attrs ?? defaultSzmetroNumLineBadgeAttributes).isBranch,
        onChange: (val: boolean, attrs_: SzmetroNumLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultSzmetroNumLineBadgeAttributes;
            // set value
            attrs.isBranch = val;
            // return modified attrs
            return attrs;
        },
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={szmetroNumLineBadgeFields as RmgFieldsFieldDetail<SzmetroNumLineBadgeAttributes>}
    />
);

const szmetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="2" />
        <text x="4" y="17" fill="white" fontSize="14">
            1
        </text>
        <text x="11" y="11" fill="white" fontSize="5">
            号线
        </text>
        <text x="11" y="17" fill="white" fontSize="4">
            Line 1
        </text>
    </svg>
);

const szmetroNumLineBadge: Node<SzmetroNumLineBadgeAttributes> = {
    component: SzmetroNumLineBadge,
    icon: szmetroNumLineBadgeIcon,
    defaultAttrs: defaultSzmetroNumLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.bjsubwayNumLineBadge.displayName',
        tags: [],
    },
};

export default szmetroNumLineBadge;
