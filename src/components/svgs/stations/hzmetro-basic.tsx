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
import { MultilineText, NAME_DY } from '../common/multiline-text';

export const NAME_DY_HZ_BASIC = {
    top: {
        lineHeight: 12,
        offset: 3.25 + 3.25, // offset + iconRadius
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 18,
        offset: -0.17 + 1 + 5, // offset + iconRadius
    },
};

const HzmetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultHzmetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultHzmetroBasicStationAttributes.nameOffsetY,
        color = defaultHzmetroBasicStationAttributes.color,
        scale = defaultHzmetroBasicStationAttributes.scale,
    } = attrs[StationType.HzmetroBasic] ?? defaultHzmetroBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -4 : nameOffsetX === 'right' ? 4 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_HZ_BASIC[nameOffsetY].lineHeight +
            NAME_DY_HZ_BASIC[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={3.25}
                stroke={color[2]}
                strokeWidth="1"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${textX}, ${textY}) scale(${scale} 1)`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={18}
                    lineHeight={18}
                    grow="up"
                    baseOffset={1}
                    letterSpacing={2}
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    y="2"
                    text={names[1].split('\n')}
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={12}
                    lineHeight={12}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

/**
 * HzmetroBasicStation specific props.
 */
export interface HzmetroBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    scale: number;
}

const defaultHzmetroBasicStationAttributes: HzmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    scale: 1,
    color: [CityCode.Hangzhou, 'hz1', '#e8384a', MonoColour.white],
};

const hzmetroBasicAttrsComponent = (props: AttrsProps<HzmetroBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0] ?? defaultHzmetroBasicStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultHzmetroBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultHzmetroBasicStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultHzmetroBasicStationAttributes.nameOffsetY,
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
            type: 'slider',
            label: t('panel.details.stations.hzmetroBasic.scale'),
            value: attrs.scale ?? defaultHzmetroBasicStationAttributes.scale,
            onChange: val => {
                attrs.scale = val;
                handleAttrsUpdate(id, attrs);
            },
            step: 0.025,
            min: 0.5,
            max: 1,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={StationType.HzmetroBasic} defaultTheme={defaultHzmetroBasicStationAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const hzmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="white" />
    </svg>
);

const hzmetroBasicStation: Station<HzmetroBasicStationAttributes> = {
    component: HzmetroBasicStation,
    icon: hzmetroBasicStationIcon,
    defaultAttrs: defaultHzmetroBasicStationAttributes,
    attrsComponent: hzmetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.hzmetroBasic.displayName',
        cities: [CityCode.Hangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default hzmetroBasicStation;
