import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { Theme } from '../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import ThemeButton from '../panel/theme-button';
import ColourModal from '../panel/colour-modal/colour-modal';
import { AttributesWithColor, ColorField } from '../panel/details/color-field';

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
            <g id={id} transform={`translate(${x}, ${y})scale(2)`}>
                <rect fill={color[2]} x={0} width={bBox.width + 3} height="16" />
                <g ref={textLineEl}>
                    <text textAnchor="middle" x={(bBox.width + 3) / 2} y="8" fontSize="8" fill={color[3]}>
                        {names[0]}
                    </text>
                    <text textAnchor="middle" x={(bBox.width + 3) / 2} y="14" fontSize="6" fill={color[3]}>
                        {names[1]}
                    </text>
                </g>
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="0"
                    width={bBox.width + 3}
                    height="16"
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
 * <ShmetroTextLineBadge /> specific props.
 */
export interface ShmetroTextLineBadgeAttributes extends AttributesWithColor {
    names: [string, string];
}

const defaultShmetroTextLineBadgeAttributes: ShmetroTextLineBadgeAttributes = {
    names: ['浦江线', 'Pujiang Line'],
    color: [CityCode.Shanghai, 'pjl', '#999999', MonoColour.white],
};

const ShmetroTextLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.node.shmetroTextLineBadge.nameZh',
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
        label: 'panel.details.node.shmetroTextLineBadge.nameEn',
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
        component: (
            <ColorField type={MiscNodeType.ShmetroTextLineBadge} defaultAttrs={defaultShmetroTextLineBadgeAttributes} />
        ),
    },
];

const ShmetroTextLineBadgeIcon = (
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
    icon: ShmetroTextLineBadgeIcon,
    defaultAttrs: defaultShmetroTextLineBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: ShmetroTextLineBadgeFields,
    metadata: {
        displayName: 'panel.details.node.shmetroTextLineBadge.displayName',
        tags: [],
    },
};

export default shmetroTextLineBadge;
