import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const STATION_CODE_FONT_SIZE = 5.2;
const STATION_NAME_FONT_SIZE = 8.2628;
const BASE_TEXT_OFFSET = 0;

const NAME_DY_SZ_BASIC = {
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
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultMRTBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultMRTBasicStationAttributes.nameOffsetY,
        color = defaultMRTBasicStationAttributes.color,
        lineCode = defaultMRTBasicStationAttributes.lineCode,
        stationCode = defaultMRTBasicStationAttributes.stationCode,
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
    const textY = NAME_DY_SZ_BASIC[nameOffsetY].offset * NAME_DY_SZ_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
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
                        fill={color[2]}
                        stroke="white"
                        strokeWidth="1"
                    />
                    <text
                        fontSize={STATION_CODE_FONT_SIZE}
                        dx="-4"
                        dy="0.5"
                        className="rmp-name__mrt"
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
                        className="rmp-name__mrt"
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
                        text={names[0].split('\\')}
                        fontSize={STATION_NAME_FONT_SIZE}
                        lineHeight={STATION_NAME_FONT_SIZE}
                        grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'middle' ? 'bidirectional' : 'down'}
                        baseOffset={BASE_TEXT_OFFSET}
                        className="rmp-name__mrt"
                    />
                </g>
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            nameOffsetX,
            nameOffsetY,
            color,
            lineCode,
            stationCode,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * MRTBasicStation specific props.
 */
export interface MRTBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    lineCode: string;
    stationCode: string;
}

const defaultMRTBasicStationAttributes: MRTBasicStationAttributes = {
    names: ['Marina South Pier'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    lineCode: 'NS',
    stationCode: '28',
    color: [CityCode.Singapore, 'nsl', '#DA291C', MonoColour.white],
};

const MRTBasicAttrsComponent = (props: AttrsProps<MRTBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
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
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
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
            type: 'custom',
            label: t('color'),
            component: <ColorField type={StationType.MRTBasic} defaultTheme={defaultMRTBasicStationAttributes.color} />,
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="3" y="6" rx="3" ry="6" width="18" height="12" fill="currentColor" />
        <text fontSize="5" dx="9" dy="13.5" className="rmp-name__en" fill="white" textAnchor="middle">
            NS
        </text>
        <text fontSize="5" dx="16" dy="13.5" className="rmp-name__en" fill="white" textAnchor="middle">
            28
        </text>
    </svg>
);

const mrtBasicStation: Station<MRTBasicStationAttributes> = {
    component: MRTBasicStation,
    icon: mrtBasicStationIcon,
    defaultAttrs: defaultMRTBasicStationAttributes,
    attrsComponent: MRTBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.mrt.displayName',
        cities: [CityCode.Singapore],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default mrtBasicStation;
