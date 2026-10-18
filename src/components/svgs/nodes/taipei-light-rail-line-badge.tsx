import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const BADGE_SIZE = 8.3;

const TaipeiLightRailLineBadge = (props: NodeComponentProps<TaipeiLightRailLineBadgeAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { code = defaultAttrs.code, color = defaultAttrs.color } = attrs ?? defaultAttrs;
    const width = Math.max(BADGE_SIZE, code.length * 2.85 + 2.2);

    return (
        <g
            onPointerDown={e => handlePointerDown(id, e)}
            onPointerMove={e => handlePointerMove(id, e)}
            onPointerUp={e => handlePointerUp(id, e)}
            style={{ cursor: 'move' }}
        >
            <rect x={-width / 2} y={-BADGE_SIZE / 2} width={width} height={BADGE_SIZE} rx="1.7" fill={color[2]} />
            <text
                {...getLangStyle(TextLanguage.en)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="5.7"
                fill={color[3]}
            >
                {code}
            </text>
        </g>
    );
};

export interface TaipeiLightRailLineBadgeAttributes extends ColorAttribute {
    code: string;
}

const defaultAttrs: TaipeiLightRailLineBadgeAttributes = {
    code: 'V',
    color: [CityCode.Taipei, 'v', '#DC534D', MonoColour.white],
};

const AttrsComponent = ({ id, attrs, handleAttrsUpdate }: AttrsProps<TaipeiLightRailLineBadgeAttributes>) => {
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: attrs.code,
            onChange: code => handleAttrsUpdate(id, { ...attrs, code }),
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.TaipeiLightRailLineBadge} defaultTheme={defaultAttrs.color} />,
        },
    ];
    return <RmgFields fields={fields} />;
};

const taipeiLightRailLineBadge: Node<TaipeiLightRailLineBadgeAttributes> = {
    component: TaipeiLightRailLineBadge,
    defaultAttrs,
    attrsComponent: AttrsComponent,
    icon: (
        <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
            <text
                x="12"
                y="12"
                fontSize="8"
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--chakra-colors-chakra-body-bg)"
            >
                V
            </text>
        </svg>
    ),
    metadata: { displayName: 'panel.details.nodes.taipeiLightRailLineBadge.displayName', tags: [] },
};

export default taipeiLightRailLineBadge;
