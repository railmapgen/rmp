import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
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
import { MultilineText } from '../common/multiline-text';

const NAME_JRE_IMPORTANT = {
    ja: {
        size: 10,
        baseOffset: 1,
    },
    en: {
        size: 5,
        baseOffset: 1.5,
    },
};
const ICON_SAFE_D = 1;

const JREastImportantStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names = defaultStationAttributes.names,
        nameOffsetX = defaultJREastImportantStationAttributes.nameOffsetX,
        nameOffsetY = defaultJREastImportantStationAttributes.nameOffsetY,
        textVertical = defaultJREastImportantStationAttributes.textVertical,
        mostImportant = defaultJREastImportantStationAttributes.mostImportant,
        minLength = defaultJREastImportantStationAttributes.minLength,
    } = attrs[StationType.JREastImportant] ?? defaultJREastImportantStationAttributes;

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

    const textJAEl = React.useRef<SVGTextElement | null>(null);
    const [bBox, setBBox] = React.useState({ height: 0, width: 0 } as DOMRect);
    React.useEffect(() => setBBox(textJAEl.current!.getBBox()), [names[0], textVertical, setBBox, textJAEl]);

    // Looks like the width of the bbox has some relation to the writing-mode on first render.
    // writing-mode = horizontal-tb -> the length of the text = bBox.width
    // writing-mode = vertical-rl -> the length of the text = bBox.height
    // Might due to the use of ref in two components, but anyway this Math.max should be a workaround.
    const textLength = Math.max(bBox.width, bBox.height);
    const textSafeD = (textVertical ? 0.1 : 0.7) * NAME_JRE_IMPORTANT.ja.size;
    const iconLength = Math.max(textLength + textSafeD, minLength);
    const iconWidth = textVertical ? NAME_JRE_IMPORTANT.ja.size + ICON_SAFE_D : iconLength;
    const iconHeight = textVertical ? iconLength - 5 : NAME_JRE_IMPORTANT.ja.size + ICON_SAFE_D;

    const textENDX = { left: -iconWidth / 2 - 1, middle: 0, right: iconWidth / 2 + 1 }[nameOffsetX];
    const textENDY = { top: -iconHeight / 2 - 1, middle: 0, bottom: iconHeight / 2 + 1 }[nameOffsetY];
    const textENAnchor = (
        {
            left: 'end',
            middle: 'middle',
            right: 'start',
        } as const
    )[nameOffsetX];

    const scale = mostImportant ? 1.5 : 1;

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`scale(${scale})`}>
                <rect
                    fill="black"
                    x={-iconWidth / 2}
                    y={-iconHeight / 2}
                    rx={textVertical ? undefined : iconHeight / 2}
                    ry={textVertical ? iconWidth / 2 : undefined}
                    width={iconWidth}
                    height={iconHeight}
                />

                {!textVertical ? (
                    <text
                        ref={textJAEl}
                        y="-1"
                        {...getLangStyle(TextLanguage.jreast_ja)}
                        textAnchor="middle"
                        fontSize={NAME_JRE_IMPORTANT.ja.size}
                        fill="white"
                        dominantBaseline="central"
                    >
                        {names[0]}
                    </text>
                ) : (
                    <text
                        ref={textJAEl}
                        {...getLangStyle(TextLanguage.jreast_ja)}
                        textAnchor="middle"
                        writingMode="vertical-rl"
                        fontSize={NAME_JRE_IMPORTANT.ja.size}
                        fill="white"
                        dominantBaseline="central"
                    >
                        {names[0]}
                    </text>
                )}

                {/* Below is an overlay element that has all event hooks but can not be seen. */}
                <rect
                    id={`stn_core_${id}`}
                    fill="black"
                    fillOpacity="0"
                    x={-iconWidth / 2}
                    y={-iconHeight / 2}
                    rx={textVertical ? undefined : iconWidth / 2}
                    ry={textVertical ? iconHeight / 2 : undefined}
                    width={iconWidth}
                    height={iconHeight}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                    className="removeMe"
                />
            </g>

            <g transform={`translate(${textENDX * scale}, ${textENDY * scale})`} textAnchor={textENAnchor}>
                <MultilineText
                    text={names[1].split('\n')}
                    fontSize={NAME_JRE_IMPORTANT.en.size}
                    lineHeight={NAME_JRE_IMPORTANT.en.size}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'middle' ? 'bidirectional' : 'down'}
                    baseOffset={0}
                    {...getLangStyle(TextLanguage.jreast_en)}
                />
            </g>
        </g>
    );
};

/**
 * JREastImportantStation specific props.
 */
export interface JREastImportantStationAttributes extends StationAttributes {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    textVertical: boolean;
    mostImportant: boolean;
    minLength: number;
}

const defaultJREastImportantStationAttributes: JREastImportantStationAttributes = {
    names: ['東京', 'Tōkyō'],
    nameOffsetX: 'left',
    nameOffsetY: 'middle',
    textVertical: false,
    mostImportant: false,
    minLength: 0,
};

const jrEastImportantAttrsComponent = (props: AttrsProps<JREastImportantStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0],
            onChange: val => {
                attrs.names[0] = val.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names.at(1) ?? defaultJREastImportantStationAttributes.names[1],
            onChange: val => {
                attrs.names[1] = val.toString();
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
            type: 'switch',
            label: t('panel.details.stations.jrEastImportant.textVertical'),
            isChecked: attrs.textVertical,
            onChange: (val: boolean) => {
                attrs.textVertical = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.jrEastImportant.mostImportant'),
            isChecked: attrs.mostImportant,
            onChange: (val: boolean) => {
                attrs.mostImportant = val;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.jrEastImportant.minLength'),
            value: attrs.minLength.toString(),
            onChange: val => {
                if (Number.isNaN(val)) attrs.minLength = 0;
                else attrs.minLength = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastImportantStationIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="3" y="7.5" rx="4.5" width="18" height="9" stroke="currentColor" fill="currentColor" />
        <text x="12" y="12" textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="white">
            東京
        </text>
        <text x="12" y="20.25" textAnchor="middle" dominantBaseline="middle" fontSize="3">
            Tōkyō
        </text>
    </svg>
);

const jrEastImportantStation: Station<JREastImportantStationAttributes> = {
    component: JREastImportantStation,
    icon: jrEastImportantStationIcon,
    defaultAttrs: defaultJREastImportantStationAttributes,
    attrsComponent: jrEastImportantAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.jrEastImportant.displayName',
        cities: [CityCode.Tokyo],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.NationalRail],
        tags: [],
    },
};

export default jrEastImportantStation;
