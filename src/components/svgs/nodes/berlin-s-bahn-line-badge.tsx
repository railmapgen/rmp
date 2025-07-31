import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const BerlinUBahnLineBadge = (props: NodeComponentProps<BerlinSBahnLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBerlinSBahnLineBadgeAttributes.num, color = defaultBerlinSBahnLineBadgeAttributes.color } =
        attrs ?? defaultBerlinSBahnLineBadgeAttributes;

    const [sX, numX] = num >= 10 ? [6, 19.75] : [10, 20];

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
            <rect fill={color[2]} x="0" width="30" height="15" rx="8" />
            <text
                {...getLangStyle(TextLanguage.berlin)}
                textAnchor="middle"
                x={sX}
                y="12.5"
                fill={fgColor}
                fontSize="14"
                letterSpacing="0"
            >
                S
            </text>
            <text
                {...getLangStyle(TextLanguage.berlin)}
                textAnchor="middle"
                x={numX}
                y="12.5"
                fill={fgColor}
                fontSize="14"
                letterSpacing="-0.2"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * BerlinSBahnLineBadge specific props.
 */
export interface BerlinSBahnLineBadgeAttributes extends ColorAttribute {
    num: number;
}

const defaultBerlinSBahnLineBadgeAttributes: BerlinSBahnLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Berlin, 'bs1', '#DD6CA6', MonoColour.white],
};

const BerlinSBahnLineBadgeAttrsComponent = (props: AttrsProps<BerlinSBahnLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultBerlinSBahnLineBadgeAttributes.num).toString(),
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
                    type={MiscNodeType.BerlinSBahnLineBadge}
                    defaultTheme={defaultBerlinSBahnLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const berlinSBahnLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="8" />
        <text x="4.5" y="16.5" fill="white" fontSize="14">
            S1
        </text>
    </svg>
);

const berlinSBahnLineBadge: Node<BerlinSBahnLineBadgeAttributes> = {
    component: BerlinUBahnLineBadge,
    icon: berlinSBahnLineBadgeIcon,
    defaultAttrs: defaultBerlinSBahnLineBadgeAttributes,
    attrsComponent: BerlinSBahnLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.berlinSBahnLineBadge.displayName',
        tags: [],
    },
};

export default berlinSBahnLineBadge;
