import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const ShmetroTextLineBadge = (props: NodeComponentProps<ShmetroTextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { names = defaultShmetroTextLineBadgeAttributes.names, color = defaultShmetroTextLineBadgeAttributes.color } =
        attrs ?? defaultShmetroTextLineBadgeAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 12 } as DOMRect);
    React.useEffect(() => setBBox(textLineEl.current!.getBBox()), [...names, setBBox, textLineEl]);

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
            <rect fill={color[2]} x="0" width={bBox.width + 7} height="21" />
            <g ref={textLineEl}>
                <text
                    {...getLangStyle(TextLanguage.zh)}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    x={(bBox.width + 7) / 2}
                    y="3"
                    fontSize="10"
                    fill={color[3]}
                    letterSpacing="-0.25"
                >
                    {names[0]}
                </text>
                <text
                    {...getLangStyle(TextLanguage.en)}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    x={(bBox.width + 7) / 2}
                    y="14"
                    fontSize="5"
                    fill={color[3]}
                    letterSpacing="-0.25"
                >
                    {names[1]}
                </text>
            </g>
        </g>
    );
};

/**
 * ShmetroTextLineBadge specific props.
 */
export interface ShmetroTextLineBadgeAttributes extends ColorAttribute {
    names: [string, string];
}

const defaultShmetroTextLineBadgeAttributes: ShmetroTextLineBadgeAttributes = {
    names: ['浦江线', 'Pujiang Line'],
    color: [CityCode.Shanghai, 'pjl', '#B5B5B6', MonoColour.white],
};

const SHMetroTextLineBadgeAttrsComponent = (props: AttrsProps<ShmetroTextLineBadgeAttributes>) => {
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
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.ShmetroTextLineBadge}
                    defaultTheme={defaultShmetroTextLineBadgeAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const shmetroTextLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" width="20" height="12" />
        <text x="5" y="11" fontSize="5" fill="white">
            浦江线
        </text>
        <text x="3" y="16" fontSize="4" fill="white">
            Pujiang Line
        </text>
    </svg>
);

const shmetroTextLineBadge: Node<ShmetroTextLineBadgeAttributes> = {
    component: ShmetroTextLineBadge,
    icon: shmetroTextLineBadgeIcon,
    defaultAttrs: defaultShmetroTextLineBadgeAttributes,
    attrsComponent: SHMetroTextLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.shmetroTextLineBadge.displayName',
        tags: [],
    },
};

export default shmetroTextLineBadge;
