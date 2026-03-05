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
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { NAME_DY_SH_BASIC } from './shmetro-basic';

const GuangdongIntercityRailwayStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultGuangdongIntercityRailwayStationAttributes.nameOffsetX,
        nameOffsetY = defaultGuangdongIntercityRailwayStationAttributes.nameOffsetY,
        interchange = defaultGuangdongIntercityRailwayStationAttributes.interchange,
    } = attrs[StationType.GuangdongIntercityRailway] ?? defaultGuangdongIntercityRailwayStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -13.33 : nameOffsetX === 'right' ? 13.33 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_SH_BASIC[nameOffsetY].lineHeight +
            NAME_DY_SH_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle r={5} stroke="#2559a8" strokeWidth="1.5" fill="white" />
            {interchange && <circle r={2.5} stroke="#2559a8" strokeWidth="1" fill="white" />}

            {/* Below is an overlay element that has all event hooks but can not be seen. */}
            <circle
                id={`stn_core_${id}`}
                r={5 + 1.33 / 2}
                fill="white"
                fillOpacity="0"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
                className="removeMe"
            />
            <g
                transform={`translate(${textX}, ${textY})`}
                textAnchor={textAnchor}
                className="rmp-name-outline"
                strokeWidth="1"
            >
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={13.13}
                    lineHeight={13.13}
                    grow="up"
                    baseOffset={1}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={5.83}
                    lineHeight={5.83}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * GuangdongIntercityRailwayStation specific props.
 */
export interface GuangdongIntercityRailwayStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    interchange: boolean;
}

const defaultGuangdongIntercityRailwayStationAttributes: GuangdongIntercityRailwayStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    interchange: false,
};

const guangdongIntercityRailwayAttrsComponent = (props: AttrsProps<GuangdongIntercityRailwayStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
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
            value: attrs.names.at(1) ?? defaultGuangdongIntercityRailwayStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
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
            type: 'switch',
            label: t('panel.details.stations.interchange.title'),
            oneLine: true,
            isChecked: attrs.interchange,
            onChange: val => {
                attrs.interchange = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const guangdongIntercityRailwayStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.25" fill="white" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="white" />
    </svg>
);

const guangdongIntercityRailwayStation: Station<GuangdongIntercityRailwayStationAttributes> = {
    component: GuangdongIntercityRailwayStation,
    icon: guangdongIntercityRailwayStationIcon,
    defaultAttrs: defaultGuangdongIntercityRailwayStationAttributes,
    attrsComponent: guangdongIntercityRailwayAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.guangdongIntercityRailway.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default guangdongIntercityRailwayStation;
