import { Button, FormLabel, VStack, useColorModeValue } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { StationNumber as FoshanStationNumber } from '@railmapgen/svg-assets/fmetro';
import { StationNumber } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
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
import { InterchangeInfo, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { NAME_DY as DEFAULT_NAME_DY, MultilineText } from '../common/multiline-text';
import { InterchangeCardGZMTR, defaultGZMTRTransferInfo } from './gzmtr-int-common';

const CODE_POS = [
    [[0, 0]],
    [[0, 0]],
    [
        [-21, 0],
        [21, 0],
    ],
    [
        [-21.65, -12.5],
        [21.65, -12.5],
        [0, 25],
    ],
    [
        [-23, -18],
        [22, -16],
        [23, 18],
        [-22, 16],
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

    const bgColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

    const FONT_SIZE = {
        en: tram ? 5.08 : 6.56,
        zh: tram ? 7.29 : 13.13,
    };
    const NAME_DY: typeof DEFAULT_NAME_DY = {
        top: {
            namesPos: 1,
            lineHeight: FONT_SIZE.en,
            polarity: -1,
        },
        middle: {
            namesPos: 0,
            lineHeight: 0,
            polarity: 0,
        },
        bottom: {
            namesPos: 0,
            lineHeight: FONT_SIZE.zh,
            polarity: 1,
        },
    };

    const textXConst = tram ? 18 : 25;
    const textX =
        (nameOffsetX === 'left' ? -textXConst : nameOffsetX === 'right' ? textXConst : 0) *
        (nameOffsetY === 'middle' ? 1.1 : 1);
    const textYConst = tram ? 14 : 18;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY[nameOffsetY].lineHeight +
            textYConst * (nameOffsetX === 'middle' ? 1.1 : 1)) *
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

    const transferAll = transfer.flat().slice(0, 4); // slice to make sure at most 4 transfers
    const arrowColor = [
        ['black', 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(0)?.at(2) ?? 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(1)?.at(2) ?? 'black'],
        [transferAll.at(0)?.at(2) ?? 'black', transferAll.at(1)?.at(2) ?? 'black', transferAll.at(2)?.at(2) ?? 'black'],
        [
            transferAll.at(0)?.at(2) ?? 'black',
            transferAll.at(1)?.at(2) ?? 'black',
            transferAll.at(2)?.at(2) ?? 'black',
            transferAll.at(3)?.at(2) ?? 'black',
        ],
    ];

    const secondaryTextRef = React.useRef<SVGGElement | null>(null);
    const [secondaryTextWidth, setSecondaryTextWidth] = React.useState(0);
    React.useEffect(() => setSecondaryTextWidth(secondaryTextRef.current?.getBBox().width ?? 0), [...secondaryNames]);

    const textRef = React.useRef<SVGGElement | null>(null);
    const [textWidth, setTextWidth] = React.useState(0);
    React.useEffect(() => setTextWidth(textRef.current?.getBBox().width ?? 0), [...names]);

    const secondaryDx = (textWidth + (secondaryTextWidth + 12 * 2) / 2) * (nameOffsetX === 'left' ? -1 : 1);
    const underConstructionDx =
        (textWidth + secondaryTextWidth + (secondaryTextWidth !== 0 ? 12 * 2 : 0)) * // 12 is the width of the brackets
        // when nameOffsetX === 'middle' and no secondaryNames, no dx is needed
        (nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : secondaryTextWidth !== 0 ? 1 : 0);
    const underConstructionTextAnchor = nameOffsetX === 'middle' ? 'start' : textAnchor;

    return (
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
                        <polygon points="0.25,0 0.25,2.5 2.25,1.25" fill={color} />
                    </marker>
                ))}

            <g transform={`scale(${0.57915 * (tram ? 0.729 : 1)})`}>
                {transferAll.length <= 2 && (
                    <>
                        {/* A simple mask to hide all underlying lines. */}
                        <path d="M -21,-15 A 28 28 0 0 1 21,-15 L 21,15 A 28 28 0 0 1 -21,15 Z" fill={bgColor} />
                        <path
                            d="M -21,-15 A 28 28 0 0 1 21,-15"
                            fill="none"
                            stroke={arrowColor[transferAll.length][0]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 21,15 A 28 28 0 0 1 -21,15"
                            fill="none"
                            stroke={arrowColor[transferAll.length][1]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                    </>
                )}
                {transferAll.length === 3 && (
                    <>
                        <circle r="25" fill={bgColor} />
                        <path
                            d="M -21.65,12.5 A 25 25 0 0 1 0,-25"
                            fill="none"
                            stroke={arrowColor[transferAll.length][0]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-25 A 25 25 0 0 1 21.65,12.5"
                            fill="none"
                            stroke={arrowColor[transferAll.length][1]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                        <path
                            d="M 21.65,12.5 A 25 25 0 0 1 -21.65,12.5"
                            fill="none"
                            stroke={arrowColor[transferAll.length][2]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][2]})`}
                        />
                        {/* Add another 2 transparent arrows with marker to cover bottom arrows */}
                        <path
                            d="M -21.65,12.5 A 25 25 0 0 1 0,-25"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-25 A 25 25 0 0 1 21.65,12.5"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                    </>
                )}
                {transferAll.length >= 4 && (
                    <>
                        <circle r="25" fill={bgColor} />
                        <path
                            d="M -25,0 A 25 25 0 0 1 0,-25"
                            fill="none"
                            stroke={arrowColor[transferAll.length][0]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-25 A 25 25 0 0 1 25,0"
                            fill="none"
                            stroke={arrowColor[transferAll.length][1]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                        <path
                            d="M 25,0 A 25 25 0 0 1 0,25"
                            fill="none"
                            stroke={arrowColor[transferAll.length][2]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][2]})`}
                        />
                        <path
                            d="M 0,25 A 25 25 0 0 1 -25,0"
                            fill="none"
                            stroke={arrowColor[transferAll.length][3]}
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][3]})`}
                        />
                        {/* Add another 3 transparent arrows with marker to cover bottom arrows */}
                        <path
                            d="M -25,0 A 25 25 0 0 1 0,-25"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][0]})`}
                        />
                        <path
                            d="M 0,-25 A 25 25 0 0 1 25,0"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][1]})`}
                        />
                        <path
                            d="M 25,0 A 25 25 0 0 1 0,25"
                            fill="none"
                            strokeOpacity="0"
                            stroke="white"
                            strokeWidth="5"
                            markerEnd={`url(#gzmtr_int_arrow_${arrowColor[transferAll.length][2]})`}
                        />
                    </>
                )}

                {transfer[0]?.map((info, i, arr) => (
                    <g
                        key={`gzmtr_int_${id}_stn_${i}`}
                        transform={`translate(${CODE_POS[arr.length][i][0]},${CODE_POS[arr.length][i][1]})`}
                    >
                        {info[6] === 'gz' ? (
                            <StationNumber
                                strokeColour={info[2]}
                                lineNum={info[4]}
                                stnNum={info[5]}
                                textClassName="rmp-name__zh"
                            />
                        ) : (
                            <FoshanStationNumber
                                strokeColour={info[2]}
                                lineNum={info[4]}
                                stnNum={info[5]}
                                textClassName="rmp-name__zh"
                            />
                        )}
                    </g>
                ))}

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <circle
                    id={`stn_core_${id}`}
                    r="25"
                    fill="white"
                    fillOpacity="0"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    className="removeMe"
                />
            </g>

            <g ref={textRef} transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={FONT_SIZE.zh}
                    lineHeight={FONT_SIZE.zh}
                    grow="up"
                    className="rmp-name__zh"
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={FONT_SIZE.en}
                    lineHeight={FONT_SIZE.en}
                    grow="down"
                    className="rmp-name__en"
                />
            </g>
            {secondaryNames.join('') !== '' && (
                <g transform={`translate(${textX + secondaryDx}, ${textY})`} textAnchor="middle">
                    <text
                        fontSize="13.13"
                        dx={-(secondaryTextWidth + 5) / 2}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="rmp-name__zh"
                    >
                        （
                    </text>
                    <text
                        fontSize="13.13"
                        dx={(secondaryTextWidth + 5) / 2}
                        textAnchor="start"
                        dominantBaseline="middle"
                        className="rmp-name__zh"
                    >
                        ）
                    </text>
                    <g ref={secondaryTextRef}>
                        <text fontSize="10" dy="-2" dominantBaseline="auto" className="rmp-name__zh">
                            {secondaryNames[0]}
                        </text>
                        <text fontSize="5.42" dy="2" dominantBaseline="hanging" className="rmp-name__en">
                            {secondaryNames[1]}
                        </text>
                    </g>
                </g>
            )}
            {!open && (
                <g
                    transform={`translate(${textX + underConstructionDx}, ${textY})`}
                    textAnchor={underConstructionTextAnchor}
                >
                    <text fontSize="6.04" dy="-2" dominantBaseline="auto" className="rmp-name__zh">
                        （未开通）
                    </text>
                    <text fontSize="3.6" dy="4" dominantBaseline="hanging" className="rmp-name__en">
                        (Under Construction)
                    </text>
                </g>
            )}
        </g>
    );
};

/**
 * GzmtrIntStation specific props.
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
            value: attrs.names[1],
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
                attrs.nameOffsetX = val as Exclude<NameOffsetX, 'middle'>;
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
    ];

    const maximumTransfers = [4, 4, 0];
    const transfer = attrs.transfer ?? defaultGzmtrIntStationAttributes.transfer;

    const handleAdd = (setIndex: number) => (interchangeInfo: InterchangeInfo) => {
        const newTransferInfo = structuredClone(transfer);
        if (newTransferInfo.length <= setIndex) {
            for (let i = newTransferInfo.length; i <= setIndex; i++) {
                newTransferInfo[i] = [defaultGZMTRTransferInfo];
            }
        }
        newTransferInfo[setIndex].push(interchangeInfo);

        attrs.transfer = newTransferInfo;
        handleAttrsUpdate(id, attrs);
    };

    const handleDelete = (setIndex: number) => (interchangeIndex: number) => {
        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex ? set.filter((_, intIdx) => intIdx !== interchangeIndex) : set
            );

            attrs.transfer = newTransferInfo;
            handleAttrsUpdate(id, attrs);
        }
    };

    const handleUpdate = (setIndex: number) => (interchangeIndex: number, interchangeInfo: InterchangeInfo) => {
        if (transfer.length > setIndex && transfer[setIndex].length > interchangeIndex) {
            const newTransferInfo = transfer.map((set, setIdx) =>
                setIdx === setIndex
                    ? set.map((int, intIdx) =>
                          intIdx === interchangeIndex
                              ? ([0, 1, 2, 3, 4, 5, 6].map(i =>
                                    interchangeInfo[i] === undefined ? int[i] : interchangeInfo[i]
                                ) as InterchangeInfo)
                              : int
                      )
                    : set
            );

            attrs.transfer = newTransferInfo;
            handleAttrsUpdate(id, attrs);
        }
    };

    const handleAddInterchangeGroup = () => handleAdd(transfer.length)(defaultGZMTRTransferInfo);

    return (
        <>
            <RmgFields fields={fields} />

            <RmgLabel label={t('panel.details.stations.interchange.title')}>
                <VStack align="flex-start">
                    {transfer.map((infoList, i) => (
                        <React.Fragment key={i}>
                            <FormLabel size="xs">
                                {i === 0
                                    ? t('panel.details.stations.interchange.within')
                                    : i === 1
                                      ? t('panel.details.stations.interchange.outStation')
                                      : t('panel.details.stations.interchange.outSystem')}
                            </FormLabel>

                            <InterchangeCardGZMTR
                                interchangeList={infoList}
                                onAdd={maximumTransfers[i] > infoList.length ? handleAdd(i) : undefined}
                                onDelete={handleDelete(i)}
                                onUpdate={handleUpdate(i)}
                            />
                        </React.Fragment>
                    ))}

                    {maximumTransfers[transfer.length] > 0 && (
                        <Button
                            size="xs"
                            variant="ghost"
                            alignSelf="flex-end"
                            leftIcon={<MdAdd />}
                            onClick={handleAddInterchangeGroup}
                        >
                            {t('panel.details.stations.interchange.addGroup')}
                        </Button>
                    )}
                </VStack>
            </RmgLabel>
        </>
    );
};

const gzmtrIntStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(6,12)scale(0.3)">
            <StationNumber strokeColour="currentColor" lineNum="1" stnNum="09" />
        </g>
        <g transform="translate(18,12)scale(0.3)">
            <StationNumber strokeColour="currentColor" lineNum="2" stnNum="13" />
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
