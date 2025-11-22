import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const NAME_DY_WUHAN_INT = {
    top: {
        lineHeight: 6.67,
        offset: 3.5 + 1.5, // offset + baseOffset
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 12.67,
        offset: -0.17 + 1, // offset + baseOffset
    },
};

const WuhanRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultWuhanRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultWuhanRTIntStationAttributes.nameOffsetY,
        rotate = defaultWuhanRTIntStationAttributes.rotate,
        width = defaultWuhanRTIntStationAttributes.width,
        height = defaultWuhanRTIntStationAttributes.height,
    } = attrs[StationType.WuhanRTInt] ?? defaultWuhanRTIntStationAttributes;

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

    const iconWidth =
        rotate === 0 || rotate === 180 ? width : rotate === 90 || rotate === 270 ? height : width * Math.SQRT1_2;
    const iconHeight =
        rotate === 0 || rotate === 180 ? height : rotate === 90 || rotate === 270 ? width : width * Math.SQRT1_2;
    // x should be ±10 in default (width=10), 10 - 10 / 2 = 5
    const textDX = nameOffsetX === 'left' ? -5 : nameOffsetX === 'right' ? 5 : 0;
    // if icon grows the same direction of the text, add the extra icon length to text
    const textX = (Math.abs(textDX) + iconWidth / 2) * Math.sign(textDX);
    const textDY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_WUHAN_INT[nameOffsetY].lineHeight +
            NAME_DY_WUHAN_INT[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textY = (Math.abs(textDY) + iconHeight / 2) * Math.sign(textDY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                <rect
                    id={`stn_core_${id}`}
                    x={-width / 2}
                    y={-height / 2}
                    height={height}
                    width={width}
                    ry={height / 2}
                    stroke="black"
                    strokeWidth="1"
                    fill="white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
            <g
                transform={`translate(${x + textX}, ${y + textY})`}
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
 * WuhanRTIntStation specific props.
 */
export interface WuhanRTIntStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
    width: number;
    height: number;
}

const defaultWuhanRTIntStationAttributes: WuhanRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    height: 5,
    width: 10,
};

const wuhanRTIntAttrsComponent = (props: AttrsProps<WuhanRTIntStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultWuhanRTIntStationAttributes.names[1],
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
            type: 'input',
            label: t('panel.details.stations.wuhanRTInt.height'),
            value: attrs.height.toString(),
            validator: val => Number.isInteger(val),
            onChange: val => {
                attrs.height = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.wuhanRTInt.width'),
            value: attrs.width.toString(),
            validator: val => Number.isInteger(val),
            onChange: val => {
                attrs.width = Number(val);
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

const wuhanRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="7" y="9.5" height="5" width="10" ry="2.5" stroke="currentColor" fill="none" />
    </svg>
);

const wuhanRTIntStation: Station<WuhanRTIntStationAttributes> = {
    component: WuhanRTIntStation,
    icon: wuhanRTIntStationIcon,
    defaultAttrs: defaultWuhanRTIntStationAttributes,
    attrsComponent: wuhanRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.wuhanRTInt.displayName',
        cities: [CityCode.Wuhan],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default wuhanRTIntStation;
