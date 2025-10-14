import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const [WIDTH, HEIGHT] = [15, 9];
const NAME_DY_KM_INT = {
    top: {
        lineHeight: 6.67,
        offset: 4 + 1.5, // offset + baseOffset
    },
    middle: {
        lineHeight: 0,
        offset: 0,
    },
    bottom: {
        lineHeight: 12.67,
        offset: 3 + 1.5, // offset + baseOffset
    },
};

const KunmingRTIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultKunmingRTIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultKunmingRTIntStationAttributes.nameOffsetY,
        rotate = defaultKunmingRTIntStationAttributes.rotate,
        transfer = defaultKunmingRTIntStationAttributes.transfer,
    } = attrs[StationType.KunmingRTInt] ?? defaultKunmingRTIntStationAttributes;

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
        rotate === 0 || rotate === 180 ? WIDTH : rotate === 90 || rotate === 270 ? HEIGHT : WIDTH * Math.SQRT1_2;
    const iconHeight =
        rotate === 0 || rotate === 180 ? HEIGHT : rotate === 90 || rotate === 270 ? WIDTH : WIDTH * Math.SQRT1_2;
    // x should be ±13.33 in default (width=13), 13.33 - 13 / 2 = 6.83
    const textDX = nameOffsetX === 'left' ? -6.83 : nameOffsetX === 'right' ? 6.83 : 0;
    // if icon grows the same direction of the text, add the extra icon length to text
    const textX = (Math.abs(textDX) + iconWidth / 2) * Math.sign(textDX);
    const textDY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY_KM_INT[nameOffsetY].lineHeight +
            NAME_DY_KM_INT[nameOffsetY].offset) *
        NAME_DY[nameOffsetY].polarity;
    const textY = (Math.abs(textDY) + iconHeight / 2) * Math.sign(textDY);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id}>
            <g
                transform={`translate(${x}, ${y})rotate(${rotate})`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            >
                {transfer.at(0)!.length <= 2 ? (
                    <g transform="translate(-7.5,-4.5)">
                        <rect
                            id={`stn_core_${id}`}
                            height="9"
                            width="15"
                            ry="4"
                            stroke="#393332"
                            strokeWidth="1"
                            fill="white"
                        ></rect>
                        <path
                            fill={transfer.at(0)!.at(0)?.at(2) ?? '#ea3222'}
                            fillRule="evenodd"
                            stroke="none"
                            d="M 3.833333 6.375 C 2.820813 6.375 2 5.535532 2 4.5 C 2 3.464468 2.820813 2.625 3.833333 2.625 L 4.444445 2.625 L 4.444445 2 L 6.888889 2.9375 L 4.444445 3.875 L 4.444445 3.25 L 3.833333 3.25 C 3.158321 3.25 2.611111 3.809647 2.611111 4.5 C 2.611111 5.190353 3.158321 5.75 3.833333 5.75 L 7.5 5.75 L 7.5 6.375 L 3.833333 6.375 Z"
                        />
                        <path
                            fill={transfer.at(0)!.at(1)?.at(2) ?? '#03619e'}
                            fillRule="evenodd"
                            stroke="none"
                            d="M 11.166667 2.625 C 12.179187 2.625 13 3.464468 13 4.5 C 13 5.535532 12.179187 6.375 11.166667 6.375 L 10.555555 6.375 L 10.555555 7 L 8.111111 6.0625 L 10.555555 5.125 L 10.555555 5.75 L 11.166667 5.75 C 11.841679 5.75 12.388889 5.190353 12.388889 4.5 C 12.388889 3.809647 11.841679 3.25 11.166667 3.25 L 7.5 3.25 L 7.5 2.625 L 11.166667 2.625 Z"
                        />
                    </g>
                ) : (
                    <g transform="translate(-8.5,-8.5)">
                        <circle
                            id={`stn_core_${id}`}
                            r="8.5"
                            cx="8.5"
                            cy="8.5"
                            stroke="#000000"
                            strokeWidth="1"
                            fill="white"
                        ></circle>
                        <path
                            fill={transfer.at(0)!.at(0)!.at(2)}
                            fillRule="evenodd"
                            stroke="none"
                            d="M 8.900812 14 L 10.286572 11.992442 L 10.63521 12.569632 C 12.188999 11.790696 13.24999 10.23524 13.24999 8.441039 C 13.24999 8.070708 13.203481 7.710487 13.118152 7.365112 L 13.887206 7.365112 C 13.960998 7.712721 14 8.072591 14 8.441039 C 14 10.500518 12.789013 12.288074 11.01168 13.191653 L 11.411587 13.855702 L 8.900812 14 Z"
                        />
                        <path
                            fill={transfer.at(0)!.at(1)!.at(2)}
                            fillRule="evenodd"
                            stroke="none"
                            d="M 8 13.974609 C 5.462755 13.73554 3.426537 11.698185 3.0625 9.090137 L 2.5 9.090137 L 3.5 7 L 4.5 9.090137 L 4.074219 9.090137 C 4.422903 11.120208 6.015293 12.696354 8 12.925459 L 8 13.974609 Z"
                        />
                        <path
                            fill={transfer.at(0)!.at(2)!.at(2)}
                            fillRule="evenodd"
                            stroke="none"
                            d="M 12.68764 6.50351 L 10.588492 5.178213 L 11.35608 4.753726 C 10.531951 4.143034 9.498575 3.778666 8.375084 3.778666 C 6.644794 3.778666 5.125485 4.640751 4.260284 5.940329 L 3.718284 5.421978 C 4.730131 3.997121 6.438381 3.061381 8.375084 3.061381 C 9.781034 3.061381 11.063435 3.556896 12.04896 4.372667 L 12.536759 4.102285 L 12.68764 6.50351 Z"
                        />
                    </g>
                )}
            </g>
            <g
                transform={`translate(${x + textX}, ${y + textY})`}
                textAnchor={textAnchor}
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
 * KunmingRTIntStation specific props.
 */
export interface KunmingRTIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    rotate: Rotate;
}

const defaultKunmingRTIntStationAttributes: KunmingRTIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    rotate: 0,
    transfer: [
        [
            [CityCode.Kunming, 'km1', '#ea3222', MonoColour.white, '', ''],
            [CityCode.Kunming, 'km2', '#03619e', MonoColour.white, '', ''],
            [CityCode.Kunming, 'km3', '#a13187', MonoColour.white, '', ''],
        ],
    ],
};

const KunmingRTIntAttrsComponent = (props: AttrsProps<KunmingRTIntStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultKunmingRTIntStationAttributes.names[1],
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

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.KunmingRTInt}
                defaultAttrs={defaultKunmingRTIntStationAttributes}
                maximumTransfers={[3, 0, 0]}
            />
        </>
    );
};

const kunmingRTIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(3.5, 3.5)">
            <circle r="8.5" cx="8.5" cy="8.5" stroke="currentColor" strokeWidth="1" fill="none"></circle>
            <path
                fill="currentColor"
                fillRule="evenodd"
                stroke="none"
                d="M 8.900812 14 L 10.286572 11.992442 L 10.63521 12.569632 C 12.188999 11.790696 13.24999 10.23524 13.24999 8.441039 C 13.24999 8.070708 13.203481 7.710487 13.118152 7.365112 L 13.887206 7.365112 C 13.960998 7.712721 14 8.072591 14 8.441039 C 14 10.500518 12.789013 12.288074 11.01168 13.191653 L 11.411587 13.855702 L 8.900812 14 Z"
            />
            <path
                fill="currentColor"
                fillRule="evenodd"
                stroke="none"
                d="M 8 13.974609 C 5.462755 13.73554 3.426537 11.698185 3.0625 9.090137 L 2.5 9.090137 L 3.5 7 L 4.5 9.090137 L 4.074219 9.090137 C 4.422903 11.120208 6.015293 12.696354 8 12.925459 L 8 13.974609 Z"
            />
            <path
                fill="currentColor"
                fillRule="evenodd"
                stroke="none"
                d="M 12.68764 6.50351 L 10.588492 5.178213 L 11.35608 4.753726 C 10.531951 4.143034 9.498575 3.778666 8.375084 3.778666 C 6.644794 3.778666 5.125485 4.640751 4.260284 5.940329 L 3.718284 5.421978 C 4.730131 3.997121 6.438381 3.061381 8.375084 3.061381 C 9.781034 3.061381 11.063435 3.556896 12.04896 4.372667 L 12.536759 4.102285 L 12.68764 6.50351 Z"
            />
        </g>
    </svg>
);

const kunmingRTIntStation: Station<KunmingRTIntStationAttributes> = {
    component: KunmingRTIntStation,
    icon: kunmingRTIntStationIcon,
    defaultAttrs: defaultKunmingRTIntStationAttributes,
    attrsComponent: KunmingRTIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.kunmingRTInt.displayName',
        cities: [CityCode.Kunming],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default kunmingRTIntStation;
