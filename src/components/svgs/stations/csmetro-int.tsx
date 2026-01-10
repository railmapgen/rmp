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
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

/**
 * Changsha interchange station component
 * Major information taken from changsha-metro-int.svg and adapted for runtime.
 */
const CsmetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultCsmetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultCsmetroIntStationAttributes.nameOffsetY,
        transfer = defaultCsmetroIntStationAttributes.transfer,
    } = attrs[StationType.CsmetroInt] ?? defaultCsmetroIntStationAttributes;

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

    // text position similar to shmetro-int
    const textX = nameOffsetX === 'left' ? -8 : nameOffsetX === 'right' ? 8 : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * 12.67 +
            (nameOffsetY === 'top' ? 6 : nameOffsetY === 'bottom' ? 11 : 0)) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id}>
            <g transform={`translate(${x}, ${y})`}>
                {/* Render original SVG artwork scaled so original r=10.35 maps to r=9 */}
                <g transform={`scale(${9 / 10.35}) translate(${-11.7}, ${-11.7})`}>
                    <circle
                        cx="11.7"
                        cy="11.7"
                        r="10.35"
                        fill="white"
                        stroke={transfer?.[0]?.[0]?.[2] ?? '#9B9B9B'}
                        strokeMiterlimit={10}
                        strokeWidth="2.7"
                    />
                    <path
                        d="M29.875,20.5,26.4,24.6h2.4V25c0,1.689.076,2.162-.508,3.2a4.472,4.472,0,0,1-3.834,2.15V32a7.279,7.279,0,0,0,3.922-.7,6.664,6.664,0,0,0,.745-.466,4.978,4.978,0,0,0,1-1,5.669,5.669,0,0,0,.5-.833,14.713,14.713,0,0,0,.435-4.4H33.1Z"
                        transform="translate(-13.3 -13.3)"
                        fill={transfer?.[0]?.[1]?.[2] ?? '#9B9B9B'}
                    />
                    <path
                        d="M20.1,29.659l3.475-4.1h-2.4v-.4c0-1.689-.076-2.162.508-3.2a4.284,4.284,0,0,1,1.5-1.5,4.332,4.332,0,0,1,2.333-.65v-1.65a7.281,7.281,0,0,0-3.922.7,6.664,6.664,0,0,0-.745.466,4.978,4.978,0,0,0-1,1,5.772,5.772,0,0,0-.5.833,14.713,14.713,0,0,0-.435,4.4h-2.04Z"
                        transform="translate(-13.3 -13.3)"
                        fill={transfer?.[0]?.[0]?.[2] ?? '#9B9B9B'}
                    />

                    <circle
                        cx="11.7"
                        cy="11.7"
                        r="10.35"
                        fill="white"
                        opacity="0"
                        stroke="none"
                        strokeMiterlimit={10}
                        strokeWidth="2.7"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
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

export interface CsmetroIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultCsmetroIntStationAttributes: CsmetroIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [[]],
};

const csmetroIntAttrsComponent = (props: AttrsProps<CsmetroIntStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultCsmetroIntStationAttributes.names[1],
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
        // Interchange editor (transfer list)
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.CsmetroInt}
                    defaultAttrs={defaultCsmetroIntStationAttributes}
                    maximumTransfers={[2, 0, 0]}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const csmetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <g transform="translate(-9.9 -9.9) scale(0.87)">
            <path
                d="M29.875,20.5,26.4,24.6h2.4V25c0,1.689.076,2.162-.508,3.2a4.472,4.472,0,0,1-3.834,2.15V32a7.279,7.279,0,0,0,3.922-.7,6.664,6.664,0,0,0,.745-.466,4.978,4.978,0,0,0,1-1,5.669,5.669,0,0,0,.5-.833,14.713,14.713,0,0,0,.435-4.4H33.1Z"
                stroke="currentColor"
                fill="currentColor"
                strokeLinecap="round"
            />
            <path
                d="M20.1,29.659l3.475-4.1h-2.4v-.4c0-1.689-.076-2.162.508-3.2a4.284,4.284,0,0,1,1.5-1.5,4.332,4.332,0,0,1,2.333-.65v-1.65a7.281,7.281,0,0,0-3.922.7,6.664,6.664,0,0,0-.745.466,4.978,4.978,0,0,0-1,1,5.772,5.772,0,0,0-.5.833,14.713,14.713,0,0,0-.435,4.4h-2.04Z"
                stroke="currentColor"
                fill="currentColor"
                strokeLinecap="round"
            />
        </g>
    </svg>
);

const csmetroIntStation: Station<CsmetroIntStationAttributes> = {
    component: CsmetroIntStation,
    icon: csmetroIntStationIcon,
    defaultAttrs: defaultCsmetroIntStationAttributes,
    attrsComponent: csmetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.csmetroInt.displayName',
        cities: [CityCode.Changsha],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: ['interchange'],
    },
};

export default csmetroIntStation;
