import React from 'react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export const LINE_HEIGHT = {
    zh: 9,
    en: 3.5,
    top: 3.5 + 1,
    middle: 3.5 + 1,
    bottom: 3.5 + 1,
};

const ChengduMetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChengduMetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultChengduMetroIntStationAttributes.nameOffsetY,
        direction = defaultChengduMetroIntStationAttributes.direction,
    } = attrs[StationType.ChengduMetroInt] ?? defaultChengduMetroIntStationAttributes;

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
    const height = direction == 'horizontal' ? 15 : 60;
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
                        className="rmp-name__en"
                        dominantBaseline="central"
                    />
                ) : (
                    <MultilineTextVertical
                        grow={nameOffsetX == 'left' ? 'right' : nameOffsetX == 'right' ? 'left' : 'bidirectional'}
                        lineWidth={LINE_HEIGHT.en}
                        text={names[1].split('\n')}
                        fontSize={LINE_HEIGHT.en}
                        className="rmp-name__en"
                        dominantBaseline="central"
                    />
                )}
            </g>
        </g>
    );
};

/**
 * ChengduMetroIntStation specific props.
 */
export interface ChengduMetroIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    direction: 'vertical' | 'horizontal';
}

const defaultChengduMetroIntStationAttributes: ChengduMetroIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    direction: 'horizontal',
};

const ChengduMetroIntAttrsComponent = (props: AttrsProps<ChengduMetroIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs.names ?? defaultChengduMetroIntStationAttributes.names)[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: (attrs.names ?? defaultChengduMetroIntStationAttributes.names)[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultChengduMetroIntStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultChengduMetroIntStationAttributes.nameOffsetY,
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
            label: t('panel.details.stations.chengduMetroBasic.isVertical'),
            isChecked: (attrs.direction ?? defaultChengduMetroIntStationAttributes.direction) == 'vertical',
            onChange: val => {
                attrs.direction = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chengduMetroIntStationIcon = (
    <svg viewBox="-1 -1 61 16" height={40} width={40} focusable={false} style={{ padding: 5 }}>
        <g textAnchor="middle">
            <rect x={0} y={-5} width={60} height={30} stroke={'black'} strokeWidth={2} rx={15} ry={15} fill={'white'} />
            <text fontSize={16} textAnchor="middle" x={30} y={15} fill={'black'} fontWeight={800}>
                孵化园
            </text>
        </g>
    </svg>
);

const chengduMetroIntStation: Station<ChengduMetroIntStationAttributes> = {
    component: ChengduMetroIntStation,
    icon: chengduMetroIntStationIcon,
    defaultAttrs: defaultChengduMetroIntStationAttributes,
    attrsComponent: ChengduMetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chengduMetroInt.displayName',
        cities: [CityCode.Chengdu],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chengduMetroIntStation;
