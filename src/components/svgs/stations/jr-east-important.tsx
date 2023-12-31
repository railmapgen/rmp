import { RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, StnId } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
    defaultStationAttributes,
} from '../../../constants/stations';
import { MultilineText } from '../common/multiline-text';

const NAME_SZ_BASIC = {
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
    const textSafeD = (textVertical ? 0.1 : 0.7) * NAME_SZ_BASIC.ja.size;
    const iconLength = Math.max(textLength + textSafeD, minLength);
    const iconWidth = textVertical ? NAME_SZ_BASIC.ja.size + ICON_SAFE_D : iconLength;
    const iconHeight = textVertical ? iconLength : NAME_SZ_BASIC.ja.size + ICON_SAFE_D;

    const textENDX = { left: -iconWidth / 2 - 1, middle: 0, right: iconWidth / 2 + 1 }[nameOffsetX];
    const textENDY = { top: -iconHeight / 2 - 1, middle: 0, bottom: iconHeight / 2 + 1 }[nameOffsetY];
    const textENAnchor = { left: 'end', middle: 'middle', right: 'start' }[nameOffsetX];

    const scale = mostImportant ? 1.5 : 1;

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
            <g transform={`scale(${scale})`}>
                <rect
                    id={`stn_core_${id}`}
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
                        y="-0.525"
                        className="rmp-name__jreast"
                        textAnchor="middle"
                        fontSize={NAME_SZ_BASIC.ja.size}
                        fill="white"
                        dominantBaseline="central"
                    >
                        {names[0]}
                    </text>
                ) : (
                    <text
                        ref={textJAEl}
                        x="1.25"
                        className="rmp-name__jreast"
                        textAnchor="middle"
                        writingMode="vertical-rl"
                        fontSize={NAME_SZ_BASIC.ja.size}
                        fill="white"
                        dominantBaseline="central"
                    >
                        {names[0]}
                    </text>
                )}

                <rect
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
                />
            </g>

            <g transform={`translate(${textENDX * scale}, ${textENDY * scale})`} textAnchor={textENAnchor}>
                <MultilineText
                    text={names[1].split('\\')}
                    fontSize={NAME_SZ_BASIC.en.size}
                    lineHeight={NAME_SZ_BASIC.en.size}
                    grow={nameOffsetY === 'top' ? 'up' : nameOffsetY === 'middle' ? 'bidirectional' : 'down'}
                    baseOffset={0}
                    className="rmp-name__en"
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
            value: attrs.names[1].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[1] = val.toString().replaceAll('\n', '\\');
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
        <rect x="6" y="9" width="12" height="6" stroke="currentColor" fill="currentColor" />
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
