import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const CIRCLE_R = 4;
const CIRCLE_X = 7;
const FONT_SIZE_JA = 10;
const FONT_SIZE_EN = 5;

const LINE_WIDTH = 5;
const PATTERN_LEN = LINE_WIDTH * Math.SQRT1_2;
const PATTERN_WIDTH = 0.25;
const PATTERN_CLIP_PATH_D = ((PATTERN_LEN * Math.SQRT2 - PATTERN_WIDTH) / 2) * Math.SQRT2;

const JREastLineBadge = (props: NodeComponentProps<JREastLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultJREastLineBadgeAttributes.names,
        num = defaultJREastLineBadgeAttributes.num,
        color = defaultJREastLineBadgeAttributes.color,
        crosshatchPatternFill = defaultJREastLineBadgeAttributes.crosshatchPatternFill,
    } = attrs ?? defaultJREastLineBadgeAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ height: 10, width: 12 } as DOMRect);
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
            <defs>
                <clipPath id="jr_east_fill_pattern_clip_path" patternUnits="userSpaceOnUse">
                    <polygon points={`0,0 0,${PATTERN_CLIP_PATH_D} ${PATTERN_CLIP_PATH_D},0`} />
                    <polygon
                        points={`${PATTERN_LEN},${PATTERN_LEN} ${
                            PATTERN_LEN - PATTERN_CLIP_PATH_D
                        },${PATTERN_LEN} ${PATTERN_LEN},${PATTERN_LEN - PATTERN_CLIP_PATH_D}`}
                    />
                </clipPath>
                <pattern
                    id={`jr_east_${id}_fill_pattern_${color[2]}`}
                    width={PATTERN_LEN}
                    height={PATTERN_LEN}
                    patternUnits="userSpaceOnUse"
                >
                    <rect width={PATTERN_LEN} height={PATTERN_LEN} fill={color[2]} />
                    <line
                        x1="0"
                        y1="0"
                        x2={PATTERN_LEN}
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="33%"
                        clipPath={`url(#jr_east_fill_pattern_clip_path)`}
                    />
                    <line
                        x1={PATTERN_LEN}
                        y1="0"
                        x2="0"
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="33%"
                    />
                </pattern>
            </defs>
            <rect
                fill={crosshatchPatternFill ? `url(#jr_east_${id}_fill_pattern_${color[2]})` : color[2]}
                x="0"
                y="-1"
                width={bBox.width + CIRCLE_R + 10}
                height={bBox.height + 1}
                rx="1"
                stroke="black"
                strokeWidth="0.25"
            />
            <circle
                r={CIRCLE_R}
                cx={CIRCLE_X}
                cy={FONT_SIZE_JA / 2 + 1}
                stroke="black"
                strokeWidth="0.25"
                fill={color[3]}
            />
            <text
                x={CIRCLE_X}
                y={FONT_SIZE_JA / 2 + 1.75}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color[3] === '#000' ? 'white' : color[2]}
                fontSize={num > 9 ? 7 : 8}
                {...getLangStyle(TextLanguage.jreast_en)}
            >
                {num}
            </text>
            <MultilineText
                ref={textLineEl}
                text={names[0].split('\n')}
                x={CIRCLE_X + CIRCLE_R + 1}
                y="-1"
                fill={color[3]}
                fontSize={FONT_SIZE_JA}
                lineHeight={FONT_SIZE_JA}
                grow="down"
                {...getLangStyle(TextLanguage.jreast_ja)}
            />
            <MultilineText
                text={names[1].split('\n')}
                textAnchor="middle"
                dominantBaseline="hanging"
                x={(bBox.width + CIRCLE_R + 10) / 2}
                y={bBox.height + 1}
                fontSize={FONT_SIZE_EN}
                lineHeight={FONT_SIZE_EN}
                baseOffset={0}
                grow="down"
                {...getLangStyle(TextLanguage.jreast_en)}
            />
        </g>
    );
};

/**
 * JREastLineBadge specific props.
 */
export interface JREastLineBadgeAttributes extends ColorAttribute {
    names: [string, ...string[]];
    num: number;
    crosshatchPatternFill: boolean;
}

const defaultJREastLineBadgeAttributes: JREastLineBadgeAttributes = {
    names: ['山手線', 'Yamanote Line'],
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
    num: 9,
    crosshatchPatternFill: false,
};

const jrEastLineBadgeAttrsComponent = (props: AttrsProps<JREastLineBadgeAttributes>) => {
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
            type: 'textarea',
            label: t('panel.details.nodes.common.nameJa'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.nodes.common.nameEn'),
            value: attrs.names.at(1) ?? defaultJREastLineBadgeAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.jrEastLineBadge.crosshatchPatternFill'),
            oneLine: true,
            isChecked: attrs.crosshatchPatternFill,
            onChange: val => {
                attrs.crosshatchPatternFill = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={MiscNodeType.JREastLineBadge} defaultTheme={defaultJREastLineBadgeAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="1" y="6" width="22" height="7" />
        <circle cx="3.5" cy="9.25" r="2" fill="white" />
        <text x="3" y="10.5" fontSize="3">
            9
        </text>
        <text x="6" y="11.25" fontSize="5" fill="white">
            山手線
        </text>
        <text x="1.5" y="16" fontSize="3">
            Yamanote Line
        </text>
    </svg>
);

const jrEastLineBadge: Node<JREastLineBadgeAttributes> = {
    component: JREastLineBadge,
    icon: jrEastLineBadgeIcon,
    defaultAttrs: defaultJREastLineBadgeAttributes,
    attrsComponent: jrEastLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.jrEastLineBadge.displayName',
        tags: [],
    },
};

export default jrEastLineBadge;
