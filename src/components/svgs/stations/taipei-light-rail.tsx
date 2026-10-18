import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import { Station, StationComponentProps, StationType } from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import {
    getTaipeiOpacityMode,
    getTaipeiOpacityOptions,
    resolveTaipeiOpacity,
    TaipeiOpacitySetting,
} from '../../../util/taipei-opacity';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { SameStyleLineEndpointOverlay } from '../common/same-style-line-endpoint-overlay';
import {
    getTaipeiStationNameFields,
    TaipeiGlyphTheme,
    TaipeiStationHitTarget,
    TaipeiStationName,
    TaipeiStationNameAttributes,
} from './taipei-common';

export interface TaipeiLightRailStationAttributes extends TaipeiStationNameAttributes, ColorAttribute {
    lineCode: string;
    stationCode: string;
    codeLayout: 'inline' | 'stacked';
    opacity?: TaipeiOpacitySetting;
    textOpacity?: TaipeiOpacitySetting;
}

const defaultAttrs: TaipeiLightRailStationAttributes = {
    names: ['崁頂', 'Kanding'],
    secondaryNames: ['', ''],
    secondaryNameOnNewLine: false,
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    lineCode: 'V',
    stationCode: '11',
    codeLayout: 'inline',
    opacity: 'preset',
    textOpacity: 'preset',
    color: [CityCode.Taipei, 'v', '#E5554F', MonoColour.white],
};

export const TaipeiLightRailBadge = ({
    lineCode,
    stationCode,
    codeLayout,
    color,
    opacity = 1,
    textOpacity = 1,
}: Pick<TaipeiLightRailStationAttributes, 'lineCode' | 'stationCode' | 'codeLayout'> & {
    color: TaipeiGlyphTheme;
    opacity?: number;
    textOpacity?: number;
}) => (
    <g data-taipei-light-rail-badge={codeLayout}>
        <circle data-taipei-light-rail-background="" r={9.5 / 2} fill="white" />
        <circle
            data-taipei-light-rail-outline=""
            r={(9.5 - 1.15) / 2}
            fill="none"
            stroke={color[2]}
            strokeWidth={1.15}
            opacity={opacity}
        />
        <g {...getLangStyle(TextLanguage.en)} fill="black" fontWeight="bold" textAnchor="middle" opacity={textOpacity}>
            {codeLayout === 'stacked' ? (
                <>
                    <text y={-0.3} fontSize={3.7}>
                        {lineCode}
                    </text>
                    <text y={3.2} fontSize={3.7}>
                        {stationCode}
                    </text>
                </>
            ) : (
                <text y={1.6} fontSize={4.5}>
                    {lineCode}
                    {stationCode}
                </text>
            )}
        </g>
    </g>
);

const TaipeiLightRailStation = (props: StationComponentProps) => {
    const attrs = { ...defaultAttrs, ...props.attrs[StationType.TaipeiLightRail] };
    const opacity = resolveTaipeiOpacity(attrs.opacity, 0.45);
    const textOpacity = resolveTaipeiOpacity(attrs.textOpacity, 0.55);
    return (
        <g>
            <TaipeiLightRailBadge {...attrs} opacity={opacity} textOpacity={textOpacity} />
            <TaipeiStationHitTarget {...props} width={9.5} height={9.5} />
            <g opacity={textOpacity}>
                <TaipeiStationName
                    id={props.id}
                    type={StationType.TaipeiLightRail}
                    attrs={attrs}
                    width={9.5}
                    height={9.5}
                />
            </g>
        </g>
    );
};

const TaipeiLightRailAttrs = (props: AttrsProps<TaipeiLightRailStationAttributes>) => {
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
            type: 'select',
            label: t('panel.details.stations.taipeiLightRail.codeLayout'),
            value: attrs.codeLayout,
            options: {
                inline: t('panel.details.stations.taipeiLightRail.codeInline'),
                stacked: t('panel.details.stations.taipeiLightRail.codeStacked'),
            },
            onChange: value => {
                attrs.codeLayout = value as TaipeiLightRailStationAttributes['codeLayout'];
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        ...(['opacity', 'textOpacity'] as const).map(
            (key): RmgFieldsField => ({
                type: 'select',
                label: t(
                    key === 'opacity'
                        ? 'panel.details.lines.generic.opacity'
                        : 'panel.details.stations.taipeiLightRail.textOpacity'
                ),
                value: getTaipeiOpacityMode(attrs[key]),
                options: getTaipeiOpacityOptions(t),
                onChange: value => {
                    attrs[key] = value === 'opaque' ? 'opaque' : 'preset';
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            })
        ),
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={StationType.TaipeiLightRail} defaultTheme={defaultAttrs.color} />,
        },
    ];
    return <RmgFields fields={fields} />;
};

const taipeiLightRailStation: Station<TaipeiLightRailStationAttributes> = {
    component: TaipeiLightRailStation,
    overlayComponent: SameStyleLineEndpointOverlay,
    icon: (
        <svg viewBox="-10 -10 20 20" width={40} height={40} focusable={false}>
            <TaipeiLightRailBadge
                lineCode="V"
                stationCode="11"
                codeLayout="inline"
                color={[CityCode.Taipei, '', 'currentColor', MonoColour.white]}
            />
        </svg>
    ),
    defaultAttrs,
    attrsComponent: TaipeiLightRailAttrs,
    metadata: {
        displayName: 'panel.details.stations.taipeiLightRail.displayName',
        cities: [CityCode.Taipei],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.LightRail],
        tags: [],
    },
};

export default taipeiLightRailStation;
