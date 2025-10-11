import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CanvasType, CategoriesType, CityCode } from '../../../constants/constants';
import { Station, StationComponentProps, StationType } from '../../../constants/stations';
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
    VERTICAL_SPACING: 2,
    MAGIC_OFFSET_8: 8,
    MAGIC_OFFSET_9: 9,
    MAGIC_OFFSET_10: 10,
    MAGIC_OFFSET_11: 11,
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
};

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
    const [, , bgColor, fgColor, lineCode, stationCode] = interchangeInfo;
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

function calculateStationDimensions(
    stationType: string,
    transferCount: number,
    stationDirection: OsakaMetroDirection
): {
    width: number;
    height: number;
} {
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

function calculateTextPosition(config: {
    stationType: OsakaMetroStationType;
    transferCount: number;
    nameLineCount: number;
    hasOldName: boolean;
    stationDirection: OsakaMetroDirection;
    nameDirection: OsakaMetroDirection;
    nameOverallPosition: OsakaMetroNameOverallPosition;
    nameOffsetPosition: OsakaMetroNameOffsetPosition;
}) {
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
        textAnchor: React.SVGAttributes<SVGTextElement>['textAnchor'];

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
                        : LAYOUT_CONSTANTS.STATION.STROKE_WIDTH);
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
                        : LAYOUT_CONSTANTS.STATION.STROKE_WIDTH) +
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
                        : LAYOUT_CONSTANTS.STATION.STROKE_WIDTH);
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
                        : LAYOUT_CONSTANTS.STATION.STROKE_WIDTH) +
                    LAYOUT_CONSTANTS.MAGIC_OFFSET_9;
            }
        }
    }

    return { textX, textY, textAnchor };
}

const OsakaMetroIntSvg = (props: {
    stationDirection: OsakaMetroDirection;
    interchangeList: InterchangeInfo[];
    stationType: OsakaMetroStationType;
}) => {
    const { stationDirection, interchangeList, stationType } = props;
    const isHorizontal = stationDirection === 'horizontal';

    return (
        <g>
            {interchangeList.map((interchange, index) => (
                <g
                    key={index}
                    transform={`translate(${isHorizontal ? index * LAYOUT_CONSTANTS.STATION.WIDTH + 1 : 1}, ${isHorizontal ? 1 : index * LAYOUT_CONSTANTS.STATION.HEIGHT + 1})`}
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
    const isHorizontal = nameDirection === 'horizontal';
    const isThrough = stationType === 'through';
    const hasOldName = oldName.length > 0;
    const nameScale = nameMaxWidth / 100;
    const oldNameScale = oldNameMaxWidth / 100;
    const translationScale = translationMaxWidth / 100;
    const processedNameText = names[0].length === 2 ? `${names[0][0]} ${names[0][1]}` : names[0];

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
    const { textX, textY, textAnchor } = calculateTextPosition({
        stationType,
        transferCount,
        nameLineCount: names[0].split('\n').length,
        hasOldName,
        stationDirection,
        nameDirection,
        nameOverallPosition,
        nameOffsetPosition,
    });
    const adjustX =
        x -
        (stationDirection === 'horizontal' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.WIDTH) / 2 : 0) -
        (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH : 0);
    const adjustY =
        y -
        (stationDirection === 'vertical' ? ((transferCount - 1) * LAYOUT_CONSTANTS.STATION.HEIGHT) / 2 : 0) -
        (transferCount > 1 ? LAYOUT_CONSTANTS.STATION.STROKE_WIDTH : 0);

    return (
        <g id={id} transform={`translate(${adjustX}, ${adjustY})`}>
            {interchangeList.length === 1 ? (
                isThrough ? (
                    <g>
                        <circle
                            cx={0}
                            cy={0}
                            r={LAYOUT_CONSTANTS.STATION.RADIUS + LAYOUT_CONSTANTS.STATION.STROKE_WIDTH + 0.5}
                            fill="white"
                        />
                        <OsakaMetroSvg interchangeInfo={interchangeList[0]} stationType={stationType} />
                    </g>
                ) : (
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
                        interchangeList={interchangeList}
                        stationType={stationType}
                    />
                </>
            )}

            {transferCount === 1 && isThrough ? (
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

            {isHorizontal ? (
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
                        transform={`${`translate(0, ${-(LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + 2) * (hasOldName ? 1 : 0)})`}${nameScale === 1 ? '' : ` scale(${nameScale}, 1)`}`}
                        grow="up"
                        baseOffset={1}
                        fontWeight="bold"
                        stroke="none"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                    {hasOldName && (
                        <MultilineText
                            text={`(${oldName})`.split('\n')}
                            fontSize={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            lineHeight={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            transform={`translate(0, ${-LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME / 2 - 0.5})${oldNameScale === 1 ? '' : ` scale(${oldNameScale}, 1)`}`}
                            grow="bidirectional"
                            baseOffset={1}
                            fontWeight="bold"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    )}
                    <MultilineText
                        text={names[1].split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        lineHeight={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        transform={translationScale === 1 ? undefined : `scale(${translationScale}, 1)`}
                        grow="down"
                        baseOffset={1}
                        fontWeight="bold"
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
                        transform={nameScale === 1 ? undefined : `scale(1, ${nameScale})`}
                        grow="right"
                        baseOffset={1}
                        fontWeight="bold"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                    {hasOldName && (
                        <MultilineTextVertical
                            text={`(${oldName})`.split('\n')}
                            fontSize={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            lineWidth={LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME}
                            transform={`${`translate(${LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME - LAYOUT_CONSTANTS.FONT_SIZE.NAME - LAYOUT_CONSTANTS.MAGIC_OFFSET_8}, 0)`}${oldNameScale === 1 ? '' : ` scale(1, ${oldNameScale})`}`}
                            grow="bidirectional"
                            baseOffset={1}
                            fontWeight="bold"
                            {...getLangStyle(TextLanguage.tokyo_ja)}
                        />
                    )}
                    <MultilineTextVertical
                        text={names[1].split('\n')}
                        fontSize={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        lineWidth={LAYOUT_CONSTANTS.FONT_SIZE.TRANSLATION}
                        transform={`${`translate(${-(LAYOUT_CONSTANTS.FONT_SIZE.OLD_NAME + 2) * (hasOldName ? 1 : 0) - 4}, 0)`}${translationScale === 1 ? '' : ` scale(1, ${translationScale})`}`}
                        grow="left"
                        baseOffset={1}
                        fontWeight="bold"
                        {...getLangStyle(TextLanguage.tokyo_ja)}
                    />
                </g>
            )}
        </g>
    );
};

const OsakaMetroAttrsComponent = (props: AttrsProps<OsakaMetroStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const interchangeCount = attrs.transfer?.[0]?.length || 1;
    const isHorizontal = attrs.nameDirection === 'horizontal';
    const isMultipleTransfers = interchangeCount > 1;
    const isNameUpOrDown = ['up', 'down'].includes(attrs.nameOverallPosition);

    React.useEffect(() => {
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

    const updateAttr = <K extends keyof OsakaMetroStationAttributes>(key: K, value: OsakaMetroStationAttributes[K]) => {
        attrs[key] = value;
        handleAttrsUpdate(id, attrs);
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
            min: 70,
            max: 100,
            step: 1,
            onChange: val => updateAttr('nameMaxWidth', val),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.osakaMetro.oldNameMaxWidth'),
            value: attrs.oldNameMaxWidth,
            min: 70,
            max: 100,
            step: 1,
            onChange: val => updateAttr('oldNameMaxWidth', val || 100),
            minW: 'full',
        },
        {
            type: 'slider',
            label: t('panel.details.stations.osakaMetro.translationMaxWidth'),
            value: attrs.translationMaxWidth,
            min: 70,
            max: 100,
            step: 1,
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
                maximumTransfers={[Infinity, 0, 0]}
            />
        </>
    );
};

const osakaMetroStation: Station<OsakaMetroStationAttributes> = {
    component: OsakaMetroStation,
    icon: OsakaMetroStationIcon,
    defaultAttrs: defaultOsakaMetroStationAttributes,
    attrsComponent: OsakaMetroAttrsComponent,
    metadata: {
        displayName: 'panel.details.stations.osakaMetro.displayName',
        cities: [CityCode.Osaka],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default osakaMetroStation;
