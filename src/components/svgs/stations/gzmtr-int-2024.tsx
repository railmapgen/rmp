import { Button, FormLabel, VStack } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { InterchangeStation2024 } from '@railmapgen/svg-assets/gzmtr';
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

const FONT_SIZE = {
    en: 6.56,
    zh: 13.13,
};
const NAME_DY = structuredClone(DEFAULT_NAME_DY);
NAME_DY.top.lineHeight = FONT_SIZE.en;
NAME_DY.bottom.lineHeight = FONT_SIZE.zh;

const GzmtrInt2024Station = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultGzmtrInt2024StationAttributes.nameOffsetX,
        nameOffsetY = defaultGzmtrInt2024StationAttributes.nameOffsetY,
        transfer = defaultGzmtrInt2024StationAttributes.transfer,
        open = defaultGzmtrInt2024StationAttributes.open,
        secondaryNames = defaultGzmtrInt2024StationAttributes.secondaryNames,
        preferVertical = defaultGzmtrInt2024StationAttributes.preferVertical,
        anchorAt = defaultGzmtrInt2024StationAttributes.anchorAt,
    } = attrs[StationType.GzmtrInt2024] ?? defaultGzmtrInt2024StationAttributes;

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

    const transferAll = transfer.flat().slice(0, 4); // slice to make sure at most 4 transfers

    // temporary fix for the missing id on the top element of the station
    const iconEl = React.useRef<SVGGElement | null>(null);
    iconEl.current?.querySelectorAll('path')?.forEach(elem => elem.setAttribute('id', `stn_core_${id}`));

    const [iconBBox, setIconBBox] = React.useState({ x1: 0, x2: 0, y1: 0, y2: 0 });
    React.useEffect(() => {
        const { height: iconHeight, width: iconWidth, x: iconX1, y: iconY1 } = iconEl.current!.getBBox();
        const [iconX2, iconY2] = [iconX1 + iconWidth, iconY1 + iconHeight];
        setIconBBox({ x1: iconX1, x2: iconX2, y1: iconY1, y2: iconY2 });
    }, [JSON.stringify(transferAll), preferVertical, anchorAt, setIconBBox, iconEl]);
    const textDX = preferVertical && transferAll.length === 2 ? 0 : 8;

    const stations = transferAll.map(s => ({
        style: s[6] === 'gz' ? 'gzmtr' : ('fmetro' as 'gzmtr' | 'fmetro'),
        lineNum: s[4],
        stnNum: s[5],
        strokeColour: s[2],
    }));

    const textX = nameOffsetX === 'left' ? iconBBox.x1 + textDX : nameOffsetX === 'right' ? iconBBox.x2 - textDX : 0;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY[nameOffsetY].lineHeight +
            (iconBBox.y2 - iconBBox.y1) / 2) *
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

    const secondaryDx = (textWidth + (secondaryTextWidth + 12 * 2) / 2) * (nameOffsetX === 'left' ? -1 : 1);
    const underConstructionDx =
        (textWidth + secondaryTextWidth + (secondaryTextWidth !== 0 ? 12 * 2 : 0)) * (nameOffsetX === 'left' ? -1 : 1);

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g
                transform="scale(0.56)"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
                ref={iconEl}
            >
                <InterchangeStation2024
                    stations={stations}
                    textClassName="rmp-name__zh"
                    preferVertical={preferVertical}
                    anchorAt={anchorAt >= 0 ? anchorAt : undefined}
                />
            </g>
            <g ref={textRef} transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={13.13}
                    lineHeight={13.13}
                    grow="up"
                    className="rmp-name__zh"
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={6.56}
                    lineHeight={6.56}
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
                <g transform={`translate(${textX + underConstructionDx}, ${textY})`} textAnchor={textAnchor}>
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
 * GzmtrInt2024Station specific props.
 */
export interface GzmtrInt2024StationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    /**
     * Whether to show a Under Construction hint.
     */
    open: boolean;
    secondaryNames: [string, string];
    preferVertical: boolean;
    anchorAt: number;
}

const defaultGzmtrInt2024StationAttributes: GzmtrInt2024StationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    transfer: [
        [
            [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.white, '1', '14', 'gz'],
            [CityCode.Guangzhou, 'gz3', '#ECA154', MonoColour.white, '3', '11', 'gz'],
        ],
    ],
    open: true,
    secondaryNames: ['', ''],
    preferVertical: true,
    anchorAt: -1,
};

const gzmtrInt2024StationAttrsComponents = (props: AttrsProps<GzmtrInt2024StationAttributes>) => {
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
            type: 'select',
            label: t('panel.details.stations.gzmtrInt2024.anchorAt'),
            value: attrs.anchorAt ?? '-1',
            options: {
                '-1': t('panel.details.stations.gzmtrInt2024.anchorAtNone'),
                ...Object.fromEntries(
                    Array.from({ length: Math.min(attrs.transfer.flat().length, 4) }, (_, i) => [i.toString(), i])
                ),
            },
            onChange: val => {
                attrs.anchorAt = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrInt2024.preferVertical'),
            oneLine: true,
            isChecked: attrs.preferVertical,
            onChange: val => {
                attrs.preferVertical = val;
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
    ];

    const maximumTransfers = [4, 4, 0];
    const transfer = attrs.transfer ?? defaultGzmtrInt2024StationAttributes.transfer;

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
            attrs.anchorAt = -1;
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

const gzmtrInt2024StationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <InterchangeStation2024
            stations={[
                {
                    strokeColour: 'currentColor',
                    lineNum: '3',
                    stnNum: '03',
                },
                {
                    strokeColour: 'currentColor',
                    lineNum: '7',
                    stnNum: '05',
                },
            ]}
            textClassName="rmp-name__zh"
            preferVertical
            transform="translate(12,12)scale(0.3)"
        />
    </svg>
);

const gzmtrInt2024Station: Station<GzmtrInt2024StationAttributes> = {
    component: GzmtrInt2024Station,
    icon: gzmtrInt2024StationIcon,
    defaultAttrs: defaultGzmtrInt2024StationAttributes,
    attrsComponent: gzmtrInt2024StationAttrsComponents,
    metadata: {
        displayName: 'panel.details.stations.gzmtrInt2024.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrInt2024Station;
