import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { getLangStyle, TextLanguage } from '../../../util/fonts';

const TaipeiMetroLineBadge = (props: NodeComponentProps<TaipeiMetroLineBadgeAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        code = defaultTaipeiMetroLineBadgeAttributes.code,
        color = defaultTaipeiMetroLineBadgeAttributes.color,
        // Missing sizes belong to older saves, whose badges were 16 units high.
        size = 16,
    } = attrs ?? defaultTaipeiMetroLineBadgeAttributes;

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

    const width = (code.length <= 2 ? 10 : 5.5 * code.length) + 6;

    return (
        <g
            transform={`scale(${size / 16})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x={-width / 2} y="-8" width={width} height="16" rx="2.5" ry="2.5" />
            <g>
                <text
                    {...getLangStyle(TextLanguage.en)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fill={color[3]}
                >
                    {code}
                </text>
            </g>
        </g>
    );
};

/**
 * TaipeiMetroLineBadge specific props.
 */
export interface TaipeiMetroLineBadgeAttributes extends ColorAttribute {
    code: string;
    size?: number;
}

const defaultTaipeiMetroLineBadgeAttributes: TaipeiMetroLineBadgeAttributes = {
    code: 'BR',
    size: 13.2,
    color: [CityCode.Taipei, 'br', '#C48C31', MonoColour.white],
};

const TaipeiMetroTextLineBadgeAttrsComponent = (props: AttrsProps<TaipeiMetroLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: attrs.code,
            onChange: val => {
                attrs.code = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.taipeiMetroLineBadge.size'),
            variant: 'number',
            value: String(attrs.size ?? 16),
            validator: val => Number.isFinite(Number(val)) && Number(val) > 0,
            onChange: val => {
                if (!val.trim()) return;
                const size = Number(val);
                if (Number.isFinite(size) && size > 0) {
                    handleAttrsUpdate(id, { ...attrs, size });
                }
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.TaiPeiMetroLineBadege}
                    defaultTheme={defaultTaipeiMetroLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const taipeiMetroLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="6" y="6" width="12" height="12" rx="2" ry="2" />
        <text
            x="12"
            y="12"
            fontSize="6"
            fill="var(--chakra-colors-chakra-body-bg)"
            textAnchor="middle"
            dominantBaseline="central"
        >
            BR
        </text>
    </svg>
);

const taipeiMetroLineBadge: Node<TaipeiMetroLineBadgeAttributes> = {
    component: TaipeiMetroLineBadge,
    icon: taipeiMetroLineBadgeIcon,
    defaultAttrs: defaultTaipeiMetroLineBadgeAttributes,
    attrsComponent: TaipeiMetroTextLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.taipeiMetroLineBadge.displayName',
        tags: [],
    },
};

export default taipeiMetroLineBadge;
