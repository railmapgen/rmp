import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const NUM_WIDTH = 11.84375;

const BjsubwayNumLineBadge = (props: NodeComponentProps<BjsubwayNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultBjsubwayNumLineBadgeAttributes.num, color = defaultBjsubwayNumLineBadgeAttributes.color } =
        attrs ?? defaultBjsubwayNumLineBadgeAttributes;

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

    const fgColor = color[3] === MonoColour.black ? '#003670' : MonoColour.white;

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width={NUM_WIDTH + 21} height="16" rx="2" />
            <text
                {...getLangStyle(TextLanguage.en)}
                textAnchor="middle"
                x={NUM_WIDTH / 2 + 2}
                y="13.5"
                fill={fgColor}
                fontSize="15"
                letterSpacing="-1.5"
            >
                {num}
            </text>
            <text
                x={NUM_WIDTH + (num > 9 ? 5.5 : 3)}
                y="8.5"
                fontSize="7"
                fill={fgColor}
                {...getLangStyle(TextLanguage.zh)}
            >
                号线
            </text>
            <text
                {...getLangStyle(TextLanguage.en)}
                x={NUM_WIDTH + (num > 9 ? 6 : 4.5)}
                y="13.5"
                fontSize="4"
                fill={fgColor}
            >
                Line {num}
            </text>
        </g>
    );
};

/**
 * BjsubwayNumLineBadge specific props.
 */
export interface BjsubwayNumLineBadgeAttributes extends ColorAttribute {
    num: number;
}

const defaultBjsubwayNumLineBadgeAttributes: BjsubwayNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const BJSubwayNumLineBadgeAttrsComponent = (props: AttrsProps<BjsubwayNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultBjsubwayNumLineBadgeAttributes.num).toString(),
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
                    type={MiscNodeType.BjsubwayNumLineBadge}
                    defaultTheme={defaultBjsubwayNumLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjSubwayNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="2" />
        <text x="4" y="17" fill="white" fontSize="14">
            1
        </text>
        <text x="11" y="11" fill="white" fontSize="5">
            号线
        </text>
        <text x="11" y="17" fill="white" fontSize="4">
            Line 1
        </text>
    </svg>
);

const bjsubwayNumLineBadge: Node<BjsubwayNumLineBadgeAttributes> = {
    component: BjsubwayNumLineBadge,
    icon: bjSubwayNumLineBadgeIcon,
    defaultAttrs: defaultBjsubwayNumLineBadgeAttributes,
    attrsComponent: BJSubwayNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.bjsubwayNumLineBadge.displayName',
        tags: [],
    },
};

export default bjsubwayNumLineBadge;
