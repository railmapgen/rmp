import { Button, HStack, IconButton, VStack } from '@chakra-ui/react';
import { RmgDebouncedInput, RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDelete } from 'react-icons/md';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import ThemeButton from '../../panels/theme-button';
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export const STYLE_OSAKA_METRO = {
    iconRatio: 0.6,
    station: {
        width: 30,
        height: 15,
        radius: 10,
        strokeWidth: 1,
        strokeRadius: 2,
        fontSize: 9,
        fontWeight: 'bold',
    },
    text: {
        offset: 2,
        fontSize: {
            name: 12,
            note: 9,
            translation: 7.5,
        },
    },
};

type OsakaMetroStationType = 'normal' | 'through';
type OsakaMetroNameDirection = 'vertical' | 'horizontal';
type OsakaMetroIntDirection = 'horizontal' | 'vertical';

export interface OsakaMetroSvgAttributes {
    stationType: 'normal' | 'through';
    lineCode: string;
    stationCode: string;
    theme: Theme;
}

export interface OsakaMetroStationAttributes extends StationAttributes {
    transferInfo: Array<OsakaMetroSvgAttributes>;
    nameDirection: OsakaMetroNameDirection;
    stationDirection: OsakaMetroIntDirection;
    noteName: string;
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    customNameOffsetX: number;
    customNameOffsetY: number;
    customStationOffsetX: number;
    customStationOffsetY: number;
    nameMaxWidth: number;
    noteMaxWidth: number;
    translationMaxWidth: number;
}

const defaultTransferInfo: OsakaMetroSvgAttributes = {
    stationType: 'normal',
    lineCode: 'M',
    stationCode: '16',
    theme: [CityCode.Osaka, 'm', '#db260a', MonoColour.white],
};
const defaultOsakaMetroStationAttributes: OsakaMetroStationAttributes = {
    names: ['梅田', 'Umeda'],
    transferInfo: [defaultTransferInfo],
    nameDirection: 'horizontal',
    stationDirection: 'horizontal',
    noteName: '',
    nameOffsetX: 'left',
    nameOffsetY: 'middle',
    customNameOffsetX: 0,
    customNameOffsetY: 0,
    customStationOffsetX: 0,
    customStationOffsetY: 0,
    nameMaxWidth: 0,
    noteMaxWidth: 0,
    translationMaxWidth: 0,
};

const osakaMetroStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect
            x={(24 - STYLE_OSAKA_METRO.station.width * STYLE_OSAKA_METRO.iconRatio) / 2}
            y={(24 - STYLE_OSAKA_METRO.station.height * STYLE_OSAKA_METRO.iconRatio) / 2}
            width={STYLE_OSAKA_METRO.station.width * STYLE_OSAKA_METRO.iconRatio}
            height={STYLE_OSAKA_METRO.station.height * STYLE_OSAKA_METRO.iconRatio}
            fill="currentColor"
        />
        <text
            x="12"
            y="12"
            transform={`translate(0, ${STYLE_OSAKA_METRO.station.fontSize * STYLE_OSAKA_METRO.iconRatio * 0.4})`}
            textAnchor="middle"
            fontSize={STYLE_OSAKA_METRO.station.fontSize * STYLE_OSAKA_METRO.iconRatio}
            fontWeight={STYLE_OSAKA_METRO.station.fontWeight}
            fill="white"
        >
            {`${defaultOsakaMetroStationAttributes.transferInfo[0].lineCode}${defaultOsakaMetroStationAttributes.transferInfo[0].stationCode}`}
        </text>
    </svg>
);

export const OsakaMetroSvg = (props: { transferInfo: Array<OsakaMetroSvgAttributes> }) => {
    const { transferInfo } = props;
    const { lineCode, stationCode, theme, stationType } = transferInfo[0];
    const [bgColor, fgColor] = [theme[2], theme[3]];
    return stationType !== 'through' ? (
        <>
            <rect
                x={-STYLE_OSAKA_METRO.station.width / 2}
                y={-STYLE_OSAKA_METRO.station.height / 2}
                width={STYLE_OSAKA_METRO.station.width}
                height={STYLE_OSAKA_METRO.station.height}
                fill={bgColor}
            />
            <text
                y={(STYLE_OSAKA_METRO.station.height - STYLE_OSAKA_METRO.station.fontSize) / 2}
                textAnchor="middle"
                fontSize={STYLE_OSAKA_METRO.station.fontSize}
                fontWeight={STYLE_OSAKA_METRO.station.fontWeight}
                fill={fgColor}
            >
                {`${lineCode}${stationCode}`}
            </text>
        </>
    ) : (
        <>
            <circle
                cx={0}
                cy={0}
                r={STYLE_OSAKA_METRO.station.radius - STYLE_OSAKA_METRO.station.strokeWidth}
                stroke={bgColor}
                strokeWidth={STYLE_OSAKA_METRO.station.strokeWidth}
                fill="white"
            />
            {lineCode.length === 1 ? (
                <text
                    y={(STYLE_OSAKA_METRO.station.height - STYLE_OSAKA_METRO.station.fontSize) / 2 - 0.5}
                    textAnchor="middle"
                    fontSize={STYLE_OSAKA_METRO.station.fontSize - 2}
                    fontWeight={STYLE_OSAKA_METRO.station.fontWeight}
                    fill={bgColor}
                >
                    {`${lineCode}${stationCode}`}
                </text>
            ) : (
                <>
                    <text
                        textAnchor="middle"
                        fontSize={STYLE_OSAKA_METRO.station.fontSize - 2}
                        fontWeight={STYLE_OSAKA_METRO.station.fontWeight}
                        fill={bgColor}
                    >
                        {lineCode}
                    </text>
                    <text
                        y={STYLE_OSAKA_METRO.station.fontSize - 2.75}
                        textAnchor="middle"
                        fontSize={STYLE_OSAKA_METRO.station.fontSize - 2}
                        fontWeight={STYLE_OSAKA_METRO.station.fontWeight}
                        fill={bgColor}
                    >
                        {stationCode}
                    </text>
                </>
            )}
        </>
    );
};

const OsakaMetroIntSvg = (props: {
    stationDirection: OsakaMetroIntDirection;
    width: number;
    height: number;
    transferInfo: Array<OsakaMetroSvgAttributes>;
}) => {
    const { stationDirection, width, height, transferInfo } = props;
    return (
        <g>
            {transferInfo.map((transfer, index) => (
                <g
                    key={index}
                    transform={`translate(
                        ${(stationDirection === 'horizontal' ? index * STYLE_OSAKA_METRO.station.width : 0) + 1},
                        ${(stationDirection === 'vertical' ? index * STYLE_OSAKA_METRO.station.height : 0) + 1}
                    )`}
                >
                    <OsakaMetroSvg transferInfo={[transfer]} />
                </g>
            ))}
        </g>
    );
};

const OsakaMetroStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;

    const {
        names = defaultOsakaMetroStationAttributes.names,
        transferInfo = defaultOsakaMetroStationAttributes.transferInfo,
        nameDirection = defaultOsakaMetroStationAttributes.nameDirection,
        stationDirection = defaultOsakaMetroStationAttributes.stationDirection,
        noteName = defaultOsakaMetroStationAttributes.noteName,
        nameOffsetX = defaultOsakaMetroStationAttributes.nameOffsetX,
        nameOffsetY = defaultOsakaMetroStationAttributes.nameOffsetY,
        customNameOffsetX = defaultOsakaMetroStationAttributes.customNameOffsetX,
        customNameOffsetY = defaultOsakaMetroStationAttributes.customNameOffsetY,
        customStationOffsetX = defaultOsakaMetroStationAttributes.customStationOffsetX,
        customStationOffsetY = defaultOsakaMetroStationAttributes.customStationOffsetY,
        nameMaxWidth = defaultOsakaMetroStationAttributes.nameMaxWidth,
        noteMaxWidth = defaultOsakaMetroStationAttributes.noteMaxWidth,
        translationMaxWidth = defaultOsakaMetroStationAttributes.translationMaxWidth,
    } = attrs[StationType.OsakaMetro] ?? defaultOsakaMetroStationAttributes;

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

    const transferCount = transferInfo.length;
    const svgWidth =
        transferCount > 1
            ? (stationDirection === 'horizontal'
                  ? transferCount * STYLE_OSAKA_METRO.station.width
                  : STYLE_OSAKA_METRO.station.width) +
              STYLE_OSAKA_METRO.station.strokeWidth * 2
            : STYLE_OSAKA_METRO.station.width;
    const svgHeight =
        transferCount > 1
            ? (stationDirection === 'horizontal'
                  ? STYLE_OSAKA_METRO.station.height
                  : transferCount * STYLE_OSAKA_METRO.station.height) +
              STYLE_OSAKA_METRO.station.strokeWidth * 2
            : STYLE_OSAKA_METRO.station.height;

    const stationType = transferInfo[0].stationType;
    const baseOffsetX = {
        left: -STYLE_OSAKA_METRO.text.offset - 2,
        middle:
            (stationType === 'normal' ? -STYLE_OSAKA_METRO.station.width / 2 : -2 * STYLE_OSAKA_METRO.text.offset) +
            (stationDirection === 'horizontal' ? ((transferCount - 1) / 2) * STYLE_OSAKA_METRO.station.width : 0),
        right:
            STYLE_OSAKA_METRO.text.offset +
            (transferCount > 1
                ? STYLE_OSAKA_METRO.station.strokeWidth * 2 +
                  (stationDirection === 'horizontal' ? (transferCount - 1) * STYLE_OSAKA_METRO.station.width : 0)
                : 0),
    };
    const baseOffsetY = {
        top:
            -STYLE_OSAKA_METRO.station.height / 2 -
            STYLE_OSAKA_METRO.text.offset -
            (stationType === 'normal' ? 0 : 2) -
            (transferCount > 1 ? STYLE_OSAKA_METRO.station.strokeWidth * 2 : 0) -
            8,
        middle:
            Math.max(names[0].split('\n').length - 1, 0) *
                STYLE_OSAKA_METRO.text.fontSize.name *
                (nameDirection === 'horizontal' ? 1 : -1) +
            (noteName.length > 0 ? STYLE_OSAKA_METRO.text.fontSize.note + 2 : 0) +
            (stationDirection === 'vertical' ? ((transferCount - 1) / 2) * STYLE_OSAKA_METRO.station.height : 0) +
            2,
        bottom:
            Math.max(names[0].split('\n').length - 1, 0) *
                STYLE_OSAKA_METRO.text.fontSize.name *
                (nameDirection === 'horizontal' ? 1 : -1) +
            STYLE_OSAKA_METRO.station.height / 2 +
            STYLE_OSAKA_METRO.text.offset +
            (noteName.length > 0 ? STYLE_OSAKA_METRO.text.fontSize.note + 2 : 0) +
            (stationType === 'normal' ? 0 : 2) +
            STYLE_OSAKA_METRO.station.strokeWidth * (transferCount > 1 ? 4 : 2) +
            (stationDirection === 'vertical' ? (transferCount - 1) * STYLE_OSAKA_METRO.station.height : 0) +
            11,
    };
    let textX = baseOffsetX[nameOffsetX] + customNameOffsetX + STYLE_OSAKA_METRO.station.strokeWidth;
    if (nameOffsetY === 'middle') {
        textX +=
            stationType === 'normal'
                ? nameOffsetX === 'left'
                    ? nameDirection === 'horizontal'
                        ? -STYLE_OSAKA_METRO.station.width / 2
                        : -STYLE_OSAKA_METRO.station.height / 2
                    : nameDirection === 'horizontal'
                      ? STYLE_OSAKA_METRO.station.width / 2
                      : STYLE_OSAKA_METRO.station.height / 2
                : nameOffsetX === 'left'
                  ? -STYLE_OSAKA_METRO.station.radius
                  : STYLE_OSAKA_METRO.station.radius;
    } else {
        textX +=
            nameOffsetX === 'left'
                ? -STYLE_OSAKA_METRO.text.offset
                : nameOffsetX === 'right'
                  ? STYLE_OSAKA_METRO.text.offset
                  : stationType === 'normal'
                    ? 0
                    : -STYLE_OSAKA_METRO.station.radius;
    }
    const textY = baseOffsetY[nameOffsetY] + customNameOffsetY;
    const textAnchor = nameOffsetX === 'left' ? 'end' : 'start';

    const adjustX =
        x -
        (stationDirection === 'horizontal' ? ((transferCount - 1) * STYLE_OSAKA_METRO.station.width) / 2 : 0) -
        (transferCount > 1 ? STYLE_OSAKA_METRO.station.strokeWidth : 0) +
        customStationOffsetX;
    const adjustY =
        y -
        (stationDirection === 'vertical' ? ((transferCount - 1) * STYLE_OSAKA_METRO.station.height) / 2 : 0) -
        (transferCount > 1 ? STYLE_OSAKA_METRO.station.strokeWidth * 2 : 0) +
        customStationOffsetY;

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${adjustX}, ${adjustY})`}>
                {transferInfo.length === 1 ? (
                    <g>
                        {stationType !== 'through' ? (
                            <rect
                                x={-STYLE_OSAKA_METRO.station.width / 2 - STYLE_OSAKA_METRO.station.strokeWidth}
                                y={-STYLE_OSAKA_METRO.station.height / 2 - STYLE_OSAKA_METRO.station.strokeWidth}
                                width={STYLE_OSAKA_METRO.station.width + STYLE_OSAKA_METRO.station.strokeWidth * 2}
                                height={STYLE_OSAKA_METRO.station.height + STYLE_OSAKA_METRO.station.strokeWidth * 2}
                                fill="white"
                            />
                        ) : (
                            <circle
                                r={STYLE_OSAKA_METRO.station.radius + STYLE_OSAKA_METRO.station.strokeWidth / 2}
                                fill="white"
                            />
                        )}
                        <OsakaMetroSvg transferInfo={transferInfo} />
                    </g>
                ) : (
                    <>
                        <rect
                            x={-STYLE_OSAKA_METRO.station.width / 2 - STYLE_OSAKA_METRO.station.strokeWidth}
                            y={-STYLE_OSAKA_METRO.station.height / 2 - STYLE_OSAKA_METRO.station.strokeWidth}
                            width={svgWidth + STYLE_OSAKA_METRO.station.strokeWidth * 2}
                            height={svgHeight + STYLE_OSAKA_METRO.station.strokeWidth * 2}
                            fill="white"
                            stroke="black"
                            strokeWidth={STYLE_OSAKA_METRO.station.strokeWidth}
                            rx={STYLE_OSAKA_METRO.station.strokeRadius}
                        />
                        <OsakaMetroIntSvg
                            stationDirection={stationDirection}
                            width={svgWidth}
                            height={svgHeight}
                            transferInfo={transferInfo}
                        />
                    </>
                )}

                {transferCount === 1 && stationType === 'through' ? (
                    <circle
                        id={`stn_core_${id}`}
                        cx={0}
                        cy={0}
                        r={STYLE_OSAKA_METRO.station.radius}
                        opacity={0}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                ) : (
                    <rect
                        id={`stn_core_${id}`}
                        x={-STYLE_OSAKA_METRO.station.width / 2}
                        y={-STYLE_OSAKA_METRO.station.height / 2}
                        width={svgWidth}
                        height={svgHeight}
                        opacity={0}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                )}

                {nameDirection === 'horizontal' ? (
                    <g
                        transform={`translate(${textX}, ${textY})`}
                        textAnchor={textAnchor}
                        className="rmp-name-outline"
                        strokeWidth="1"
                    >
                        <MultilineText
                            text={(names[0].length === 2
                                ? names[0].slice(0, 1) + ' ' + names[0].slice(1)
                                : names[0]
                            ).split('\n')}
                            fontSize={STYLE_OSAKA_METRO.text.fontSize.name}
                            lineHeight={STYLE_OSAKA_METRO.text.fontSize.name}
                            transform={`translate(0, ${-(STYLE_OSAKA_METRO.text.fontSize.note + 2) * (noteName.length > 0 ? 1 : 0)})`}
                            grow="up"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={nameMaxWidth || undefined}
                            lengthAdjust="spacingAndGlyphs"
                            stroke="none"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                        {noteName && noteName.length > 0 && (
                            <MultilineText
                                text={`(${noteName})`.split('\n')}
                                fontSize={STYLE_OSAKA_METRO.text.fontSize.note}
                                lineHeight={STYLE_OSAKA_METRO.text.fontSize.note}
                                transform={`translate(0, ${-STYLE_OSAKA_METRO.text.fontSize.note / 2 - 0.5})`}
                                grow="bidirectional"
                                baseOffset={1}
                                fontWeight="bold"
                                textLength={noteMaxWidth || undefined}
                                lengthAdjust="spacingAndGlyphs"
                                {...getLangStyle(TextLanguage.tokyo_ja)}
                            />
                        )}
                        <MultilineText
                            text={names[1].split('\n')}
                            fontSize={STYLE_OSAKA_METRO.text.fontSize.translation}
                            lineHeight={STYLE_OSAKA_METRO.text.fontSize.translation}
                            grow="down"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={translationMaxWidth || undefined}
                            lengthAdjust="spacingAndGlyphs"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    </g>
                ) : (
                    <g
                        transform={`translate(${textY - (STYLE_OSAKA_METRO.text.fontSize.note + 2) * (noteName.length > 0 ? 1 : 0)}, ${textX})`}
                        textAnchor={textAnchor}
                        className="rmp-name-outline"
                        strokeWidth="1"
                    >
                        <MultilineTextVertical
                            text={(names[0].length === 2
                                ? names[0].slice(0, 1) + ' ' + names[0].slice(1)
                                : names[0]
                            ).split('\n')}
                            fontSize={STYLE_OSAKA_METRO.text.fontSize.name}
                            lineWidth={STYLE_OSAKA_METRO.text.fontSize.name}
                            grow="right"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={nameMaxWidth || undefined}
                            lengthAdjust="spacingAndGlyphs"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                        {noteName && noteName.length > 0 && (
                            <MultilineTextVertical
                                text={`(${noteName})`.split('\n')}
                                fontSize={STYLE_OSAKA_METRO.text.fontSize.note}
                                lineWidth={STYLE_OSAKA_METRO.text.fontSize.note}
                                transform={`translate(${-STYLE_OSAKA_METRO.text.fontSize.note - 2}, 0)`}
                                grow="bidirectional"
                                baseOffset={1}
                                fontWeight="bold"
                                textLength={noteMaxWidth || undefined}
                                lengthAdjust="spacingAndGlyphs"
                                {...getLangStyle(TextLanguage.tokyo_ja)}
                            />
                        )}
                        <MultilineTextVertical
                            text={names[1].split('\n')}
                            fontSize={STYLE_OSAKA_METRO.text.fontSize.translation}
                            lineWidth={STYLE_OSAKA_METRO.text.fontSize.translation}
                            transform={`translate(${-(STYLE_OSAKA_METRO.text.fontSize.note + 2) * (noteName.length > 0 ? 1 : 0) - 4}, 0)`}
                            grow="left"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={translationMaxWidth || undefined}
                            lengthAdjust="spacingAndGlyphs"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    </g>
                )}
            </g>
        ),
        [
            id,
            x,
            y,
            ...names,
            stationType,
            transferInfo,
            nameDirection,
            stationDirection,
            noteName,
            nameOffsetX,
            nameOffsetY,
            nameMaxWidth,
            noteMaxWidth,
            translationMaxWidth,
            customNameOffsetX,
            customNameOffsetY,
            customStationOffsetX,
            customStationOffsetY,
            onPointerDown,
            onPointerMove,
            onPointerUp,
        ]
    );
};

const osakaMetroAttrsComponent = (props: AttrsProps<OsakaMetroStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const dispatch = useRootDispatch();
    const {
        paletteAppClip: { input, output },
    } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();

    const basicFields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.stations.osakaMetro.stationType'),
            value: attrs.transferInfo[0].stationType || defaultOsakaMetroStationAttributes.transferInfo[0].stationType,
            options: {
                normal: t('panel.details.stations.osakaMetro.normalType'),
                through: t('panel.details.stations.osakaMetro.throughType'),
            },
            onChange: val => {
                attrs.transferInfo[0].stationType = val as OsakaMetroStationType;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    const transferFields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.stations.osakaMetro.stationVertical'),
            isChecked: attrs.stationDirection === 'vertical',
            onChange: val => {
                attrs.stationDirection = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    const commonFields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.osakaMetro.noteName'),
            value: attrs.noteName,
            onChange: val => {
                attrs.noteName = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
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
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.common.nameOffsetX')
                    : t('panel.details.stations.common.nameOffsetY'),
            value: attrs.nameOffsetX,
            options: {
                left:
                    attrs.nameDirection === 'horizontal'
                        ? t('panel.details.stations.common.left')
                        : t('panel.details.stations.common.top'),
                middle: t('panel.details.stations.common.middle'),
                right:
                    attrs.nameDirection === 'horizontal'
                        ? t('panel.details.stations.common.right')
                        : t('panel.details.stations.common.bottom'),
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
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.common.nameOffsetY')
                    : t('panel.details.stations.common.nameOffsetX'),
            value: attrs.nameOffsetY,
            options: {
                top:
                    attrs.nameDirection === 'horizontal'
                        ? t('panel.details.stations.common.top')
                        : t('panel.details.stations.common.left'),
                middle: t('panel.details.stations.common.middle'),
                bottom:
                    attrs.nameDirection === 'horizontal'
                        ? t('panel.details.stations.common.bottom')
                        : t('panel.details.stations.common.right'),
            },
            disabledOptions:
                attrs.nameOffsetX === 'middle'
                    ? ['middle']
                    : attrs.nameDirection === 'vertical'
                      ? ['top', 'bottom']
                      : [],
            onChange: val => {
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.osakaMetro.nameMaxWidth'),
            value: attrs.nameMaxWidth?.toString(),
            placeholder: t('panel.details.stations.osakaMetro.maxWidthPlaceholder'),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.nameMaxWidth = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.osakaMetro.noteMaxWidth'),
            value: attrs.noteMaxWidth?.toString(),
            placeholder: t('panel.details.stations.osakaMetro.maxWidthPlaceholder'),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.noteMaxWidth = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.osakaMetro.translationMaxWidth'),
            value: attrs.translationMaxWidth?.toString(),
            placeholder: t('panel.details.stations.osakaMetro.maxWidthPlaceholder'),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.translationMaxWidth = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.osakaMetro.customNameOffsetX')
                    : t('panel.details.stations.osakaMetro.customNameOffsetY'),
            value: attrs.customNameOffsetX?.toString(),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.customNameOffsetX = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.osakaMetro.customNameOffsetY')
                    : t('panel.details.stations.osakaMetro.customNameOffsetX'),
            value: attrs.customNameOffsetY?.toString(),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.customNameOffsetY = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.osakaMetro.customStationOffsetX')
                    : t('panel.details.stations.osakaMetro.customStationOffsetY'),
            value: attrs.customStationOffsetX?.toString(),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.customStationOffsetX = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label:
                attrs.nameDirection === 'horizontal'
                    ? t('panel.details.stations.osakaMetro.customStationOffsetY')
                    : t('panel.details.stations.osakaMetro.customStationOffsetX'),
            value: attrs.customStationOffsetY?.toString(),
            onChange: val => {
                if (Number.isNaN(val)) val = '0';
                attrs.customStationOffsetY = parseInt(val) || 0;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.osakaMetro.nameVertical'),
            isChecked: attrs.nameDirection === 'vertical',
            onChange: val => {
                attrs.nameDirection = val ? 'vertical' : 'horizontal';
                handleAttrsUpdate(id, attrs);
            },
        },
    ];

    const [themeRequested, setThemeRequested] = React.useState<number | undefined>(undefined);
    React.useEffect(() => {
        if (themeRequested === undefined) {
            return;
        }
        if (output) {
            const newTransferInfo = [...attrs.transferInfo];
            newTransferInfo[themeRequested] = { ...newTransferInfo[themeRequested], theme: output };
            handleAttrsUpdate(id, { ...attrs, transferInfo: newTransferInfo });
            setThemeRequested(undefined);
        } else if (!input) {
            setThemeRequested(undefined);
        }
    }, [input, output]);

    const handleAdd = (index: number) => {
        attrs.transferInfo[0].stationType = 'normal';
        const newTransferInfo = structuredClone(attrs.transferInfo);
        newTransferInfo.push(defaultTransferInfo);
        for (let i = newTransferInfo.length - 1; i > index; i--) {
            newTransferInfo[i] = structuredClone(newTransferInfo[i - 1]);
        }
        newTransferInfo[index] = defaultTransferInfo;
        handleAttrsUpdate(id, { ...attrs, transferInfo: newTransferInfo });
    };

    const handleDelete = (index: number) => {
        const newTransferInfo = attrs.transferInfo.filter((s, i) => i !== index);
        handleAttrsUpdate(id, { ...attrs, transferInfo: newTransferInfo });
    };

    const handleLineCodeChange = (val: string, index: number) => {
        const newTransferInfo = [...attrs.transferInfo];
        newTransferInfo[index] = { ...newTransferInfo[index], lineCode: val };
        handleAttrsUpdate(id, { ...attrs, transferInfo: newTransferInfo });
    };

    const handleStationCodeChange = (val: string, index: number) => {
        const newTransferInfo = [...attrs.transferInfo];
        newTransferInfo[index] = { ...newTransferInfo[index], stationCode: val };
        handleAttrsUpdate(id, { ...attrs, transferInfo: newTransferInfo });
    };

    return (
        <>
            {attrs.transferInfo.length === 1 && <RmgFields fields={basicFields} />}
            <RmgFields fields={commonFields} />
            {attrs.transferInfo.length > 1 && <RmgFields fields={transferFields} />}

            <RmgLabel label={t('panel.details.stations.osakaMetro.transferEdit')}>
                <VStack align="flex-start">
                    {attrs.transferInfo.map((s, i) => (
                        <HStack key={`${s.lineCode}_${s.stationCode}_${i}`}>
                            <ThemeButton
                                theme={s.theme}
                                onClick={() => {
                                    setThemeRequested(i);
                                    dispatch(openPaletteAppClip(s.theme));
                                }}
                            />
                            <RmgLabel label={t('panel.details.stations.common.lineCode')}>
                                <RmgDebouncedInput
                                    defaultValue={s.lineCode}
                                    onDebouncedChange={val => handleLineCodeChange(val, i)}
                                />
                            </RmgLabel>
                            <RmgLabel label={t('panel.details.stations.common.stationCode')}>
                                <RmgDebouncedInput
                                    defaultValue={s.stationCode}
                                    onDebouncedChange={val => handleStationCodeChange(val, i)}
                                />
                            </RmgLabel>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.add')}
                                icon={<MdAdd />}
                                onClick={() => handleAdd(i)}
                            ></IconButton>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label={t('panel.details.stations.interchange.add')}
                                icon={<MdDelete />}
                                onClick={() => handleDelete(i)}
                                isDisabled={attrs.transferInfo.length === 1}
                            ></IconButton>
                        </HStack>
                    ))}

                    <Button
                        size="sm"
                        width="100%"
                        variant="outline"
                        leftIcon={<MdAdd />}
                        onClick={() => handleAdd(attrs.transferInfo.length)}
                    >
                        {t('panel.details.stations.interchange.title')}
                    </Button>
                </VStack>
            </RmgLabel>
        </>
    );
};

const osakaMetroStation: Station<OsakaMetroStationAttributes> = {
    component: OsakaMetroStation,
    icon: osakaMetroStationIcon,
    defaultAttrs: defaultOsakaMetroStationAttributes,
    attrsComponent: osakaMetroAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.osakaMetro.displayName',
        cities: [CityCode.Osaka],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default osakaMetroStation;
