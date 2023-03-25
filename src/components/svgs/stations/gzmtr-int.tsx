import React from 'react';
import { useColorMode, useColorModeValue } from '@chakra-ui/react';
import { CityCode } from '@railmapgen/rmg-palette-resources';
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
import { StationNumber } from './gzmtr-basic';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

const CODE_POS = [
    [[0, 0]],
    [[0, 0]],
    [
        [-18, 0],
        [18, 0],
    ],
    [
        [-15.588, -9],
        [15.588, -9],
        [0, 18],
    ],
];

const GzmtrIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultGzmtrIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultGzmtrIntStationAttributes.nameOffsetY,
        transfer = defaultGzmtrIntStationAttributes.transfer,
        open = defaultGzmtrIntStationAttributes.open,
        secondaryNames = defaultGzmtrIntStationAttributes.secondaryNames,
    } = attrs[StationType.GzmtrInt] ?? defaultGzmtrIntStationAttributes;

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

    const { colorMode } = useColorMode();
    const bgColor = useColorModeValue('white', 'gray.800');

    const textX =
        (nameOffsetX === 'left' ? -20 : nameOffsetX === 'right' ? 20 : 0) * (nameOffsetY === 'middle' ? 1.8 : 1);
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\\').length * NAME_DY[nameOffsetY].lineHeight +
            20 * (nameOffsetX === 'middle' ? 1.8 : 1)) *
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

    const transferAll = transfer.flat().slice(0, 3); // slice to make sure at most 3 transfers
    const arrowColor = [
        ['black', 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(0)?.at(2) ?? 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(1)?.at(2) ?? 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(1)?.at(2) ?? 'black', transferAll.at(2)?.at(2) ?? 'black'],
    ];

    const secondaryTextRef = React.useRef<SVGGElement | null>(null);
    const [secondaryTextWidth, setSecondaryTextWidth] = React.useState(0);
    React.useEffect(() => setSecondaryTextWidth(secondaryTextRef.current?.getBBox().width ?? 0), [...secondaryNames]);

    const textRef = React.useRef<SVGGElement | null>(null);
    const [textWidth, setTextWidth] = React.useState(0);
    React.useEffect(() => setTextWidth(textRef.current?.getBBox().width ?? 0), [...names]);

    const secondaryDx = (textWidth + (secondaryTextWidth + 12 * 2) / 2) * (nameOffsetX === 'left' ? -1 : 1);
    const underConstructionDx =
        (textWidth + secondaryTextWidth + (secondaryTextWidth !== 0 ? 12 * 2 : 0)) * (nameOffsetX === 'left' ? -1 : 1);

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                {transferAll
                    .map(info => info[2])
                    .filter((color, i, arr) => arr.indexOf(color) === i)
                    .map(color => (
                        <marker
                            key={`gzmtr_int_arrow_${color}`}
                            id={`gzmtr_int_arrow_${color}`}
                            markerWidth="5"
                            markerHeight="5"
                            refX="1"
                            refY="1.25"
                            orient="auto"
                        >
                            <polygon points="0,0 0,3 2,1.5" fill={color} />
                        </marker>
                    ))}
                {transferAll.length <= 2 && (
                    <g>
                        {/* A simple mask to hide all underlying lines. */}
                        <path d="M -18,-12 A 24 24 0 0 1 18,-12 L 18,12 A 24 24 0 0 1 -18,12 Z" fill={bgColor} />
                        <path
                            d="M -18,-12 A 24 24 0 0 1 18,-12"
                            fill="none"
                            stroke={arrowColor[transferAll.length][0]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 18,12 A 24 24 0 0 1 -18,12"
                            fill="none"
                            stroke={arrowColor[transferAll.length][1]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                    </g>
                )}
                {transferAll.length >= 3 && (
                    <g>
                        <circle r="22.395" fill={bgColor} />
                        <path
                            d="M -19.3948,11.1976 A 22.395 22.395 0 0 1 0,-22.395"
                            fill="none"
                            stroke={arrowColor[transferAll.length][0]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-22.395 A 22.395 22.395 0 0 1 19.3948,11.1976"
                            fill="none"
                            stroke={arrowColor[transferAll.length][1]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                        <path
                            d="M 19.3948,11.1976 A 22.395 22.395 0 0 1 -19.3948,11.1976"
                            fill="none"
                            stroke={arrowColor[transferAll.length][2]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][2]})`}
                        />
                        {/* Add another 2 transparent arrows with marker to cover bottom arrows */}
                        <path
                            d="M -19.3948,11.1976 A 22.395 22.395 0 0 1 0,-22.395"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-22.395 A 22.395 22.395 0 0 1 19.3948,11.1976"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                    </g>
                )}

                {transfer[0]?.map((info, i, arr) => (
                    <g
                        key={`gzmtr_int_${id}_stn_${i}`}
                        transform={`translate(${CODE_POS[arr.length][i][0]},${CODE_POS[arr.length][i][1]})`}
                    >
                        <StationNumber strokeColor={info[2]} lineCode={info[4]} stationCode={info[5]} />
                    </g>
                ))}

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <circle
                    id={`stn_core_${id}`}
                    r={transferAll.length === 3 ? 22.395 : 18}
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
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
                        textAnchor={textAnchor}
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
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            nameOffsetX,
            nameOffsetY,
            JSON.stringify(transferAll),
            open,
            ...secondaryNames,
            // Update the mask on dark mode changes.
            colorMode,
            // BBox will only be computed after first render and won't cause this to update another time.
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
export interface GzmtrIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    /**
     * Whether to show a Under Construction hint.
     */
    open: boolean;
    secondaryNames: [string, string];
}

const defaultGzmtrIntStationAttributes: GzmtrIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [[], []],
    open: true,
    secondaryNames: ['', ''],
};

const gzmtrIntStationFields = [
    {
        type: 'textarea',
        label: 'panel.details.station.gzmtrInt.nameZh',
        value: (attrs?: GzmtrIntStationAttributes) =>
            (attrs ?? defaultGzmtrIntStationAttributes).names[0].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.names[0] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'textarea',
        label: 'panel.details.station.gzmtrInt.nameEn',
        value: (attrs?: GzmtrIntStationAttributes) =>
            (attrs ?? defaultGzmtrIntStationAttributes).names[1].replaceAll('\\', '\n'),
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.names[1] = val.toString().replaceAll('\n', '\\');
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrInt.nameOffsetX',
        value: (attrs?: GzmtrIntStationAttributes) => (attrs ?? defaultGzmtrIntStationAttributes).nameOffsetX,
        options: { left: 'left', middle: 'middle', right: 'right' },
        disabledOptions: (attrs?: GzmtrIntStationAttributes) => (attrs?.nameOffsetY === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.nameOffsetX = val as Exclude<NameOffsetX, 'middle'>;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'select',
        label: 'panel.details.station.gzmtrInt.nameOffsetY',
        value: (attrs?: GzmtrIntStationAttributes) => (attrs ?? defaultGzmtrIntStationAttributes).nameOffsetY,
        options: { top: 'top', middle: 'middle', bottom: 'bottom' },
        disabledOptions: (attrs?: GzmtrIntStationAttributes) => (attrs?.nameOffsetX === 'middle' ? ['middle'] : []),
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.nameOffsetY = val as Exclude<NameOffsetY, 'middle'>;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'switch',
        label: 'panel.details.station.gzmtrInt.open',
        oneLine: true,
        isChecked: (attrs?: GzmtrIntStationAttributes) => (attrs ?? defaultGzmtrIntStationAttributes).open,
        onChange: (val: boolean, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.open = val;
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrInt.secondaryNameZh',
        value: (attrs?: GzmtrIntStationAttributes) => (attrs ?? defaultGzmtrIntStationAttributes).secondaryNames[0],
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.secondaryNames[0] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'input',
        label: 'panel.details.station.gzmtrInt.secondaryNameEn',
        value: (attrs?: GzmtrIntStationAttributes) => (attrs ?? defaultGzmtrIntStationAttributes).secondaryNames[1],
        onChange: (val: string | number, attrs_: GzmtrIntStationAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultGzmtrIntStationAttributes;
            // set value
            attrs.secondaryNames[1] = val.toString();
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: (
            <InterchangeField
                stationType={StationType.GzmtrInt}
                defaultAttrs={defaultGzmtrIntStationAttributes}
                maximumTransfers={[3, 3, 0]}
            />
        ),
    },
];

const gzmtrIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(6,12)scale(0.4)">
            <StationNumber strokeColor="#000" lineCode="1" stationCode="09" />
        </g>
        <g transform="translate(18,12)scale(0.4)">
            <StationNumber strokeColor="#000" lineCode="2" stationCode="13" />
        </g>
        <marker id="arrow" markerWidth="5" markerHeight="5" refX="1" refY="1.25" orient="auto">
            <polygon points="0,0 0,3 2,1.5" />
        </marker>
        <path d="M 6,6 A 8 8 0 0 1 18,6" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" />
        <path d="M 18,18 A 8 8 0 0 1 6,18" fill="none" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrow)" />
    </svg>
);

const gzmtrIntStation: Station<GzmtrIntStationAttributes> = {
    component: GzmtrIntStation,
    icon: gzmtrIntStationIcon,
    defaultAttrs: defaultGzmtrIntStationAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: gzmtrIntStationFields,
    metadata: {
        displayName: 'panel.details.station.gzmtrInt.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrIntStation;
