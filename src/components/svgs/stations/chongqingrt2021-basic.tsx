import React from 'react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
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
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';

export const LINE_HEIGHT = {
    zh: 9,
    en: 4,
    top: 4 + 1,
    middle: 0,
    bottom: 9 + 1,
};

const ChongqingRT2021BasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultChongqingRT2021BasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultChongqingRT2021BasicStationAttributes.nameOffsetY,
        color = defaultChongqingRT2021BasicStationAttributes.color,
        lineCode = defaultChongqingRT2021BasicStationAttributes.lineCode,
        stationCode = defaultChongqingRT2021BasicStationAttributes.stationCode,
        open = defaultChongqingRT2021BasicStationAttributes.open,
    } = attrs[StationType.ChongqingRT2021Basic] ?? defaultChongqingRT2021BasicStationAttributes;

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

    const getTextOffset = (oX: NameOffsetX, oY: NameOffsetY) => {
        if (oX === 'left' && oY === 'top') {
            return [-6.5, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 7.5];
        } else if (oX === 'middle' && oY === 'top') {
            return [0, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 9.5];
        } else if (oX === 'right' && oY === 'top') {
            return [7.5, -(names[1].split('\n').length + (!open ? 1 : 0)) * LINE_HEIGHT[oY] - 7.5];
        } else if (oX === 'left' && oY === 'bottom') {
            return [-6.5, names[0].split('\n').length * LINE_HEIGHT[oY] + 7.5];
        } else if (oX === 'middle' && oY === 'bottom') {
            return [0, names[0].split('\n').length * LINE_HEIGHT[oY] + 9.5];
        } else if (oX === 'right' && oY === 'bottom') {
            return [7.5, names[0].split('\n').length * LINE_HEIGHT[oY] + 7.5];
        } else if (oX === 'left' && oY === 'middle') {
            return [-10.5, 2];
        } else if (oX === 'right' && oY === 'middle') {
            return [10.5, 2];
        } else return [0, 0];
    };

    const [textX, textY] = getTextOffset(nameOffsetX, nameOffsetY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';
    const isTextLine = new RegExp('[\\u4E00-\\u9FFF]+', 'g').test(lineCode);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <rect
                x={-7.5}
                y={-7.5}
                width={15}
                height={15}
                stroke={color[2]}
                strokeWidth={1.2}
                rx={2}
                ry={2}
                fill="white"
            />
            <text fontSize={isTextLine ? 5 : 7} textAnchor="middle" x={0} y={isTextLine ? -1.5 : -1}>
                {lineCode}
            </text>
            <text fontSize={7} textAnchor="middle" x={0} y={6}>
                {Number.isInteger(stationCode) && Number(stationCode) < 10 ? `0${Number(stationCode)}` : stationCode}
            </text>
            {(lineCode || stationCode) && <line x1={-5.5} y1={0} x2={5.5} y2={0} stroke={'black'} strokeWidth={0.6} />}
            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <rect
                id={`stn_core_${id}`}
                x={-8.5}
                y={-8.5}
                width={17}
                height={17}
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
                    text={names[0].split('\n')}
                    fontSize={LINE_HEIGHT.zh}
                    lineHeight={LINE_HEIGHT.zh}
                    grow="up"
                    className="rmp-name__zh"
                    baseOffset={1}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={LINE_HEIGHT.en}
                    lineHeight={LINE_HEIGHT.en}
                    grow="down"
                    className="rmp-name__en"
                    baseOffset={1}
                />
                {!open && (
                    <text
                        dy={names[1].split('\n').length * LINE_HEIGHT.en + 2}
                        fontSize={LINE_HEIGHT.en}
                        dominantBaseline="hanging"
                        className="rmp-name__zh"
                    >
                        (暂缓开通)
                    </text>
                )}
            </g>
        </g>
    );
};

/**
 * ChongqingRT2021BasicStation specific props.
 */
export interface ChongqingRT2021BasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    lineCode: string;
    stationCode: string;
    open: boolean;
}

const defaultChongqingRT2021BasicStationAttributes: ChongqingRT2021BasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Chongqing, 'cq1', '#e4002b', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    lineCode: '1',
    stationCode: '1',
    open: true,
};

const ChongqingRT2021BasicAttrsComponent = (props: AttrsProps<ChongqingRT2021BasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).nameOffsetX,
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
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs?.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).lineCode,
            onChange: val => {
                attrs.lineCode = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: (attrs ?? defaultChongqingRT2021BasicStationAttributes).stationCode,
            onChange: val => {
                attrs.stationCode = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.ChongqingRT2021Basic}
                    defaultTheme={defaultChongqingRT2021BasicStationAttributes.color}
                />
            ),
        },
        {
            type: 'switch',
            label: t('panel.details.stations.chongqingRT2021Basic.open'),
            oneLine: true,
            isChecked: (attrs ?? defaultChongqingRT2021BasicStationAttributes).open,
            onChange: (val: boolean) => {
                attrs.open = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
    return <RmgFields fields={fields} />;
};

const chongqingRT2021BasicStationIcon = (
    <svg viewBox="-1 -1 14 14" width={40} height={40} focusable={false} style={{ padding: 5 }}>
        <rect
            x={0}
            y={0}
            width={12}
            height={12}
            stroke="black"
            strokeWidth={1.2}
            rx={2}
            ry={2}
            fill="white"
            style={{ cursor: 'move' }}
        />
        <text fontSize={5.5} textAnchor="middle" x={6} y={5}>
            1
        </text>
        <text fontSize={5.5} textAnchor="middle" x={6} y={11}>
            01
        </text>
        <line x1={1.5} y1={6} x2={10.5} y2={6} stroke={'black'} strokeWidth={0.6} />
    </svg>
);

const chongqingRT2021BasicStation: Station<ChongqingRT2021BasicStationAttributes> = {
    component: ChongqingRT2021BasicStation,
    icon: chongqingRT2021BasicStationIcon,
    defaultAttrs: defaultChongqingRT2021BasicStationAttributes,
    attrsComponent: ChongqingRT2021BasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.chongqingRT2021Basic.displayName',
        cities: [CityCode.Chongqing],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default chongqingRT2021BasicStation;
