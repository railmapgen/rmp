import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const SuzhouRTNumLineBadge = (props: NodeComponentProps<SuzhouRTNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        num = defaultSuzhouRTNumLineBadgeAttributes.num,
        branch = defaultSuzhouRTNumLineBadgeAttributes.branch,
        color = defaultSuzhouRTNumLineBadgeAttributes.color,
    } = attrs ?? defaultSuzhouRTNumLineBadgeAttributes;

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
            transform={`translate(${x}, ${y})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} width="20" height="20" rx="2" ry="2" />
            <text
                {...getLangStyle(TextLanguage.zh)}
                textAnchor="middle"
                dominantBaseline="middle"
                x="10"
                y="11.4" // TODO: why? even both textAnchor and dominantBaseline are set to middle
                fill={color[3]}
                fontSize="15"
                letterSpacing="-1"
            >
                {num}
            </text>
            {branch && (
                <>
                    <text {...getLangStyle(TextLanguage.zh)} x={20 + 2.5} y="10" fontSize="10">
                        支线
                    </text>
                    <text {...getLangStyle(TextLanguage.en)} x={20 + 2.5} y="18" fontSize="5" fill="gray">
                        Branch line
                    </text>
                </>
            )}
        </g>
    );
};

/**
 * SuzhouRTNumLineBadge specific props.
 */
export interface SuzhouRTNumLineBadgeAttributes extends ColorAttribute {
    num: number;
    branch: boolean;
}

const defaultSuzhouRTNumLineBadgeAttributes: SuzhouRTNumLineBadgeAttributes = {
    num: 1,
    branch: false,
    color: [CityCode.Suzhou, 'sz1', '#78BA25', MonoColour.white],
};

const SuzhouRTNumLineBadgeAttrsComponent = (props: AttrsProps<SuzhouRTNumLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.common.num'),
            value: (attrs.num ?? defaultSuzhouRTNumLineBadgeAttributes.num).toString(),
            validator: (val: string) => !Number.isNaN(val),
            onChange: val => {
                attrs.num = Number(val);
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.suzhouRTNumLineBadge.branch'),
            isChecked: attrs?.branch ?? defaultSuzhouRTNumLineBadgeAttributes.branch,
            onChange: val => {
                attrs.branch = val;
                handleAttrsUpdate(id, attrs);
            },
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.SuzhouRTNumLineBadge}
                    defaultTheme={defaultSuzhouRTNumLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const suzhouRTNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="4" y="4" width="16" height="16" rx="3" ry="3" />
        <text x="12" y="13.4" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14">
            1
        </text>
    </svg>
);

const suzhouRTNumLineBadge: Node<SuzhouRTNumLineBadgeAttributes> = {
    component: SuzhouRTNumLineBadge,
    icon: suzhouRTNumLineBadgeIcon,
    defaultAttrs: defaultSuzhouRTNumLineBadgeAttributes,
    attrsComponent: SuzhouRTNumLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.suzhouRTNumLineBadge.displayName',
        tags: [],
    },
};

export default suzhouRTNumLineBadge;
