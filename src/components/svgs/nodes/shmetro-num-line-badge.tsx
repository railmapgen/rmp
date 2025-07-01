import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const ShmetroNumLineBadge = (props: NodeComponentProps<ShmetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultShmetroNumLineBadgeAttributes.num, color = defaultShmetroNumLineBadgeAttributes.color } =
        attrs ?? defaultShmetroNumLineBadgeAttributes;

    const [width, numX] = num >= 10 ? [22.67, 10.75] : [21, 10];

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

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} width={width} height="22.67" />
            <text
                {...getLangStyle(TextLanguage.en)}
                textAnchor="middle"
                x={numX}
                y="19"
                fill={color[3]}
                fontSize="21.33"
                letterSpacing="-1.75"
            >
                {num}
            </text>
            <text {...getLangStyle(TextLanguage.zh)} x={width + 2} y="12" fontSize="14.67">
                号线
            </text>
            <text {...getLangStyle(TextLanguage.en)} x={width + 4} y="21.5" fontSize="8">
                Line {num}
            </text>
        </g>
    );
};

/**
 * ShmetroNumLineBadge specific props.
 */
export interface ShmetroNumLineBadgeAttributes extends ColorAttribute {
    num: number;
}

const defaultShmetroNumLineBadgeAttributes: ShmetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const SHMetroNumLineBadgeAttrsComponent = (props: AttrsProps<ShmetroNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultShmetroNumLineBadgeAttributes.num).toString(),
            validator: (val: string) => !Number.isNaN(val),
            onChange: val => {
                attrs.num = Number(val);
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ShmetroNumLineBadge}
                    defaultTheme={defaultShmetroNumLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const shmetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="10" height="16" />
        <text x="4" y="18" fill="white">
            1
        </text>
        <text x="14" y="10" fontSize="5">
            号线
        </text>
        <text x="14" y="18" fontSize="4">
            Line 1
        </text>
    </svg>
);

const shmetroNumLineBadge: Node<ShmetroNumLineBadgeAttributes> = {
    component: ShmetroNumLineBadge,
    icon: shmetroNumLineBadgeIcon,
    defaultAttrs: defaultShmetroNumLineBadgeAttributes,
    attrsComponent: SHMetroNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.shmetroNumLineBadge.displayName',
        tags: [],
    },
};

export default shmetroNumLineBadge;
