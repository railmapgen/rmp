import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import { Station, StationComponentProps, StationType } from '../../../constants/stations';
import { ColorField } from '../../panels/details/color-field';
import { SameStyleLineEndpointOverlay } from '../common/same-style-line-endpoint-overlay';
import {
    getTaipeiStationNameFields,
    TaipeiMetroBadge,
    TaipeiMetroBadgeProps,
    TaipeiStationHitTarget,
    TaipeiStationName,
    TaipeiStationNameAttributes,
    TAIPEI_METRO_BADGE_HEIGHT,
    TAIPEI_METRO_BADGE_WIDTH,
} from './taipei-common';

export interface TaipeiMetroBasicStationAttributes extends TaipeiStationNameAttributes, TaipeiMetroBadgeProps {
    filled: boolean;
}

const defaultAttrs: TaipeiMetroBasicStationAttributes = {
    names: ['淡水', 'Tamsui'],
    secondaryNames: ['', ''],
    secondaryNameOnNewLine: false,
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    lineCode: 'R',
    stationCode: '28',
    color: [CityCode.Taipei, 'r', '#E3002C', MonoColour.white],
    filled: false,
};

const TaipeiMetroBasicStation = (props: StationComponentProps) => {
    const attrs = { ...defaultAttrs, ...props.attrs[StationType.TaipeiMetroBasic] };
    return (
        <g>
            <TaipeiMetroBadge {...attrs} />
            <TaipeiStationHitTarget {...props} width={TAIPEI_METRO_BADGE_WIDTH} height={TAIPEI_METRO_BADGE_HEIGHT} />
            <TaipeiStationName
                id={props.id}
                type={StationType.TaipeiMetroBasic}
                attrs={attrs}
                width={TAIPEI_METRO_BADGE_WIDTH}
                height={TAIPEI_METRO_BADGE_HEIGHT}
            />
        </g>
    );
};

const TaipeiMetroBasicAttrs = (props: AttrsProps<TaipeiMetroBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        ...getTaipeiStationNameFields(props, t),
        ...(['lineCode', 'stationCode'] as const).map(
            (key): RmgFieldsField => ({
                type: 'input',
                label: t(`panel.details.stations.common.${key}`),
                value: attrs[key],
                onChange: value => {
                    attrs[key] = value;
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            })
        ),
        {
            type: 'switch',
            label: t('panel.details.stations.taipeiCommon.filled'),
            isChecked: attrs.filled,
            onChange: value => {
                attrs.filled = value;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={StationType.TaipeiMetroBasic} defaultTheme={defaultAttrs.color} />,
        },
    ];
    return <RmgFields fields={fields} />;
};

const taipeiMetroBasicStation: Station<TaipeiMetroBasicStationAttributes> = {
    component: TaipeiMetroBasicStation,
    overlayComponent: SameStyleLineEndpointOverlay,
    icon: (
        <svg viewBox="-12 -12 24 24" width={40} height={40} focusable={false}>
            <TaipeiMetroBadge
                lineCode="R"
                stationCode="03"
                color={[CityCode.Taipei, '', 'currentColor', MonoColour.white]}
            />
        </svg>
    ),
    defaultAttrs,
    attrsComponent: TaipeiMetroBasicAttrs,
    metadata: {
        displayName: 'panel.details.stations.taipeiMetroBasic.displayName',
        cities: [CityCode.Taipei],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default taipeiMetroBasicStation;
