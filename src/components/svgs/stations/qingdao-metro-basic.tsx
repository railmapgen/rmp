import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
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
import { MultilineText, NAME_DY } from '../common/multiline-text';

const NAME_QD_BASIC = {
    zh: {
        size: 10,
        baseOffset: 1,
    },
    en: {
        size: 5,
        baseOffset: 1.5,
    },
};

const NAME_DY_QD_BASIC = {
    top: {
        lineHeight: 5,
        offset: 4 + NAME_QD_BASIC.en.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: -1,
    },
    middle: {
        lineHeight: 0,
        offset: NAME_QD_BASIC.zh.size / 2,
        polarity: 1,
    },
    bottom: {
        lineHeight: 10,
        offset: 3 + NAME_QD_BASIC.zh.baseOffset + 2.5, // offset + baseOffset + iconRadius
        polarity: 1,
    },
};

const QingdaoMetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        color = defaultQingdaoMetroBasicStationAttributes.color,
        nameOffsetX = defaultQingdaoMetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultQingdaoMetroBasicStationAttributes.nameOffsetY,
    } = attrs[StationType.QingdaoMetroBasic] ?? defaultQingdaoMetroBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -7.5 : nameOffsetX === 'right' ? 7.5 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_QD_BASIC[nameOffsetY].lineHeight +
            NAME_DY_QD_BASIC[nameOffsetY].offset) *
        NAME_DY_QD_BASIC[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_core_${id}`}
                r={3}
                stroke={color[2]}
                strokeWidth="0.67"
                fill="white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={10}
                    lineHeight={10}
                    grow="up"
                    baseOffset={1}
                    className="rmp-name__zh"
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={5.5}
                    lineHeight={5.5}
                    grow="down"
                    baseOffset={1.5}
                    className="rmp-name__en"
                />
            </g>
        </g>
    );
};

/**
 * Qingdao Metro basic station specific props.
 */
export interface QingdaoMetroBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultQingdaoMetroBasicStationAttributes: QingdaoMetroBasicStationAttributes = {
    ...defaultStationAttributes,
    color: [CityCode.Qingdao, 'qd1', '#eaaa00', MonoColour.white],
    nameOffsetX: 'right',
    nameOffsetY: 'top',
};

const qingdaoMetroBasicAttrsComponent = (props: AttrsProps<QingdaoMetroBasicStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0] ?? defaultQingdaoMetroBasicStationAttributes.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1] ?? defaultQingdaoMetroBasicStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX ?? defaultQingdaoMetroBasicStationAttributes.nameOffsetX,
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
            value: attrs.nameOffsetY ?? defaultQingdaoMetroBasicStationAttributes.nameOffsetY,
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
                <ColorField
                    type={StationType.QingdaoMetroBasic}
                    defaultTheme={defaultQingdaoMetroBasicStationAttributes.color}
                />
            ),
        },
    ];
    return <RmgFields fields={fields} />;
};

const qingdaoMetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="0.6" fill="none" />
    </svg>
);

const qingdaoMetroBasicStation: Station<QingdaoMetroBasicStationAttributes> = {
    component: QingdaoMetroBasicStation,
    icon: qingdaoMetroBasicStationIcon,
    defaultAttrs: defaultQingdaoMetroBasicStationAttributes,
    attrsComponent: qingdaoMetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.qingdaoMetroBasic.displayName',
        cities: [CityCode.Qingdao],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default qingdaoMetroBasicStation;
