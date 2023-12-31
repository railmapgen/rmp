import { Flex, NumberInput, NumberInputField } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

const NAME_SZ_BASIC = {
    ja: {
        size: 10,
        baseOffset: 1,
    },
    en: {
        size: 5,
        baseOffset: 1.5,
    },
};

const LINE_WIDTH = 5;

const JREastBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultJREastBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultJREastBasicStationAttributes.nameOffsetY,
        rotate = defaultJREastBasicStationAttributes.rotate,
        textOneLine = defaultJREastBasicStationAttributes.textOneLine,
        textVertical = defaultJREastBasicStationAttributes.textVertical,
        important = defaultJREastBasicStationAttributes.important,
        lines = defaultJREastBasicStationAttributes.lines,
    } = attrs[StationType.JREastBasic] ?? defaultJREastBasicStationAttributes;

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

    const iconWidth = (Math.max(...lines) - Math.min(...lines) + 1) * LINE_WIDTH;
    const iconDX1 = (Math.min(...lines) - 0.5) * LINE_WIDTH;
    const iconRotateDX1 = Math.cos((rotate * Math.PI) / 180) * LINE_WIDTH * Math.min(...lines) - LINE_WIDTH / 2;
    const iconRotateDX2 = Math.cos((rotate * Math.PI) / 180) * LINE_WIDTH * Math.max(...lines) + LINE_WIDTH / 2;
    const iconRotateDY1 = Math.sin((rotate * Math.PI) / 180) * LINE_WIDTH * Math.min(...lines) - LINE_WIDTH / 2;
    const iconRotateDY2 = Math.sin((rotate * Math.PI) / 180) * LINE_WIDTH * Math.max(...lines) + LINE_WIDTH / 2;

    const textDX = nameOffsetX === 'left' ? iconRotateDX1 : nameOffsetX === 'right' ? iconRotateDX2 : 0;
    const textJAHeight = names[0].split('\\').length * (nameOffsetY === 'middle' ? 0 : NAME_SZ_BASIC.ja.size);
    const textJAOffset = (nameOffsetY === 'middle' ? 0 : nameOffsetY === 'top' ? 2 : 1) + NAME_SZ_BASIC.ja.baseOffset;
    const textDY =
        (textJAHeight + textJAOffset) * NAME_DY[nameOffsetY].polarity +
        (nameOffsetY === 'middle' ? 0 : nameOffsetY === 'top' ? iconRotateDY1 : iconRotateDY2);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    const textGrow: { ja: 'down' | 'up' | 'bidirectional'; en: 'down' | 'up' | 'bidirectional' } = {
        ja: nameOffsetY === 'top' ? 'down' : nameOffsetY === 'bottom' ? 'up' : 'bidirectional',
        en: nameOffsetY === 'top' || textOneLine ? 'up' : 'down',
    };
    const textBaseOffset: { ja: number; en: number } = {
        ja: NAME_SZ_BASIC.ja.baseOffset,
        en:
            (nameOffsetY === 'middle'
                ? textOneLine
                    ? (-names[0].split('\\').length * NAME_SZ_BASIC.ja.size) / 2 - 1
                    : (names[0].split('\\').length * NAME_SZ_BASIC.ja.size) / 2
                : 0) +
            (important && !textOneLine ? 2 : 0) +
            NAME_SZ_BASIC.en.baseOffset,
    };

    const textJAEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 0 } as DOMRect);
    React.useEffect(() => setBBox(textJAEl.current!.getBBox()), [names[0], textVertical, setBBox, textJAEl]);
    const textSafeDImportant = (textVertical ? 0.2 : 0.7) * NAME_SZ_BASIC.ja.size;
    const textJAXImportant = { left: -textSafeDImportant / 2, middle: 0, right: textSafeDImportant / 2 }[nameOffsetX];
    const textJAYImportant = { top: -2, middle: 0, bottom: 2 }[nameOffsetY];
    const textENX = textOneLine
        ? (bBox.width + 1 + (important ? textSafeDImportant : 0)) * (nameOffsetX === 'left' ? -1 : 1)
        : 0;
    const textENY = (important ? 2 : 0) * NAME_DY[nameOffsetY].polarity;

    const iconImportantWidth = bBox.width;
    const iconImportantHeight = bBox.height;
    const iconImportantDX = {
        left: -(iconImportantWidth + textSafeDImportant),
        middle: -(iconImportantWidth + textSafeDImportant) / 2,
        right: 0,
    }[nameOffsetX];
    const iconImportantDY = {
        top: -2 - textBaseOffset.ja,
        middle: -iconImportantHeight / 2,
        bottom: -iconImportantHeight + 3 + textBaseOffset.ja,
    }[nameOffsetY];
    const iconImportantVerticalDY = {
        top: -iconImportantHeight + 3 - textBaseOffset.ja,
        middle: 0,
        bottom: -3 + textBaseOffset.ja,
    }[nameOffsetY];

    const textVerticalDY =
        (nameOffsetY === 'top'
            ? iconRotateDY1 - NAME_SZ_BASIC.en.baseOffset
            : iconRotateDY2 + NAME_SZ_BASIC.en.baseOffset) +
        (important ? textSafeDImportant : 0) * NAME_DY[nameOffsetY].polarity;
    const textVerticalAnchor = {
        ja: nameOffsetY === 'top' ? 'end' : 'start',
        en: nameOffsetY === 'top' ? 'start' : 'end',
    };
    const textVerticalENBaseOffset =
        (names[0].split('\\').length * NAME_SZ_BASIC.ja.size) / 2 + NAME_SZ_BASIC.en.baseOffset;
    const textVerticalENY = (important ? 2 : 0) * NAME_DY[nameOffsetY].polarity * -1;

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`rotate(${rotate})`}>
                {lines.map((v, i) => (
                    <circle
                        key={`stn_core_${id}_${i}`}
                        cx={LINE_WIDTH * v}
                        cy="0"
                        r="1.5"
                        stroke="black"
                        strokeWidth="0.2"
                        fill="white"
                    />
                ))}
                <rect
                    id={`stn_core_${id}`}
                    fill="url(#opaque)"
                    fillOpacity="50%"
                    x={iconDX1}
                    y={-LINE_WIDTH / 2}
                    rx={LINE_WIDTH / 2}
                    width={iconWidth}
                    height={LINE_WIDTH}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
            {!textVertical ? (
                <g transform={`translate(${textDX}, ${textDY})`} textAnchor={textAnchor}>
                    {important && (
                        <rect
                            x={iconImportantDX}
                            y={iconImportantDY}
                            width={bBox.width + textSafeDImportant}
                            height={iconImportantHeight}
                            ry={iconImportantHeight / 2}
                            fill="black"
                        />
                    )}
                    <MultilineText
                        ref={textJAEl}
                        x={important && nameOffsetX !== 'middle' ? textJAXImportant : 0}
                        y={important && nameOffsetY !== 'middle' ? textJAYImportant : 0}
                        text={names[0].split('\\')}
                        fontSize={NAME_SZ_BASIC.ja.size}
                        lineHeight={NAME_SZ_BASIC.ja.size}
                        grow={textGrow.ja}
                        baseOffset={textBaseOffset.ja}
                        className="rmp-name__jreast_ja"
                        fill={important ? 'white' : 'black'}
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        x={textENX}
                        y={textENY}
                        fontSize={NAME_SZ_BASIC.en.size}
                        lineHeight={NAME_SZ_BASIC.en.size}
                        grow={textGrow.en}
                        baseOffset={textBaseOffset.en}
                        className="rmp-name__jreast_en"
                    />
                </g>
            ) : (
                <>
                    <g transform={`translate(0, ${textVerticalDY})`} textAnchor={textVerticalAnchor.ja}>
                        {important && (
                            <rect
                                x={-(iconImportantWidth - 6) / 2}
                                y={iconImportantVerticalDY - textSafeDImportant / 2}
                                width={iconImportantWidth - 6}
                                height={iconImportantHeight + textSafeDImportant}
                                rx={(iconImportantWidth - 6) / 2}
                                fill="black"
                            />
                        )}
                        <MultilineTextVertical
                            ref={textJAEl}
                            text={names[0].split('\\')}
                            fontSize={NAME_SZ_BASIC.ja.size}
                            lineWidth={NAME_SZ_BASIC.ja.size}
                            grow="bidirectional"
                            baseOffset={0}
                            className="rmp-name__jreast_ja"
                            fill={important ? 'white' : 'black'}
                        />
                    </g>
                    <g transform={`translate(0, ${textVerticalDY})rotate(270)`} textAnchor={textVerticalAnchor.en}>
                        <MultilineText
                            text={names[1].split('\\')}
                            y={textVerticalENY}
                            fontSize={NAME_SZ_BASIC.en.size}
                            lineHeight={NAME_SZ_BASIC.en.size}
                            grow={nameOffsetY === 'top' ? 'down' : 'up'}
                            baseOffset={textVerticalENBaseOffset}
                            className="rmp-name__jreast_en"
                        />
                    </g>
                </>
            )}
        </g>
    );
};

/**
 * JREastBasicStation specific props.
 */
export interface JREastBasicStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
    textOneLine: boolean;
    textVertical: boolean;
    important: boolean;
    lines: number[];
}

const defaultJREastBasicStationAttributes: JREastBasicStationAttributes = {
    names: ['渋谷', 'Shibuya'],
    nameOffsetX: 'left',
    nameOffsetY: 'middle',
    rotate: 0,
    textOneLine: false,
    textVertical: false,
    important: false,
    lines: [-1, 0, 1],
};

const jrEastBasicAttrsComponent = (props: AttrsProps<JREastBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[1] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.jrEastBasic.nameOffset'),
            value: attrs.nameOffsetX !== 'middle' ? attrs.nameOffsetX : attrs.nameOffsetY,
            options: { top: 'top', bottom: 'bottom', left: 'left', right: 'right' },
            onChange: val => {
                if (val === 'left' || val === 'right') {
                    attrs.nameOffsetX = val as NameOffsetX;
                    attrs.nameOffsetY = 'middle';
                    attrs.textVertical = false;
                } else {
                    attrs.nameOffsetX = 'middle';
                    attrs.nameOffsetY = val as NameOffsetY;
                    attrs.textOneLine = false;
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.jrEastBasic.textOneLine'),
            isChecked: attrs.textOneLine,
            isDisabled: attrs.nameOffsetY !== 'middle',
            onChange: (val: boolean) => {
                attrs.textOneLine = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.jrEastBasic.textVertical'),
            isChecked: attrs.textVertical,
            isDisabled: attrs.nameOffsetX !== 'middle',
            onChange: (val: boolean) => {
                attrs.textVertical = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.jrEastBasic.important'),
            isChecked: attrs.important ?? false,
            onChange: (val: boolean) => {
                attrs.important = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
    ];

    const handleLinesAdd = (s: string) => {
        const v = s === '-' ? -1 : Number(s);
        if (Number.isNaN(v)) return;
        attrs.lines.push(v);
        handleAttrsUpdate(id, attrs);
    };
    const handleLinesChange = (s: string, i: number) => {
        if ((s === '' || s === '-') && attrs.lines.length > 1) {
            attrs.lines.splice(i, 1);
        } else {
            const v = Number(s);
            if (Number.isNaN(v)) return;
            attrs.lines[i] = v;
        }
        handleAttrsUpdate(id, attrs);
    };
    const handleLinesKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && attrs.lines.length > 1) {
            attrs.lines.pop();
            handleAttrsUpdate(id, attrs);
        }
    };

    return (
        <>
            <RmgFields fields={fields} />
            <RmgLabel label={t('panel.details.stations.jrEastBasic.lines')}>
                <Flex flexWrap="wrap" flexDirection="row" pt="1">
                    {attrs.lines.map((v, i) => (
                        <NumberInput
                            key={i}
                            width="80px"
                            inputMode="numeric"
                            mr="2"
                            mb="2"
                            value={v}
                            onChange={v => handleLinesChange(v, i)}
                        >
                            <NumberInputField />
                        </NumberInput>
                    ))}
                    <NumberInput
                        width="80px"
                        inputMode="numeric"
                        mr="2"
                        mb="2"
                        value=""
                        onChange={v => handleLinesAdd(v)}
                        onKeyDown={e => handleLinesKeyDown(e)}
                    >
                        <NumberInputField />
                    </NumberInput>
                </Flex>
            </RmgLabel>
        </>
    );
};

const jrEastBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="0.5" fill="none" />
        <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="0.5" fill="none" />
    </svg>
);

const jrEastBasicStation: Station<JREastBasicStationAttributes> = {
    component: JREastBasicStation,
    icon: jrEastBasicStationIcon,
    defaultAttrs: defaultJREastBasicStationAttributes,
    attrsComponent: jrEastBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.jrEastBasic.displayName',
        cities: [CityCode.Tokyo],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.NationalRail],
        tags: [],
    },
};

export default jrEastBasicStation;
