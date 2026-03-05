import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { StationNumber } from '@railmapgen/svg-assets/fmetro';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
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
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { NAME_DY as DEFAULT_NAME_DY, MultilineText } from '../common/multiline-text';

const FoshanMetroBasicStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultFoshanMetroBasicStationAttributes.nameOffsetX,
        nameOffsetY = defaultFoshanMetroBasicStationAttributes.nameOffsetY,
        color = defaultFoshanMetroBasicStationAttributes.color,
        lineCode = defaultFoshanMetroBasicStationAttributes.lineCode,
        stationCode = defaultFoshanMetroBasicStationAttributes.stationCode,
        open = defaultFoshanMetroBasicStationAttributes.open,
        secondaryNames = defaultFoshanMetroBasicStationAttributes.secondaryNames,
        tram = defaultFoshanMetroBasicStationAttributes.tram,
    } = attrs[StationType.FoshanMetroBasic] ?? defaultFoshanMetroBasicStationAttributes;

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

    const iconEl = React.useRef<SVGGElement | null>(null);
    const [iconBBox, setIconBBox] = React.useState({ x: -18.5, y: -9.25, width: 37, height: 18.5 } as DOMRect);
    React.useEffect(() => setIconBBox(iconEl.current!.getBBox()), []);

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

    const textXConst = tram ? 11 : 15;
    const textX = nameOffsetX === 'left' ? -textXConst : nameOffsetX === 'right' ? textXConst : 0;
    const textYConst = tram ? 8 : 10;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY[nameOffsetY].lineHeight + textYConst) *
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

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`scale(${0.57915 * (tram ? 0.729 : 1)})`}>
                <StationNumber
                    id={`stn_core_${id}`}
                    strokeColour={color[2]}
                    lineNum={lineCode === '' ? undefined : lineCode}
                    stnNum={stationCode === '' ? undefined : stationCode}
                    textProps={{ ...getLangStyle(TextLanguage.en) }}
                    ref={iconEl}
                />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    id={`stn_core_${id}`}
                    x={iconBBox.x}
                    y={iconBBox.y}
                    width={iconBBox.width}
                    height={iconBBox.height}
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
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={FONT_SIZE.en}
                    lineHeight={FONT_SIZE.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
            {secondaryNames.join('') !== '' && (
                <g transform={`translate(${textX + secondaryDx}, ${textY})`} textAnchor="middle">
                    <text
                        fontSize="13.13"
                        dx={-(secondaryTextWidth + 5) / 2}
                        textAnchor="end"
                        dominantBaseline="middle"
                        {...getLangStyle(TextLanguage.zh)}
                    >
                        （
                    </text>
                    <text
                        fontSize="13.13"
                        dx={(secondaryTextWidth + 5) / 2}
                        textAnchor="start"
                        dominantBaseline="middle"
                        {...getLangStyle(TextLanguage.zh)}
                    >
                        ）
                    </text>
                    <g ref={secondaryTextRef}>
                        <text fontSize="10" dy="-2" dominantBaseline="auto" {...getLangStyle(TextLanguage.zh)}>
                            {secondaryNames[0]}
                        </text>
                        <text fontSize="5.42" dy="2" dominantBaseline="hanging" {...getLangStyle(TextLanguage.en)}>
                            {secondaryNames[1]}
                        </text>
                    </g>
                </g>
            )}
            {!open && (
                <g
                    transform={`translate(${textX + underConstructionDx}, ${textY})`}
                    textAnchor={nameOffsetX === 'middle' ? 'start' : textAnchor}
                >
                    <text fontSize="6.04" dy="-2" dominantBaseline="auto" {...getLangStyle(TextLanguage.zh)}>
                        （未开通）
                    </text>
                    <text fontSize="3.6" dy="4" dominantBaseline="hanging" {...getLangStyle(TextLanguage.en)}>
                        (Under Construction)
                    </text>
                </g>
            )}
        </g>
    );
};

/**
 * Foshan Metro basic station specific props.
 */
export interface FoshanMetroBasicStationAttributes extends StationAttributes, ColorAttribute {
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

const defaultFoshanMetroBasicStationAttributes: FoshanMetroBasicStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    color: [CityCode.Foshan, 'fs1', '#C4D600', MonoColour.black],
    lineCode: 'GF',
    stationCode: '01',
    open: true,
    secondaryNames: ['', ''],
    tram: false,
};

const foshanMetroBasicStationAttrsComponents = (props: AttrsProps<FoshanMetroBasicStationAttributes>) => {
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
            value: attrs.names.at(1) ?? defaultFoshanMetroBasicStationAttributes.names[1],
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
                attrs.nameOffsetX = val as NameOffsetX;
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
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={StationType.FoshanMetroBasic}
                    defaultTheme={defaultFoshanMetroBasicStationAttributes.color}
                />
            ),
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
            type: 'switch',
            label: t('panel.details.stations.foshanMetroBasic.open'),
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
            label: t('panel.details.stations.foshanMetroBasic.secondaryNameZh'),
            value: attrs.secondaryNames[0],
            onChange: val => {
                attrs.secondaryNames[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.foshanMetroBasic.secondaryNameEn'),
            value: attrs.secondaryNames[1],
            onChange: val => {
                attrs.secondaryNames[1] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.foshanMetroBasic.tram'),
            oneLine: true,
            isChecked: attrs.tram,
            onChange: val => {
                attrs.tram = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const foshanMetroBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(12,12)scale(0.45)">
            <StationNumber strokeColour="#000" lineNum="1" stnNum="01" />
        </g>
    </svg>
);

const foshanMetroBasicStation: Station<FoshanMetroBasicStationAttributes> = {
    component: FoshanMetroBasicStation,
    icon: foshanMetroBasicStationIcon,
    defaultAttrs: defaultFoshanMetroBasicStationAttributes,
    attrsComponent: foshanMetroBasicStationAttrsComponents,
    metadata: {
        displayName: 'panel.details.stations.foshanMetroBasic.displayName',
        cities: [CityCode.Foshan],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default foshanMetroBasicStation;
