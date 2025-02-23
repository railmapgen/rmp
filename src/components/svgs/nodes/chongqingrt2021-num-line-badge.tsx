import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

const ChongqingRT2021NumLineBadge = (props: NodeComponentProps<ChongqingRT2021NumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultChongqingRT2021NumLineBadgeAttributes.num,
        color = defaultChongqingRT2021NumLineBadgeAttributes.color,
    } = attrs ?? defaultChongqingRT2021NumLineBadgeAttributes;

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
    const fontSize = !Number.isInteger(num) ? 15 : 16;
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
 * ChongqingRT2021NumLineBadge specific props.
 */
export interface ChongqingRT2021NumLineBadgeAttributes extends AttributesWithColor {
    num: number | string;
}

const defaultChongqingRT2021NumLineBadgeAttributes: ChongqingRT2021NumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
};

const ChongqingRT2021NumLineBadgeAttrsComponent = (props: AttrsProps<ChongqingRT2021NumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs ?? defaultChongqingRT2021NumLineBadgeAttributes).num as string,
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
                    type={MiscNodeType.ChongqingRT2021NumLineBadge}
                    defaultTheme={defaultChongqingRT2021NumLineBadgeAttributes.color}
                />
            ),
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRT2021NumLineBadgeIcon = (
    <svg viewBox="0 0 21 21" height={40} width={40} focusable={false} style={{ padding: 3 }}>
        <rect fill="currentColor" x="0" width="21" height="21" rx="3" ry="3" />
        <rect strokeWidth="1.5" stroke="white" fill="none" x="1.5" y="1.5" width="18" height="18" rx="2" ry="2" />
        <text textAnchor="left" x="7.5" y="9.5" fill="white" fontSize="15" dominantBaseline="central">
            1
        </text>
    </svg>
);

const chongqingRT2021NumLineBadge: Node<ChongqingRT2021NumLineBadgeAttributes> = {
    component: ChongqingRT2021NumLineBadge,
    icon: chongqingRT2021NumLineBadgeIcon,
    defaultAttrs: defaultChongqingRT2021NumLineBadgeAttributes,
    attrsComponent: ChongqingRT2021NumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.chongqingRT2021NumLineBadge.displayName',
        tags: [],
    },
};

export default chongqingRT2021NumLineBadge;
