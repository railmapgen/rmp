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
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText } from '../common/multiline-text';

const STATION_CODE_FONT_SIZE = 6.9;
const STATION_NAME_FONT_SIZE = 8.2628;
const BASE_TEXT_OFFSET = 2.5;

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

const MRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { transfer = defaultMRTIntStationAttributes.transfer } =
        attrs[StationType.MRTInt] ?? defaultMRTIntStationAttributes;

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

    const height = 16.77;
    const width = (transfer[0].length - 2) * 29.625 + 57.8;

    return (
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
                    rx="4.5"
                    ry="8"
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

const MRTIntStationPost = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultMRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultMRTIntStationAttributes.nameOffsetY,
        transfer = defaultMRTIntStationAttributes.transfer,
    } = attrs[StationType.MRTInt] ?? defaultMRTIntStationAttributes;

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

    const transfer0 = transfer.at(0)!;
    const width = (transfer0.length - 2) * 29.625 + 57.8;
    const height = 16.77;

    const dividingIndex: number[] = []; // the index of transfer line that has the same color as the previous one
    for (let i = 1; i < transfer0.length; i++) if (transfer0[i][2] == transfer0[i - 1][2]) dividingIndex.push(i);

    const textPolarity = nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : 0;
    const textX = (nameOffsetY === 'middle' ? width / 2 + 5 : 10) * textPolarity;
    const textY = NAME_DY_SG_BASIC[nameOffsetY].offset * NAME_DY_SG_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                {transfer.map((info, i) => (
                    <React.Fragment key={info.map(int => int[2]).join('_')}>
                        <rect
                            x={-width / 2}
                            y={-height / 2}
                            rx="4.5"
                            ry="8"
                            width={width}
                            height={height}
                            fill={`url(#${id}_grad_${i})`}
                        />
                        <linearGradient id={`${id}_grad_${i}`} y1="0%" y2="0%" x1="0%" x2="100%">
                            {info.map((int, j) => (
                                <React.Fragment key={int[2]}>
                                    <stop // from
                                        offset={`${(100 / info.length) * j}%`}
                                        stopColor={int[2]}
                                    />
                                    <stop // to
                                        offset={`${(100 / info.length) * (j + 1)}%`}
                                        stopColor={int[2]}
                                    />
                                </React.Fragment>
                            ))}
                        </linearGradient>
                        {dividingIndex.map(j => (
                            <line
                                key={j}
                                x1={(j / info.length) * width - width / 2}
                                x2={(j / info.length) * width - width / 2}
                                y1={-height / 2}
                                y2={height / 2}
                                stroke="white"
                                strokeWidth="1"
                            />
                        ))}
                        {info.map((int, j, arr) => (
                            <React.Fragment key={int[2]}>
                                <text
                                    fontSize={STATION_CODE_FONT_SIZE}
                                    dx={
                                        (int[5] !== '' ? -5 : -2) +
                                        (width / arr.length / 2) * (j * 2 + 1) -
                                        width / 2 +
                                        1
                                    }
                                    dy="0.5"
                                    {...getLangStyle(TextLanguage.mrt)}
                                    fill={int[3]}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    {int[4]}
                                </text>
                                <text
                                    fontSize={STATION_CODE_FONT_SIZE}
                                    dx={5 + (width / arr.length / 2) * (j * 2 + 1) - width / 2 + 1}
                                    dy="0.5"
                                    {...getLangStyle(TextLanguage.mrt)}
                                    fill={int[3]}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    {int[5]}
                                </text>
                            </React.Fragment>
                        ))}
                        <rect
                            id={`stn_core_${id}`}
                            x={-width / 2}
                            y={-height / 2}
                            rx="4.5"
                            ry="8"
                            width={width}
                            height={height}
                            fill="white"
                            opacity="0"
                        />
                    </React.Fragment>
                ))}
            </g>
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={STATION_NAME_FONT_SIZE}
                    lineHeight={STATION_NAME_FONT_SIZE}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'middle' ? 'bidirectional' : 'down'}
                    baseOffset={0}
                    {...getLangStyle(TextLanguage.mrt)}
                />
            </g>
        </g>
    );
};

/**
 * MRTIntStation specific props.
 */
export interface MRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultMRTIntStationAttributes: MRTIntStationAttributes = {
    names: ['Chinatown'],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [
        [
            [CityCode.Singapore, 'nel', '#9B26B6', MonoColour.white, 'NE', '4'],
            [CityCode.Singapore, 'dtl', '#0057B7', MonoColour.white, 'DT', '19'],
        ],
    ],
};

const MRTIntAttrsComponent = (props: AttrsProps<MRTIntStationAttributes>) => {
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
    ];

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.MRTInt}
                defaultAttrs={defaultMRTIntStationAttributes}
                maximumTransfers={[Infinity, 0, 0]}
            />
        </>
    );
};

const mrtIntStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="2" y="9.0985" rx="1.038" ry="2.076" width="20" height="5.803" fill="currentColor" />
        <text fontSize="3" dx="5" dy="13.25" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            NE
        </text>
        <text fontSize="3" dx="9.5" dy="13.25" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            4
        </text>
        <text fontSize="3" dx="14.5" dy="13.25" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            DT
        </text>
        <text fontSize="3" dx="19" dy="13.25" {...getLangStyle(TextLanguage.mrt)} fill="white" textAnchor="middle">
            19
        </text>
    </svg>
);

const mrtIntStation: Station<MRTIntStationAttributes> = {
    component: MRTIntStation,
    postComponent: MRTIntStationPost,
    icon: mrtIntStationIcon,
    defaultAttrs: defaultMRTIntStationAttributes,
    attrsComponent: MRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.MRTInt.displayName',
        cities: [CityCode.Singapore],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default mrtIntStation;
