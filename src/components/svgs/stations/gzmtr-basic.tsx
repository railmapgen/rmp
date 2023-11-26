import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
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
import { AttributesWithColor, ColorField } from '../../panels/details/color-field';
import { MultilineText, NAME_DY } from '../common/multiline-text';

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

    // temporary fix for the missing id on the top element of the station
    const iconEl = React.useRef<SVGGElement | null>(null);
    iconEl.current?.querySelector('path')?.setAttribute('id', `stn_core_${id}`);

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
                <g
                    transform="scale(0.75)"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    ref={iconEl}
                >
                    <StationNumber
                        id={`stn_core_${id}`}
                        strokeColour={color[2]}
                        lineNum={lineCode}
                        stnNum={stationCode}
                    />
                </g>
                <g
                    ref={textRef}
                    transform={`translate(${textX}, ${textY})`}
                    textAnchor={textAnchor}
                    fill={!open ? 'red' : ''}
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
                    <g
                        transform={`translate(${textX + underConstructionDx}, ${textY})`}
                        textAnchor={nameOffsetX === 'middle' ? 'start' : textAnchor}
                        fill="red"
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

const gzmtrBasicStationAttrsComponents = (props: AttrsProps<GzmtrBasicStationAttributes>) => {
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
                attrs.nameOffsetX = val as NameOffsetX;
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
                attrs.nameOffsetY = val as NameOffsetY;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField type={StationType.GzmtrBasic} defaultTheme={defaultGzmtrBasicStationAttributes.color} />
            ),
        },
        {
            type: 'input',
            label: t('panel.details.stations.gzmtrBasic.lineCode'),
            value: attrs.lineCode,
            onChange: val => {
                attrs.lineCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.gzmtrBasic.stationCode'),
            value: attrs.stationCode,
            onChange: val => {
                attrs.stationCode = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrBasic.open'),
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
            label: t('panel.details.stations.gzmtrBasic.secondaryNameZh'),
            value: attrs.secondaryNames[0],
            onChange: val => {
                attrs.secondaryNames[0] = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.gzmtrBasic.secondaryNameEn'),
            value: attrs.secondaryNames[1],
            onChange: val => {
                attrs.secondaryNames[1] = val;
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

    return <RmgFields fields={fields} />;
};

const gzmtrBasicStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <g transform="translate(12,12)scale(0.45)">
            <StationNumber strokeColour="#000" lineNum="1" stnNum="01" />
        </g>
    </svg>
);

const gzmtrBasicStation: Station<GzmtrBasicStationAttributes> = {
    component: GzmtrBasicStation,
    icon: gzmtrBasicStationIcon,
    defaultAttrs: defaultGzmtrBasicStationAttributes,
    attrsComponent: gzmtrBasicStationAttrsComponents,
    metadata: {
        displayName: 'panel.details.stations.gzmtrBasic.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrBasicStation;
