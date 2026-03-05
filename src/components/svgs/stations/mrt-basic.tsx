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

const STATION_CODE_FONT_SIZE = 5.2;
const STATION_NAME_FONT_SIZE = 8.2628;
const BASE_TEXT_OFFSET = 0;

const NAME_DY_SG_BASIC = {
    top: {
        offset: STATION_NAME_FONT_SIZE + BASE_TEXT_OFFSET, // offset + baseOffset
        polarity: -1,
    },
    middle: {
        offset: 0,
        polarity: 0,
    },
    bottom: {
        offset: STATION_NAME_FONT_SIZE + BASE_TEXT_OFFSET, // offset + baseOffset
        polarity: 1,
    },
};

const MRTBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { isTram = defaultMRTBasicStationAttributes.isTram } =
        attrs[StationType.MRTBasic] ?? defaultMRTBasicStationAttributes;

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

    const width = 22.85;
    const height = 12.935;

    return (
        <g id={id} transform={`translate(${x}, ${y}) ${isTram ? 'scale(0.81)' : ''}`}>
            <g
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                <rect
                    x={-width / 2}
                    y={-height / 2}
                    rx="3"
                    ry="6"
                    width={width}
                    height={height}
                    fill="white"
                    stroke="white"
                    strokeWidth="1"
                />
            </g>
        </g>
    );
};

const MRTBasicStationPost = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultMRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultMRTBasicStationAttributes.nameOffsetY,
        color = defaultMRTBasicStationAttributes.color,
        lineCode = defaultMRTBasicStationAttributes.lineCode,
        stationCode = defaultMRTBasicStationAttributes.stationCode,
        isTram = defaultMRTBasicStationAttributes.isTram,
    } = attrs[StationType.MRTBasic] ?? defaultMRTBasicStationAttributes;

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

    const width = 22.85;
    const height = 12.935;

    const textPolarity = nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : 0;
    const textX = (width / 2 + 5) * textPolarity;
    const textY = NAME_DY_SG_BASIC[nameOffsetY].offset * NAME_DY_SG_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y}) ${isTram ? 'scale(0.81)' : ''}`}>
            <g
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                <rect x={-width / 2} y={-height / 2} rx="3" ry="6" width={width} height={height} fill={color[2]} />
                <text
                    fontSize={STATION_CODE_FONT_SIZE}
                    dx="-4"
                    dy="0.5"
                    {...getLangStyle(TextLanguage.mrt)}
                    fill={color[3]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {lineCode}
                </text>
                <text
                    fontSize={STATION_CODE_FONT_SIZE}
                    dx="4"
                    dy="0.5"
                    {...getLangStyle(TextLanguage.mrt)}
                    fill={color[3]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {stationCode}
                </text>
                <rect
                    id={`stn_core_${id}`}
                    x={-width / 2}
                    y={-height / 2}
                    rx="3"
                    ry="6"
                    width={width}
                    height={height}
                    fill="white"
                    opacity="0"
                />
            </g>
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={STATION_NAME_FONT_SIZE}
                    lineHeight={STATION_NAME_FONT_SIZE}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'middle' ? 'bidirectional' : 'down'}
                    baseOffset={BASE_TEXT_OFFSET}
                    {...getLangStyle(TextLanguage.mrt)}
                />
            </g>
        </g>
    );
};

/**
 * MRTBasicStation specific props.
 */
export interface MRTBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    lineCode: string;
    stationCode: string;
    isTram: boolean;
}

const defaultMRTBasicStationAttributes: MRTBasicStationAttributes = {
    names: ['Marina South Pier'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    lineCode: 'NS',
    stationCode: '28',
    isTram: false,
    color: [CityCode.Singapore, 'nsl', '#DA291C', MonoColour.white],
};

const MRTBasicAttrsComponent = (props: AttrsProps<MRTBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
            options: {
                left: t('panel.details.stations.common.left'),
                middle: t('panel.details.stations.common.middle'),
                right: t('panel.details.stations.common.right'),
            },
            disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as NameOffsetX;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetY,
            options: {
                top: t('panel.details.stations.common.top'),
                middle: t('panel.details.stations.common.middle'),
                bottom: t('panel.details.stations.common.bottom'),
            },
            disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: attrs.lineCode,
            onChange: val => {
                attrs.lineCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: attrs.stationCode,
            onChange: val => {
                attrs.stationCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.MRTBasic.isTram'),
            isChecked: attrs.isTram,
            onChange: val => {
                attrs.isTram = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
            oneLine: true,
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={StationType.MRTBasic} defaultTheme={defaultMRTBasicStationAttributes.color} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="6" y="8.6035" rx="1.575" ry="3.151" width="12" height="6.793" fill="currentColor" />
        <text fontSize="3.5" dx="10" dy="13" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            NS
        </text>
        <text fontSize="3.5" dx="15" dy="13" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            28
        </text>
    </svg>
);

const mrtBasicStation: Station<MRTBasicStationAttributes> = {
    component: MRTBasicStation,
    postComponent: MRTBasicStationPost,
    icon: mrtBasicStationIcon,
    defaultAttrs: defaultMRTBasicStationAttributes,
    attrsComponent: MRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.MRTBasic.displayName',
        cities: [CityCode.Singapore],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default mrtBasicStation;
