import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode, NodeType } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { Rotate, StationType } from '../../../constants/stations';
import { loadFontCss } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

export enum TextLanguage {
    zh = 'zh',
    en = 'en',
    mtr__zh = 'mtr__zh',
    mtr__en = 'mtr__en',
    berlin = 'berlin',
    mrt = 'mrt',
    jreast_ja = 'jreast_ja',
    jreast_en = 'jreast_en',
    tokyo_en = 'tokyo_en',
    tube = 'tube',
    taipei = 'taipei',
}

export const languageToFontsCss: { [k in TextLanguage]: NodeType } = {
    zh: StationType.ShmetroBasic,
    en: StationType.ShmetroBasic,
    mtr__zh: StationType.MTR,
    mtr__en: StationType.MTR,
    berlin: MiscNodeType.BerlinSBahnLineBadge,
    mrt: StationType.MRTBasic,
    jreast_ja: StationType.JREastBasic,
    jreast_en: StationType.JREastBasic,
    tokyo_en: StationType.TokyoMetroBasic,
    tube: StationType.LondonTubeBasic,
    taipei: MiscNodeType.TaiPeiMetroLineBadege,
};

const Text = (props: NodeComponentProps<TextAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        content = defaultTextAttributes.content,
        fontSize = defaultTextAttributes.fontSize,
        lineHeight = defaultTextAttributes.lineHeight,
        textAnchor = defaultTextAttributes.textAnchor,
        dominantBaseline = defaultTextAttributes.dominantBaseline,
        language = defaultTextAttributes.language,
        color = defaultTextAttributes.color,
        rotate = defaultTextAttributes.rotate,
        italic = defaultTextAttributes.italic,
        bold = defaultTextAttributes.bold,
        outline = defaultTextAttributes.outline,
    } = attrs ?? defaultTextAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ x: 0, y: 0, width: 32, height: 16 } as DOMRect);
    React.useEffect(
        () => setBBox(textLineEl.current!.getBBox()),
        // Watch content to get update of bBox's width and height.
        // Watch textAnchor and dominantBaseline to get update of bBox's x and y.
        [
            content,
            fontSize,
            lineHeight,
            textAnchor,
            dominantBaseline,
            language,
            rotate,
            italic,
            bold,
            setBBox,
            textLineEl,
        ]
    );

    // Add fonts css to the document for the language selected.
    React.useEffect(() => {
        const type = languageToFontsCss[language];
        if (type) loadFontCss(type);
    }, [language]);

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
            transform={`translate(${x}, ${y})rotate(${rotate})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            <rect
                className="removeMe"
                fill="gray"
                fillOpacity="0.1"
                x={bBox.x - 1.5}
                y={bBox.y - 1.5}
                width={bBox.width + 3}
                height={bBox.height + 3}
            />
            <MultilineText
                ref={textLineEl}
                text={content.split('\n')}
                lineHeight={lineHeight}
                grow="down" // this will be ignored
                className={`rmp-name__${language} ${outline > 0 ? 'rmp-name-outline' : ''}`}
                strokeWidth={outline > 0 ? outline : undefined}
                fontSize={fontSize}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                fill={color[2]}
                fontStyle={italic}
                fontWeight={bold}
            />
        </g>
    );
};

/**
 * Text specific props.
 */
export interface TextAttributes extends ColorAttribute {
    content: string;
    fontSize: number;
    lineHeight: number;
    textAnchor: React.SVGProps<SVGTextElement>['textAnchor'];
    dominantBaseline: React.SVGProps<SVGTextElement>['dominantBaseline'];
    language: TextLanguage;
    rotate: Rotate;
    italic: string | number;
    bold: string | number;
    outline: number;
}

export const defaultTextAttributes: TextAttributes = {
    content: 'Enter your text here',
    fontSize: 16,
    lineHeight: 16,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    language: TextLanguage.en,
    color: [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white],
    rotate: 0,
    italic: 'normal',
    bold: 'normal',
    outline: 0,
};

const textAttrsComponent = (props: AttrsProps<TextAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.nodes.text.content'),
            value: attrs.content ?? defaultTextAttributes.content,
            onChange: val => {
                attrs.content = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.text.fontSize'),
            value: (attrs.fontSize ?? defaultTextAttributes.fontSize).toString(),
            validator: (val: string) => Number.isInteger(val) && Number(val) > 0,
            onChange: val => {
                attrs.fontSize = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.text.lineHeight'),
            value: (attrs.lineHeight ?? defaultTextAttributes.lineHeight).toString(),
            validator: (val: string) => Number.isInteger(val) && Number(val) > 0,
            onChange: val => {
                attrs.lineHeight = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.text.textAnchor'),
            value: attrs.textAnchor ?? defaultTextAttributes.textAnchor,
            options: {
                start: t('panel.details.nodes.text.start'),
                middle: t('panel.details.nodes.text.middle'),
                end: t('panel.details.nodes.text.end'),
            },
            onChange: val => {
                attrs.textAnchor = val as React.SVGProps<SVGTextElement>['textAnchor'];
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.text.dominantBaseline'),
            value: attrs.dominantBaseline ?? defaultTextAttributes.dominantBaseline,
            options: {
                auto: t('panel.details.nodes.text.auto'),
                middle: t('panel.details.nodes.text.middle'),
                hanging: t('panel.details.nodes.text.hanging'),
            },
            onChange: val => {
                attrs.dominantBaseline = val as React.SVGProps<SVGTextElement>['dominantBaseline'];
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.text.language'),
            value: attrs.language ?? defaultTextAttributes.language,
            options: {
                zh: t('panel.details.nodes.text.zh'),
                en: t('panel.details.nodes.text.en'),
                mtr__zh: t('panel.details.nodes.text.mtr__zh'),
                mtr__en: t('panel.details.nodes.text.mtr__en'),
                berlin: t('panel.details.nodes.text.berlin'),
                mrt: t('panel.details.nodes.text.mrt'),
                jreast_ja: t('panel.details.nodes.text.jreast_ja'),
                jreast_en: t('panel.details.nodes.text.jreast_en'),
                tokyo_en: t('panel.details.nodes.text.tokyo_en'),
                tube: t('panel.details.nodes.text.tube'),
                taipei: t('panel.details.nodes.text.taipei'),
            } as { [key in TextLanguage]: string },
            onChange: val => {
                attrs.language = val.toString() as TextLanguage;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.text.rotate'),
            value: attrs.rotate ?? defaultTextAttributes.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.text.italic'),
            isChecked: attrs.italic === 'italic',
            onChange: val => {
                attrs.italic = val ? 'italic' : 'normal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.nodes.text.bold'),
            isChecked: attrs.bold === 'bold',
            onChange: val => {
                attrs.bold = val ? 'bold' : 'normal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.nodes.text.outline'),
            value: (attrs.outline ?? defaultTextAttributes.outline).toString(),
            validator: (val: string) => Number.isInteger(val) && Number(val) > 0,
            onChange: val => {
                attrs.outline = Math.abs(Number(val));
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.Text} defaultTheme={defaultTextAttributes.color} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

const textIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <text x="12" y="12" textAnchor="middle" dominantBaseline="middle" fontSize="10">
            Text
        </text>
    </svg>
);

const text: Node<TextAttributes> = {
    component: Text,
    icon: textIcon,
    defaultAttrs: defaultTextAttributes,
    attrsComponent: textAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.text.displayName',
        tags: [],
    },
};

export default text;
