import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';

import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

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
    } = attrs ?? defaultTextAttributes;

    const textLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 12 } as DOMRect);
    React.useEffect(() => setBBox(textLineEl.current!.getBBox()), [content, setBBox, textLineEl]);

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

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                {/* This hint rect is hard to remove in exporting. */}
                {/* <rect
                    fill="gray"
                    fillOpacity="0.1"
                    x={bBox.x - 1.5}
                    y={bBox.y - 1.5}
                    width={bBox.width + 3}
                    height={bBox.height + 3}
                /> */}
                <MultilineText
                    ref={textLineEl}
                    text={content.split('\n')}
                    className={`rmp-name-station rmp-name__${language}`}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    textAnchor={textAnchor}
                    dominantBaseline={dominantBaseline}
                    fill={color[2]}
                    grow="down" // this will be ignored
                />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    fill="white"
                    fillOpacity="0"
                    x={bBox.x - 1.5}
                    y={bBox.y - 1.5}
                    width={bBox.width + 3}
                    height={bBox.height + 3}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [
            id,
            x,
            y,
            content,
            fontSize,
            lineHeight,
            textAnchor,
            dominantBaseline,
            language,
            color,
            bBox,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * Text specific props.
 */
export interface TextAttributes extends AttributesWithColor {
    content: string;
    fontSize: number;
    lineHeight: number;
    textAnchor: React.SVGProps<SVGTextElement>['textAnchor'];
    dominantBaseline: React.SVGProps<SVGTextElement>['dominantBaseline'];
    language: string;
}

const defaultTextAttributes: TextAttributes = {
    content: 'Enter your text here',
    fontSize: 16,
    lineHeight: 16,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    language: 'en',
    color: [CityCode.Shanghai, 'jsr', '#000000', MonoColour.white],
};

const TextFields = [
    {
        type: 'textarea',
        label: 'panel.details.node.text.content',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).content,
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.content = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.node.text.fontSize',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).fontSize,
        validator: (val: string) => Number.isInteger(val) && Number(val) > 0,
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.fontSize = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.node.text.lineHeight',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).lineHeight,
        validator: (val: string) => Number.isInteger(val) && Number(val) > 0,
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.lineHeight = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.node.text.textAnchor',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).textAnchor,
        options: { start: 'start', middle: 'middle', end: 'end' },
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.textAnchor = val as React.SVGProps<SVGTextElement>['textAnchor'];
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.node.text.dominantBaseline',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).dominantBaseline,
        options: { auto: 'auto', middle: 'middle', hanging: 'hanging' },
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.dominantBaseline = val as React.SVGProps<SVGTextElement>['dominantBaseline'];
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.node.text.language',
        value: (attrs?: TextAttributes) => (attrs ?? defaultTextAttributes).language,
        options: { zh: 'Chinese', en: 'English', mtr__zh: 'MTR Chinese', mtr__en: 'MTR English' },
        onChange: (val: string | number, attrs_: TextAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultTextAttributes;
            // set value
            attrs.language = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: <ColorField type={MiscNodeType.Text} defaultAttrs={defaultTextAttributes} />,
    },
];

const TextIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <text x="12" y="12" textAnchor="middle" dominantBaseline="middle" fontSize="10">
            Text
        </text>
    </svg>
);

const text: Node<TextAttributes> = {
    component: Text,
    icon: TextIcon,
    defaultAttrs: defaultTextAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: TextFields,
    metadata: {
        displayName: 'panel.details.node.text.displayName',
        tags: [],
    },
};

export default text;
