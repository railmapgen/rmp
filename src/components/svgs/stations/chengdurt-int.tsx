import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
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
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export const LINE_HEIGHT = {
    zh: 9,
    en: 3.5,
    top: 3.5 + 1,
    middle: 3.5 + 1,
    bottom: 3.5 + 1,
};

const ChengduRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChengduRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultChengduRTIntStationAttributes.nameOffsetY,
        direction = defaultChengduRTIntStationAttributes.direction,
    } = attrs[StationType.ChengduRTInt] ?? defaultChengduRTIntStationAttributes;

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
        if (direction == 'horizontal') {
            if (oX === 'left' && oY === 'top') {
                return [-10, -names[1].split('\n').length * LINE_HEIGHT.en - 9];
            } else if (oX === 'middle' && oY === 'top') {
                return [0, -names[1].split('\n').length * LINE_HEIGHT.en - 9];
            } else if (oX === 'right' && oY === 'top') {
                return [10, -names[1].split('\n').length * LINE_HEIGHT.en - 9];
            } else if (oX === 'left' && oY === 'bottom') {
                return [-10, 9];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [0, 9];
            } else if (oX === 'right' && oY === 'bottom') {
                return [10, 9];
            } else if (oX === 'left' && oY === 'middle') {
                return [-(width / 2 + 3), (-names[1].split('\n').length * LINE_HEIGHT.en) / 2];
            } else if (oX === 'right' && oY === 'middle') {
                return [width / 2 + 3, (-names[1].split('\n').length * LINE_HEIGHT.en) / 2];
            } else return [0, 0];
        } else {
            if (oX === 'left' && oY === 'top') {
                return [-names[1].split('\n').length * LINE_HEIGHT.en - 9, -6];
            } else if (oX === 'middle' && oY === 'top') {
                return [-1.5, -(height / 2 + 3)];
            } else if (oX === 'right' && oY === 'top') {
                return [names[1].split('\n').length * LINE_HEIGHT.en + 9, -6];
            } else if (oX === 'left' && oY === 'bottom') {
                return [-names[1].split('\n').length * LINE_HEIGHT.en - 9, 6];
            } else if (oX === 'middle' && oY === 'bottom') {
                return [-1.5, height / 2 + 3];
            } else if (oX === 'right' && oY === 'bottom') {
                return [names[1].split('\n').length * LINE_HEIGHT.en + 9, 6];
            } else if (oX === 'left' && oY === 'middle') {
                return [-names[1].split('\n').length * LINE_HEIGHT.en - 9, 0];
            } else if (oX === 'right' && oY === 'middle') {
                return [names[1].split('\n').length * LINE_HEIGHT.en + 9, 0];
            } else return [0, 0];
        }
    };

    const width =
        direction == 'horizontal' ? (names[0].length > 5 ? 60 + (names[0].length - 5) * LINE_HEIGHT.zh : 60) : 15;
    const height =
        direction == 'vertical' ? (names[0].length > 5 ? 60 + (names[0].length - 5) * LINE_HEIGHT.zh : 60) : 15;
    const [textX, textY] = getTextOffset();
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
        <g id={id} transform={`translate(${x}, ${y})`} textAnchor="middle">
            <rect
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                stroke={'black'}
                strokeWidth={0.5}
                rx={7.5}
                ry={7.5}
                fill={'white'}
            />
            <text
                fontSize={9}
                textAnchor="middle"
                writingMode={direction == 'horizontal' ? 'lr-tb' : 'tb'}
                x={0}
                y={direction == 'horizontal' ? 3 : 0}
                fill={'black'}
                fontWeight={800}
            >
                {names[0]}
            </text>
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
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor} className="rmp-name-outline">
                {direction == 'horizontal' ? (
                    <MultilineText
                        grow="down"
                        lineHeight={LINE_HEIGHT.en}
                        text={names[1].split('\n')}
                        fontSize={LINE_HEIGHT.en}
                        {...getLangStyle(TextLanguage.en)}
                        dominantBaseline="central"
                    />
                ) : (
                    <MultilineTextVertical
                        grow={nameOffsetX == 'left' ? 'right' : nameOffsetX == 'right' ? 'left' : 'bidirectional'}
                        lineWidth={LINE_HEIGHT.en}
                        text={names[1].split('\n')}
                        fontSize={LINE_HEIGHT.en}
                        {...getLangStyle(TextLanguage.en)}
                        dominantBaseline="central"
                    />
                )}
            </g>
        </g>
    );
};

/**
 * ChengduRTIntStation specific props.
 */
export interface ChengduRTIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    direction: 'vertical' | 'horizontal';
}

const defaultChengduRTIntStationAttributes: ChengduRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    direction: 'horizontal',
};

const ChengduRTIntAttrsComponent = (props: AttrsProps<ChengduRTIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs.names ?? defaultChengduRTIntStationAttributes.names)[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: (attrs.names ?? defaultChengduRTIntStationAttributes.names)[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultChengduRTIntStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultChengduRTIntStationAttributes.nameOffsetY,
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
            label: t('panel.details.stations.chengduRTBasic.isVertical'),
            isChecked: (attrs.direction ?? defaultChengduRTIntStationAttributes.direction) == 'vertical',
            onChange: val => {
                attrs.direction = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chengduRTIntStationIcon = (
    <svg viewBox="-1 -1 61 16" height={40} width={40} focusable={false} style={{ padding: 5 }}>
        <g textAnchor="middle">
            <rect x={0} y={-5} width={60} height={30} stroke={'black'} strokeWidth={2} rx={15} ry={15} fill={'white'} />
            <text fontSize={16} textAnchor="middle" x={30} y={15} fill={'black'} fontWeight={800}>
                孵化园
            </text>
        </g>
    </svg>
);

const chengduRTIntStation: Station<ChengduRTIntStationAttributes> = {
    component: ChengduRTIntStation,
    icon: chengduRTIntStationIcon,
    defaultAttrs: defaultChengduRTIntStationAttributes,
    attrsComponent: ChengduRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chengduRTInt.displayName',
        cities: [CityCode.Chengdu],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chengduRTIntStation;
