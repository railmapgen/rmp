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
import { MultilineText, NAME_DY } from '../common/multiline-text';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const NAME_DY_CS_BASIC = {
    top: { lineHeight: 6, offset: 14 },
    middle: { lineHeight: 0, offset: 0 },
    bottom: { lineHeight: 12.67, offset: 9 },
};

const CsmetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultCsmetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultCsmetroBasicStationAttributes.nameOffsetY,
        color = defaultCsmetroBasicStationAttributes.color,
    } = attrs[StationType.CsmetroBasic] ?? defaultCsmetroBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -10 : nameOffsetX === 'right' ? 10 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_CS_BASIC[nameOffsetY].lineHeight +
            NAME_DY_CS_BASIC[nameOffsetY].offset) *
            NAME_DY[nameOffsetY].polarity +
        2;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={7}
                stroke={color[2]}
                strokeWidth={2}
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g
                transform={`translate(${textX}, ${textY})`}
                textAnchor={textAnchor}
                className="rmp-name-outline"
                strokeWidth="1"
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
                    dx={nameOffsetX === 'right' ? 1.67 : 0}
                    fontSize={6}
                    lineHeight={6}
                    grow="down"
                    baseOffset={1.5}
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
        </g>
    );
};

export interface CsmetroBasicStationAttributes extends StationAttributes, ColorAttribute {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultCsmetroBasicStationAttributes: CsmetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    color: [CityCode.Changsha, 'cs1', '#DA291C', MonoColour.white],
};

const csmetroBasicAttrsComponent = (props: AttrsProps<CsmetroBasicStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultCsmetroBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val;
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
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={StationType.CsmetroBasic} defaultTheme={defaultCsmetroBasicStationAttributes.color} />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const csmetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
);

const csmetroBasicStation: Station<CsmetroBasicStationAttributes> = {
    component: CsmetroBasicStation,
    icon: csmetroBasicStationIcon,
    defaultAttrs: defaultCsmetroBasicStationAttributes,
    attrsComponent: csmetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.csmetroBasic.displayName',
        cities: [CityCode.Changsha],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default csmetroBasicStation;
