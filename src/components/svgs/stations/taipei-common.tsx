import { RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { TFunction } from 'i18next';
import { useSvgLayoutEffect } from '../../svg-layout';
import { AttrsProps, Theme } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import {
    getPreciseNameOffsetsSelectState,
    NameLayout,
    useDraggableStationName,
} from '../../../util/use-draggable-station-name';
import StationNameTranslateButton from '../../panels/details/station-name-translate-button';
import { MultilineText } from '../common/multiline-text';

export const TAIPEI_METRO_BADGE_WIDTH = 9.5;
export const TAIPEI_METRO_BADGE_HEIGHT = 12.2;
const TAIPEI_NAME_EN_FONT_SIZE = 5.05;
const SECONDARY_ZH_FONT_SIZE = 4.7;
const SECONDARY_EN_FONT_SIZE = 2.67;
const SECONDARY_ZH_LINE_HEIGHT = 5;
const SECONDARY_EN_LINE_HEIGHT = 3.4;
// Align the bundled Taipei/Arial glyph bounds with one 8-unit Chinese station-name row.
// Hanging baselines add internal leading, so a negative offset still leaves a visible language gap.
const SECONDARY_LANGUAGE_GAP = -0.024;
const SECONDARY_TEXT_TOP_INSET = 0.787;
export type TaipeiGlyphTheme = readonly [unknown, unknown, string, string];

export interface TaipeiMetroBadgeProps {
    lineCode: string;
    stationCode: string;
    color: Theme;
    filled?: boolean;
}

/** Shared numbered badge used by both basic and interchange stations. */
export const TaipeiMetroBadge = ({
    lineCode,
    stationCode,
    color,
    filled = false,
}: Omit<TaipeiMetroBadgeProps, 'color'> & { color: TaipeiGlyphTheme }) => (
    <g data-taipei-metro-badge={filled ? 'filled' : 'hollow'}>
        <rect
            x={-(TAIPEI_METRO_BADGE_WIDTH - 0.75) / 2}
            y={-(TAIPEI_METRO_BADGE_HEIGHT - 0.75) / 2}
            width={TAIPEI_METRO_BADGE_WIDTH - 0.75}
            height={TAIPEI_METRO_BADGE_HEIGHT - 0.75}
            rx={2}
            stroke={color[2]}
            strokeWidth={0.75}
            fill={filled ? color[2] : 'white'}
        />
        <g {...getLangStyle(TextLanguage.en)} fontWeight="bold" textAnchor="middle" fill={filled ? color[3] : 'black'}>
            <text y={-0.5} fontSize={lineCode.length > 2 ? 4 : 5.5}>
                {lineCode}
            </text>
            <text y={4.7} fontSize={stationCode.length > 2 ? 4.3 : 5.5}>
                {stationCode}
            </text>
        </g>
    </g>
);

export interface TaipeiStationNameAttributes extends StationAttributes {
    names: [string, string];
    secondaryNames: [string, string];
    secondaryNameOnNewLine?: boolean;
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

interface TaipeiStationNameProps {
    id: StationComponentProps['id'];
    type: StationType;
    attrs: TaipeiStationNameAttributes;
    width: number;
    height: number;
}

/** Static/video exports render without effects, so they also need an initial width. */
const measureTaipeiNameWidth = (
    names: [string, string],
    fontSizes: readonly [number, number] = [8, TAIPEI_NAME_EN_FONT_SIZE]
) => {
    const context =
        typeof CanvasRenderingContext2D !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return Math.max(
        ...names.flatMap((name, index) => {
            const fontSize = fontSizes[index];
            if (context) {
                const font = getLangStyle(index === 0 ? TextLanguage.taipei : TextLanguage.en);
                context.font = `${fontSize}px ${font.fontFamily}`;
            }
            return name
                .split('\n')
                .map(
                    line =>
                        context?.measureText(line).width ??
                        Array.from(line).reduce(
                            (width, character) => width + fontSize * (character.codePointAt(0)! > 0x7f ? 1 : 0.55),
                            0
                        )
                );
        })
    );
};

/** Keep the main and secondary names in one draggable group. */
export const TaipeiStationName = ({ id, type, attrs, width, height }: TaipeiStationNameProps) => {
    const {
        names,
        secondaryNames,
        secondaryNameOnNewLine = false,
        nameOffsetX,
        nameOffsetY,
        preciseNameOffsets,
    } = attrs;
    const hasSecondaryName = secondaryNames.some(Boolean);
    const secondaryZhLines = secondaryNames[0] ? secondaryNames[0].split('\n') : [];
    const secondaryEnLines = secondaryNames[1] ? secondaryNames[1].split('\n') : [];
    const secondaryZhHeight = secondaryZhLines.length
        ? SECONDARY_ZH_FONT_SIZE + (secondaryZhLines.length - 1) * SECONDARY_ZH_LINE_HEIGHT
        : 0;
    const secondaryEnY =
        secondaryZhHeight + (secondaryZhLines.length && secondaryEnLines.length ? SECONDARY_LANGUAGE_GAP : 0);
    const secondaryBaseHeight = secondaryEnLines.length
        ? secondaryZhLines.length
            ? 8
            : SECONDARY_EN_LINE_HEIGHT
        : secondaryZhLines.length
          ? SECONDARY_ZH_FONT_SIZE
          : 0;
    const secondaryHeight =
        secondaryBaseHeight +
        Math.max(0, secondaryZhLines.length - 1) * SECONDARY_ZH_LINE_HEIGHT +
        Math.max(0, secondaryEnLines.length - 1) * SECONDARY_EN_LINE_HEIGHT;
    const mainEnLineCount = (names[1] ?? '').split('\n').length;
    const mainNameBottom = names[1] ? 1.4 + (mainEnLineCount - 1) * 6 + TAIPEI_NAME_EN_FONT_SIZE : 0;
    const secondaryTop = secondaryNameOnNewLine ? mainNameBottom + 1.5 : -7;
    const nameBottom = Math.max(
        Math.max(1, mainEnLineCount) * 6,
        hasSecondaryName ? secondaryTop + secondaryHeight : 0
    );
    // Reference corner labels start inside the interchange frame's horizontal bounds.
    const isInterchangeCorner =
        type === StationType.TaipeiMetroInt && nameOffsetX !== 'middle' && nameOffsetY !== 'middle';
    const isMetroSideName =
        nameOffsetX !== 'middle' && (type === StationType.TaipeiMetroBasic || type === StationType.TaipeiMetroInt);
    const horizontalOffset = width / 2 + (isInterchangeCorner ? -4 : 2.5);
    const fallbackLayout: NameLayout = {
        x: nameOffsetX === 'left' ? -horizontalOffset : nameOffsetX === 'right' ? horizontalOffset : 0,
        y:
            nameOffsetY === 'top'
                ? -height / 2 - 2.5 - nameBottom
                : nameOffsetY === 'bottom'
                  ? height / 2 + 2.5 + Math.max(1, names[0].split('\n').length) * 8
                  : isMetroSideName
                    ? 0.5
                    : -0.5,
        anchor: nameOffsetX === 'left' ? 'end' : nameOffsetX === 'right' ? 'start' : 'middle',
    };
    const { canDrag, dragHandlers, previewPreciseNameOffsets } = useDraggableStationName(id, type, fallbackLayout);
    const layout = previewPreciseNameOffsets ?? preciseNameOffsets ?? fallbackLayout;
    const mainNameRef = React.useRef<SVGGElement>(null);
    const secondaryNameRef = React.useRef<SVGGElement>(null);
    const namesKey = JSON.stringify(names);
    const secondaryNamesKey = JSON.stringify(secondaryNames);
    const initialWidth = React.useMemo(() => measureTaipeiNameWidth(names), [names[0], names[1]]);
    const initialSecondaryWidth = React.useMemo(
        () => measureTaipeiNameWidth(secondaryNames, [SECONDARY_ZH_FONT_SIZE, SECONDARY_EN_FONT_SIZE]),
        [secondaryNames[0], secondaryNames[1]]
    );
    const [measuredName, setMeasuredName] = React.useState<{ key: string; width: number }>();
    const [measuredSecondaryName, setMeasuredSecondaryName] = React.useState<{ key: string; width: number }>();
    const mainNameWidth = measuredName?.key === namesKey ? measuredName.width : initialWidth;
    const secondaryNameWidth =
        measuredSecondaryName?.key === secondaryNamesKey ? measuredSecondaryName.width : initialSecondaryWidth;
    useSvgLayoutEffect(
        ({ measureBBox }) => {
            const width = mainNameRef.current?.getBBox ? measureBBox(mainNameRef.current).width : undefined;
            if (width !== undefined) setMeasuredName({ key: namesKey, width });
            const secondaryWidth = secondaryNameRef.current?.getBBox
                ? measureBBox(secondaryNameRef.current).width
                : undefined;
            if (secondaryWidth !== undefined)
                setMeasuredSecondaryName({ key: secondaryNamesKey, width: secondaryWidth });
        },
        [namesKey, secondaryNamesKey]
    );
    const direction = layout.anchor === 'end' ? -1 : 1;
    const dividerX = secondaryNameOnNewLine
        ? layout.anchor === 'middle'
            ? -secondaryNameWidth / 2 - 2
            : 0
        : (mainNameWidth * (layout.anchor === 'middle' ? 0.5 : 1) + 2) * direction;
    const secondaryTextX = secondaryNameOnNewLine && layout.anchor === 'middle' ? 0 : dividerX + direction * 2;
    const secondaryAnchor = secondaryNameOnNewLine ? layout.anchor : direction < 0 ? 'end' : 'start';

    return (
        <g
            id={`stn_name_${id}`}
            transform={`translate(${layout.x}, ${layout.y})`}
            textAnchor={layout.anchor}
            className="rmp-name-outline"
            strokeWidth={0.65}
            style={{ cursor: canDrag ? 'grab' : undefined }}
            {...dragHandlers}
        >
            <g ref={mainNameRef}>
                <MultilineText
                    text={names[0].split('\n')}
                    fontSize={8}
                    lineHeight={8}
                    grow="up"
                    baseOffset={0}
                    {...getLangStyle(TextLanguage.taipei)}
                    fill="black"
                />
                <MultilineText
                    text={(names[1] ?? '').split('\n')}
                    fontSize={TAIPEI_NAME_EN_FONT_SIZE}
                    lineHeight={6}
                    grow="down"
                    baseOffset={1.4}
                    {...getLangStyle(TextLanguage.en)}
                    fill="black"
                />
            </g>
            {hasSecondaryName && (
                <g data-taipei-secondary-name="" textAnchor={secondaryAnchor}>
                    <line
                        x1={dividerX}
                        x2={dividerX}
                        y1={secondaryTop}
                        y2={secondaryTop + secondaryHeight}
                        stroke="#808080"
                        strokeWidth={0.5}
                    />
                    <g
                        ref={secondaryNameRef}
                        transform={`translate(${secondaryTextX}, ${secondaryTop + SECONDARY_TEXT_TOP_INSET})`}
                    >
                        {secondaryZhLines.length > 0 && (
                            <MultilineText
                                text={secondaryZhLines}
                                fontSize={SECONDARY_ZH_FONT_SIZE}
                                lineHeight={SECONDARY_ZH_LINE_HEIGHT}
                                grow="down"
                                baseOffset={0}
                                {...getLangStyle(TextLanguage.taipei)}
                                fill="#808080"
                            />
                        )}
                        {secondaryEnLines.length > 0 && (
                            <MultilineText
                                text={secondaryEnLines}
                                fontSize={SECONDARY_EN_FONT_SIZE}
                                lineHeight={SECONDARY_EN_LINE_HEIGHT}
                                grow="down"
                                baseOffset={secondaryEnY}
                                {...getLangStyle(TextLanguage.en)}
                                fill="#808080"
                            />
                        )}
                    </g>
                </g>
            )}
        </g>
    );
};

interface TaipeiStationHitTargetProps extends StationComponentProps {
    width: number;
    height: number;
}

export const TaipeiStationHitTarget = (props: TaipeiStationHitTargetProps) => {
    const { id, width, height, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    return (
        <rect
            id={`stn_core_${id}`}
            x={-width / 2 - 0.5}
            y={-height / 2 - 0.5}
            width={width + 1}
            height={height + 1}
            rx={2}
            fill="white"
            fillOpacity={0}
            className="removeMe"
            onPointerDown={event => handlePointerDown(id, event)}
            onPointerMove={event => handlePointerMove(id, event)}
            onPointerUp={event => handlePointerUp(id, event)}
            style={{ cursor: 'move' }}
        />
    );
};

export const getTaipeiStationNameFields = <T extends TaipeiStationNameAttributes>(
    { id, attrs, handleAttrsUpdate }: AttrsProps<T>,
    t: TFunction
): RmgFieldsField[] => {
    const customLabel = t('panel.details.stations.common.custom');
    const offsetXSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetX,
        options: {
            left: t('panel.details.stations.common.left'),
            middle: t('panel.details.stations.common.middle'),
            right: t('panel.details.stations.common.right'),
        },
        customLabel,
        disabledOptions: attrs.nameOffsetY === 'middle' ? ['middle'] : [],
    });
    const offsetYSelect = getPreciseNameOffsetsSelectState({
        attrs,
        value: attrs.nameOffsetY,
        options: {
            top: t('panel.details.stations.common.top'),
            middle: t('panel.details.stations.common.middle'),
            bottom: t('panel.details.stations.common.bottom'),
        },
        customLabel,
        disabledOptions: attrs.nameOffsetX === 'middle' ? ['middle'] : [],
    });
    return [
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameZh'),
            value: attrs.names[0],
            onChange: value => {
                attrs.names[0] = value.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1],
            onChange: value => {
                attrs.names[1] = value.toString();
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: '',
            component: <StationNameTranslateButton id={id} attrs={attrs} handleAttrsUpdate={handleAttrsUpdate} />,
        },
        ...([0, 1] as const).map(
            (index): RmgFieldsField => ({
                type: 'textarea',
                label: t(`panel.details.stations.taipeiCommon.${index === 0 ? 'secondaryNameZh' : 'secondaryNameEn'}`),
                value: attrs.secondaryNames[index],
                onChange: value => {
                    attrs.secondaryNames[index] = value.toString();
                    handleAttrsUpdate(id, attrs);
                },
                minW: 'full',
            })
        ),
        {
            type: 'switch',
            label: t('panel.details.stations.taipeiCommon.secondaryNameOnNewLine'),
            isChecked: attrs.secondaryNameOnNewLine ?? false,
            onChange: value => {
                attrs.secondaryNameOnNewLine = value;
                handleAttrsUpdate(id, attrs);
            },
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetX'),
            value: offsetXSelect.value,
            options: offsetXSelect.options,
            disabledOptions: offsetXSelect.disabledOptions,
            onChange: value => {
                attrs.nameOffsetX = value as NameOffsetX;
                delete attrs.preciseNameOffsets;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.nameOffsetY'),
            value: offsetYSelect.value,
            options: offsetYSelect.options,
            disabledOptions: offsetYSelect.disabledOptions,
            onChange: value => {
                attrs.nameOffsetY = value as NameOffsetY;
                delete attrs.preciseNameOffsets;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];
};
