import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { utils } from '@railmapgen/svg-assets';
import { Coordinates, InterchangeStation2024, InterchangeStation2024Handle } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdRemove } from 'react-icons/md';
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
import { TextLanguage, getLangStyle } from '../../../util/fonts';
import { InterchangeField, StationAttributesWithInterchange } from '../../panels/details/interchange-field';
import { NAME_DY as DEFAULT_NAME_DY, MultilineText } from '../common/multiline-text';

const FONT_SIZE = {
    en: 6.56,
    zh: 13.13,
};
const NAME_DY = structuredClone(DEFAULT_NAME_DY);
NAME_DY.top.lineHeight = FONT_SIZE.en;
NAME_DY.bottom.lineHeight = FONT_SIZE.zh;

const SCALE = 0.56; // scale the InterchangeStation2024 to match the global line width 5
const SCALE_WITH_PADDING = 0.6; // station names uses the coordinates from the icon and also need some padding

const GzmtrInt2024Station = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultGzmtrInt2024StationAttributes.nameOffsetX,
        nameOffsetY = defaultGzmtrInt2024StationAttributes.nameOffsetY,
        transfer = defaultGzmtrInt2024StationAttributes.transfer,
        open = defaultGzmtrInt2024StationAttributes.open,
        secondaryNames = defaultGzmtrInt2024StationAttributes.secondaryNames,
        columns = defaultGzmtrInt2024StationAttributes.columns,
        topHeavy = defaultGzmtrInt2024StationAttributes.topHeavy,
        anchorAt = defaultGzmtrInt2024StationAttributes.anchorAt,
        osiPosition = defaultGzmtrInt2024StationAttributes.osiPosition,
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

    const transferAll = transfer.flat();
    const stations = transferAll.map(s => ({
        style: (s[6] === 'fs' ? 'fmetro' : 'gzmtr') as 'gzmtr' | 'fmetro',
        lineNum: s[4],
        stnNum: s[5],
        strokeColour: s[2],
    }));

    // use imperative handle to get the bbox of the icon (with the help from InterchangeStation2024Handle)
    const [borderBox, setBorderBox] = React.useState<SVGRect>();
    const [translate, setTranslate] = React.useState<Coordinates>([0, 0]);
    const ref = React.useRef<InterchangeStation2024Handle>(null);
    React.useEffect(() => {
        if (ref.current) {
            setBorderBox(ref.current.getCorrectedBBox());
            setTranslate(ref.current.getTranslate());
        }
    }, [ref.current, transferAll.length, columns, topHeavy, anchorAt]);
    const iconBBox = {
        x1: (borderBox?.x ?? 0) + translate[0],
        y1: (borderBox?.y ?? 0) + translate[1],
        x2: (borderBox?.x ?? 0) + (borderBox?.width ?? 0) + translate[0],
        y2: (borderBox?.y ?? 0) + (borderBox?.height ?? 0) + translate[1],
    };

    // Update all components that requires a bbox after fonts are loaded.
    // bbox calculated before fonts are loaded will be incorrect.
    // Also see SvgAssetsContextProvider in src/components/svg-wrapper.tsx
    const { update } = React.useContext(utils.SvgAssetsContext);
    React.useEffect(() => {
        document.fonts.load('12px Arial', 'ABCDEFG123456').finally(() => setTimeout(update, 100));
    }, []);

    const textX =
        (nameOffsetX === 'left' ? iconBBox.x1 : nameOffsetX === 'right' ? iconBBox.x2 : 0) * SCALE_WITH_PADDING;
    const textY =
        (names[NAME_DY[nameOffsetY].namesPos].split('\n').length * NAME_DY[nameOffsetY].lineHeight + 2) *
            NAME_DY[nameOffsetY].polarity +
        (nameOffsetY === 'top' ? iconBBox.y1 : nameOffsetY === 'bottom' ? iconBBox.y2 : 0) * SCALE_WITH_PADDING;
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
        (textWidth + secondaryTextWidth + (secondaryTextWidth !== 0 ? 12 * 2 : 0)) * // 12 is the width of the brackets
        // when nameOffsetX === 'middle' and no secondaryNames, no dx is needed
        (nameOffsetX === 'left' ? -1 : nameOffsetX === 'right' ? 1 : secondaryTextWidth !== 0 ? 1 : 0);
    const underConstructionTextAnchor = nameOffsetX === 'middle' ? 'start' : textAnchor;

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`scale(${SCALE})`}>
                <InterchangeStation2024
                    ref={ref}
                    stations={stations}
                    textProps={{ ...getLangStyle(TextLanguage.en) }}
                    columns={columns}
                    topHeavy={topHeavy}
                    anchorAt={anchorAt >= 0 ? anchorAt : undefined}
                    osiPosition={
                        transfer.flat().length === 2 && columns === 1 && osiPosition !== 'none'
                            ? osiPosition
                            : undefined
                    }
                />
                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    id={`stn_core_${id}`}
                    x={iconBBox.x1}
                    y={iconBBox.y1}
                    width={iconBBox.x2 - iconBBox.x1}
                    height={iconBBox.y2 - iconBBox.y1}
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
                    fontSize={13.13}
                    lineHeight={13.13}
                    grow="up"
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={6.56}
                    lineHeight={6.56}
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
                    textAnchor={underConstructionTextAnchor}
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
    columns: number;
    topHeavy: boolean;
    anchorAt: number;
    osiPosition: 'none' | 'left' | 'right';
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
    columns: 2,
    topHeavy: false,
    anchorAt: -1,
    osiPosition: 'none',
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
            value: attrs.names.at(1) ?? defaultGzmtrInt2024StationAttributes.names[1],
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
            type: 'slider',
            label: t('panel.details.stations.gzmtrInt2024.columns'),
            value: attrs.columns,
            min: 1,
            max: Math.min(5, attrs.transfer.flat().length),
            step: 1,
            onChange: val => {
                attrs.columns = val;
                handleAttrsUpdate(id, attrs);
            },
            leftIcon: <MdRemove />,
            rightIcon: <MdAdd />,
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.gzmtrInt2024.topHeavy'),
            oneLine: true,
            isChecked: attrs.topHeavy,
            onChange: val => {
                attrs.topHeavy = val;
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
            type: 'select',
            label: t('panel.details.stations.gzmtrInt2024.osiPosition'),
            value: attrs.osiPosition,
            options: {
                none: t('panel.details.stations.gzmtrInt2024.osiPositionNone'),
                left: t('panel.details.stations.gzmtrInt2024.osiPositionLeft'),
                right: t('panel.details.stations.gzmtrInt2024.osiPositionRight'),
            },
            onChange: val => {
                attrs.osiPosition = val as 'none' | 'left' | 'right';
                handleAttrsUpdate(id, attrs);
            },
            hidden: !(attrs.transfer.flat().length === 2 && attrs.columns === 1),
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

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.GzmtrInt2024}
                defaultAttrs={defaultGzmtrInt2024StationAttributes}
                maximumTransfers={[1000, 0, 0]}
            />
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
            textProps={{ ...getLangStyle(TextLanguage.en) }}
            columns={1}
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
