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
import { ColorField } from '../../panels/details/color-field';
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

export interface TokyoMetroBasicSvgAttributes {
    lineCode: string;
    stationCode: string;
    color: Theme;
}

export interface TokyoMetroBasicSvgProps extends TokyoMetroBasicSvgAttributes {
    stroke?: boolean;
}

export const TokyoMetroBasicSvg = (props: TokyoMetroBasicSvgProps) => {
    const { lineCode, stationCode, color, stroke } = props;
    const [width, height, strokeWidth] = [10, 15, 0.8];
    return (
        <>
            {stroke && (
                <rect
                    x={-width / 2 - strokeWidth}
                    y={-height / 2 - strokeWidth}
                    width={width + 2 * strokeWidth}
                    height={height + 2 * strokeWidth}
                    rx={2.5}
                    strokeWidth={strokeWidth}
                    stroke="white"
                    fill="white"
                />
            )}
            <rect
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                rx={2}
                strokeWidth={1.5}
                stroke={color[2]}
                fill="white"
            />
            <text
                x={0}
                y={lineCode.length === 1 ? -0.75 : -1.5}
                textAnchor="middle"
                {...getLangStyle(TextLanguage.tokyo_en)}
                fontSize={lineCode.length === 1 ? 7 : 4.5}
                fill="black"
            >
                {lineCode}
            </text>
            <text
                x={stationCode.length === 1 ? 0 : -0.4 / stationCode.length}
                y={5}
                textAnchor="middle"
                {...getLangStyle(TextLanguage.tokyo_en)}
                fontSize={6}
                letterSpacing="-0.4"
                fill="black"
            >
                {stationCode}
            </text>
        </>
    );
};

const TokyoMetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultTokyoMetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultTokyoMetroBasicStationAttributes.nameOffsetY,
        textVertical = defaultTokyoMetroBasicStationAttributes.textVertical,
        lineCode = defaultTokyoMetroBasicStationAttributes.lineCode,
        stationCode = defaultTokyoMetroBasicStationAttributes.stationCode,
        color = defaultTokyoMetroBasicStationAttributes.color,
    } = attrs[StationType.TokyoMetroBasic] ?? defaultTokyoMetroBasicStationAttributes;

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
    const textX = nameOffsetX === 'left' ? -7 : nameOffsetX === 'right' ? 7 : 0;
    const textXVer = nameOffsetX === 'left' ? -12 : nameOffsetX === 'right' ? 12 : 0;
    const textY = nameOffsetY === 'bottom' ? 7 : nameOffsetY === 'top' ? -9 : 5.5;
    const textYVer = nameOffsetY === 'bottom' ? 9 + textLength * 5 : nameOffsetY === 'top' ? -9 - textLength * 5 : -5;
    const textAnchor = nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <TokyoMetroBasicSvg lineCode={lineCode} stationCode={stationCode} color={color} />
            <rect
                id={`stn_core_${id}`}
                x={-5.8}
                y={-8.2}
                width={11.6}
                height={16.4}
                rx={2.5}
                opacity={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
            <g textAnchor={textAnchor} className="rmp-name-outline" strokeWidth="1">
                {!textVertical ? (
                    <g transform={`translate(${textX}, ${textY})`} textAnchor={textAnchor}>
                        <MultilineText
                            text={names[0].split('\n')}
                            fontSize={10}
                            lineHeight={10}
                            grow={nameOffsetY === 'bottom' ? 'down' : 'up'}
                            {...getLangStyle(TextLanguage.jreast_ja)}
                            fill={'black'}
                        />
                    </g>
                ) : (
                    <g transform={`translate(${textXVer}, ${textYVer})`} textAnchor={textAnchor}>
                        <MultilineTextVertical
                            text={names[0].split('\n')}
                            fontSize={10}
                            lineWidth={10}
                            grow="bidirectional"
                            baseOffset={0}
                            baseDY={0}
                            {...getLangStyle(TextLanguage.jreast_ja)}
                            fill={'black'}
                        />
                    </g>
                )}
            </g>
        </g>
    );
};

/**
 * TokyoMetroBasicStation specific props.
 */
export interface TokyoMetroBasicStationAttributes extends StationAttributes, TokyoMetroBasicSvgAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    textVertical: boolean;
}

const defaultTokyoMetroBasicStationAttributes: TokyoMetroBasicStationAttributes = {
    names: ['京橋'],
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    textVertical: false,
    lineCode: 'G',
    stationCode: '10',
    color: [CityCode.Tokyo, 'g', '#f9a328', MonoColour.white],
};

const tokyoMetroBasicAttrsComponent = (props: AttrsProps<TokyoMetroBasicStationAttributes>) => {
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
                } else {
                    attrs.nameOffsetX = 'middle';
                    attrs.nameOffsetY = val as NameOffsetY;
                }
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
            type: 'input',
            label: t('panel.details.stations.common.lineCode'),
            value: attrs.lineCode,
            onChange: val => {
                attrs.lineCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.stationCode'),
            value: attrs.stationCode,
            onChange: val => {
                attrs.stationCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.TokyoMetroBasic}
                    defaultTheme={defaultTokyoMetroBasicStationAttributes.color}
                />
            ),
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const tokyoMetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect x="6.5" y="4.5" rx="1.5" width="10" height="15" stroke="currentColor" fill="none" />
        <text x="9" y="11" fontSize="7" fill="currentColor">
            G
        </text>
        <text x="7.75" y="18" fontSize="7" letterSpacing="-0.8" fill="currentColor">
            10
        </text>
    </svg>
);

const tokyoMetroBasicStation: Station<TokyoMetroBasicStationAttributes> = {
    component: TokyoMetroBasicStation,
    icon: tokyoMetroBasicStationIcon,
    defaultAttrs: defaultTokyoMetroBasicStationAttributes,
    attrsComponent: tokyoMetroBasicAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.tokyoMetroBasic.displayName',
        cities: [CityCode.Tokyo],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default tokyoMetroBasicStation;
