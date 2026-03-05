import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute } from '../../panels/details/color-field';

const GuangdongIntercityRailwayLineBadge = (
    props: NodeComponentProps<GuangdongIntercityRailwayLineBadgeAttributes>
) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultGuangdongIntercityRailwayLineBadgeAttributes.names,
        color = defaultGuangdongIntercityRailwayLineBadgeAttributes.color,
    } = attrs ?? defaultGuangdongIntercityRailwayLineBadgeAttributes;

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

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect rx="2" ry="2" fill={color[2]} x="0" width={bBox.width + 7} height="21" />
            <g ref={textLineEl}>
                <text
                    {...getLangStyle(TextLanguage.zh)}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    x={(bBox.width + 7) / 2}
                    y="3"
                    fontSize="8.63"
                    fill={color[3]}
                >
                    {names[0]}
                </text>
                <text
                    {...getLangStyle(TextLanguage.en)}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    x={(bBox.width + 7) / 2}
                    y="14"
                    fontSize="3.54"
                    fill={color[3]}
                >
                    {names[1]}
                </text>
            </g>
        </g>
    );
};

/**
 * GuangdongIntercityRailwayLineBadge specific props.
 */
export interface GuangdongIntercityRailwayLineBadgeAttributes extends ColorAttribute {
    names: [string, string];
}

const defaultGuangdongIntercityRailwayLineBadgeAttributes: GuangdongIntercityRailwayLineBadgeAttributes = {
    names: ['广清城际', 'Guangzhou-Qingyuan Intercity'],
    color: [CityCode.Guangzhou, 'ir', '#2559a8', MonoColour.white],
};

const guangdongIntercityRailwayLineBadgeAttrsComponent = (
    props: AttrsProps<GuangdongIntercityRailwayLineBadgeAttributes>
) => {
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
            value: attrs.names.at(1) ?? defaultGuangdongIntercityRailwayLineBadgeAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const guangdongIntercityRailwayLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" width="20" height="12" />
        <text x="4.5" y="11" fontSize="4" fill="white">
            广清城际
        </text>
        <text x="3" y="16" fontSize="2" fill="white">
            Guangzhou-Qingyuan Intercity
        </text>
    </svg>
);

const guangdongIntercityRailwayLineBadge: Node<GuangdongIntercityRailwayLineBadgeAttributes> = {
    component: GuangdongIntercityRailwayLineBadge,
    icon: guangdongIntercityRailwayLineBadgeIcon,
    defaultAttrs: defaultGuangdongIntercityRailwayLineBadgeAttributes,
    attrsComponent: guangdongIntercityRailwayLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.guangdongIntercityRailwayLineBadge.displayName',
        tags: [],
    },
};

export default guangdongIntercityRailwayLineBadge;
