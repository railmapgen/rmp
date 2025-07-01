import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const MIN_WIDTH = 28.84375;

const BjsubwayTextLineBadge = (props: NodeComponentProps<BjsubwayTextLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultBjsubwayTextLineBadgeAttributes.names,
        color = defaultBjsubwayTextLineBadgeAttributes.color,
    } = attrs ?? defaultBjsubwayTextLineBadgeAttributes;

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

    const width = Math.max(MIN_WIDTH, bBox.width);
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
            <rect fill={color[2]} x="0" width={width + 4} height="16" rx="2" />
            <g ref={textLineEl}>
                <text
                    {...getLangStyle(TextLanguage.zh)}
                    textAnchor="middle"
                    x={(width + 4) / 2}
                    y="8"
                    fontSize="7"
                    fill={fgColor}
                >
                    {names[0]}
                </text>
                <text
                    {...getLangStyle(TextLanguage.en)}
                    textAnchor="middle"
                    x={(width + 4) / 2}
                    y="13.5"
                    fontSize="4"
                    fill={fgColor}
                >
                    {names[1]}
                </text>
            </g>
        </g>
    );
};

/**
 * BjsubwayTextLineBadge specific props.
 */
export interface BjsubwayTextLineBadgeAttributes extends ColorAttribute {
    names: [string, string];
}

const defaultBjsubwayTextLineBadgeAttributes: BjsubwayTextLineBadgeAttributes = {
    names: ['八通线', 'Batong Line'],
    color: [CityCode.Beijing, 'bj1', '#c23a30', MonoColour.white],
};

const BJSubwayTextLineBadgeAttrsComponent = (props: AttrsProps<BjsubwayTextLineBadgeAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultBjsubwayTextLineBadgeAttributes.names[1],
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
                    type={MiscNodeType.BjsubwayTextLineBadge}
                    defaultTheme={defaultBjsubwayTextLineBadgeAttributes.color}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const bjSubwayTextLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="6" width="20" height="12" rx="2" />
        <text x="3" y="12" fontSize="6" fill="white">
            八通线
        </text>
        <text x="3" y="16" fontSize="3.2" fill="white">
            Batong Line
        </text>
    </svg>
);

const bjsubwayTextLineBadge: Node<BjsubwayTextLineBadgeAttributes> = {
    component: BjsubwayTextLineBadge,
    icon: bjSubwayTextLineBadgeIcon,
    defaultAttrs: defaultBjsubwayTextLineBadgeAttributes,
    attrsComponent: BJSubwayTextLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.bjsubwayTextLineBadge.displayName',
        tags: [],
    },
};

export default bjsubwayTextLineBadge;
