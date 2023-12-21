import { useColorMode, useColorModeValue } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import { StationNumber } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
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
        tram = defaultGzmtrIntStationAttributes.tram,
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
    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

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

    return (
        <g id={id} transform={`translate(${x}, ${y})scale(${tram ? 0.5 : 1})`}>
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
                    transform={`translate(${CODE_POS[arr.length][i][0]},${CODE_POS[arr.length][i][1]})scale(0.75)`}
                >
                    <StationNumber strokeColour={info[2]} lineNum={info[4]} stnNum={info[5]} />
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
            <g ref={textRef} transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
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
                <g transform={`translate(${textX + secondaryDx}, ${textY})`} textAnchor="middle">
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
                <g transform={`translate(${textX + underConstructionDx}, ${textY})`} textAnchor={textAnchor}>
                    <text fontSize="8" dy="-2" dominantBaseline="auto" className="rmp-name__zh">
                        （未开通）
                    </text>
                    <text fontSize="6" dy="4" dominantBaseline="hanging" className="rmp-name__en">
                        (Under Construction)
                    </text>
                </g>
            )}
        </g>
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
    tram: boolean;
}

const defaultGzmtrIntStationAttributes: GzmtrIntStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [[], []],
    open: true,
    secondaryNames: ['', ''],
    tram: false,
};

const gzmtrIntStationAttrsComponents = (props: AttrsProps<GzmtrIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[1] = val.replaceAll('\n', '\\');
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetX,
            options: { left: 'left', middle: 'middle', right: 'right' },
            disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetX = val as Exclude<NameOffsetX, 'middle'>;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetY,
            options: { top: 'top', middle: 'middle', bottom: 'bottom' },
            disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
            onChange: val => {
                attrs.nameOffsetY = val as Exclude<NameOffsetY, 'middle'>;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrInt.open'),
            oneLine: true,
            isChecked: attrs.open,
            onChange: val => {
                attrs.open = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.gzmtrInt.secondaryNameZh'),
            value: attrs.secondaryNames[0],
            onChange: val => {
                attrs.secondaryNames[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.gzmtrInt.secondaryNameEn'),
            value: attrs.secondaryNames[1],
            onChange: val => {
                attrs.secondaryNames[1] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrBasic.tram'),
            oneLine: true,
            isChecked: attrs.tram,
            onChange: val => {
                attrs.tram = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.stations.interchange.title'),
            component: (
                <InterchangeField
                    stationType={StationType.GzmtrInt}
                    defaultAttrs={defaultGzmtrIntStationAttributes}
                    maximumTransfers={[3, 3, 0]}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const gzmtrIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(6,12)scale(0.3)">
            <StationNumber strokeColour="#000" lineNum="1" stnNum="09" />
        </g>
        <g transform="translate(18,12)scale(0.3)">
            <StationNumber strokeColour="#000" lineNum="2" stnNum="13" />
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
    attrsComponent: gzmtrIntStationAttrsComponents,
    metadata: {
        displayName: 'panel.details.stations.gzmtrInt.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrIntStation;
