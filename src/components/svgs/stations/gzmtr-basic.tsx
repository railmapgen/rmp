import React from 'react';
import { CityCode, ColourHex, MonoColour } from '@railmapgen/rmg-palette-resources';
import { CanvasType, CategoriesType } from '../../../constants/constants';
import {
    defaultStationAttributes,
    NameOffsetX,
    NameOffsetY,
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
                    <text
                        ref={lineCodeEl}
                        className="rmp-name__zh"
                        // dominantBaseline is specified in rmg-name__zh but missing in rmp-name__zh
                        dominantBaseline="central"
                    >
                        {lineCode}
                    </text>
                </g>
                <g transform={`translate(6,0)scale(${stnCodeScale})`}>
                    <text
                        ref={stnCodeEl}
                        className="rmp-name__zh"
                        // dominantBaseline is specified in rmg-name__zh but missing in rmp-name__zh
                        dominantBaseline="central"
                    >
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
        open = defaultGzmtrBasicStationAttributes.open,
        secondaryNames = defaultGzmtrBasicStationAttributes.secondaryNames,
        tram = defaultGzmtrBasicStationAttributes.tram,
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
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY[nameOffsetY].lineHeight + 11) *
        NAME_DY[nameOffsetY].polarity;
    const textAnchor =
        nameOffsetX === 'left'
            ? 'end'
            : nameOffsetX === 'right'
            ? 'start'
            : !open && nameOffsetX === 'middle' && secondaryNames.join('') === ''
            ? // Special hook to align station name and (Under Construction) when there are no secondaryNames.
              'end'
            : // Default to middle when nameOffsetX === 'middle'.
              'middle';

    const secondaryTextRef = React.useRef<SVGGElement | null>(null);
    const [secondaryTextWidth, setSecondaryTextWidth] = React.useState(0);
    React.useEffect(() => setSecondaryTextWidth(secondaryTextRef.current?.getBBox().width ?? 0), [...secondaryNames]);

    const textRef = React.useRef<SVGGElement | null>(null);
    const [textWidth, setTextWidth] = React.useState(0);
    React.useEffect(() => setTextWidth(textRef.current?.getBBox().width ?? 0), [...names]);

    const secondaryDx =
        nameOffsetX === 'middle'
            ? textWidth / 2 + (secondaryTextWidth + 12 * 2) / 2
            : (textWidth + (secondaryTextWidth + 12 * 2) / 2) * (nameOffsetX === 'left' ? -1 : 1);
    const underConstructionDx =
        nameOffsetX === 'middle' && secondaryNames.join('') !== ''
            ? textWidth / 2 + (secondaryTextWidth + 12 * 2)
            : (textWidth + secondaryTextWidth + (secondaryTextWidth !== 0 ? 12 * 2 : 0)) *
              (nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : 0);

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})scale(${tram ? 0.5 : 1})`}>
                <StationNumber strokeColor={color[2]} lineCode={lineCode} stationCode={stationCode} />
                <g
                    ref={textRef}
                    transform={`translate(${textX}, ${textY})`}
                    textAnchor={textAnchor}
                    className="rmp-name-station"
                >
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
                        grow="down"
                        className="rmp-name__en"
                    />
                </g>
                {secondaryNames.join('') !== '' && (
                    <g
                        transform={`translate(${textX + secondaryDx}, ${textY})`}
                        textAnchor="middle"
                        className="rmp-name-station"
                    >
                        <text
                            fontSize="20"
                            dx={-(secondaryTextWidth + 5) / 2}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="rmp-name__zh"
                        >
                            （
                        </text>
                        <text
                            fontSize="20"
                            dx={(secondaryTextWidth + 5) / 2}
                            textAnchor="start"
                            dominantBaseline="middle"
                            className="rmp-name__zh"
                        >
                            ）
                        </text>
                        <g ref={secondaryTextRef}>
                            <text fontSize="14" dy="-2" dominantBaseline="auto" className="rmp-name__zh">
                                {secondaryNames[0]}
                            </text>
                            <text fontSize="8" dy="2" dominantBaseline="hanging" className="rmp-name__en">
                                {secondaryNames[1]}
                            </text>
                        </g>
                    </g>
                )}
                {!open && (
                    <g
                        transform={`translate(${textX + underConstructionDx}, ${textY})`}
                        textAnchor={nameOffsetX === 'middle' ? 'start' : textAnchor}
                        fill="red"
                        className="rmp-name-station"
                    >
                        <text fontSize="8" dy="-2" dominantBaseline="auto" className="rmp-name__zh">
                            （未开通）
                        </text>
                        <text fontSize="6" dy="4" dominantBaseline="hanging" className="rmp-name__en">
                            (Under Construction)
                        </text>
                    </g>
                )}
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
            open,
            ...secondaryNames,
            tram,
            // bbox will only be computed after first render and won't cause this to update another time
            textWidth,
            secondaryTextWidth,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

/**
 * GzmtrStation specific props.
 */
export interface GzmtrBasicStationAttributes extends StationAttributes, AttributesWithColor {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    lineCode: string;
    stationCode: string;
    /**
     * Whether to show a Under Construction hint.
     */
    open: boolean;
    secondaryNames: [string, string];
    tram: boolean;
}

const defaultGzmtrBasicStationAttributes: GzmtrBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black],
    lineCode: '1',
    stationCode: '01',
    open: true,
    secondaryNames: ['', ''],
    tram: false,
};

const gzmtrBasicStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.gzmtrBasic.nameZh',
        value: (attrs?: GzmtrBasicStationAttributes) =>
            (attrs ?? defaultGzmtrBasicStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.gzmtrBasic.nameEn',
        value: (attrs?: GzmtrBasicStationAttributes) =>
            (attrs ?? defaultGzmtrBasicStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrBasic.nameOffsetX',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: GzmtrBasicStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.nameOffsetX = val as NameOffsetX;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrBasic.nameOffsetY',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: GzmtrBasicStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.nameOffsetY = val as NameOffsetY;
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
    {
        type: 'switch',
        label: 'panel.details.station.gzmtrBasic.open',
        oneLine: true,
        isChecked: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).open,
        onChange: (val: boolean, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.open = val;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.secondaryNameZh',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).secondaryNames[0],
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.secondaryNames[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrBasic.secondaryNameEn',
        value: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).secondaryNames[1],
        onChange: (val: string | number, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.secondaryNames[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'switch',
        label: 'panel.details.station.gzmtrBasic.tram',
        oneLine: true,
        isChecked: (attrs?: GzmtrBasicStationAttributes) => (attrs ?? defaultGzmtrBasicStationAttributes).tram,
        onChange: (val: boolean, attrs_: GzmtrBasicStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrBasicStationAttributes;
            // set value
            attrs.tram = val;
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
