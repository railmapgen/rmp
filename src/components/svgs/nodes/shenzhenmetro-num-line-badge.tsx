import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const NUM_WIDTH = 11.84375;

const ShenzhenMetroNumLineBadge = (props: NodeComponentProps<ShenzhenMetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultShenzhenMetroNumLineBadgeAttributes.num,
        color = defaultShenzhenMetroNumLineBadgeAttributes.color,
        isBranch = defaultShenzhenMetroNumLineBadgeAttributes.isBranch,
    } = attrs ?? defaultShenzhenMetroNumLineBadgeAttributes;

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
    const chX = isBranch ? 10 : NUM_WIDTH + (num > 9 ? 6.5 : 3);
    const chLetSp = isBranch ? -1 : 0;
    const enX = isBranch ? 11 : NUM_WIDTH + (num > 9 ? 7 : 3.5);
    const numX = isBranch ? 6 : NUM_WIDTH / 2 + 4;

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
                x={numX}
                y="13.5"
                fill={fgColor}
                fontSize="15"
                letterSpacing="-1"
            >
                {num}
            </text>
            <text
                {...getLangStyle(TextLanguage.zh)}
                x={chX}
                y="9.5"
                fontSize="6"
                fill={fgColor}
                letterSpacing={chLetSp}
            >
                号线{isBranch ? '支线' : ''}
            </text>
            <text {...getLangStyle(TextLanguage.en)} x={enX} y="13.5" fontSize="3" fill={fgColor}>
                {isBranch ? 'Branch' : ''} Line {num}
            </text>
        </g>
    );
};

/**
 * ShenzhenMetroNumLineBadge specific props.
 */
export interface ShenzhenMetroNumLineBadgeAttributes extends ColorAttribute {
    num: number;
    isBranch: boolean;
}

const defaultShenzhenMetroNumLineBadgeAttributes: ShenzhenMetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Shenzhen, 'sz1', '#00b140', MonoColour.white],
    isBranch: false,
};

const shenzhenMetroNumLineBadgeAttrsComponent = (props: AttrsProps<ShenzhenMetroNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: String(attrs.num),
            validator: (val: string) => !Number.isNaN(val),
            onChange: (val: string | number) => {
                attrs.num = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ShenzhenMetroNumLineBadge}
                    defaultTheme={defaultShenzhenMetroNumLineBadgeAttributes.color}
                />
            ),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.shenzhenMetroNumLineBadge.branch'),
            oneLine: true,
            isChecked: attrs.isBranch,
            onChange: (val: boolean) => {
                attrs.isBranch = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const shenzhenMetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="20" height="16" rx="2" />
        <text x="4" y="17" fill="white" fontSize="14">
            1
        </text>
        <text x="11" y="14" fill="white" fontSize="5">
            号线
        </text>
        <text x="12" y="17" fill="white" fontSize="3">
            Line 1
        </text>
    </svg>
);

const shenzhenMetroNumLineBadge: Node<ShenzhenMetroNumLineBadgeAttributes> = {
    component: ShenzhenMetroNumLineBadge,
    icon: shenzhenMetroNumLineBadgeIcon,
    defaultAttrs: defaultShenzhenMetroNumLineBadgeAttributes,
    attrsComponent: shenzhenMetroNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.shenzhenMetroNumLineBadge.displayName',
        tags: [],
    },
};

export default shenzhenMetroNumLineBadge;
