import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { Theme } from '../../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../../constants/nodes';
import { ColorField } from '../../../panels/details/color-field';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';
import { LineIcon } from './line-icon';

const GzmtrLineBadge = (props: NodeComponentProps<GzmtrLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { names = defaultGzmtrLineBadgeAttributes.names, color = defaultGzmtrLineBadgeAttributes.color } =
        attrs ?? defaultGzmtrLineBadgeAttributes;

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
                <LineIcon lineName={names} foregroundColour={color[3]} backgroundColour={color[2]} />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x="-22.5"
                    width="45"
                    height="24"
                    rx="4.5"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, ...names, ...color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * GzmtrLineBadge specific props.
 */
export interface GzmtrLineBadgeAttributes {
    names: [string, string];
    color: Theme;
}

const defaultGzmtrLineBadgeAttributes: GzmtrLineBadgeAttributes = {
    names: ['1号线', 'Line 1'],
    color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black],
};

const gzmtrLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameZh',
        value: (attrs?: GzmtrLineBadgeAttributes) => (attrs ?? defaultGzmtrLineBadgeAttributes).names[0],
        onChange: (val: string | number, attrs_: GzmtrLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrLineBadgeAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.nodes.common.nameEn',
        value: (attrs?: GzmtrLineBadgeAttributes) => (attrs ?? defaultGzmtrLineBadgeAttributes).names[1],
        onChange: (val: string | number, attrs_: GzmtrLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrLineBadgeAttributes;
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
            <ColorField type={MiscNodeType.GzmtrLineBadge} defaultTheme={defaultGzmtrLineBadgeAttributes.color} />
        ),
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes fields={gzmtrLineBadgeFields as RmgFieldsFieldDetail<GzmtrLineBadgeAttributes>} />
);

const gzmtrLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="5" width="20" height="14" rx="1" />
        <text x="12" y="12" textAnchor="middle" fontSize="6" fill="white">
            1号线
        </text>
        <text x="12" y="17" textAnchor="middle" fontSize="5" fill="white">
            Line 1
        </text>
    </svg>
);

const gzmtrLineBadge: Node<GzmtrLineBadgeAttributes> = {
    component: GzmtrLineBadge,
    icon: gzmtrLineBadgeIcon,
    defaultAttrs: defaultGzmtrLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.gzmtrLineBadge.displayName',
        tags: [],
    },
};

export default gzmtrLineBadge;
