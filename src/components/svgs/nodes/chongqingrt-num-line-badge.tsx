import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const ChongqingRTNumLineBadge = (props: NodeComponentProps<ChongqingRTNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultChongqingRTNumLineBadgeAttributes.num,
        color = defaultChongqingRTNumLineBadgeAttributes.color,
    } = attrs ?? defaultChongqingRTNumLineBadgeAttributes;

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
    const fontSize = !Number.isInteger(num) ? 15 : 16;
    const letterSpacing = Number.isInteger(num) ? (Number(num) >= 10 ? -1.2 : 0) : 0;

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width="20" height="20" rx="10" ry="10" />
            <text
                {...getLangStyle(TextLanguage.zh)}
                textAnchor="middle"
                x="10"
                y="10"
                fill={fgColor}
                fontSize={fontSize}
                letterSpacing={letterSpacing}
                dominantBaseline="central"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * ChongqingRTNumLineBadge specific props.
 */
export interface ChongqingRTNumLineBadgeAttributes extends ColorAttribute {
    num: number | string;
}

const defaultChongqingRTNumLineBadgeAttributes: ChongqingRTNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
};

const ChongqingRTNumLineBadgeAttrsComponent = (props: AttrsProps<ChongqingRTNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultChongqingRTNumLineBadgeAttributes.num).toString(),
            onChange: val => {
                attrs.num = val;
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ChongqingRTNumLineBadge}
                    defaultTheme={defaultChongqingRTNumLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const chongqingRTNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="8" y="18" fill="white" fontSize="18">
            1
        </text>
    </svg>
);

const chongqingRTNumLineBadge: Node<ChongqingRTNumLineBadgeAttributes> = {
    component: ChongqingRTNumLineBadge,
    icon: chongqingRTNumLineBadgeIcon,
    defaultAttrs: defaultChongqingRTNumLineBadgeAttributes,
    attrsComponent: ChongqingRTNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRTNumLineBadge.displayName',
        tags: [],
    },
};

export default chongqingRTNumLineBadge;
