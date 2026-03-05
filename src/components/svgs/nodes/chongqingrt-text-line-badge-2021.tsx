import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const ChongqingRTTextLineBadge2021 = (props: NodeComponentProps<ChongqingRTTextLineBadge2021Attributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultChongqingRTTextLineBadge2021Attributes.names,
        color = defaultChongqingRTTextLineBadge2021Attributes.color,
        isRapid = defaultChongqingRTTextLineBadge2021Attributes.isRapid,
    } = attrs ?? defaultChongqingRTTextLineBadge2021Attributes;

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
    const width = isRapid ? 42 : 21;
    const height = 21;
    return (
        <g transform={`translate(${x}, ${y})`}>
            <g transform={`translate(${-width / 2}, ${-height / 2})`}>
                <rect fill={color[2]} x="0" width={width} height={height} rx="3" ry="3" />
                <rect
                    strokeWidth="1.5"
                    stroke="white"
                    fill="none"
                    x="1.5"
                    y="1.5"
                    width={width - 3}
                    height={height - 3}
                    rx="2"
                    ry="2"
                />
                <text
                    {...getLangStyle(TextLanguage.zh)}
                    textAnchor="middle"
                    x={width / 2}
                    y={height / 2 + 0.5}
                    fill={fgColor}
                    fontSize={isRapid ? 8 : 5}
                    letterSpacing="0"
                >
                    {names[0]}
                </text>
                <MultilineText
                    ref={textLineEl}
                    text={names[1].split('\n')}
                    {...getLangStyle(TextLanguage.en)}
                    textAnchor="middle"
                    x={width / 2}
                    y={height / 2 - Number(!isRapid) * 0.75}
                    fill={fgColor}
                    fontSize={isRapid ? 4 : 2.2}
                    letterSpacing="0"
                    lineHeight={2.25}
                    grow={'down'}
                />

                <rect
                    id={`misc_node_connectable_${id}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move', zIndex: 1000 }}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="white"
                    opacity={0}
                    stroke="none"
                />
            </g>
        </g>
    );
};

/**
 * ChongqingRTNumLineBadge2021 specific props.
 */
export interface ChongqingRTTextLineBadge2021Attributes extends ColorAttribute {
    names: [string, string];
    isRapid: boolean;
}

const defaultChongqingRTTextLineBadge2021Attributes: ChongqingRTTextLineBadge2021Attributes = {
    names: ['空港线', 'Konggang Line'],
    color: [CityCode.Chongqing, 'cq3', '#003da5', MonoColour.white],
    isRapid: false,
};

const ChongqingRTNumLineBadge2021AttrsComponent = (props: AttrsProps<ChongqingRTTextLineBadge2021Attributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.nameZh'),
            value: attrs.names[0],
            onChange: (val: string | number) => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.nodes.common.nameEn'),
            value: attrs.names.at(1) ?? defaultChongqingRTTextLineBadge2021Attributes.names[1],
            onChange: (val: string | number) => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ChongqingRTTextLineBadge2021}
                    defaultTheme={defaultChongqingRTTextLineBadge2021Attributes.color}
                />
            ),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.chongqingRTTextLineBadge2021.isRapid'),
            isChecked: (attrs ?? defaultChongqingRTTextLineBadge2021Attributes).isRapid,
            onChange: (val: boolean) => {
                attrs.isRapid = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTTextLineBadge2021Icon = (
    <svg viewBox="0 0 21 21" height={40} width={40} focusable={false} style={{ padding: 3 }}>
        <rect fill="currentColor" x="0" width="21" height="21" rx="3" ry="3" />
        <rect strokeWidth="1.5" stroke="white" fill="none" x="1.5" y="1.5" width="18" height="18" rx="2" ry="2" />
        <text
            {...getLangStyle(TextLanguage.zh)}
            textAnchor="middle"
            x="10.5"
            y="11"
            fill="white"
            fontSize="5"
            letterSpacing="0"
        >
            空港线
        </text>
        <text
            {...getLangStyle(TextLanguage.en)}
            textAnchor="middle"
            x="10.5"
            y="13.75"
            fill="white"
            fontSize="2"
            letterSpacing="0"
        >
            Konggang Line
        </text>
    </svg>
);

const chongqingRTTextLineBadge2021: Node<ChongqingRTTextLineBadge2021Attributes> = {
    component: ChongqingRTTextLineBadge2021,
    icon: chongqingRTTextLineBadge2021Icon,
    defaultAttrs: defaultChongqingRTTextLineBadge2021Attributes,
    attrsComponent: ChongqingRTNumLineBadge2021AttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRTTextLineBadge2021.displayName',
        tags: [],
    },
};

export default chongqingRTTextLineBadge2021;
