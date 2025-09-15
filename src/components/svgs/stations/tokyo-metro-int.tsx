import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
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
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';
import { TokyoMetroBasicSvg } from './tokyo-metro-basic';

const TokyoMetroIntStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultTokyoMetroIntStationAttributes.nameOffsetX,
        nameOffsetY = defaultTokyoMetroIntStationAttributes.nameOffsetY,
        textVertical = defaultTokyoMetroIntStationAttributes.textVertical,
        transfer = defaultTokyoMetroIntStationAttributes.transfer,
        align = defaultTokyoMetroIntStationAttributes.align,
        importance = defaultTokyoMetroIntStationAttributes.importance,
        mereOffset = defaultTokyoMetroIntStationAttributes.mereOffset,
    } = attrs[StationType.TokyoMetroInt] ?? defaultTokyoMetroIntStationAttributes;

    const interchanges = transfer[0];

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

    const [textLength, setTextLength] = React.useState(0);
    React.useEffect(() => {
        let len = 0;
        names[0].split('\n').forEach(s => {
            len = Math.max(len, s.length);
        });
        setTextLength(len);
    }, [names[0]]);

    const singleWidth = 13;
    const singleHeight = 18;
    const width = align === 'horizontal' ? interchanges.length * singleWidth : 0;
    const height = align === 'vertical' ? interchanges.length * singleHeight : 0;
    const textOffsetXL = align === 'horizontal' ? 4 : 10;
    const textOffsetXR = align === 'horizontal' ? 2 : 9;
    const textX =
        nameOffsetX === 'left'
            ? -textOffsetXL - width / 2
            : nameOffsetX === 'right'
              ? textOffsetXR + width / 2
              : mereOffset === 'left2'
                ? -5
                : mereOffset === 'right2'
                  ? 5
                  : 0;

    interface TokyoMetroIntSvgProps {
        fontSize: number;
        textXVer: number;
        textY: number;
        textYVer: number;
    }

    const getDefault = (): TokyoMetroIntSvgProps => {
        const textOffsetYTop = align === 'vertical' ? 1 : 10;
        const textOffsetYBottom = align === 'vertical' ? 3 : 12;
        const textOffsetYVerTop = align === 'vertical' ? 1 : 13;
        const textOffsetYVerBottom = align === 'vertical' ? 3 : 12;
        const textMereOffsetX =
            mereOffset === 'left1'
                ? -4
                : mereOffset === 'left2'
                  ? -10
                  : mereOffset === 'right1'
                    ? 4
                    : mereOffset === 'right2'
                      ? 10
                      : 0;
        const textMereOffsetY = mereOffset === 'up' ? 3 : mereOffset === 'down' ? 10 : 0;
        return {
            fontSize: 10,
            textXVer: (nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : -2) + textMereOffsetX,
            textY:
                nameOffsetY === 'bottom'
                    ? textOffsetYTop + height / 2
                    : nameOffsetY === 'top'
                      ? -textOffsetYBottom - height / 2
                      : -7.5 + textMereOffsetY,
            textYVer:
                nameOffsetY === 'bottom'
                    ? textOffsetYVerBottom + height / 2 + textLength * 5
                    : nameOffsetY === 'top'
                      ? -textOffsetYVerTop - height / 2 - textLength * 5
                      : -5,
        };
    };

    const getMiddle = (): TokyoMetroIntSvgProps => {
        const textOffsetYTop = align === 'vertical' ? 1 : 10;
        const textOffsetYBottom = align === 'vertical' ? 3 : 13;
        const textOffsetYVerTop = align === 'vertical' ? 4 : 13;
        const textOffsetYVerBottom = align === 'vertical' ? 3 : 13;
        const textMereOffsetX =
            mereOffset === 'left1'
                ? -8
                : mereOffset === 'left2'
                  ? -13
                  : mereOffset === 'right1'
                    ? 8
                    : mereOffset === 'right2'
                      ? 13
                      : 0;
        const textMereOffsetY = mereOffset === 'up' ? 4 : mereOffset === 'down' ? 12 : 0;
        return {
            fontSize: 15,
            textXVer: (nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : -2) + textMereOffsetX,
            textY:
                nameOffsetY === 'bottom'
                    ? textOffsetYTop + height / 2
                    : nameOffsetY === 'top'
                      ? -textOffsetYBottom - height / 2
                      : -10 + textMereOffsetY,
            textYVer:
                nameOffsetY === 'bottom'
                    ? textOffsetYVerBottom + height / 2 + textLength * 7.5
                    : nameOffsetY === 'top'
                      ? -textOffsetYVerTop - height / 2 - textLength * 7.5
                      : -5,
        };
    };

    const getImportant = (): TokyoMetroIntSvgProps => {
        const textOffsetYTop = align === 'vertical' ? 1 : 13;
        const textOffsetYBottom = align === 'vertical' ? 3 : 10;
        const textOffsetYVerTop = align === 'vertical' ? 5 : 13;
        const textOffsetYVerBottom = align === 'vertical' ? 4 : 13;
        const textMereOffsetX =
            mereOffset === 'left1'
                ? -10
                : mereOffset === 'left2'
                  ? -16
                  : mereOffset === 'right1'
                    ? 10
                    : mereOffset === 'right2'
                      ? 16
                      : 0;
        const textMereOffsetY = mereOffset === 'up' ? 6 : mereOffset === 'down' ? 15 : 0;
        return {
            fontSize: 20,
            textXVer: (nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : -2) + textMereOffsetX,
            textY:
                nameOffsetY === 'bottom'
                    ? textOffsetYBottom + height / 2
                    : nameOffsetY === 'top'
                      ? -textOffsetYTop - height / 2
                      : -13 + textMereOffsetY,
            textYVer:
                nameOffsetY === 'bottom'
                    ? textOffsetYVerBottom + height / 2 + textLength * 10
                    : nameOffsetY === 'top'
                      ? -textOffsetYVerTop - height / 2 - textLength * 10
                      : -5,
        };
    };

    const { fontSize, textXVer, textY, textYVer } =
        importance === 'default' ? getDefault() : importance === 'high' ? getImportant() : getMiddle();
    const textAnchor =
        nameOffsetX === 'left' || mereOffset === 'left1' || mereOffset === 'left2'
            ? 'end'
            : nameOffsetX === 'right' || mereOffset === 'right1' || mereOffset === 'right2'
              ? 'start'
              : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            {align === 'horizontal' ? (
                <>
                    <rect
                        x={-(width + 3) / 2}
                        y={-10.5}
                        width={width + 3}
                        height={21}
                        rx={3}
                        fill="#808285"
                        stroke="black"
                        strokeWidth="0.5"
                    />
                    {interchanges.map((s, i) => (
                        <g
                            key={`${s.toString()}_${i}`}
                            transform={`translate(${i * singleWidth - (width - singleWidth) / 2}, 0)`}
                        >
                            <TokyoMetroBasicSvg
                                lineCode={s[4]}
                                stationCode={s[5]}
                                color={s.slice(0, 4) as Theme}
                                stroke={true}
                            />
                        </g>
                    ))}

                    <rect
                        id={`stn_core_${id}`}
                        x={-(width + 3) / 2}
                        y={-10.5}
                        width={width + 3}
                        height={21}
                        rx={3}
                        opacity={0}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </>
            ) : (
                <>
                    <rect
                        x={-8}
                        y={-(height + 3) / 2}
                        width={16}
                        height={height + 3}
                        rx={3}
                        fill="#808285"
                        stroke="black"
                        strokeWidth="0.5"
                    />
                    {interchanges.map((s, i) => (
                        <g
                            key={`${s.toString()}_${i}`}
                            transform={`translate(0, ${i * singleHeight - (height - singleHeight) / 2})`}
                        >
                            <TokyoMetroBasicSvg
                                lineCode={s[4]}
                                stationCode={s[5]}
                                color={s.slice(0, 4) as Theme}
                                stroke={true}
                            />
                        </g>
                    ))}

                    <rect
                        id={`stn_core_${id}`}
                        x={-8}
                        y={-(height + 3) / 2}
                        width={16}
                        height={height + 3}
                        rx={3}
                        opacity={0}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                    />
                </>
            )}
            <g textAnchor={textAnchor} className="rmp-name-outline" strokeWidth="1">
                {!textVertical ? (
                    <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                        <MultilineText
                            text={names[0].split('\n')}
                            fontSize={fontSize}
                            lineHeight={fontSize}
                            grow={nameOffsetY === 'top' || mereOffset === 'up' ? 'up' : 'down'}
                            {...getLangStyle(TextLanguage.jreast_ja)}
                            fill={'black'}
                            fontWeight={importance !== 'default' ? 'bold' : 'normal'}
                        />
                    </g>
                ) : (
                    <g transform={`translate(${textXVer}, ${textYVer})`} textAnchor="middle">
                        <MultilineTextVertical
                            text={names[0].split('\n')}
                            fontSize={fontSize}
                            lineWidth={fontSize}
                            grow="bidirectional"
                            {...getLangStyle(TextLanguage.jreast_ja)}
                            fill={'black'}
                            fontWeight={importance !== 'default' ? 'bold' : 'normal'}
                        />
                    </g>
                )}
            </g>
        </g>
    );
};

type MereOffset = 'none' | 'left1' | 'left2' | 'right1' | 'right2' | 'up' | 'down';
type Align = 'vertical' | 'horizontal';
type Importance = 'default' | 'middle' | 'high';

/**
 * TokyoMetroIntStation specific props.
 */
export interface TokyoMetroIntStationAttributes extends StationAttributes, StationAttributesWithInterchange {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    mereOffset: MereOffset;
    textVertical: boolean;
    align: Align;
    importance: Importance;
}

const defaultTokyoMetroIntStationAttributes: TokyoMetroIntStationAttributes = {
    names: ['日本橋'],
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    mereOffset: 'none',
    textVertical: false,
    transfer: [
        [
            [CityCode.Tokyo, 'g', '#f9a328', MonoColour.white, 'G', '11'],
            [CityCode.Tokyo, 't', '#00a4db', MonoColour.white, 'T', '10'],
            [CityCode.Tokyo, 'a', '#dd4231', MonoColour.white, 'A', '13'],
        ],
    ],
    align: 'horizontal',
    importance: 'default',
};

const tokyoMetroIntAttrsComponent = (props: AttrsProps<TokyoMetroIntStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.tokyoMetroBasic.nameOffset'),
            value: attrs.nameOffsetX !== 'middle' ? attrs.nameOffsetX : attrs.nameOffsetY,
            options: {
                left: t('panel.details.stations.common.left'),
                right: t('panel.details.stations.common.right'),
                top: t('panel.details.stations.common.top'),
                bottom: t('panel.details.stations.common.bottom'),
            },
            onChange: val => {
                if (val === 'left' || val === 'right') {
                    attrs.nameOffsetX = val as NameOffsetX;
                    attrs.nameOffsetY = 'middle';
                    attrs.textVertical = false;
                    if (
                        attrs.mereOffset === 'left1' ||
                        attrs.mereOffset === 'left2' ||
                        attrs.mereOffset === 'right1' ||
                        attrs.mereOffset === 'right2'
                    ) {
                        attrs.mereOffset = 'none';
                    }
                } else {
                    attrs.nameOffsetX = 'middle';
                    attrs.nameOffsetY = val as NameOffsetY;
                    if (attrs.mereOffset === 'up' || attrs.mereOffset === 'down') {
                        attrs.mereOffset = 'none';
                    }
                }
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.tokyoMetroInt.mereOffset.displayName'),
            value: attrs.mereOffset,
            options: {
                none: t('panel.details.stations.tokyoMetroInt.mereOffset.none'),
                ...(attrs.nameOffsetX === 'middle'
                    ? {
                          left1: t('panel.details.stations.tokyoMetroInt.mereOffset.left1'),
                          left2: t('panel.details.stations.tokyoMetroInt.mereOffset.left2'),
                          right1: t('panel.details.stations.tokyoMetroInt.mereOffset.right1'),
                          right2: t('panel.details.stations.tokyoMetroInt.mereOffset.right2'),
                      }
                    : {
                          up: t('panel.details.stations.tokyoMetroInt.mereOffset.up'),
                          down: t('panel.details.stations.tokyoMetroInt.mereOffset.down'),
                      }),
            },
            onChange: val => {
                attrs.mereOffset = val as MereOffset;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.tokyoMetroBasic.textVertical'),
            isChecked: attrs.textVertical,
            isDisabled: attrs.nameOffsetX !== 'middle',
            onChange: (val: boolean) => {
                attrs.textVertical = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.tokyoMetroInt.importance.displayName'),
            value: attrs.importance,
            options: {
                default: t('panel.details.stations.tokyoMetroInt.importance.default'),
                middle: t('panel.details.stations.tokyoMetroInt.importance.middle'),
                high: t('panel.details.stations.tokyoMetroInt.importance.high'),
            },
            onChange: val => {
                attrs.importance = val as Importance;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.tokyoMetroInt.align.displayName'),
            value: attrs.align,
            options: {
                horizontal: t('panel.details.stations.tokyoMetroInt.align.horizontal'),
                vertical: t('panel.details.stations.tokyoMetroInt.align.vertical'),
            },
            onChange: val => {
                attrs.align = val as Align;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.TokyoMetroInt}
                defaultAttrs={defaultTokyoMetroIntStationAttributes}
                maximumTransfers={[1000, 0, 0]}
            />
        </>
    );
};

const tokyoMetroIntStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="4" y="8" rx="1" width="6.5" height="10" stroke="currentColor" fill="none" />
        <rect x="12.5" y="8" rx="1" width="6.5" height="10" stroke="currentColor" fill="none" />
        <text x="5.5" y="12.5" fontSize="4" fill="currentColor">
            G
        </text>
        <text x="5" y="16.25" fontSize="4" letterSpacing="-0.8" fill="currentColor">
            16
        </text>
        <text x="14.25" y="12.5" fontSize="4" fill="currentColor">
            H
        </text>
        <text x="13.75" y="16.25" fontSize="4" letterSpacing="-0.8" fill="currentColor">
            18
        </text>
    </svg>
);

const tokyoMetroIntStation: Station<TokyoMetroIntStationAttributes> = {
    component: TokyoMetroIntStation,
    icon: tokyoMetroIntStationIcon,
    defaultAttrs: defaultTokyoMetroIntStationAttributes,
    attrsComponent: tokyoMetroIntAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.tokyoMetroInt.displayName',
        cities: [CityCode.Tokyo],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default tokyoMetroIntStation;
