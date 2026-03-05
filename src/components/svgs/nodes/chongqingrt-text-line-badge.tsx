import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const ChongqingRTTextLineBadge = (props: NodeComponentProps<ChongqingRTTextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultChongqingRTTextLineBadgeAttributes.names,
        color = defaultChongqingRTTextLineBadgeAttributes.color,
    } = attrs ?? defaultChongqingRTTextLineBadgeAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);

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
                y="10.5"
                fill={fgColor}
                fontSize="6"
                letterSpacing="0"
            >
                {names[0]}
            </text>
            <MultilineText
                ref={textLineEl}
                text={names[1].split('\n')}
                {...getLangStyle(TextLanguage.en)}
                textAnchor="middle"
                x="10"
                y="9.25"
                fill={fgColor}
                fontSize="2.5"
                letterSpacing="0"
                lineHeight={2.25}
                grow={'down'}
            />
        </g>
    );
};

/**
 * ChongqingRTTextLineBadge specific props.
 */
export interface ChongqingRTTextLineBadgeAttributes extends ColorAttribute {
    names: [string, string];
}

const defaultChongqingRTTextLineBadgeAttributes: ChongqingRTTextLineBadgeAttributes = {
    names: ['空港线', 'Konggang Line'],
    color: [CityCode.Chongqing, 'cq3', '#003da5', MonoColour.white],
};

const ChongqingRTTextLineBadgeAttrsComponent = (props: AttrsProps<ChongqingRTTextLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.common.nameEn'),
            value: attrs.names.at(1) ?? defaultChongqingRTTextLineBadgeAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ChongqingRTTextLineBadge}
                    defaultTheme={defaultChongqingRTTextLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const chongqingRTTextLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="4.5" y="12.5" fill="white" fontSize="5">
            空港线
        </text>
        <text x="4.5" y="15" fill="white" fontSize="2">
            Konggang Line
        </text>
    </svg>
);

const chongqingRTTextLineBadge: Node<ChongqingRTTextLineBadgeAttributes> = {
    component: ChongqingRTTextLineBadge,
    icon: chongqingRTTextLineBadgeIcon,
    defaultAttrs: defaultChongqingRTTextLineBadgeAttributes,
    attrsComponent: ChongqingRTTextLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRTTextLineBadge.displayName',
        tags: [],
    },
};

export default chongqingRTTextLineBadge;
