import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const ChongqingRTNumLineBadge2021 = (props: NodeComponentProps<ChongqingRTNumLineBadge2021Attributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultChongqingRTNumLineBadge2021Attributes.num,
        color = defaultChongqingRTNumLineBadge2021Attributes.color,
    } = attrs ?? defaultChongqingRTNumLineBadge2021Attributes;

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
    const fontSize = !Number.isInteger(num) ? 15 : Number(num) >= 10 ? 15 : 16;
    const [letterSpacing, sX] = Number.isInteger(num) ? (Number(num) >= 10 ? [-1.2, 1.5] : [0, 5.5]) : [0, 2.55];

    return (
        <g
            id={id}
            transform={`translate(${x - 10.5}, ${y - 10.5})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width="21" height="21" rx="3" ry="3" />
            <rect strokeWidth="1.5" stroke="white" fill="none" x="1.5" y="1.5" width="18" height="18" rx="2" ry="2" />
            <text
                className="rmp-name__zh"
                textAnchor="left"
                x={sX + 0.5}
                y="10.5"
                fill={fgColor}
                fontSize={fontSize}
                letterSpacing={letterSpacing}
                dominantBaseline="central"
            >
                {num}
            </text>
        </g>
    );
};

/**
 * ChongqingRTNumLineBadge2021 specific props.
 */
export interface ChongqingRTNumLineBadge2021Attributes extends AttributesWithColor {
    num: number | string;
}

const defaultChongqingRTNumLineBadge2021Attributes: ChongqingRTNumLineBadge2021Attributes = {
    num: 1,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
};

const ChongqingRTNumLineBadge2021AttrsComponent = (props: AttrsProps<ChongqingRTNumLineBadge2021Attributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs ?? defaultChongqingRTNumLineBadge2021Attributes).num as string,
            validator: (val: string) => !Number.isNaN(val),
            onChange: (val: string | number) => {
                if (Number.isNaN(Number(val))) {
                    attrs.num = val;
                } else {
                    attrs.num = Number(val);
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
                    type={MiscNodeType.ChongqingRTNumLineBadge2021}
                    defaultTheme={defaultChongqingRTNumLineBadge2021Attributes.color}
                />
            ),
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTNumLineBadge2021Icon = (
    <svg viewBox="0 0 21 21" height={40} width={40} focusable={false} style={{ padding: 3 }}>
        <rect fill="currentColor" x="0" width="21" height="21" rx="3" ry="3" />
        <rect strokeWidth="1.5" stroke="white" fill="none" x="1.5" y="1.5" width="18" height="18" rx="2" ry="2" />
        <text textAnchor="left" x="7.5" y="9.5" fill="white" fontSize="15" dominantBaseline="central">
            1
        </text>
    </svg>
);

const chongqingRTNumLineBadge2021: Node<ChongqingRTNumLineBadge2021Attributes> = {
    component: ChongqingRTNumLineBadge2021,
    icon: chongqingRTNumLineBadge2021Icon,
    defaultAttrs: defaultChongqingRTNumLineBadge2021Attributes,
    attrsComponent: ChongqingRTNumLineBadge2021AttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRTNumLineBadge2021.displayName',
        tags: [],
    },
};

export default chongqingRTNumLineBadge2021;
