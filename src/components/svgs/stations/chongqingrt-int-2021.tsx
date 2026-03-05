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

export const LINE_HEIGHT = {
    zh: 9,
    en: 4,
    top: 4 + 1,
    middle: 0,
    bottom: 9 + 1,
};

const ChongqingRTIntStation2021 = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChongqingRTIntStation2021Attributes.nameOffsetX,
        nameOffsetY = defaultChongqingRTIntStation2021Attributes.nameOffsetY,
        isRapid = defaultChongqingRTIntStation2021Attributes.isRapid,
        isWide = defaultChongqingRTIntStation2021Attributes.isWide,
        color = defaultChongqingRTIntStation2021Attributes.color,
        wideDirection = defaultChongqingRTIntStation2021Attributes.wideDirection,
    } = attrs[StationType.ChongqingRTInt2021] ?? defaultChongqingRTIntStation2021Attributes;

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

    const getTextOffset = (
        oX: NameOffsetX,
        oY: NameOffsetY,
        isWide: boolean,
        wideDirection: 'vertical' | 'horizontal'
    ) => {
        if (isWide) {
            if (wideDirection == 'horizontal') {
                if (oX === 'left' && oY === 'top') {
                    return [-22, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
                } else if (oX === 'middle' && oY === 'top') {
                    return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 7];
                } else if (oX === 'right' && oY === 'top') {
                    return [22, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
                } else if (oX === 'left' && oY === 'bottom') {
                    return [-22, names[0].split('\n').length * LINE_HEIGHT[oY] - 6];
                } else if (oX === 'middle' && oY === 'bottom') {
                    return [0, names[0].split('\n').length * LINE_HEIGHT[oY] - 3];
                } else if (oX === 'right' && oY === 'bottom') {
                    return [22, names[0].split('\n').length * LINE_HEIGHT[oY] - 6];
                } else if (oX === 'left' && oY === 'middle') {
                    return [-22, -3.5];
                } else if (oX === 'right' && oY === 'middle') {
                    return [22, -3.5];
                } else return [0, 0];
            } else {
                if (oX === 'left' && oY === 'top') {
                    return [-8, -names[1].split('\n').length * LINE_HEIGHT[oY] - 15];
                } else if (oX === 'middle' && oY === 'top') {
                    return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 21];
                } else if (oX === 'right' && oY === 'top') {
                    return [8, -names[1].split('\n').length * LINE_HEIGHT[oY] - 15];
                } else if (oX === 'left' && oY === 'bottom') {
                    return [-8, names[0].split('\n').length * LINE_HEIGHT[oY] + 6];
                } else if (oX === 'middle' && oY === 'bottom') {
                    return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 11];
                } else if (oX === 'right' && oY === 'bottom') {
                    return [8, names[0].split('\n').length * LINE_HEIGHT[oY] + 6];
                } else if (oX === 'left' && oY === 'middle') {
                    return [-8, -3.5];
                } else if (oX === 'right' && oY === 'middle') {
                    return [8, -3.5];
                } else return [0, 0];
            }
        } else {
            if (oX === 'left' && oY === 'top') {
                return [-13, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
            } else if (oX === 'middle' && oY === 'top') {
                return [0, -names[1].split('\n').length * LINE_HEIGHT[oY] - 12];
            } else if (oX === 'right' && oY === 'top') {
                return [13, -names[1].split('\n').length * LINE_HEIGHT[oY] - 4];
            } else if (oX === 'left' && oY === 'bottom') {
                return [-13, names[0].split('\n').length * LINE_HEIGHT[oY] - 5];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 2];
            } else if (oX === 'right' && oY === 'bottom') {
                return [13, names[0].split('\n').length * LINE_HEIGHT[oY] - 5];
            } else if (oX === 'left' && oY === 'middle') {
                return [-13, -4];
            } else if (oX === 'right' && oY === 'middle') {
                return [13, -4];
            } else return [0, 0];
        }
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY, isWide, wideDirection);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const width = isWide ? (wideDirection == 'horizontal' ? 40 : 12) : 20;
    const height = isWide ? (wideDirection == 'horizontal' ? 12 : 40) : 20;
    const fgColor = color[3];

    return (
        <g id={id} transform={`translate(${x}, ${y})`} textAnchor="middle">
            <rect
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                stroke={isRapid ? '#d3d3d3' : 'black'}
                strokeWidth={2}
                rx={3}
                ry={3}
                fill={isRapid ? color[2] : 'white'}
            />
            {isWide ? (
                <text
                    fontSize={7}
                    textAnchor="middle"
                    writingMode={wideDirection == 'horizontal' ? 'lr-tb' : 'tb'}
                    x={0}
                    y={wideDirection == 'horizontal' ? 2.5 : 0}
                    fill={isRapid ? fgColor : 'black'}
                >
                    {names[0].slice(0, 5)}
                </text>
            ) : names[0].length <= 2 ? (
                <text fontSize={8} textAnchor="middle" x={0} y={2} fill={isRapid ? fgColor : 'black'}>
                    {names[0]}
                </text>
            ) : names[0].length <= 4 ? (
                <>
                    <text fontSize={8} textAnchor="middle" x={0} y={-1} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(0, 2)}
                    </text>
                    <text fontSize={8} textAnchor="middle" x={0} y={7} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(2)}
                    </text>
                </>
            ) : names[0].length <= 6 ? (
                <>
                    <text fontSize={5.5} textAnchor="middle" x={0} y={-1} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(0, 3)}
                    </text>
                    <text fontSize={5.5} textAnchor="middle" x={0} y={5} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(3)}
                    </text>
                </>
            ) : (
                <>
                    <text fontSize={5.5} textAnchor="middle" x={0} y={-4} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(0, 3)}
                    </text>
                    <text fontSize={5.5} textAnchor="middle" x={0} y={2} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(3, 6)}
                    </text>
                    <text fontSize={5.5} textAnchor="middle" x={0} y={8} fill={isRapid ? fgColor : 'black'}>
                        {names[0].slice(6, 9)}
                    </text>
                </>
            )}
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <rect
                id={`stn_core_${id}`}
                x={-width / 2 - 1}
                y={-height / 2 - 1}
                width={width + 2}
                height={height + 2}
                fill="white"
                fillOpacity="0"
                stroke="#231815"
                strokeMiterlimit="22.9"
                strokeWidth="0.232"
                strokeOpacity="0"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                    baseOffset={1}
                />
            </g>
        </g>
    );
};

/**
 * ChongqingRTIntStation2021 specific props.
 */
export interface ChongqingRTIntStation2021Attributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    isRapid: boolean;
    isWide: boolean;
    wideDirection: 'vertical' | 'horizontal';
}

const defaultChongqingRTIntStation2021Attributes: ChongqingRTIntStation2021Attributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    isRapid: false,
    isWide: false,
    wideDirection: 'horizontal',
    color: [CityCode.Chongqing, 'cq10', '#5f249f', MonoColour.white],
};

const ChongqingRTInt2021AttrsComponent = (props: AttrsProps<ChongqingRTIntStation2021Attributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultChongqingRTIntStation2021Attributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultChongqingRTIntStation2021Attributes).nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs?.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: (attrs ?? defaultChongqingRTIntStation2021Attributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chongqingRTInt2021.isRapid'),
            oneLine: true,
            isChecked: (attrs ?? defaultChongqingRTIntStation2021Attributes).isRapid,
            onChange: val => {
                attrs.isRapid = val as boolean;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.ChongqingRTInt2021}
                    defaultTheme={defaultChongqingRTIntStation2021Attributes.color}
                />
            ),
            hidden: !attrs.isRapid,
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chongqingRTInt2021.isWide'),
            oneLine: true,
            isChecked: (attrs ?? defaultChongqingRTIntStation2021Attributes).isWide,
            onChange: val => {
                attrs.isWide = val as boolean;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.chongqingRTInt2021.wideDirection.displayName'),
            options: {
                vertical: t('panel.details.stations.chongqingRTInt2021.wideDirection.vertical'),
                horizontal: t('panel.details.stations.chongqingRTInt2021.wideDirection.horizontal'),
            },
            value: (attrs ?? defaultChongqingRTIntStation2021Attributes).wideDirection,
            onChange: val => {
                attrs.wideDirection = val as 'vertical' | 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            hidden: !attrs.isWide,
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRTIntStation2021Icon = (
    <svg viewBox="-1 -1 22 22" height={40} width={40} focusable={false} style={{ padding: 5 }}>
        <g textAnchor="middle">
            <rect x={0} y={0} width={20} height={20} stroke="black" strokeWidth={2} rx={2.5} ry={2.5} fill="white" />
            <text fontSize={8} textAnchor="middle" x={10} y={9} fill="black">
                两路
            </text>
            <text fontSize={8} textAnchor="middle" x={10} y={17} fill="black">
                口
            </text>
        </g>
    </svg>
);

const chongqingRTIntStation2021: Station<ChongqingRTIntStation2021Attributes> = {
    component: ChongqingRTIntStation2021,
    icon: chongqingRTIntStation2021Icon,
    defaultAttrs: defaultChongqingRTIntStation2021Attributes,
    attrsComponent: ChongqingRTInt2021AttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chongqingRTInt2021.displayName',
        cities: [CityCode.Chongqing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chongqingRTIntStation2021;
