import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LineIcon } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const GzmtrLineBadge = (props: NodeComponentProps<GzmtrLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultGzmtrLineBadgeAttributes.names,
        color = defaultGzmtrLineBadgeAttributes.color,
        tram = defaultGzmtrLineBadgeAttributes.tram,
    } = attrs ?? defaultGzmtrLineBadgeAttributes;

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
            transform={`translate(${x}, ${y})scale(${tram ? 0.5 : 1})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <LineIcon
                zhName={names.at(0) ?? ''}
                enName={names.at(1) ?? ''}
                foregroundColour={color[3]}
                backgroundColour={color[2]}
                spanDigits
            />
        </g>
    );
};

/**
 * GzmtrLineBadge specific props.
 */
export interface GzmtrLineBadgeAttributes extends AttributesWithColor {
    names: [string, string];
    tram: boolean;
}

const defaultGzmtrLineBadgeAttributes: GzmtrLineBadgeAttributes = {
    names: ['1号线', 'Line 1'],
    color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black],
    tram: false,
};

const gzmtrLineBadgeAttrsComponents = (props: AttrsProps<GzmtrLineBadgeAttributes>) => {
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
            value: attrs.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.gzmtrLineBadge.tram'),
            oneLine: true,
            isChecked: attrs.tram,
            onChange: val => {
                attrs.tram = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={MiscNodeType.GzmtrLineBadge} defaultTheme={defaultGzmtrLineBadgeAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const gzmtrLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="5" width="20" height="14" rx="1" />
        <text x="6" y="15" textAnchor="middle" fontSize="10" fill="white">
            1
        </text>
        <text x="15" y="12" textAnchor="middle" fontSize="6" fill="white">
            号线
        </text>
        <text x="14.5" y="17" textAnchor="middle" fontSize="4" fill="white">
            Line 1
        </text>
    </svg>
);

const gzmtrLineBadge: Node<GzmtrLineBadgeAttributes> = {
    component: GzmtrLineBadge,
    icon: gzmtrLineBadgeIcon,
    defaultAttrs: defaultGzmtrLineBadgeAttributes,
    attrsComponent: gzmtrLineBadgeAttrsComponents,
    metadata: {
        displayName: 'panel.details.nodes.gzmtrLineBadge.displayName',
        tags: [],
    },
};

export default gzmtrLineBadge;
