import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode, Theme } from '../../../constants/constants';
import {
    NameOffsetX,
    NameOffsetY,
    Station,
    StationAttributes,
    StationComponentProps,
    StationType,
} from '../../../constants/stations';
import { getLangStyle, TextLanguage } from '../../../util/fonts';
import {
    InterchangeField,
    StationAttributesWithInterchange,
    InterchangeInfo,
} from '../../panels/details/interchange-field';
import { MultilineText } from '../common/multiline-text';
import { MultilineTextVertical } from '../common/multiline-text-vertical';

const LAYOUT_CONSTANTS = {
    ICON_RATIO: 0.6,
    BASE_TEXT_OFFSET: 3,
    BASE_LINE_HALF_WIDTH: 2,
    ADDITIONAL_STROKE_OFFSET: 1,
    VERTICAL_SPACING: 2,
    MAGIC_OFFSET_8: 8,
    MAGIC_OFFSET_9: 9,
    MAGIC_OFFSET_10: 10,
    MAGIC_OFFSET_11: 11,
    TEXT_VERTICAL_CORRECTION: 0.5,
    OLD_NAME_VERTICAL_CORRECTION: 2,
    STATION: {
        WIDTH: 30,
        HEIGHT: 15,
        RADIUS: 10,
        STROKE_WIDTH: 1,
        STROKE_RADIUS: 2,
        FONT_SIZE: 9,
        FONT_WEIGHT: 'bold' as const,
    },
    FONT_SIZE: {
        NAME: 12,
        OLD_NAME: 9,
        TRANSLATION: 7.5,
    },
};

type OsakaMetroStationType = 'normal' | 'through';
type OsakaMetroDirection = 'vertical' | 'horizontal';
type OsakaMetroNameOverallPosition = 'up' | 'down' | 'left' | 'right';
type OsakaMetroNameOffsetPosition = OsakaMetroNameOverallPosition | 'middle';

export interface OsakaMetroStationAttributes extends StationAttributesWithInterchange {
    stationType: OsakaMetroStationType;
    nameDirection: OsakaMetroDirection;
    stationDirection: OsakaMetroDirection;
    oldName: string;
    nameOverallPosition: OsakaMetroNameOverallPosition;
    nameOffsetPosition: OsakaMetroNameOffsetPosition;
    nameMaxWidth: number;
    oldNameMaxWidth: number;
    translationMaxWidth: number;
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
}

const defaultOsakaMetroStationAttributes: OsakaMetroStationAttributes = {
    stationType: 'normal',
    names: ['梅田', 'Umeda'],
    transfer: [[[CityCode.Osaka, 'm', '#db260a', MonoColour.white, 'M', '16']]],
    nameDirection: 'horizontal',
    stationDirection: 'horizontal',
    oldName: '',
    nameOverallPosition: 'left',
    nameOffsetPosition: 'middle',
    nameMaxWidth: 100,
    oldNameMaxWidth: 100,
    translationMaxWidth: 100,
    nameOffsetX: 'left',
    nameOffsetY: 'middle',
};

/**
 * Adapter function: Convert nameOverallPosition and nameOffsetPosition to nameOffsetX and nameOffsetY
 * Conversion rules (reverse of convertFromOffsetXY):
 * 1. If nameOverallPosition is up/down, nameOffsetY comes from nameOverallPosition, nameOffsetX comes from nameOffsetPosition
 * 2. If nameOverallPosition is left/right and nameOffsetPosition is middle, nameOffsetX comes from nameOverallPosition, nameOffsetY is middle
 * 3. If nameOverallPosition is left/right and nameOffsetPosition is up/down, handle diagonal positions (e.g. left+down = bottom-left)
 */
function convertToOffsetXY(
    nameOverallPosition: OsakaMetroNameOverallPosition,
    nameOffsetPosition: OsakaMetroNameOffsetPosition = 'middle'
): {
    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
} {
    // If nameOverallPosition is up/down, it determines nameOffsetY
    if (nameOverallPosition === 'up' || nameOverallPosition === 'down') {
        const nameOffsetY: NameOffsetY = nameOverallPosition === 'up' ? 'top' : 'bottom';
        // nameOffsetX comes from nameOffsetPosition (or middle if nameOffsetPosition is up/down)
        const nameOffsetX: NameOffsetX =
            nameOffsetPosition === 'left' || nameOffsetPosition === 'right' ? nameOffsetPosition : 'middle';

        return {
            nameOffsetX,
            nameOffsetY,
        };
    }

    // If nameOverallPosition is left/right
    const nameOffsetX: NameOffsetX = nameOverallPosition;

    // Handle diagonal positions: if nameOffsetPosition is up/down, it determines nameOffsetY
    if (nameOffsetPosition === 'up' || nameOffsetPosition === 'down') {
        const nameOffsetY: NameOffsetY = nameOffsetPosition === 'up' ? 'top' : 'bottom';
        return {
            nameOffsetX,
            nameOffsetY,
        };
    }

    // Default case: nameOffsetPosition is middle or other values
    return {
        nameOffsetX,
        nameOffsetY: 'middle',
    };
}

/**
 * Adapter function: Convert nameOffsetX and nameOffsetY to nameOverallPosition and nameOffsetPosition
 * Conversion rules:
 * 1. Both nameOffsetY and nameOffsetX can be middle, but not at the same time
 * 2. If both are not middle, nameOverallPosition is based on nameOffsetY (up/down), nameOffsetPosition is based on nameOffsetX (left/right)
 */
function convertFromOffsetXY(
    nameOffsetX: NameOffsetX,
    nameOffsetY: NameOffsetY
): { nameOverallPosition: OsakaMetroNameOverallPosition; nameOffsetPosition: OsakaMetroNameOffsetPosition } {
    // If nameOffsetY is not middle, determine nameOverallPosition based on nameOffsetY
    if (nameOffsetY !== 'middle') {
        const nameOverallPosition: OsakaMetroNameOverallPosition = nameOffsetY === 'top' ? 'up' : 'down';
        // If nameOffsetX is also not middle, nameOffsetPosition is based on nameOffsetX
        const nameOffsetPosition: OsakaMetroNameOffsetPosition = nameOffsetX === 'middle' ? 'middle' : nameOffsetX;

        return {
            nameOverallPosition,
            nameOffsetPosition,
        };
    }

    // When nameOffsetY is middle, nameOverallPosition is based on nameOffsetX
    const nameOverallPosition: OsakaMetroNameOverallPosition = nameOffsetX === 'left' ? 'left' : 'right';

    return {
        nameOverallPosition,
        nameOffsetPosition: 'middle',
    };
}

const OsakaMetroStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <rect
            x={(24 - LAYOUT_CONSTANTS.STATION.WIDTH * LAYOUT_CONSTANTS.ICON_RATIO) / 2}
            y={(24 - LAYOUT_CONSTANTS.STATION.HEIGHT * LAYOUT_CONSTANTS.ICON_RATIO) / 2}
            width={LAYOUT_CONSTANTS.STATION.WIDTH * LAYOUT_CONSTANTS.ICON_RATIO}
            height={LAYOUT_CONSTANTS.STATION.HEIGHT * LAYOUT_CONSTANTS.ICON_RATIO}
            fill="currentColor"
        />
        <text
            x="12"
            y="12"
            transform={`translate(0, ${LAYOUT_CONSTANTS.STATION.FONT_SIZE * LAYOUT_CONSTANTS.ICON_RATIO * 0.4})`}
            textAnchor="middle"
            fontSize={LAYOUT_CONSTANTS.STATION.FONT_SIZE * LAYOUT_CONSTANTS.ICON_RATIO}
            fontWeight={LAYOUT_CONSTANTS.STATION.FONT_WEIGHT}
            fill="white"
        >
            M16
        </text>
    </svg>
);

const OsakaMetroSvg = (props: { interchangeInfo: InterchangeInfo; stationType: OsakaMetroStationType }) => {
    const { interchangeInfo, stationType } = props;
    const [cityCode, lineId, bgColor, fgColor, lineCode, stationCode] = interchangeInfo;
    const isThrough = stationType === 'through';

    return !isThrough ? (
        <>
            <rect
                x={-LAYOUT_CONSTANTS.STATION.WIDTH / 2}
                y={-LAYOUT_CONSTANTS.STATION.HEIGHT / 2}
                width={LAYOUT_CONSTANTS.STATION.WIDTH}
                height={LAYOUT_CONSTANTS.STATION.HEIGHT}
                fill={bgColor}
            />
            <text
                y={(LAYOUT_CONSTANTS.STATION.HEIGHT - LAYOUT_CONSTANTS.STATION.FONT_SIZE) / 2}
                textAnchor="middle"
                fontSize={LAYOUT_CONSTANTS.STATION.FONT_SIZE}
                fontWeight={LAYOUT_CONSTANTS.STATION.FONT_WEIGHT}
                fill={fgColor}
            >
                {`${lineCode.toUpperCase()}${stationCode}`}
            </text>
        </>
    ) : (
        <>
            <circle
                cx={0}
                cy={0}
                r={LAYOUT_CONSTANTS.STATION.RADIUS}
                stroke={bgColor}
                strokeWidth={LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                fill="white"
            />
            {lineCode.length === 1 ? (
                <text
                    y={(LAYOUT_CONSTANTS.STATION.HEIGHT - LAYOUT_CONSTANTS.STATION.FONT_SIZE) / 2 - 0.5}
                    textAnchor="middle"
                    fontSize={LAYOUT_CONSTANTS.STATION.FONT_SIZE - 2}
                    fontWeight={LAYOUT_CONSTANTS.STATION.FONT_WEIGHT}
                    fill={bgColor}
                >
                    {`${lineCode.toUpperCase()}${stationCode}`}
                </text>
            ) : (
                <>
                    <text
                        textAnchor="middle"
                        fontSize={LAYOUT_CONSTANTS.STATION.FONT_SIZE - 2}
                        fontWeight={LAYOUT_CONSTANTS.STATION.FONT_WEIGHT}
                        fill={bgColor}
                    >
                        {lineCode.toUpperCase()}
                    </text>
                    <text
                        y={LAYOUT_CONSTANTS.STATION.FONT_SIZE - 2.75}
                        textAnchor="middle"
                        fontSize={LAYOUT_CONSTANTS.STATION.FONT_SIZE - 2}
                        fontWeight={LAYOUT_CONSTANTS.STATION.FONT_WEIGHT}
                        fill={bgColor}
                    >
                        {stationCode}
                    </text>
                </>
            )}
        </>
    );
};

interface StationDimensions {
    width: number;
    height: number;
}

interface PositionConfig {
    stationType: OsakaMetroStationType;
    transferCount: number;
    nameLineCount: number;
    hasOldName: boolean;
    stationDirection: OsakaMetroDirection;
    nameDirection: OsakaMetroDirection;
    nameOverallPosition: OsakaMetroNameOverallPosition;
    nameOffsetPosition: OsakaMetroNameOffsetPosition;
}

function calculateStationDimensions(
    stationType: string,
    transferCount: number,
    stationDirection: OsakaMetroDirection
): StationDimensions {
    const isThrough = stationType === 'through';
    const baseWidth = isThrough ? LAYOUT_CONSTANTS.STATION.RADIUS * 2 : LAYOUT_CONSTANTS.STATION.WIDTH;
    const baseHeight = isThrough ? LAYOUT_CONSTANTS.STATION.RADIUS * 2 : LAYOUT_CONSTANTS.STATION.HEIGHT;
    const strokeOffset = LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2 * 2;

    if (transferCount === 1) {
        return { width: baseWidth, height: baseHeight };
    }

    return {
        width: stationDirection === 'horizontal' ? transferCount * baseWidth + strokeOffset : baseWidth + strokeOffset,
        height:
            stationDirection === 'horizontal' ? baseHeight + strokeOffset : transferCount * baseHeight + strokeOffset,
    };
}

function calculateTextPosition(config: PositionConfig) {
    const {
        stationType,
        nameLineCount,
        hasOldName,
        transferCount,
        stationDirection,
        nameDirection,
        nameOverallPosition,
        nameOffsetPosition,
    } = config;
    const { width, height } = calculateStationDimensions(stationType, transferCount, stationDirection);
    let textX = 0,
        textY = 0,
        textAnchor;

    if (nameDirection === 'vertical') {
        textX = LAYOUT_CONSTANTS.BASE_TEXT_OFFSET - (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME;
        if (nameOverallPosition === 'up') {
            textY -= height / 2 + LAYOUT_CONSTANTS.BASE_TEXT_OFFSET;
            textAnchor = 'end';
        } else {
            textY += height / 2 + LAYOUT_CONSTANTS.BASE_TEXT_OFFSET;
            textAnchor = 'start';
        }
    } else {
        textX = stationDirection === 'horizontal' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.WIDTH) / 2 : 0;
        textY = stationDirection === 'vertical' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 : 0;
        if (nameOverallPosition === 'up') {
            textY -= height / 2 + LAYOUT_CONSTANTS.BASE_TEXT_OFFSET + LAYOUT_CONSTANTS.MAGIC_OFFSET_9;
            if (nameOffsetPosition === 'left') {
                textX -= LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 3;
                textAnchor = 'end';
            } else if (nameOffsetPosition === 'middle') {
                textX -=
                    width / 2 -
                    (stationDirection === 'horizontal' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.WIDTH) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0) +
                    (stationType === 'through' ? LAYOUT_CONSTANTS.BASE_TEXT_OFFSET * 1.5 : 0);
                textAnchor = 'start';
            } else if (nameOffsetPosition === 'right') {
                textX +=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 3 +
                    (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2 : 0);
                textAnchor = 'start';
            }
        } else if (nameOverallPosition === 'down') {
            textY +=
                height / 2 +
                LAYOUT_CONSTANTS.BASE_TEXT_OFFSET +
                (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME +
                (hasOldName ? LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + LAYOUT_CONSTANTS.VERTICAL_SPACING : 0) +
                (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2 : 0) +
                LAYOUT_CONSTANTS.MAGIC_OFFSET_10;
            if (nameOffsetPosition === 'left') {
                textX -= LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 3;
                textAnchor = 'end';
            } else if (nameOffsetPosition === 'middle') {
                textX -=
                    width / 2 -
                    (stationDirection === 'horizontal' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.WIDTH) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0) +
                    (stationType === 'through' ? LAYOUT_CONSTANTS.BASE_TEXT_OFFSET * 1.5 : 0);
                textAnchor = 'start';
            } else if (nameOffsetPosition === 'right') {
                textX +=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 3 +
                    (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2 : 0);
                textAnchor = 'start';
            }
        } else if (nameOverallPosition === 'left') {
            textX -= width / 2 + LAYOUT_CONSTANTS.BASE_TEXT_OFFSET;
            textY +=
                LAYOUT_CONSTANTS.VERTICAL_SPACING -
                (stationDirection === 'vertical' && transferCount > 1
                    ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                      LAYOUT_CONSTANTS.STATION.STROKE_WIDTH
                    : 0);
            textAnchor = 'end';
            if (nameOffsetPosition === 'up') {
                textY -=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 2 +
                    LAYOUT_CONSTANTS.MAGIC_OFFSET_11 -
                    (stationDirection === 'vertical' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0);
            } else if (nameOffsetPosition === 'middle') {
                textY +=
                    (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME +
                    (hasOldName ? LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + LAYOUT_CONSTANTS.VERTICAL_SPACING : 0) +
                    (stationDirection === 'horizontal' && transferCount > 1
                        ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH
                        : 0) +
                    (stationDirection === 'vertical' && transferCount > 1
                        ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0);
            } else if (nameOffsetPosition === 'down') {
                textY +=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 2 +
                    (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME +
                    (hasOldName ? LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + LAYOUT_CONSTANTS.VERTICAL_SPACING : 0) +
                    (stationDirection === 'vertical' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0) +
                    LAYOUT_CONSTANTS.MAGIC_OFFSET_9;
            }
        } else if (nameOverallPosition === 'right') {
            textX += width / 2 + LAYOUT_CONSTANTS.BASE_TEXT_OFFSET;
            textY +=
                LAYOUT_CONSTANTS.VERTICAL_SPACING -
                (stationDirection === 'vertical' && transferCount > 1
                    ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                      LAYOUT_CONSTANTS.STATION.STROKE_WIDTH
                    : 0);
            textAnchor = 'start';
            if (nameOffsetPosition === 'up') {
                textY -=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 2 +
                    LAYOUT_CONSTANTS.MAGIC_OFFSET_11 -
                    (stationDirection === 'vertical' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0);
            } else if (nameOffsetPosition === 'middle') {
                textY +=
                    (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME +
                    (hasOldName ? LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + LAYOUT_CONSTANTS.VERTICAL_SPACING : 0) +
                    (stationDirection === 'horizontal' && transferCount > 1
                        ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH
                        : 0) +
                    (stationDirection === 'vertical' && transferCount > 1
                        ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0);
            } else if (nameOffsetPosition === 'down') {
                textY +=
                    LAYOUT_CONSTANTS.BASE_LINE_HALF_WIDTH * 2 +
                    (nameLineCount - 1) * LAYOUT_CONSTANTS.FONT_SIZE.NAME +
                    (hasOldName ? LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + LAYOUT_CONSTANTS.VERTICAL_SPACING : 0) +
                    (stationDirection === 'vertical' && transferCount > 1
                        ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 +
                          LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2
                        : 0) +
                    LAYOUT_CONSTANTS.MAGIC_OFFSET_9;
            }
        }
    }

    return { textX, textY, textAnchor };
}

function calculateStationAdjustment(
    x: number,
    y: number,
    transferCount: number,
    stationDirection: OsakaMetroDirection
) {
    const adjustX =
        x -
        (stationDirection === 'horizontal' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.WIDTH) / 2 : 0) -
        (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH : 0);

    const adjustY =
        y -
        (stationDirection === 'vertical' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 : 0) -
        (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH : 0);

    return { adjustX, adjustY };
}

const OsakaMetroIntSvg = (props: {
    stationDirection: OsakaMetroDirection;
    width: number;
    height: number;
    interchangeList: InterchangeInfo[];
    stationType: OsakaMetroStationType;
}) => {
    const { stationDirection, width, height, interchangeList, stationType } = props;
    return (
        <g>
            {interchangeList.map((interchange, index) => (
                <g
                    key={index}
                    transform={`translate(
                        ${(stationDirection === 'horizontal' ? index * LAYOUT_CONSTANTS.STATION.WIDTH : 0) + 1},
                        ${(stationDirection === 'vertical' ? index * LAYOUT_CONSTANTS.STATION.HEIGHT : 0) + 1}
                    )`}
                >
                    <OsakaMetroSvg interchangeInfo={interchange} stationType={stationType} />
                </g>
            ))}
        </g>
    );
};

const OsakaMetroStation = (props: StationComponentProps) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;

    const stationAttrs = attrs[StationType.OsakaMetro] ?? defaultOsakaMetroStationAttributes;

    const {
        stationType = defaultOsakaMetroStationAttributes.stationType,
        names = defaultOsakaMetroStationAttributes.names,
        transfer = defaultOsakaMetroStationAttributes.transfer,
        nameDirection = defaultOsakaMetroStationAttributes.nameDirection,
        stationDirection = defaultOsakaMetroStationAttributes.stationDirection,
        oldName = defaultOsakaMetroStationAttributes.oldName,
        nameOverallPosition = defaultOsakaMetroStationAttributes.nameOverallPosition,
        nameOffsetPosition = defaultOsakaMetroStationAttributes.nameOffsetPosition,
        nameMaxWidth = defaultOsakaMetroStationAttributes.nameMaxWidth,
        oldNameMaxWidth = defaultOsakaMetroStationAttributes.oldNameMaxWidth,
        translationMaxWidth = defaultOsakaMetroStationAttributes.translationMaxWidth,
    } = stationAttrs;

    const interchangeList = transfer[0] || [];
    const transferCount = interchangeList.length || 1;

    const calculateTextLength = (percentage: number, text: string, fontSize: number) => {
        if (percentage === 100) return undefined;
        if (!text || text.trim() === '') return undefined;

        // For multi-line text, calculate based on the longest line
        const lines = text.split('\n');
        const longestLine = lines.reduce(
            (longest, current) => (current.length > longest.length ? current : longest),
            ''
        );

        // Estimate character width ratio
        let totalWidth = 0;
        for (let i = 0; i < longestLine.length; i++) {
            const char = longestLine[i];
            if (/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(char)) {
                // Japanese characters
                totalWidth += fontSize * 1.0;
            } else if (/[A-Za-z]/.test(char)) {
                // English letters
                totalWidth += fontSize * 0.6;
            } else if (/[0-9]/.test(char)) {
                // Numbers
                totalWidth += fontSize * 0.5;
            } else {
                // Other characters (spaces, punctuation, etc.)
                totalWidth += fontSize * 0.4;
            }
        }

        return totalWidth * (percentage / 100);
    };

    const actualNameText = names[0].length === 2 ? names[0].slice(0, 1) + ' ' + names[0].slice(1) : names[0];
    const actualOldNameText = oldName ? `(${oldName})` : '';
    const actualTranslationText = names[1];

    const actualNameMaxWidth = calculateTextLength(nameMaxWidth, actualNameText, LAYOUT_CONSTANTS.FONT_SIZE.NAME);
    const actualOldNameMaxWidth = calculateTextLength(
        oldNameMaxWidth,
        actualOldNameText,
        LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME
    );
    const actualTranslationMaxWidth = calculateTextLength(
        translationMaxWidth,
        actualTranslationText,
        LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION
    );

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

    const { width: stationWidth, height: stationHeight } = calculateStationDimensions(
        stationType,
        transferCount,
        stationDirection
    );

    const positionConfig: PositionConfig = {
        stationType,
        transferCount,
        nameLineCount: names[0].split('\n').length,
        hasOldName: oldName.length > 0,
        stationDirection,
        nameDirection,
        nameOverallPosition,
        nameOffsetPosition,
    };

    const { textX, textY, textAnchor } = calculateTextPosition(positionConfig);
    const { adjustX, adjustY } = calculateStationAdjustment(x, y, transferCount, stationDirection);
    const processedNameText = names[0].length === 2 ? names[0].slice(0, 1) + ' ' + names[0].slice(1) : names[0];
    const nameTransform = `translate(0, ${-(LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + 2) * (oldName.length > 0 ? 1 : 0)})`;
    const oldNameVerticalTransform = `translate(${LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME - LAYOUT_CONSTANTS.FONT_SIZE.NAME - LAYOUT_CONSTANTS.MAGIC_OFFSET_8}, 0)`;
    const translationVerticalTransform = `translate(${-(LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + 2) * (oldName.length > 0 ? 1 : 0) - 4}, 0)`;

    return (
        <g id={id} transform={`translate(${adjustX}, ${adjustY})`}>
            {interchangeList.length === 1 ? (
                stationType !== 'through' ? (
                    <g>
                        <rect
                            x={-LAYOUT_CONSTANTS.STATION.WIDTH / 2 - LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                            y={-LAYOUT_CONSTANTS.STATION.HEIGHT / 2 - LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                            width={LAYOUT_CONSTANTS.STATION.WIDTH + LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2}
                            height={LAYOUT_CONSTANTS.STATION.HEIGHT + LAYOUT_CONSTANTS.STATION.STROKE_WIDTH * 2}
                            fill="white"
                        />
                        <OsakaMetroSvg interchangeInfo={interchangeList[0]} stationType={stationType} />
                    </g>
                ) : (
                    <g>
                        <circle
                            cx={0}
                            cy={0}
                            r={LAYOUT_CONSTANTS.STATION.RADIUS + LAYOUT_CONSTANTS.STATION.STROKE_WIDTH + 0.5}
                            fill="white"
                        />
                        <OsakaMetroSvg interchangeInfo={interchangeList[0]} stationType={stationType} />
                    </g>
                )
            ) : (
                <>
                    <rect
                        x={-LAYOUT_CONSTANTS.STATION.WIDTH / 2 - LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                        y={-LAYOUT_CONSTANTS.STATION.HEIGHT / 2 - LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                        width={stationWidth}
                        height={stationHeight}
                        fill="white"
                        stroke="black"
                        strokeWidth={LAYOUT_CONSTANTS.STATION.STROKE_WIDTH}
                        rx={LAYOUT_CONSTANTS.STATION.STROKE_RADIUS}
                    />
                    <OsakaMetroIntSvg
                        stationDirection={stationDirection}
                        width={stationWidth}
                        height={stationHeight}
                        interchangeList={interchangeList}
                        stationType={stationType}
                    />
                </>
            )}

            {transferCount === 1 && stationType === 'through' ? (
                <circle
                    id={`stn_core_${id}`}
                    cx={0}
                    cy={0}
                    r={LAYOUT_CONSTANTS.STATION.RADIUS}
                    opacity={0}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            ) : (
                <rect
                    id={`stn_core_${id}`}
                    x={-LAYOUT_CONSTANTS.STATION.WIDTH / 2}
                    y={-LAYOUT_CONSTANTS.STATION.HEIGHT / 2}
                    width={stationWidth}
                    height={stationHeight}
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
                        text={processedNameText.split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.NAME}
                        lineHeight={LAYOUT_CONSTANTS.FONT_SIZE.NAME}
                        transform={nameTransform}
                        grow="up"
                        baseOffset={1}
                        fontWeight="bold"
                        textLength={actualNameMaxWidth}
                        lengthAdjust="spacingAndGlyphs"
                        stroke="none"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                    {oldName && oldName.length > 0 && (
                        <MultilineText
                            text={`(${oldName})`.split('\n')}
                            fontSize={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            lineHeight={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            transform={`translate(0, ${-LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME / 2 - 0.5})`}
                            grow="bidirectional"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={actualOldNameMaxWidth}
                            lengthAdjust="spacingAndGlyphs"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    )}
                    <MultilineText
                        text={names[1].split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        lineHeight={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        grow="down"
                        baseOffset={1}
                        fontWeight="bold"
                        textLength={actualTranslationMaxWidth}
                        lengthAdjust="spacingAndGlyphs"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                </g>
            ) : (
                <g
                    transform={`translate(${textX}, ${textY})`}
                    textAnchor={textAnchor}
                    className="rmp-name-outline"
                    strokeWidth="1"
                >
                    <MultilineTextVertical
                        text={processedNameText.split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.NAME}
                        lineWidth={LAYOUT_CONSTANTS.FONT_SIZE.NAME}
                        grow="right"
                        baseOffset={1}
                        fontWeight="bold"
                        textLength={actualNameMaxWidth}
                        lengthAdjust="spacingAndGlyphs"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                    {oldName && oldName.length > 0 && (
                        <MultilineTextVertical
                            text={`(${oldName})`.split('\n')}
                            fontSize={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            lineWidth={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            transform={oldNameVerticalTransform}
                            grow="bidirectional"
                            baseOffset={1}
                            fontWeight="bold"
                            textLength={actualOldNameMaxWidth}
                            lengthAdjust="spacingAndGlyphs"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    )}
                    <MultilineTextVertical
                        text={names[1].split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        lineWidth={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        transform={translationVerticalTransform}
                        grow="left"
                        baseOffset={1}
                        fontWeight="bold"
                        textLength={actualTranslationMaxWidth}
                        lengthAdjust="spacingAndGlyphs"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                </g>
            )}
        </g>
    );
};

const osakaMetroAttrsComponent = (props: AttrsProps<OsakaMetroStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const interchangeCount = attrs.transfer?.[0]?.length || 1;
    const isHorizontal = attrs.nameDirection === 'horizontal';
    const isMultipleTransfers = interchangeCount > 1;
    const isNameUpOrDown = attrs.nameOverallPosition === 'up' || attrs.nameOverallPosition === 'down';

    const handleAutoAdjustment = React.useCallback(() => {
        if (isMultipleTransfers) {
            let needsUpdate = false;
            const newAttrs = { ...attrs };

            if (newAttrs.stationType !== 'normal') {
                newAttrs.stationType = 'normal';
                needsUpdate = true;
            }
            if (newAttrs.nameDirection !== 'horizontal') {
                newAttrs.nameDirection = 'horizontal';
                needsUpdate = true;
            }

            if (needsUpdate) {
                handleAttrsUpdate(id, newAttrs);
            }
        }
    }, [isMultipleTransfers, attrs.stationType, attrs.nameDirection, id, handleAttrsUpdate]);

    const syncOffsets = React.useCallback((updatedAttrs: OsakaMetroStationAttributes) => {
        const { nameOffsetX, nameOffsetY } = convertToOffsetXY(
            updatedAttrs.nameOverallPosition,
            updatedAttrs.nameOffsetPosition
        );
        updatedAttrs.nameOffsetX = nameOffsetX;
        updatedAttrs.nameOffsetY = nameOffsetY;
        return updatedAttrs;
    }, []);

    React.useEffect(() => {
        handleAutoAdjustment();
    }, [handleAutoAdjustment]);

    // Initialize sync mechanism to handle station type conversion and ensure consistency
    React.useEffect(() => {
        // Check if this is a station type conversion scenario:
        // nameOffsetX/Y are not default but nameOverallPosition/nameOffsetPosition are still default
        const isDefaultPosition =
            attrs.nameOverallPosition === defaultOsakaMetroStationAttributes.nameOverallPosition &&
            attrs.nameOffsetPosition === defaultOsakaMetroStationAttributes.nameOffsetPosition;
        const isDefaultOffset =
            attrs.nameOffsetX === defaultOsakaMetroStationAttributes.nameOffsetX &&
            attrs.nameOffsetY === defaultOsakaMetroStationAttributes.nameOffsetY;

        if (isDefaultPosition && !isDefaultOffset) {
            // Station type conversion scenario: convert nameOffsetX/Y to nameOverallPosition/nameOffsetPosition
            const { nameOverallPosition, nameOffsetPosition } = convertFromOffsetXY(
                attrs.nameOffsetX,
                attrs.nameOffsetY
            );
            const syncedAttrs = { ...attrs, nameOverallPosition, nameOffsetPosition };
            handleAttrsUpdate(id, syncedAttrs);
        } else {
            // Normal scenario: ensure nameOffsetX/Y are consistent with nameOverallPosition/nameOffsetPosition
            const { nameOffsetX, nameOffsetY } = convertToOffsetXY(attrs.nameOverallPosition, attrs.nameOffsetPosition);

            // Check if sync is needed
            if (attrs.nameOffsetX !== nameOffsetX || attrs.nameOffsetY !== nameOffsetY) {
                const syncedAttrs = { ...attrs, nameOffsetX, nameOffsetY };
                handleAttrsUpdate(id, syncedAttrs);
            }
        }
    }, []); // Only run once on component mount

    const updateAttr = <K extends keyof OsakaMetroStationAttributes>(key: K, value: OsakaMetroStationAttributes[K]) => {
        attrs[key] = value;

        if (key === 'nameOverallPosition' || key === 'nameOffsetPosition') {
            const syncedAttrs = syncOffsets(attrs);
            handleAttrsUpdate(id, syncedAttrs);
        } else {
            handleAttrsUpdate(id, attrs);
        }
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.stations.osakaMetro.stationType'),
            hidden: isMultipleTransfers,
            value: attrs.stationType,
            options: {
                normal: t('panel.details.stations.osakaMetro.normalType'),
                through: t('panel.details.stations.osakaMetro.throughType'),
            },
            onChange: val => updateAttr('stationType', val as OsakaMetroStationType),
        },
        {
            type: 'textarea',
            label: t('panel.details.stations.common.nameJa'),
            value: attrs.names[0],
            onChange: val => updateAttr('names', [val, attrs.names[1]]),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.osakaMetro.oldName'),
            value: attrs.oldName,
            onChange: val => updateAttr('oldName', val),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('panel.details.stations.common.nameEn'),
            value: attrs.names[1],
            onChange: val => updateAttr('names', [attrs.names[0], val]),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.osakaMetro.nameOverallPosition'),
            value: attrs.nameOverallPosition,
            options: {
                up: t('panel.details.stations.osakaMetro.up'),
                left: t('panel.details.stations.common.left'),
                right: t('panel.details.stations.common.right'),
                down: t('panel.details.stations.osakaMetro.down'),
            },
            disabledOptions: attrs.nameDirection === 'vertical' ? ['left', 'right'] : [],
            onChange: val => {
                updateAttr('nameOffsetPosition', 'middle');
                updateAttr('nameOverallPosition', val as OsakaMetroNameOverallPosition);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.osakaMetro.nameOffsetPosition'),
            hidden: !isHorizontal,
            value: attrs.nameOffsetPosition,
            options: isNameUpOrDown
                ? {
                      left: t('panel.details.stations.common.left'),
                      middle: t('panel.details.stations.common.middle'),
                      right: t('panel.details.stations.common.right'),
                  }
                : {
                      up: t('panel.details.stations.osakaMetro.up'),
                      middle: t('panel.details.stations.common.middle'),
                      down: t('panel.details.stations.osakaMetro.down'),
                  },
            disabledOptions: isNameUpOrDown ? ['up', 'down'] : ['left', 'right'],
            onChange: val => {
                updateAttr('nameOffsetPosition', val as OsakaMetroNameOffsetPosition);
            },
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.osakaMetro.nameMaxWidth'),
            value: attrs.nameMaxWidth,
            min: 50,
            max: 100,
            step: 5,
            onChange: val => updateAttr('nameMaxWidth', val),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.osakaMetro.oldNameMaxWidth'),
            value: attrs.oldNameMaxWidth,
            min: 50,
            max: 100,
            step: 5,
            onChange: val => updateAttr('oldNameMaxWidth', val || 100),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.osakaMetro.translationMaxWidth'),
            value: attrs.translationMaxWidth,
            min: 50,
            max: 100,
            step: 5,
            onChange: val => updateAttr('translationMaxWidth', val || 100),
            minW: 'full',
        },
        {
            type: 'switch',
            label: t('panel.details.stations.osakaMetro.nameVertical'),
            hidden: isMultipleTransfers,
            isChecked: !isHorizontal,
            onChange: val => {
                updateAttr('nameDirection', val ? 'vertical' : 'horizontal');
                if (val) {
                    updateAttr('nameOverallPosition', 'down');
                    updateAttr('nameOffsetPosition', 'middle');
                }
            },
        },
        {
            type: 'switch',
            label: t('panel.details.stations.osakaMetro.stationVertical'),
            hidden: !isMultipleTransfers,
            isChecked: attrs.stationDirection === 'vertical',
            onChange: val => updateAttr('stationDirection', val ? 'vertical' : 'horizontal'),
        },
    ];

    return (
        <>
            <RmgFields fields={fields} />
            <InterchangeField
                stationType={StationType.OsakaMetro}
                defaultAttrs={defaultOsakaMetroStationAttributes}
                maximumTransfers={[4, 0, 0]}
            />
        </>
    );
};

const osakaMetroStation: Station<OsakaMetroStationAttributes> = {
    component: OsakaMetroStation,
    icon: OsakaMetroStationIcon,
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
