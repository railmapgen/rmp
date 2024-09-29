import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import {
    Rotate,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';

const ROTATE_CONST: {
    [rotate: number]: {
        textDx: number;
        textDy: number;
        textAnchor: 'start' | 'middle' | 'end';
        namesPos: 0 | 1;
        lineHeight: 0 | 6.67 | 12.67;
        polarity: -1 | 0 | 1;
    };
} = {
    0: {
        textDx: 0,
        textDy: -17.5,
        textAnchor: 'middle',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
    45: {
        textDx: 1,
        textDy: -16.25,
        textAnchor: 'start',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
    90: {
        textDx: 12,
        textDy: 0,
        textAnchor: 'start',
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    135: {
        textDx: 5,
        textDy: 21,
        textAnchor: 'start',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    180: {
        textDx: 0,
        textDy: 22.5,
        textAnchor: 'middle',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    225: {
        textDx: -5,
        textDy: 21,
        textAnchor: 'end',
        namesPos: 0,
        lineHeight: 12.67,
        polarity: 1,
    },
    270: {
        textDx: -12,
        textDy: 0,
        textAnchor: 'end',
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    315: {
        textDx: -1,
        textDy: -16.25,
        textAnchor: 'end',
        namesPos: 1,
        lineHeight: 6.67,
        polarity: -1,
    },
};

const ShanghaiSuburbanRailwayStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { names = defaultStationAttributes.names, rotate = defaultShanghaiSuburbanRailwayStationAttributes.rotate } =
        attrs[StationType.ShanghaiSuburbanRailway] ?? defaultShanghaiSuburbanRailwayStationAttributes;

    const textDy =
        ROTATE_CONST[rotate].textDy + // fixed dy for each rotation
        (names[ROTATE_CONST[rotate].namesPos].split('\\').length - 1) *
            ROTATE_CONST[rotate].lineHeight *
            ROTATE_CONST[rotate].polarity; // dynamic dy of n lines (either zh or en)

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

    return React.useMemo(
        () => (
            <g id={id}>
                <g transform={`translate(${x}, ${y})rotate(${rotate})`}>
                    <rect x="-2" y="-7.83" width="4" height="7.83" stroke="none" fill="#666464" />
                    {/* A mask for the end of shanghai subsurban railway style. */}
                    <rect x="-3.5" y="-1" width="7" height="2" stroke="none" fill="white" />
                    <rect
                        x={-2 + 1.1675}
                        y={-7.83 + 1.5}
                        width={(4 * 2) / 5}
                        height={7.83 - 1.5}
                        stroke="none"
                        fill="white"
                    />
                    <rect
                        id={`stn_core_${id}`}
                        x="-2"
                        y="-7.83"
                        width="4"
                        height={7.83 + 1.25}
                        stroke="none"
                        fill="white"
                        fillOpacity="0"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </g>
                <g
                    transform={`translate(${x + ROTATE_CONST[rotate].textDx}, ${y + textDy})`}
                    textAnchor={ROTATE_CONST[rotate].textAnchor}
                    className="rmp-name-outline"
                    strokeWidth="2.5"
                >
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={12.67}
                        lineHeight={12.67}
                        grow="up"
                        baseOffset={1}
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        dx={rotate >= 45 && rotate <= 135 ? 1.67 : 0}
                        fontSize={6.67}
                        lineHeight={6.67}
                        grow="down"
                        baseOffset={1.5}
                        className="rmp-name__en"
                    />
                </g>
            </g>
        ),
        [id, x, y, ...names, rotate, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * ShanghaiSuburbanRailwayStation specific props.
 */
export interface ShanghaiSuburbanRailwayStationAttributes extends StationAttributes {
    rotate: Rotate;
}

const defaultShanghaiSuburbanRailwayStationAttributes: ShanghaiSuburbanRailwayStationAttributes = {
    ...defaultStationAttributes,
    rotate: 0,
};

const shanghaiSuburbanRailwayAttrsComponent = (props: AttrsProps<ShanghaiSuburbanRailwayStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[1] = val.toString().replaceAll('\n', '\\');
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

const shanghaiSuburbanRailwayStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="currentColor" />
    </svg>
);

const shanghaiSuburbanRailwayStation: Station<ShanghaiSuburbanRailwayStationAttributes> = {
    component: ShanghaiSuburbanRailwayStation,
    icon: shanghaiSuburbanRailwayStationIcon,
    defaultAttrs: defaultShanghaiSuburbanRailwayStationAttributes,
    attrsComponent: shanghaiSuburbanRailwayAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.shanghaiSuburbanRailway.displayName',
        cities: [CityCode.Shanghai],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default shanghaiSuburbanRailwayStation;
