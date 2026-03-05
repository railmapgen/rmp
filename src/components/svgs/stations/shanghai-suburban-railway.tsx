import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { MultilineText } from '../common/multiline-text';
import { ROTATE_CONST } from './shmetro-basic-2020';

const ShanghaiSuburbanRailwayStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { names = defaultStationAttributes.names, rotate = defaultShanghaiSuburbanRailwayStationAttributes.rotate } =
        attrs[StationType.ShanghaiSuburbanRailway] ?? defaultShanghaiSuburbanRailwayStationAttributes;

    const textDy =
        ROTATE_CONST[rotate].textDy + // fixed dy for each rotation
        (names[ROTATE_CONST[rotate].namesPos].split('\n').length - 1) *
            ROTATE_CONST[rotate].lineHeight *
            ROTATE_CONST[rotate].polarity; // dynamic dy of n lines (either zh or en)

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

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                <rect x="-2" y="-7.83" width="4" height="7.83" stroke="none" fill="#898989" />
                {/* A mask for the end of shanghai suburban railway style. */}
                <rect x="-3.5" y="-1" width="7" height="2" stroke="none" fill="white" />
                <rect
                    x={-2 + 1.1675}
                    y={-7.83 + 1.5}
                    width={(4 * 2) / 5}
                    height={7.83 - 1.5}
                    stroke="none"
                    fill="white"
                />

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    id={`stn_core_${id}`}
                    x="-2"
                    y="-7.83"
                    width="4"
                    height={7.83 + 1.25}
                    stroke="none"
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    className="removeMe"
                />
            </g>
            <g
                transform={`translate(${x + ROTATE_CONST[rotate].textDx}, ${y + textDy})`}
                textAnchor={ROTATE_CONST[rotate].textAnchor}
                className="rmp-name-outline"
                strokeWidth="2.5"
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={12.67}
                    lineHeight={12.67}
                    grow="up"
                    baseOffset={1}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    dx={rotate >= 45 && rotate <= 135 ? 1.67 : 0}
                    fontSize={6.67}
                    lineHeight={6.67}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * ShanghaiSuburbanRailwayStation specific props.
 */
export interface ShanghaiSuburbanRailwayStationAttributes extends StationAttributes {
    rotate: Rotate;
}

const defaultShanghaiSuburbanRailwayStationAttributes: ShanghaiSuburbanRailwayStationAttributes = {
    ...defaultStationAttributes,
    rotate: 0,
};

const shanghaiSuburbanRailwayAttrsComponent = (props: AttrsProps<ShanghaiSuburbanRailwayStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultShanghaiSuburbanRailwayStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
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
    ];

    return <RmgFields fields={fields} />;
};

const shanghaiSuburbanRailwayStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="currentColor" />
    </svg>
);

const shanghaiSuburbanRailwayStation: Station<ShanghaiSuburbanRailwayStationAttributes> = {
    component: ShanghaiSuburbanRailwayStation,
    icon: shanghaiSuburbanRailwayStationIcon,
    defaultAttrs: defaultShanghaiSuburbanRailwayStationAttributes,
    attrsComponent: shanghaiSuburbanRailwayAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shanghaiSuburbanRailway.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shanghaiSuburbanRailwayStation;
