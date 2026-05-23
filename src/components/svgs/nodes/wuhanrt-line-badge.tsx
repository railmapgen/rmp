import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const BADGE_HEIGHT = 12;
const BADGE_MIN_WIDTH = 20;
const BADGE_PADDING_X = 2.5;
const BADGE_RADIUS = 2;
const BADGE_FONT_SIZE = 8.5;
const BADGE_TEXT_Y = 6;
const NUM_LINE_RE = /^(\d+)(?:号线)?$/;

const getDisplayText = (content: string) => {
    const trimmed = content.trim();
    const numMatch = trimmed.match(NUM_LINE_RE);

    return numMatch ? `${numMatch[1]}号线` : trimmed;
};

const WuhanRTLineBadge = (props: NodeComponentProps<WuhanRTLineBadgeAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { content = defaultWuhanRTLineBadgeAttributes.content, color = defaultWuhanRTLineBadgeAttributes.color } =
        attrs ?? defaultWuhanRTLineBadgeAttributes;

    const textEl = React.useRef<SVGTextElement | null>(null);
    const displayText = getDisplayText(content);
    const [textWidth, setTextWidth] = React.useState(0);
    React.useEffect(() => setTextWidth(textEl.current?.getBBox().width ?? 0), [displayText]);

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

    const width = Math.max(BADGE_MIN_WIDTH, textWidth + BADGE_PADDING_X * 2);

    return (
        <g
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect fill={color[2]} width={width} height={BADGE_HEIGHT} rx={BADGE_RADIUS} ry={BADGE_RADIUS} />
            <text
                ref={textEl}
                {...getLangStyle(TextLanguage.zh)}
                textAnchor="middle"
                x={width / 2}
                y={BADGE_TEXT_Y}
                letterSpacing="-0.5"
                fill={MonoColour.white}
                fontSize={BADGE_FONT_SIZE}
                dominantBaseline="central"
            >
                {displayText}
            </text>
        </g>
    );
};

/**
 * Wuhan Rail Transit Line Badge specific props.
 */
export interface WuhanRTLineBadgeAttributes extends ColorAttribute {
    content: string;
}

const defaultWuhanRTLineBadgeAttributes: WuhanRTLineBadgeAttributes = {
    content: '3',
    color: [CityCode.Wuhan, 'wuhan3', '#d3b65a', MonoColour.white],
};

const wuhanRTLineBadgeAttrsComponent = (props: AttrsProps<WuhanRTLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.nodes.text.content'),
            value: attrs.content ?? defaultWuhanRTLineBadgeAttributes.content,
            onChange: val => {
                attrs.content = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={MiscNodeType.WuhanRTLineBadge}
                    defaultTheme={defaultWuhanRTLineBadgeAttributes.color}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const wuhanRTLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="7" width="20" height="10" rx="2" />
        <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="7">
            3号线
        </text>
    </svg>
);

const wuhanRTLineBadge: Node<WuhanRTLineBadgeAttributes> = {
    component: WuhanRTLineBadge,
    icon: wuhanRTLineBadgeIcon,
    defaultAttrs: defaultWuhanRTLineBadgeAttributes,
    attrsComponent: wuhanRTLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.wuhanRTLineBadge.displayName',
        tags: [],
    },
};

export default wuhanRTLineBadge;
