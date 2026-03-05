import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const QingdaoMetroNumLineBadge = (props: NodeComponentProps<QingdaoMetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultQingdaoMetroNumLineBadgeAttributes.num,
        numEn = defaultQingdaoMetroNumLineBadgeAttributes.numEn,
        color = defaultQingdaoMetroNumLineBadgeAttributes.color,
        showText = defaultQingdaoMetroNumLineBadgeAttributes.showText,
    } = attrs ?? defaultQingdaoMetroNumLineBadgeAttributes;

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
    const [letterSpacing, sX, sY, fontSize] = Number(num) >= 10 ? [-2.4, 0, 10.25, 20] : [0, 4, 10, 22];

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} x="0" width="20" height="20" rx="2" ry="2" />
            <text
                {...getLangStyle(TextLanguage.en)}
                textAnchor="start"
                x={sX}
                y={sY}
                fill={fgColor}
                fontSize={fontSize}
                fontWeight="bold"
                letterSpacing={letterSpacing}
                dominantBaseline="central"
            >
                {num}
            </text>
            {showText && (
                <>
                    <text {...getLangStyle(TextLanguage.zh)} x="22" y="10.5" fontSize="13">
                        号线
                    </text>
                    <text {...getLangStyle(TextLanguage.en)} x="22.5" y="19.5" fontSize="8">
                        Line {numEn}
                    </text>
                </>
            )}
        </g>
    );
};

/**
 * Qingdao Metro Num Line Badge specific props.
 */
export interface QingdaoMetroNumLineBadgeAttributes extends ColorAttribute {
    num: number;
    numEn: string;
    showText: boolean;
}

const defaultQingdaoMetroNumLineBadgeAttributes: QingdaoMetroNumLineBadgeAttributes = {
    num: 1,
    numEn: '1',
    showText: true,
    color: [CityCode.Qingdao, 'qd1', '#f7b000', MonoColour.white],
};

const attrsComponent = (props: AttrsProps<QingdaoMetroNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const field: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: attrs.num.toString(),
            onChange: value => {
                attrs.num = Number(value);
                attrs.numEn = value;
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'input',
            label: t('panel.details.nodes.qingdaoMetroNumLineBadge.numEn'),
            value: attrs.numEn.toString(),
            onChange: value => {
                attrs.numEn = value;
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.qingdaoMetroNumLineBadge.showText'),
            isChecked: attrs.showText,
            oneLine: true,
            onChange: value => {
                attrs.showText = value;
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.QingdaoMetroNumLineBadge}
                    defaultTheme={defaultQingdaoMetroNumLineBadgeAttributes.color}
                />
            ),
        },
    ];
    return <RmgFields fields={field} minW="full" />;
};

const qingdaoMetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" rx="1" ry="1" width="10" height="10" />
        <text x="4" y="15" fill="white" fontSize="12">
            1
        </text>
        <text x="12" y="11.5" fill="black" fontSize="6">
            号线
        </text>
        <text x="12" y="15.5" fill="black" fontSize="4">
            Line1
        </text>
    </svg>
);

const qingdaoMetroNumLineBadge: Node<QingdaoMetroNumLineBadgeAttributes> = {
    component: QingdaoMetroNumLineBadge,
    icon: qingdaoMetroNumLineBadgeIcon,
    defaultAttrs: defaultQingdaoMetroNumLineBadgeAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.qingdaoMetroNumLineBadge.displayName',
        tags: [],
    },
};

export default qingdaoMetroNumLineBadge;
