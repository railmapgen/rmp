import React from 'react';
import { CityCode, ColourHex, MonoColour } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const PATH = 'M0,9.25 V-9.25 H-9.25 a9.25,9.25 0 0,0 0,18.5 h18.5 a9.25,9.25 0 0,0 0,-18.5 H0';
const TEXT_MAX_WIDTH = 12.5;

/**
 * A StationNumber sub component for both gzmtr-basic and gzmtr-int station.
 * It draws the code of the line and the station with a capsule icon outside it.
 */
export const StationNumber = (props: { strokeColor: ColourHex; lineCode: string; stationCode: string }) => {
    const { strokeColor, lineCode, stationCode } = props;

    const lineCodeEl = React.useRef<SVGTextElement | null>(null);
    const stnCodeEl = React.useRef<SVGTextElement | null>(null);

    const [lineCodeBBox, setlineCodeBBox] = React.useState({ width: 0 } as DOMRect);
    const [stnCodeBBox, setstnCodeBBox] = React.useState({ width: 0 } as DOMRect);

    React.useEffect(() => {
        setlineCodeBBox(lineCodeEl.current!.getBBox());
        setstnCodeBBox(stnCodeEl.current!.getBBox());
    }, [lineCode, stationCode]);

    const lineCodeScale = TEXT_MAX_WIDTH / Math.max(TEXT_MAX_WIDTH, lineCodeBBox.width);
    const stnCodeScale =
        lineCode.length === 2 && stationCode.length === 2
            ? lineCodeScale
            : TEXT_MAX_WIDTH / Math.max(TEXT_MAX_WIDTH, stnCodeBBox.width);

    return (
        <g>
            <path d={PATH} strokeWidth="2" stroke={strokeColor} fill="white" transform="scale(0.75)" />
            <g textAnchor="middle" dominantBaseline="middle" fontSize="8">
                <g transform={`translate(-6,0)scale(${lineCodeScale})`}>
                    <text ref={lineCodeEl} className="rmp-name__zh">
                        {lineCode}
                    </text>
                </g>
                <g transform={`translate(6,0)scale(${stnCodeScale})`}>
                    <text ref={stnCodeEl} className="rmp-name__zh">
                        {stationCode}
                    </text>
                </g>
            </g>
        </g>
    );
};

const GzmtrBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultGzmtrBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultGzmtrBasicStationAttributes.nameOffsetY,
        color = defaultGzmtrBasicStationAttributes.color,
        lineCode = defaultGzmtrBasicStationAttributes.lineCode,
        stationCode = defaultGzmtrBasicStationAttributes.stationCode,
    } = attrs[StationType.GzmtrBasic] ?? defaultGzmtrBasicStationAttributes;

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

    const textX = nameOffsetX === 'left' ? -18 : nameOffsetX === 'right' ? 18 : 0;
    const textDy =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length - 1) *
        NAME_DY[nameOffsetY].lineHeight *
        NAME_DY[nameOffsetY].polarity;
    const textY = textDy + (nameOffsetY === 'up' ? -21 : nameOffsetY === 'bottom' ? 27 : 0);
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                <StationNumber strokeColor={color[2]} lineCode={lineCode} stationCode={stationCode} />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <path
                    id={`stn_core_${id}`}
                    d={PATH}
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    transform="scale(0.75)"
                />
                <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor} className="rmp-name-station">
                    <MultilineText
                        text={names[0].split('\\')}
                        fontSize={16}
                        lineHeight={16}
                        grow="up"
                        className="rmp-name__zh"
                    />
                    <MultilineText
                        text={names[1].split('\\')}
                        fontSize={10}
                        lineHeight={10}
                        grow="bottom"
                        className="rmp-name__en"
                    />
                </g>
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            nameOffsetX,
            nameOffsetY,
            color,
            lineCode,
            stationCode,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * <GzmtrStation /> specific props.
 */
export interface GzmtrBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: 'left' | 'middle' | 'right';
    nameOffsetY: 'up' | 'middle' | 'bottom';
    lineCode: string;
    stationCode: string;
}

const defaultGzmtrBasicStationAttributes: GzmtrBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'up',
    color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black],
    lineCode: '1',
    stationCode: '01',
};

const gzmtrBasicStationFields = [
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.nameZh',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).names[0],
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.nameEn',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).names[1],
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrBasic.nameOffsetX',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as 'left' | 'middle' | 'right';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrBasic.nameOffsetY',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).nameOffsetY,
        options: { up: 'up', middle: 'middle', bottom: 'bottom' },
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as 'up' | 'middle' | 'bottom';
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: <ColorField type={StationType.GzmtrBasic} defaultAttrs={defaultGzmtrBasicStationAttributes} />,
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.lineCode',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).lineCode,
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.lineCode = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.stationCode',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).stationCode,
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.stationCode = val.toString();
            // return modified attrs
            return attrs;
        },
    },
];

const gzmtrBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(12,12)scale(0.6)">
            <StationNumber strokeColor="#000" lineCode="1" stationCode="01" />
        </g>
    </svg>
);

const gzmtrBasicStation: Station<GzmtrBasicStationAttributes> = {
    component: GzmtrBasicStation,
    icon: gzmtrBasicStationIcon,
    defaultAttrs: defaultGzmtrBasicStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: gzmtrBasicStationFields,
    metadata: {
        displayName: 'panel.details.station.gzmtrBasic.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrBasicStation;
