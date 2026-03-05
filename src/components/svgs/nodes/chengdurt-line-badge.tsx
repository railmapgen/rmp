import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const ChengduRTLineBadge = (props: NodeComponentProps<ChengduRTLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        content = defaultChengduRTLineBadgeAttributes.content,
        color = defaultChengduRTLineBadgeAttributes.color,
        badgeType = defaultChengduRTLineBadgeAttributes.badgeType,
    } = attrs ?? defaultChengduRTLineBadgeAttributes;

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
    const fontSize = 16;
    const widthOffset = badgeType == 'suburban' ? ((content.toString().length - 2) * fontSize) / 2 : 0;

    return (
        <g transform={`translate(${x}, ${y})`}>
            <g transform={`translate(${-12.5}, ${-12.5})`}>
                {badgeType == 'normal' ? (
                    <>
                        <rect fill={color[2]} x="0" width="25" height="25" rx="12.5" ry="12.5" />
                        <text
                            {...getLangStyle(TextLanguage.zh)}
                            textAnchor="middle"
                            x="12.5"
                            y="12.5"
                            fill={fgColor}
                            fontSize={fontSize}
                            dominantBaseline="central"
                        >
                            {content}
                        </text>
                    </>
                ) : badgeType == 'suburban' ? (
                    <>
                        <rect
                            fill={color[2]}
                            x={-widthOffset / 2}
                            y="0"
                            width={20 + widthOffset}
                            height="25"
                            rx="0"
                            ry="0"
                        />
                        <rect fill={color[2]} x={19 + widthOffset / 2} y="0" width="6" height="5" rx="0" ry="0" />
                        <rect fill={color[2]} x={19 + widthOffset / 2} y="10" width="6" height="5" rx="0" ry="0" />
                        <rect fill={color[2]} x={19 + widthOffset / 2} y="20" width="6" height="5" rx="0" ry="0" />
                        <text
                            {...getLangStyle(TextLanguage.zh)}
                            textAnchor="start"
                            x={-widthOffset / 2}
                            y="12.5"
                            fill={fgColor}
                            fontSize={fontSize}
                            dominantBaseline="central"
                        >
                            {content}
                        </text>
                    </>
                ) : (
                    <>
                        <rect fill={color[2]} x="-1.25" y="0" width="27.5" height="7.5" rx="0" ry="0" />
                        <rect fill={color[2]} x="7.5" y="0" width="10" height="25" rx="0" ry="0" />
                        <MultilineText
                            text={content.toString().split('')}
                            lineHeight={10.5}
                            x={12.5}
                            y={6.5}
                            fill="white"
                            fontSize={10}
                            textAnchor="middle"
                            grow="down"
                            dominantBaseline="middle"
                        />
                    </>
                )}
                <rect
                    id={`misc_node_connectable_${id}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move', zIndex: 1000 }}
                    x={0 - widthOffset / 2}
                    y={0}
                    width={25 + widthOffset}
                    height={25}
                    fill="white"
                    opacity={0}
                    stroke="none"
                />
            </g>
        </g>
    );
};

/**
 * ChengduRTLineBadge specific props.
 */
export interface ChengduRTLineBadgeAttributes extends ColorAttribute {
    content: number | string;
    badgeType: 'normal' | 'suburban' | 'tram';
}

const defaultChengduRTLineBadgeAttributes: ChengduRTLineBadgeAttributes = {
    content: 1,
    color: [CityCode.Chengdu, 'cd1', '#222a8c', MonoColour.white],
    badgeType: 'normal',
};

const ChengduRTLineBadgeAttrsComponent = (props: AttrsProps<ChengduRTLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.text.content'),
            value: (attrs ?? defaultChengduRTLineBadgeAttributes).content as string,
            validator: (val: string) => !Number.isNaN(val),
            onChange: (val: string | number) => {
                if (Number.isNaN(Number(val))) {
                    attrs.content = val;
                } else {
                    attrs.content = Number(val);
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ChengduRTLineBadge}
                    defaultTheme={defaultChengduRTLineBadgeAttributes.color}
                />
            ),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.chengduRTLineBadge.badgeType.displayName'),
            value: (attrs ?? defaultChengduRTLineBadgeAttributes).badgeType,
            options: {
                normal: t('panel.details.nodes.chengduRTLineBadge.badgeType.normal'),
                suburban: t('panel.details.nodes.chengduRTLineBadge.badgeType.suburban'),
                tram: t('panel.details.nodes.chengduRTLineBadge.badgeType.tram'),
            },
            onChange: val => {
                attrs.badgeType = val as 'normal' | 'suburban' | 'tram';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chengduRTLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="2" rx="10" ry="10" width="20" height="20" />
        <text x="9" y="17" fill="white" fontSize="14">
            1
        </text>
    </svg>
);

const chengduRTLineBadge: Node<ChengduRTLineBadgeAttributes> = {
    component: ChengduRTLineBadge,
    icon: chengduRTLineBadgeIcon,
    defaultAttrs: defaultChengduRTLineBadgeAttributes,
    attrsComponent: ChengduRTLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chengduRTLineBadge.displayName',
        tags: [],
    },
};

export default chengduRTLineBadge;
