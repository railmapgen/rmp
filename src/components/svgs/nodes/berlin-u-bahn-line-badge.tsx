import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const BerlinUBahnLineBadge = (props: NodeComponentProps<BerlinUBahnLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinUBahnLineBadgeAttributes.num, color = defaultBerlinUBahnLineBadgeAttributes.color } =
        attrs ?? defaultBerlinUBahnLineBadgeAttributes;

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
            <rect fill={color[2]} x="0" width="25" height="15" />
            <text
                {...getLangStyle(TextLanguage.berlin)}
                textAnchor="middle"
                x="12.5"
                y="12.5"
                fill={fgColor}
                fontSize="14"
                letterSpacing="1"
            >
                U{num}
            </text>
        </g>
    );
};

/**
 * BerlinUBahnLineBadge specific props.
 */
export interface BerlinUBahnLineBadgeAttributes extends ColorAttribute {
    num: number;
}

const defaultBerlinUBahnLineBadgeAttributes: BerlinUBahnLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bu1', '#62AD2D', MonoColour.white],
};

const BerlinUBahnLineBadgeAttrsComponent = (props: AttrsProps<BerlinUBahnLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultBerlinUBahnLineBadgeAttributes.num).toString(),
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
                    type={MiscNodeType.BerlinUBahnLineBadge}
                    defaultTheme={defaultBerlinUBahnLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const berlinUBahnLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" />
        <text x="4" y="17" fill="white" fontSize="14">
            U1
        </text>
    </svg>
);

const berlinUBahnLineBadge: Node<BerlinUBahnLineBadgeAttributes> = {
    component: BerlinUBahnLineBadge,
    icon: berlinUBahnLineBadgeIcon,
    defaultAttrs: defaultBerlinUBahnLineBadgeAttributes,
    attrsComponent: BerlinUBahnLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.berlinUBahnLineBadge.displayName',
        tags: [],
    },
};

export default berlinUBahnLineBadge;
