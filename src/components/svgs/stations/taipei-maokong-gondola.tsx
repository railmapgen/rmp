import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import { Station, StationComponentProps, StationType } from '../../../constants/stations';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { SameStyleLineEndpointOverlay } from '../common/same-style-line-endpoint-overlay';
import { TaipeiGondolaSymbol } from '../common/taipei-gondola-symbol';
import {
    getTaipeiStationNameFields,
    TaipeiStationHitTarget,
    TaipeiStationName,
    TaipeiStationNameAttributes,
} from './taipei-common';

export interface TaipeiMaokongGondolaStationAttributes extends TaipeiStationNameAttributes, ColorAttribute {}

const defaultAttrs: TaipeiMaokongGondolaStationAttributes = {
    names: ['動物園站', 'Taipei Zoo Station'],
    secondaryNames: ['', ''],
    secondaryNameOnNewLine: false,
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    color: [CityCode.Taipei, 'maokong', '#00AFD2', MonoColour.white],
};

const TaipeiMaokongGondolaStation = (props: StationComponentProps) => {
    const attrs = { ...defaultAttrs, ...props.attrs[StationType.TaipeiMaokongGondola] };
    return (
        <g>
            <TaipeiGondolaSymbol color={attrs.color[2]} windowColor="white" />
            <TaipeiStationHitTarget {...props} width={10} height={11.1} />
            <TaipeiStationName
                id={props.id}
                type={StationType.TaipeiMaokongGondola}
                attrs={attrs}
                width={10}
                height={11.1}
            />
        </g>
    );
};

const TaipeiMaokongGondolaAttrs = (props: AttrsProps<TaipeiMaokongGondolaStationAttributes>) => {
    const { t } = useTranslation();
    return (
        <RmgFields
            fields={[
                ...getTaipeiStationNameFields(props, t),
                {
                    type: 'custom',
                    label: t('color'),
                    component: <ColorField type={StationType.TaipeiMaokongGondola} defaultTheme={defaultAttrs.color} />,
                },
            ]}
        />
    );
};

const taipeiMaokongGondolaStation: Station<TaipeiMaokongGondolaStationAttributes> = {
    component: TaipeiMaokongGondolaStation,
    overlayComponent: SameStyleLineEndpointOverlay,
    icon: (
        <svg viewBox="-10 -10 20 20" width={40} height={40} focusable={false}>
            <TaipeiGondolaSymbol color="currentColor" />
        </svg>
    ),
    defaultAttrs,
    attrsComponent: TaipeiMaokongGondolaAttrs,
    metadata: {
        displayName: 'panel.details.stations.taipeiMaokongGondola.displayName',
        cities: [CityCode.Taipei],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.LightRail],
        tags: [],
    },
};

export default taipeiMaokongGondolaStation;
