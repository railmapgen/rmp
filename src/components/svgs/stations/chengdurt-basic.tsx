import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export const LINE_HEIGHT = {
    zh: 7,
    en: 3.5,
    top: 3.5 + 1,
    middle: 0,
    bottom: 7 + 1,
};

const ChengduRTBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChengduRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultChengduRTBasicStationAttributes.nameOffsetY,
        color = defaultChengduRTBasicStationAttributes.color,
        direction = defaultChengduRTBasicStationAttributes.direction,
        stationType = defaultChengduRTBasicStationAttributes.stationType,
        rotation = defaultChengduRTBasicStationAttributes.rotation,
    } = attrs[StationType.ChengduRTBasic] ?? defaultChengduRTBasicStationAttributes;

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

    const getTextOffset = () => {
        const [oX, oY] = [nameOffsetX, nameOffsetY];
        if (direction === 'horizontal') {
            if (oX === 'left' && oY === 'top') {
                return [
                    -5 - (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                    -names[1].split('\n').length * LINE_HEIGHT[oY] - 3,
                ];
            } else if (oX === 'middle' && oY === 'top') {
                return [
                    0,
                    -names[1].split('\n').length * LINE_HEIGHT[oY] -
                        5 -
                        (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                ];
            } else if (oX === 'right' && oY === 'top') {
                return [
                    5 + (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                    -names[1].split('\n').length * LINE_HEIGHT[oY] - 3,
                ];
            } else if (oX === 'left' && oY === 'bottom') {
                return [
                    -5 - (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                    names[0].split('\n').length * LINE_HEIGHT[oY] + 3,
                ];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [
                    0,
                    names[0].split('\n').length * LINE_HEIGHT[oY] +
                        5 +
                        (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                ];
            } else if (oX === 'right' && oY === 'bottom') {
                return [
                    5 + (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0),
                    names[0].split('\n').length * LINE_HEIGHT[oY] + 3,
                ];
            } else if (oX === 'left' && oY === 'middle') {
                return [-5 - (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0), 2];
            } else if (oX === 'right' && oY === 'middle') {
                return [5 + (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0), 2];
            } else return [0, 0];
        } else {
            if (oX === 'middle' && oY === 'top') {
                return [-LINE_HEIGHT.zh / 2, -5 - (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0)];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [-LINE_HEIGHT.zh / 2, 5 + (stationType == 'tram' ? 4 : stationType == 'joint' ? 2 : 0)];
            } else return [0, 0];
        }
    };

    const getTramPos = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [0, -8, 0, -8];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, 0, 0, -8];
        } else if (oX === 'right' && oY === 'top') {
            return [0, 8, 0, -8];
        } else if (oX === 'left' && oY === 'bottom') {
            return [0, -8, 0, 8];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, 0, 0, 8];
        } else if (oX === 'right' && oY === 'bottom') {
            return [0, 8, 0, 8];
        } else if (oX === 'left' && oY === 'middle') {
            return [0, -8, 0, 0];
        } else if (oX === 'right' && oY === 'middle') {
            return [0, 8, 0, 0];
        } else return [0, 0, 0, 0];
    };

    const [textX, textY] = getTextOffset();
    const [tramX1, tramX2, tramY1, tramY2] = getTramPos(nameOffsetX, nameOffsetY);
    const textAnchor =
        direction == 'vertical'
            ? nameOffsetY === 'top'
                ? 'end'
                : nameOffsetY === 'bottom'
                  ? 'start'
                  : 'middle'
            : nameOffsetX === 'left'
              ? 'end'
              : nameOffsetX === 'right'
                ? 'start'
                : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {stationType == 'normal' || stationType == 'branchTerminal' ? (
                <circle
                    id={`stn_core_${id}`}
                    r={stationType == 'normal' ? 1.75 : 5}
                    stroke={color[2]}
                    strokeWidth={stationType == 'normal' ? 1 : 0.5}
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            ) : stationType == 'joint' ? (
                <g
                    transform={
                        direction == 'vertical' ? `rotate(${Number(rotation) + 90})` : `rotate(${Number(rotation)})`
                    }
                >
                    <circle r={2.25} fill="black" transform="translate(-1.5,0)" />
                    <circle r={2.25} fill="black" transform="translate(1.5,0)" />
                    <circle r={1.75} fill="white" transform="translate(-1.5,0)" />
                    <circle r={1.75} fill="white" transform="translate(1.5,0)" />
                    {/* It's a overlay */}
                    <rect
                        id={`stn_core_${id}`}
                        fill="white"
                        fillOpacity="0"
                        stroke="none"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                        x={-4}
                        y={-4}
                        width={8}
                        height={8}
                    />
                </g>
            ) : (
                <g>
                    <line x1={tramX1} y1={tramY1} x2={tramX2} y2={tramY2} stroke={color[2]} strokeWidth={1} />
                    {/* It's a overlay */}
                    <rect
                        id={`stn_core_${id}`}
                        fill="white"
                        fillOpacity="0"
                        stroke="none"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                        x={-6}
                        y={-6}
                        width={12}
                        height={12}
                    />
                </g>
            )}
            {direction == 'horizontal' ? (
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                    <MultilineText
                        text={names[0].split('\n')}
                        fontSize={LINE_HEIGHT.zh}
                        lineHeight={LINE_HEIGHT.zh}
                        grow="up"
                        {...getLangStyle(TextLanguage.zh)}
                        baseOffset={1}
                    />
                    <MultilineText
                        text={names[1].split('\n')}
                        fontSize={LINE_HEIGHT.en}
                        lineHeight={LINE_HEIGHT.en}
                        grow="down"
                        {...getLangStyle(TextLanguage.en)}
                        baseOffset={1}
                    />
                </g>
            ) : nameOffsetX == 'middle' ? (
                <>
                    <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                        <MultilineTextVertical
                            text={names[0].split('\n').reverse()}
                            fontSize={LINE_HEIGHT.zh}
                            lineWidth={LINE_HEIGHT.zh + 1}
                            grow="bidirectional"
                            dominantBaseline="central"
                            textOrientation="upright"
                            {...getLangStyle(TextLanguage.zh)}
                        />
                    </g>
                    <g
                        transform={`translate(${textX + (LINE_HEIGHT.zh * names[0].split('\n').length) / 2 + 3}, ${textY})rotate(90)`}
                        textAnchor={textAnchor}
                    >
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={LINE_HEIGHT.en}
                            lineHeight={LINE_HEIGHT.en}
                            grow="up"
                            {...getLangStyle(TextLanguage.en)}
                            dominantBaseline="central"
                        />
                    </g>
                </>
            ) : nameOffsetX == 'right' ? (
                <>
                    <g
                        transform={`translate(${textX + ((names[0].split('\n').length - 1) * (LINE_HEIGHT.zh + 1)) / 2 + 5}, ${textY})`}
                        textAnchor={textAnchor}
                    >
                        <MultilineTextVertical
                            text={names[0].split('\n').reverse()}
                            fontSize={LINE_HEIGHT.zh}
                            lineWidth={LINE_HEIGHT.zh + 1}
                            grow="bidirectional"
                            dominantBaseline="central"
                            textOrientation="upright"
                            {...getLangStyle(TextLanguage.zh)}
                        />
                    </g>
                    <g
                        transform={`translate(${textX + (names[0].split('\n').length - 1) * (LINE_HEIGHT.zh + 1) + 12}, ${textY})rotate(90)`}
                        textAnchor={textAnchor}
                    >
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={LINE_HEIGHT.en}
                            lineHeight={LINE_HEIGHT.en}
                            grow="up"
                            {...getLangStyle(TextLanguage.en)}
                            dominantBaseline="central"
                        />
                    </g>
                </>
            ) : (
                <>
                    <g
                        transform={`translate(${textX - ((names[0].split('\n').length - 1) * (LINE_HEIGHT.zh + 1)) / 2 - (names[1].split('\n').length - 1) * LINE_HEIGHT.en - 14}, ${textY})`}
                        textAnchor={textAnchor}
                    >
                        <MultilineTextVertical
                            text={names[0].split('\n').reverse()}
                            fontSize={LINE_HEIGHT.zh}
                            lineWidth={LINE_HEIGHT.zh + 1}
                            grow="bidirectional"
                            dominantBaseline="central"
                            textOrientation="upright"
                            {...getLangStyle(TextLanguage.zh)}
                        />
                    </g>
                    <g
                        transform={`translate(${textX - (names[1].split('\n').length - 1) * LINE_HEIGHT.en - 7}, ${textY})rotate(90)`}
                        textAnchor={textAnchor}
                    >
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={LINE_HEIGHT.en}
                            lineHeight={LINE_HEIGHT.en}
                            grow="up"
                            {...getLangStyle(TextLanguage.en)}
                            dominantBaseline="central"
                        />
                    </g>
                </>
            )}
        </g>
    );
};

/**
 * ChengduRTBasicStation specific props.
 */
export interface ChengduRTBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    direction: 'vertical' | 'horizontal';
    stationType: 'normal' | 'joint' | 'branchTerminal' | 'tram';
    rotation: '0' | '45' | '90' | '135' | '180' | '225' | '270' | '315';
}

const defaultChengduRTBasicStationAttributes: ChengduRTBasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Chengdu, 'cd1', '#222a8c', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    direction: 'horizontal',
    stationType: 'normal',
    rotation: '0',
};

const ChengduRTBasicAttrsComponent = (props: AttrsProps<ChengduRTBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs.names ?? defaultChengduRTBasicStationAttributes.names)[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: (attrs.names ?? defaultChengduRTBasicStationAttributes.names)[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultChengduRTBasicStationAttributes.nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                // if (attrs.nameOffsetX != 'middle') {
                //     attrs.direction = 'horizontal';
                // }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetY ?? defaultChengduRTBasicStationAttributes.nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                // if (attrs.nameOffsetY == 'middle') {
                //     attrs.direction = 'horizontal';
                // }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.ChengduRTBasic}
                    defaultTheme={defaultChengduRTBasicStationAttributes.color}
                />
            ),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chengduRTBasic.isVertical'),
            isChecked: (attrs.direction ?? defaultChengduRTBasicStationAttributes.direction) == 'vertical',
            onChange: val => {
                attrs.direction = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            // isDisabled: attrs.nameOffsetX != 'middle' || attrs.nameOffsetY == 'middle',
            // In fact, if it is undefined, it will be disabled so we don't need to check it:)
        },
        {
            type: 'select',
            label: t('panel.details.stations.chengduRTBasic.stationType.displayName'),
            value: attrs.stationType ?? defaultChengduRTBasicStationAttributes.stationType,
            options: {
                normal: t('panel.details.stations.chengduRTBasic.stationType.normal'),
                joint: t('panel.details.stations.chengduRTBasic.stationType.joint'),
                branchTerminal: t('panel.details.stations.chengduRTBasic.stationType.branchTerminal'),
                tram: t('panel.details.stations.chengduRTBasic.stationType.tram'),
            },
            onChange: val => {
                attrs.stationType = val as 'normal' | 'joint' | 'branchTerminal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.chengduRTBasic.rotation'),
            value: attrs.rotation ?? defaultChengduRTBasicStationAttributes.rotation,
            options: {
                '0': '0°',
                '45': '45°',
                '90': '90°',
                '135': '135°',
                '180': '180°',
                '225': '225°',
                '270': '270°',
                '315': '315°',
            },
            onChange: val => {
                attrs.rotation = val as '0' | '45' | '90' | '135' | '180' | '225' | '270' | '315';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            isDisabled: attrs.stationType != 'joint',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chengduRTBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="1.75" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
);

const chengduRTBasicStation: Station<ChengduRTBasicStationAttributes> = {
    component: ChengduRTBasicStation,
    icon: chengduRTBasicStationIcon,
    defaultAttrs: defaultChengduRTBasicStationAttributes,
    attrsComponent: ChengduRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chengduRTBasic.displayName',
        cities: [CityCode.Chengdu],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chengduRTBasicStation;
