import { RmgFields, RmgFieldsField, RmgLabel } from '@railmapgen/rmg-components';
import { CityCode } from '@railmapgen/rmg-palette-resources';
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
        length = defaultJREastImportantStationAttributes.length,
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

    const iconWidth = textVertical
        ? NAME_SZ_BASIC.ja.size + ICON_SAFE_D
        : (names[0].length + 0.7) * NAME_SZ_BASIC.ja.size;
    const iconHeight = textVertical
        ? (names[0].length + 0.7) * NAME_SZ_BASIC.ja.size
        : NAME_SZ_BASIC.ja.size + ICON_SAFE_D;

    const textENDX = nameOffsetY !== 'middle' ? 0 : nameOffsetX === 'left' ? -iconWidth / 2 - 1 : iconWidth / 2 + 1;
    const textENDY = nameOffsetX !== 'middle' ? 0 : nameOffsetY === 'top' ? -iconHeight / 2 - 1 : iconHeight / 2 + 1;
    const textENAnchor = nameOffsetY !== 'middle' ? 'middle' : nameOffsetX === 'left' ? 'end' : 'start';

    return (
        <g id={id} transform={`translate(${x}, ${y})`}>
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

            <g transform={`translate(${textENDX}, ${textENDY})`} textAnchor={textENAnchor}>
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
    length: number;
}

const defaultJREastImportantStationAttributes: JREastImportantStationAttributes = {
    ...defaultStationAttributes,
    nameOffsetX: 'right',
    nameOffsetY: 'top',
    textVertical: false,
    length: 0,
};

const jrEastImportantAttrsComponent = (props: AttrsProps<JREastImportantStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0].replaceAll('\\', '\n'),
            onChange: val => {
                attrs.names[0] = val.toString().replaceAll('\n', '\\');
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
            label: t('panel.details.stations.jrEastImportant.nameOffset'),
            value: attrs.nameOffsetX !== 'middle' ? attrs.nameOffsetX : attrs.nameOffsetY,
            options: { top: 'top', bottom: 'bottom', left: 'left', right: 'right' },
            onChange: val => {
                if (val === 'left' || val === 'right') {
                    attrs.nameOffsetX = val as NameOffsetX;
                    attrs.nameOffsetY = 'middle';
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
            type: 'input',
            label: t('panel.details.stations.jrEastImportant.length'),
            value: attrs.length.toString(),
            onChange: val => {
                if (Number.isNaN(val)) attrs.length = 0;
                else attrs.length = Number(val);
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
