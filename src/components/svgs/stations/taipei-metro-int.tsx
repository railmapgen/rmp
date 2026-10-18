import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
import { Station, StationComponentProps, StationType } from '../../../constants/stations';
import { InterchangeField } from '../../panels/details/interchange-field';
import { SameStyleLineEndpointOverlay } from '../common/same-style-line-endpoint-overlay';
import {
    getTaipeiStationNameFields,
    TaipeiMetroBadge,
    TaipeiStationHitTarget,
    TaipeiStationName,
    TaipeiStationNameAttributes,
    TAIPEI_METRO_BADGE_HEIGHT,
    TAIPEI_METRO_BADGE_WIDTH,
} from './taipei-common';

export type TaipeiMetroInterchangeInfo =
    | [...Theme, lineCode: string, stationCode: string]
    | [...Theme, lineCode: string, stationCode: string, style: 'hollow' | 'filled'];

export interface TaipeiMetroIntStationAttributes extends TaipeiStationNameAttributes {
    transfer: TaipeiMetroInterchangeInfo[][];
    align: 'horizontal' | 'vertical';
}

const defaultAttrs: TaipeiMetroIntStationAttributes = {
    names: ['台北車站', 'Taipei Main\nStation'],
    secondaryNames: ['', ''],
    secondaryNameOnNewLine: false,
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    align: 'horizontal',
    transfer: [
        [
            [CityCode.Taipei, 'bl', '#0070BD', MonoColour.white, 'BL', '12'],
            [CityCode.Taipei, 'r', '#E3002C', MonoColour.white, 'R', '10'],
        ],
    ],
};

const TaipeiMetroIntStation = (props: StationComponentProps) => {
    const attrs = { ...defaultAttrs, ...props.attrs[StationType.TaipeiMetroInt] };
    const entries = attrs.transfer[0] ?? [];
    const horizontal = attrs.align === 'horizontal';
    const pitch = horizontal ? 10.5 : 13.2;
    const count = Math.max(entries.length, 1);
    const width = TAIPEI_METRO_BADGE_WIDTH + 2.5 + (horizontal ? (count - 1) * pitch : 0);
    const height = TAIPEI_METRO_BADGE_HEIGHT + 2.8 + (horizontal ? 0 : (count - 1) * pitch);
    return (
        <g>
            <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={3} fill="#3A3637" />
            {entries.map((entry, index) => (
                <g
                    key={index}
                    transform={`translate(${horizontal ? (index - (entries.length - 1) / 2) * pitch : 0}, ${horizontal ? 0 : (index - (entries.length - 1) / 2) * pitch})`}
                >
                    <TaipeiMetroBadge
                        lineCode={entry[4]}
                        stationCode={entry[5]}
                        color={entry.slice(0, 4) as Theme}
                        filled={entry[6] === 'filled'}
                    />
                </g>
            ))}
            <TaipeiStationHitTarget {...props} width={width} height={height} />
            <TaipeiStationName
                id={props.id}
                type={StationType.TaipeiMetroInt}
                attrs={attrs}
                width={width}
                height={height}
            />
        </g>
    );
};

const TaipeiMetroIntAttrs = (props: AttrsProps<TaipeiMetroIntStationAttributes>) => {
    const { t } = useTranslation();
    return (
        <>
            <RmgFields
                fields={[
                    ...getTaipeiStationNameFields(props, t),
                    {
                        type: 'select',
                        label: t('panel.details.stations.taipeiCommon.align'),
                        value: props.attrs.align,
                        options: {
                            horizontal: t('panel.details.stations.taipeiCommon.horizontal'),
                            vertical: t('panel.details.stations.taipeiCommon.vertical'),
                        },
                        onChange: value => {
                            props.attrs.align = value as TaipeiMetroIntStationAttributes['align'];
                            props.handleAttrsUpdate(props.id, props.attrs);
                        },
                        minW: 'full',
                    },
                ]}
            />
            <InterchangeField
                stationType={StationType.TaipeiMetroInt}
                defaultAttrs={defaultAttrs}
                maximumTransfers={[1000, 0, 0]}
            />
        </>
    );
};

const taipeiMetroIntStation: Station<TaipeiMetroIntStationAttributes> = {
    component: TaipeiMetroIntStation,
    overlayComponent: SameStyleLineEndpointOverlay,
    icon: (
        <svg viewBox="-15 -12 30 24" width={40} height={40} focusable={false}>
            {[-5.25, 5.25].map((x, index) => (
                <g key={x} transform={`translate(${x}, 0)`}>
                    <TaipeiMetroBadge
                        lineCode={index ? 'R' : 'BL'}
                        stationCode={index ? '10' : '12'}
                        color={[CityCode.Taipei, '', 'currentColor', MonoColour.white]}
                    />
                </g>
            ))}
        </svg>
    ),
    defaultAttrs,
    attrsComponent: TaipeiMetroIntAttrs,
    metadata: {
        displayName: 'panel.details.stations.taipeiMetroInt.displayName',
        cities: [CityCode.Taipei],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default taipeiMetroIntStation;
