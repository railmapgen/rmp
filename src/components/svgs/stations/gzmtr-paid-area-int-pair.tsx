import { Box, FormLabel, Heading } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { ICON_FULL_HEIGHT, ICON_FULL_WIDTH, InterchangeStation2024 } from '@railmapgen/svg-assets/gzmtr';
import React from 'react';
import { useTranslation } from 'react-i18next';
import InterchangeCard from '../../panels/details/interchange-card';
import type { InterchangeInfo } from '../../panels/details/interchange-field';
import StationNameTranslateButton from '../../panels/details/station-name-translate-button';
import { useSvgLayoutEffect } from '../../svg-layout';
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
import { MultilineText } from '../common/multiline-text';
import { SecondaryNameText } from './secondary-name';

/** Must match gzmtr-int-2024 so the pair blends with standalone 2024 stations. */
const SCALE = 0.56;

/** Geometry constants of the GZMTR 2024 station icon (see svg-assets/gzmtr/constants.ts). */
const ICON_STROKE_WIDTH = 1.3;
const HALF_PILL_W = (ICON_FULL_WIDTH - ICON_STROKE_WIDTH) / 2; // 18.5
const HALF_PILL_H = (ICON_FULL_HEIGHT - ICON_STROKE_WIDTH) / 2; // 9.25
/** Outer border width InterchangeStation2024 applies to a single pill. */
const BORDER_WIDTH = ICON_STROKE_WIDTH * 7; // 9.1
/** White gap InterchangeStation2024 cuts inside that border. */
const INNER_CUT = ICON_STROKE_WIDTH * 2.6; // 3.38
/** Corner radius shared by every merged 2024 interchange outline. */
const PILL_RADIUS = HALF_PILL_H; // 9.25

const HALF_WIDTH = BORDER_WIDTH / 2; // 4.55
/**
 * Half of the white gap inside the border. Everything within this distance of the
 * outline is already white, so the corridor channel may be covered there.
 */
const CORE_MARGIN = INNER_CUT / 2; // 1.69

/** Font sizes used by gzmtr-int-2024 station names. */
const FONT_SIZE = {
    en: 6.56,
    zh: 13.13,
};

/** Which side of a station the paid-area corridor attaches to. */
type AttachSide = 'left' | 'right' | 'top' | 'bottom';

/** Which axis the corridor leaves the two stations along. */
export type PairDirection = 'vertical' | 'horizontal';

/** Which corner of a station the paid-area corridor connects to. */
export type PairAttachPosition = 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';

const isLeftCorner = (position: PairAttachPosition) => position === 'top-left' || position === 'bottom-left';
const isTopCorner = (position: PairAttachPosition) => position === 'top-left' || position === 'top-right';

/** Which point of the pair the node (and therefore line endpoints) is anchored to. */
export type PairAnchorPosition = 'center' | 'station1' | 'station2';

export interface GzmtrPaidAreaIntPairStationAttributes extends StationAttributes {
    /** Names of the second station. The first station uses `names`. */
    names2: [string, ...string[]];

    nameOffsetX: NameOffsetX;
    nameOffsetY: NameOffsetY;
    nameOffsetX2: NameOffsetX;
    nameOffsetY2: NameOffsetY;

    transfer1: InterchangeInfo[];
    transfer2: InterchangeInfo[];
    columns1: number;
    columns2: number;

    /** Station 2 offset from station 1, in viewport px (i.e. after SCALE). */
    dx: number;
    dy: number;
    direction1: PairDirection;
    direction2: PairDirection;
    /** Corner of each station the corridor connects to. */
    attachPosition1: PairAttachPosition;
    attachPosition2: PairAttachPosition;
    anchorPosition: PairAnchorPosition;
    /** Badge of the anchored station that line endpoints attach to; -1 is its sub-station centre. */
    anchorAt: number;

    secondaryNames1: [string, string];
    secondaryNames2: [string, string];
    open1: boolean;
    open2: boolean;
}

const defaultGzmtrPaidAreaIntPairStationAttributes: GzmtrPaidAreaIntPairStationAttributes = {
    ...defaultStationAttributes,
    names: ['淘金', 'Taojin'],
    names2: ['建设六马路', 'Jianshe 6th Road'],
    nameOffsetX: 'right',
    nameOffsetY: 'middle',
    nameOffsetX2: 'right',
    nameOffsetY2: 'middle',
    transfer1: [[CityCode.Guangzhou, 'gz5', '#c5003e', MonoColour.white, '5', '08', 'gz']],
    transfer2: [
        [CityCode.Guangzhou, 'gz12', '#59621d', MonoColour.white, '12', '14', 'gz'],
        [CityCode.Guangzhou, 'gz13', '#8e8c13', MonoColour.white, '13', '12', 'gz'],
    ],
    columns1: 1,
    columns2: 1,
    dx: -20,
    dy: 35,
    direction1: 'vertical',
    direction2: 'vertical',
    attachPosition1: 'bottom-left',
    attachPosition2: 'top-right',
    anchorPosition: 'station1',
    anchorAt: -1,
    secondaryNames1: ['', ''],
    secondaryNames2: ['', ''],
    open1: true,
    open2: true,
};

const ACTUAL_COLUMNS = (columns: number, count: number) => Math.max(1, Math.min(columns || 1, count));

const ACTUAL_ROWS = (columns: number, count: number) => Math.max(1, Math.ceil(count / ACTUAL_COLUMNS(columns, count)));

/**
 * Half width / height of the merged interchange outline, ignoring the border.
 * The icon is a grid of pills merged into one rounded rectangle.
 */
function getHalfExtents(columns: number, count: number): { halfW: number; halfH: number } {
    return {
        halfW: ((ACTUAL_COLUMNS(columns, count) - 1) / 2) * ICON_FULL_WIDTH + HALF_PILL_W,
        halfH: ((ACTUAL_ROWS(columns, count) - 1) / 2) * ICON_FULL_HEIGHT + HALF_PILL_H,
    };
}

type Vec = [number, number];

/**
 * Centre of badge `index` inside an InterchangeStation2024 laid out with `topHeavy`.
 * Mirrors svg-assets' getTranslates so the node can be anchored on a single badge.
 */
function getBadgeTranslate(index: number, columns: number, count: number, topHeavy: boolean): Vec {
    const actualColumns = Math.max(1, Math.min(columns || 1, count));
    const rows = Math.max(1, Math.ceil(count / actualColumns));
    const row = Math.floor(index / actualColumns);
    const remainder = count % actualColumns;
    const shortRowIndex = topHeavy ? rows - 1 : 0;
    const columnsInRow = remainder > 0 && row === shortRowIndex ? remainder : actualColumns;
    const column = index - row * actualColumns;
    return [(column - (columnsInRow - 1) / 2) * ICON_FULL_WIDTH, (row - (rows - 1) / 2) * ICON_FULL_HEIGHT];
}

/**
 * Vertical access is pulled this far into the station so the corridor wall overlaps the
 * outline instead of merely touching it, which would leave an antialiasing seam.
 */
const VERTICAL_ANCHOR_INSET = 0.5;

/**
 * Point where the corridor meets a station. `alongEdge` shifts the channel along the
 * chosen side so it lines up with the corner's row/column of badges.
 */
function getAnchorPoint(
    centre: Vec,
    halfW: number,
    halfH: number,
    side: AttachSide,
    direction: PairDirection,
    alongEdge: number
): Vec {
    const [cx, cy] = centre;
    return direction === 'vertical'
        ? [cx + (side === 'left' ? -1 : 1) * (halfW - VERTICAL_ANCHOR_INSET), cy + alongEdge]
        : [cx + alongEdge, cy + (side === 'top' ? -1 : 1) * halfH];
}

/**
 * A direction is only usable when the other station actually lies on that axis;
 * otherwise fall back to the other axis so the corridor never leaves sideways for
 * a station that is directly opposite.
 */
function effectiveDirection(direction: PairDirection, dx: number, dy: number): PairDirection {
    if (direction === 'vertical' && Math.abs(dx) < 1) return 'horizontal';
    if (direction === 'horizontal' && Math.abs(dy) < 1) return 'vertical';
    return direction;
}

/** Corner points of the orthogonal route, leaving station 1 and entering station 2 as configured. */
function routeCorners(p1: Vec, p2: Vec, direction1: PairDirection, direction2: PairDirection): Vec[] {
    if (direction1 === 'vertical' && direction2 === 'vertical') {
        if (Math.abs(p2[0] - p1[0]) < 1) return [];
        const my = (p1[1] + p2[1]) / 2;
        return [
            [p1[0], my],
            [p2[0], my],
        ];
    }
    if (direction1 === 'horizontal' && direction2 === 'horizontal') {
        if (Math.abs(p2[1] - p1[1]) < 1) return [];
        const mx = (p1[0] + p2[0]) / 2;
        return [
            [mx, p1[1]],
            [mx, p2[1]],
        ];
    }
    // Mixed access: one bend is enough to leave along one axis and arrive along the other.
    return direction1 === 'vertical' ? [[p1[0], p2[1]]] : [[p2[0], p1[1]]];
}

const isSamePoint = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;

const toPath = (points: Vec[]) => {
    const unique = points.filter((p, i, arr) => i === 0 || !isSamePoint(p, arr[i - 1]));
    return unique.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
};

/** Extend a polyline by `length` at both ends, along the first and last segment. */
function extendPath(points: Vec[], length: number): Vec[] {
    const first = points[0];
    const second = points[1] ?? first;
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2] ?? last;
    const unit = (dx: number, dy: number): Vec => {
        const len = Math.hypot(dx, dy);
        return len < 0.01 ? [0, 0] : [dx / len, dy / len];
    };
    const head = unit(first[0] - second[0], first[1] - second[1]);
    const tail = unit(last[0] - secondLast[0], last[1] - secondLast[1]);
    return [
        [first[0] + head[0] * length, first[1] + head[1] * length],
        ...points,
        [last[0] + tail[0] * length, last[1] + tail[1] * length],
    ];
}

const FieldGroup = (props: { title: string; children: React.ReactNode }) => (
    <Box mt={2}>
        <Heading as="h4" size="xs" mb={1}>
            {props.title}
        </Heading>
        {props.children}
    </Box>
);

const toIconStations = (transfer: InterchangeInfo[]) =>
    transfer.map(info => ({
        style: (info[6] === 'fs' ? 'fmetro' : 'gzmtr') as 'gzmtr' | 'fmetro',
        lineNum: info[4] ?? '',
        stnNum: info[5] ?? '',
        strokeColour: info[2],
    }));

/** Absolute position of a station name, in viewport px. */
function getNamePosition(
    label: [string, ...string[]],
    [cx, cy]: Vec,
    halfW: number,
    halfH: number,
    offsetX: NameOffsetX,
    offsetY: NameOffsetY
): Vec {
    const xHalf = (halfW + HALF_WIDTH) * SCALE + 3;
    const yHalf = (halfH + HALF_WIDTH) * SCALE;
    const zh = (label[0] ?? '').split('\n');
    const en = (label[1] ?? '').split('\n');
    return [
        cx * SCALE + (offsetX === 'left' ? -xHalf : offsetX === 'right' ? xHalf : 0),
        cy * SCALE +
            (offsetY === 'top'
                ? -yHalf - (en.length * FONT_SIZE.en + 2)
                : offsetY === 'bottom'
                  ? yHalf + (zh.length * FONT_SIZE.zh + 2)
                  : 0),
    ];
}

interface PairStationNameProps {
    label: [string, ...string[]];
    secondaryNames: [string, string];
    open: boolean;
    position: Vec;
    offsetX: NameOffsetX;
}

/**
 * Station name with the optional secondary name and the "(Under Construction)" hint,
 * laid out exactly like gzmtr-int-2024 so both station types align with each other.
 */
const PairStationName = (props: PairStationNameProps) => {
    const { label, secondaryNames, open, position, offsetX } = props;
    const [x, y] = position;

    const primaryRef = React.useRef<SVGGElement | null>(null);
    const [primaryWidth, setPrimaryWidth] = React.useState(0);
    useSvgLayoutEffect(
        ({ measureBBox }) => setPrimaryWidth(primaryRef.current ? measureBBox(primaryRef.current).width : 0),
        [label, x, y]
    );

    const secondaryRef = React.useRef<SVGGElement | null>(null);
    const [secondaryWidth, setSecondaryWidth] = React.useState(0);
    useSvgLayoutEffect(
        ({ measureBBox }) => setSecondaryWidth(secondaryRef.current ? measureBBox(secondaryRef.current).width : 0),
        [secondaryNames, x, y]
    );

    const textAnchor = offsetX === 'left' ? 'end' : offsetX === 'right' ? 'start' : 'middle';
    const hasSecondary = secondaryNames.join('') !== '';
    const secondaryDx = (primaryWidth + (secondaryWidth + 12 * 2) / 2) * (offsetX === 'left' ? -1 : 1);
    const underConstructionDx =
        (primaryWidth + secondaryWidth + (secondaryWidth !== 0 ? 12 * 2 : 0)) *
        (offsetX === 'left' ? -1 : offsetX === 'right' ? 1 : secondaryWidth !== 0 ? 1 : 0);

    return (
        <>
            <g ref={primaryRef} transform={`translate(${x}, ${y})`} textAnchor={textAnchor}>
                <MultilineText
                    text={(label[0] ?? '').split('\n')}
                    fontSize={FONT_SIZE.zh}
                    lineHeight={FONT_SIZE.zh}
                    grow="up"
                    {...getLangStyle(TextLanguage.zh)}
                />
                <MultilineText
                    text={(label[1] ?? '').split('\n')}
                    fontSize={FONT_SIZE.en}
                    lineHeight={FONT_SIZE.en}
                    grow="down"
                    {...getLangStyle(TextLanguage.en)}
                />
            </g>
            {hasSecondary && (
                <g transform={`translate(${x + secondaryDx}, ${y})`} textAnchor="middle">
                    <text
                        fontSize="13.13"
                        dx={-(secondaryWidth + 5) / 2}
                        textAnchor="end"
                        dominantBaseline="middle"
                        {...getLangStyle(TextLanguage.zh)}
                    >
                        （
                    </text>
                    <text
                        fontSize="13.13"
                        dx={(secondaryWidth + 5) / 2}
                        textAnchor="start"
                        dominantBaseline="middle"
                        {...getLangStyle(TextLanguage.zh)}
                    >
                        ）
                    </text>
                    <SecondaryNameText ref={secondaryRef} names={secondaryNames} />
                </g>
            )}
            {!open && (
                <g
                    transform={`translate(${x + underConstructionDx}, ${y})`}
                    textAnchor={offsetX === 'middle' ? 'start' : textAnchor}
                >
                    <text fontSize="6.04" dy="-2" dominantBaseline="auto" {...getLangStyle(TextLanguage.zh)}>
                        （未开通）
                    </text>
                    <text fontSize="3.6" dy="4" dominantBaseline="hanging" {...getLangStyle(TextLanguage.en)}>
                        (Under Construction)
                    </text>
                </g>
            )}
        </>
    );
};

const GzmtrPaidAreaIntPairStation = (props: StationComponentProps) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        names,
        names2,
        nameOffsetX,
        nameOffsetY,
        nameOffsetX2,
        nameOffsetY2,
        transfer1,
        transfer2,
        columns1,
        columns2,
        dx,
        dy,
        direction1,
        direction2,
        attachPosition1 = defaultGzmtrPaidAreaIntPairStationAttributes.attachPosition1,
        attachPosition2 = defaultGzmtrPaidAreaIntPairStationAttributes.attachPosition2,
        anchorPosition = 'center',
        anchorAt = -1,
        secondaryNames1 = ['', ''],
        secondaryNames2 = ['', ''],
        open1 = true,
        open2 = true,
    } = attrs[StationType.GzmtrPaidAreaIntPair] ?? defaultGzmtrPaidAreaIntPairStationAttributes;

    // Work in svg-assets coords, the whole node is scaled by SCALE at the end.
    const svgDx = dx / SCALE;
    const svgDy = dy / SCALE;

    const count1 = transfer1.length;
    const count2 = transfer2.length;

    const { halfW: hw1, halfH: hh1 } = getHalfExtents(columns1, count1);
    const { halfW: hw2, halfH: hh2 } = getHalfExtents(columns2, count2);

    const stn1: Vec = [0, 0];
    const stn2: Vec = [svgDx, svgDy];

    // Fall back to the other axis when the configured one cannot reach the other station.
    const dir1 = effectiveDirection(direction1, svgDx, svgDy);
    const dir2 = effectiveDirection(direction2, svgDx, svgDy);
    const topHeavy1 = isTopCorner(attachPosition1);
    const topHeavy2 = isTopCorner(attachPosition2);

    // The configured corner fixes which side of a station the corridor leaves from.
    // The other part of the corner lines the channel up with that row/column of badges.
    const side1: AttachSide =
        dir1 === 'vertical'
            ? isLeftCorner(attachPosition1)
                ? 'left'
                : 'right'
            : isTopCorner(attachPosition1)
              ? 'top'
              : 'bottom';
    const side2: AttachSide =
        dir2 === 'vertical'
            ? isLeftCorner(attachPosition2)
                ? 'left'
                : 'right'
            : isTopCorner(attachPosition2)
              ? 'top'
              : 'bottom';
    const alongEdge1 =
        dir1 === 'vertical'
            ? (isTopCorner(attachPosition1) ? -1 : 1) * (hh1 - HALF_PILL_H)
            : (isLeftCorner(attachPosition1) ? -1 : 1) * (hw1 - HALF_PILL_W);
    const alongEdge2 =
        dir2 === 'vertical'
            ? (isTopCorner(attachPosition2) ? -1 : 1) * (hh2 - HALF_PILL_H)
            : (isLeftCorner(attachPosition2) ? -1 : 1) * (hw2 - HALF_PILL_W);

    const p1 = getAnchorPoint(stn1, hw1, hh1, side1, dir1, alongEdge1);
    const p2 = getAnchorPoint(stn2, hw2, hh2, side2, dir2, alongEdge2);

    // The corridor is a plain orthogonal polyline between the two corner anchors.
    // Both ends are extended a little into the stations: the icons are drawn on top
    // of the tube, so the ends (and any bend next to them) stay hidden.
    const centreline = extendPath([p1, ...routeCorners(p1, p2, dir1, dir2), p2], HALF_WIDTH);
    const tubePath = toPath(centreline);

    const clip1 = `gzmtr-pair-clip-1-${id}`;
    const clip2 = `gzmtr-pair-clip-2-${id}`;

    // Anchor the node to the configured point so line endpoints and snapping land there.
    // When a badge is chosen, the anchor sits on that badge's centre instead of the
    // sub-station centre. -1 selects the centre; out-of-range indices are clamped.
    const anchorAtBadge = (centre: Vec, columns: number, count: number, topHeavy: boolean): Vec => {
        if (!(anchorAt >= 0)) return centre;
        const index = Math.min(Math.max(Math.floor(anchorAt), 0), Math.max(0, count - 1));
        const [bx, by] = getBadgeTranslate(index, columns, count, topHeavy);
        return [centre[0] + bx, centre[1] + by];
    };
    const anchorPoint: Vec =
        anchorPosition === 'station1'
            ? anchorAtBadge(stn1, columns1, count1, topHeavy1)
            : anchorPosition === 'station2'
              ? anchorAtBadge(stn2, columns2, count2, topHeavy2)
              : [(stn1[0] + stn2[0]) / 2, (stn1[1] + stn2[1]) / 2];
    const offset: Vec = [-anchorPoint[0] * SCALE, -anchorPoint[1] * SCALE];

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

    const stationIcon = (transfer: InterchangeInfo[], columns: number, topHeavy: boolean) => (
        <InterchangeStation2024 stations={toIconStations(transfer)} columns={columns} topHeavy={topHeavy} />
    );

    /** Redraw the station on top of the white channel, up to the inner edge of its border. */
    const stationRedraw = (transfer: InterchangeInfo[], columns: number, topHeavy: boolean, clip: string) => (
        <g clipPath={`url(#${clip})`}>{stationIcon(transfer, columns, topHeavy)}</g>
    );

    return (
        <g>
            <g transform={`translate(${offset[0]}, ${offset[1]})`}>
                <defs>
                    <clipPath id={clip1}>
                        <rect
                            x={-hw1 - CORE_MARGIN}
                            y={-hh1 - CORE_MARGIN}
                            width={(hw1 + CORE_MARGIN) * 2}
                            height={(hh1 + CORE_MARGIN) * 2}
                            rx={PILL_RADIUS + CORE_MARGIN}
                        />
                    </clipPath>
                    <clipPath id={clip2}>
                        <rect
                            x={-hw2 - CORE_MARGIN}
                            y={-hh2 - CORE_MARGIN}
                            width={(hw2 + CORE_MARGIN) * 2}
                            height={(hh2 + CORE_MARGIN) * 2}
                            rx={PILL_RADIUS + CORE_MARGIN}
                        />
                    </clipPath>
                </defs>

                <g transform={`scale(${SCALE})`}>
                    {/* Corridor walls, below the stations so the outline keeps its own rounded corners. */}
                    <path
                        d={tubePath}
                        fill="none"
                        stroke="#aaa"
                        strokeWidth={BORDER_WIDTH}
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                    />

                    <g transform={`translate(${stn1[0]}, ${stn1[1]})`}>{stationIcon(transfer1, columns1, topHeavy1)}</g>
                    <g transform={`translate(${stn2[0]}, ${stn2[1]})`}>{stationIcon(transfer2, columns2, topHeavy2)}</g>

                    {/* White channel: above the outline so it cuts the grey border open... */}
                    <path
                        d={tubePath}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={INNER_CUT}
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                    />

                    {/* ...but below everything inside the stations, so badges are never covered. */}
                    {stationRedraw(transfer1, columns1, topHeavy1, clip1)}
                    <g transform={`translate(${stn2[0]}, ${stn2[1]})`}>
                        {stationRedraw(transfer2, columns2, topHeavy2, clip2)}
                    </g>

                    {/* Below is an overlay element that has all event hooks but can not be seen. */}
                    <rect
                        id={`stn_core_${id}`}
                        x={Math.min(-hw1, svgDx - hw2) - HALF_WIDTH}
                        y={Math.min(-hh1, svgDy - hh2) - HALF_WIDTH}
                        width={Math.max(hw1, svgDx + hw2) - Math.min(-hw1, svgDx - hw2) + BORDER_WIDTH}
                        height={Math.max(hh1, svgDy + hh2) - Math.min(-hh1, svgDy - hh2) + BORDER_WIDTH}
                        fill="white"
                        fillOpacity="0"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        style={{ cursor: 'move' }}
                        className="removeMe"
                    />
                </g>

                <PairStationName
                    label={names}
                    secondaryNames={secondaryNames1}
                    open={open1}
                    position={getNamePosition(names, stn1, hw1, hh1, nameOffsetX, nameOffsetY)}
                    offsetX={nameOffsetX}
                />
                <PairStationName
                    label={names2}
                    secondaryNames={secondaryNames2}
                    open={open2}
                    position={getNamePosition(names2, stn2, hw2, hh2, nameOffsetX2, nameOffsetY2)}
                    offsetX={nameOffsetX2}
                />
            </g>
        </g>
    );
};

/* ---------- Attrs component ---------- */

const gzmtrPaidAreaIntPairAttrsComponents = (props: AttrsProps<GzmtrPaidAreaIntPairStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const current = { ...defaultGzmtrPaidAreaIntPairStationAttributes, ...attrs };
    const update = (patch: Partial<GzmtrPaidAreaIntPairStationAttributes>) =>
        handleAttrsUpdate(id, { ...current, ...patch });

    const stationFields = (key: '1' | '2'): RmgFieldsField[] => {
        const names = key === '1' ? current.names : current.names2;
        const transfer = key === '1' ? current.transfer1 : current.transfer2;
        const columns = key === '1' ? current.columns1 : current.columns2;
        const offsetX = key === '1' ? current.nameOffsetX : current.nameOffsetX2;
        const offsetY = key === '1' ? current.nameOffsetY : current.nameOffsetY2;
        const direction = key === '1' ? current.direction1 : current.direction2;
        const attachPosition = key === '1' ? current.attachPosition1 : current.attachPosition2;

        const setNames = (next: [string, ...string[]]) => update(key === '1' ? { names: next } : { names2: next });
        const secondaryNames = key === '1' ? current.secondaryNames1 : current.secondaryNames2;
        const setSecondaryNames = (next: [string, string]) =>
            update(key === '1' ? { secondaryNames1: next } : { secondaryNames2: next });
        const open = key === '1' ? current.open1 : current.open2;

        const fields: RmgFieldsField[] = [
            {
                type: 'select',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.direction'),
                value: direction,
                options: {
                    vertical: t('panel.details.stations.gzmtrPaidAreaIntPair.directionVertical'),
                    horizontal: t('panel.details.stations.gzmtrPaidAreaIntPair.directionHorizontal'),
                },
                onChange: val =>
                    update(key === '1' ? { direction1: val as PairDirection } : { direction2: val as PairDirection }),
                minW: 'full',
            },
            {
                type: 'select',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.attachPosition'),
                value: attachPosition,
                options: {
                    'top-left': t('panel.details.stations.gzmtrPaidAreaIntPair.attachPositionTopLeft'),
                    'bottom-left': t('panel.details.stations.gzmtrPaidAreaIntPair.attachPositionBottomLeft'),
                    'top-right': t('panel.details.stations.gzmtrPaidAreaIntPair.attachPositionTopRight'),
                    'bottom-right': t('panel.details.stations.gzmtrPaidAreaIntPair.attachPositionBottomRight'),
                },
                onChange: val =>
                    update(
                        key === '1'
                            ? { attachPosition1: val as PairAttachPosition }
                            : { attachPosition2: val as PairAttachPosition }
                    ),
                minW: 'full',
            },
            {
                type: 'textarea',
                label: t('panel.details.stations.common.nameZh'),
                value: names[0],
                onChange: val => setNames([val, names[1] ?? '']),
                minW: 'full',
            },
            {
                type: 'textarea',
                label: t('panel.details.stations.common.nameEn'),
                value: names[1] ?? '',
                onChange: val => setNames([names[0], val]),
                minW: 'full',
            },
            {
                type: 'custom',
                label: '',
                component: (
                    <StationNameTranslateButton
                        id={id}
                        attrs={current}
                        handleAttrsUpdate={handleAttrsUpdate}
                        names={names}
                        onTranslated={en => setNames([names[0], en])}
                    />
                ),
                minW: 'full',
            },
            {
                type: 'input',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.secondaryNameZh'),
                value: secondaryNames[0],
                onChange: val => setSecondaryNames([val, secondaryNames[1]]),
                minW: 'full',
            },
            {
                type: 'input',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.secondaryNameEn'),
                value: secondaryNames[1],
                onChange: val => setSecondaryNames([secondaryNames[0], val]),
                minW: 'full',
            },
            {
                type: 'select',
                label: t('panel.details.stations.common.nameOffsetX'),
                value: offsetX,
                options: {
                    left: t('panel.details.stations.common.left'),
                    middle: t('panel.details.stations.common.middle'),
                    right: t('panel.details.stations.common.right'),
                },
                onChange: val =>
                    update(key === '1' ? { nameOffsetX: val as NameOffsetX } : { nameOffsetX2: val as NameOffsetX }),
                minW: 'full',
            },
            {
                type: 'select',
                label: t('panel.details.stations.common.nameOffsetY'),
                value: offsetY,
                options: {
                    top: t('panel.details.stations.common.top'),
                    middle: t('panel.details.stations.common.middle'),
                    bottom: t('panel.details.stations.common.bottom'),
                },
                onChange: val =>
                    update(key === '1' ? { nameOffsetY: val as NameOffsetY } : { nameOffsetY2: val as NameOffsetY }),
                minW: 'full',
            },
            {
                type: 'slider',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.columns'),
                value: columns,
                min: 1,
                max: Math.max(1, Math.min(5, transfer.length)),
                step: 1,
                onChange: val => update(key === '1' ? { columns1: val } : { columns2: val }),
                minW: 'full',
            },
            {
                type: 'switch',
                label: t('panel.details.stations.gzmtrPaidAreaIntPair.open'),
                oneLine: true,
                isChecked: open,
                onChange: val => update(key === '1' ? { open1: val } : { open2: val }),
                minW: 'full',
            },
        ];

        return fields;
    };

    const interchangeCard = (key: '1' | '2') => {
        const transfer = key === '1' ? current.transfer1 : current.transfer2;
        const setTransfer = (next: InterchangeInfo[]) =>
            update(key === '1' ? { transfer1: next } : { transfer2: next });

        return (
            <InterchangeCard
                interchangeList={transfer}
                maximumTransfers={1000}
                foshan
                onAdd={(index, info) => setTransfer([...transfer.slice(0, index), info, ...transfer.slice(index)])}
                onDelete={index => setTransfer(transfer.filter((_, i) => i !== index))}
                onUpdate={(index, info) => setTransfer(transfer.map((int, i) => (i === index ? info : int)))}
                onUp={index => {
                    if (index <= 0) return;
                    const next = [...transfer];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    setTransfer(next);
                }}
                onDown={index => {
                    if (index >= transfer.length - 1) return;
                    const next = [...transfer];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    setTransfer(next);
                }}
            />
        );
    };

    // Once a station is chosen as the anchor, let the user pick one of its badges.
    const anchoredTransfer =
        current.anchorPosition === 'station1'
            ? current.transfer1
            : current.anchorPosition === 'station2'
              ? current.transfer2
              : undefined;
    const badgeAnchorAt = Number.isFinite(current.anchorAt) ? current.anchorAt! : -1;
    const badgeField: RmgFieldsField<string>[] = anchoredTransfer
        ? [
              {
                  type: 'select',
                  label: t('panel.details.stations.gzmtrPaidAreaIntPair.anchorAt'),
                  value: String(Math.min(Math.max(badgeAnchorAt, -1), Math.max(-1, anchoredTransfer.length - 1))),
                  options: {
                      '-1': t('panel.details.stations.gzmtrPaidAreaIntPair.anchorAtCenter'),
                      ...Object.fromEntries(
                          Array.from({ length: anchoredTransfer.length }, (_, i) => [String(i), String(i)])
                      ),
                  },
                  onChange: val => update({ anchorAt: Number(val) }),
                  minW: 'full',
              },
          ]
        : [];

    return (
        <>
            <FieldGroup title={t('panel.details.stations.gzmtrPaidAreaIntPair.layout')}>
                <RmgFields<string>
                    fields={[
                        {
                            type: 'select',
                            label: t('panel.details.stations.gzmtrPaidAreaIntPair.anchorPosition'),
                            value: current.anchorPosition ?? 'center',
                            options: {
                                center: t('panel.details.stations.gzmtrPaidAreaIntPair.anchorPositionCenter'),
                                station1: t('panel.details.stations.gzmtrPaidAreaIntPair.anchorPositionStation1'),
                                station2: t('panel.details.stations.gzmtrPaidAreaIntPair.anchorPositionStation2'),
                            },
                            onChange: val => update({ anchorPosition: val as PairAnchorPosition }),
                            minW: 'full',
                        },
                        ...badgeField,
                        {
                            type: 'input',
                            label: t('panel.details.stations.gzmtrPaidAreaIntPair.dx'),
                            value: String(current.dx),
                            onChange: val => update({ dx: Number(val) || 0 }),
                            minW: 'full',
                        },
                        {
                            type: 'input',
                            label: t('panel.details.stations.gzmtrPaidAreaIntPair.dy'),
                            value: String(current.dy),
                            onChange: val => update({ dy: Number(val) || 0 }),
                            minW: 'full',
                        },
                    ]}
                />
            </FieldGroup>

            <FieldGroup title={t('panel.details.stations.gzmtrPaidAreaIntPair.station1')}>
                <RmgFields fields={stationFields('1')} />
                <FormLabel fontSize="xs">{t('panel.details.stations.interchange.within')}</FormLabel>
                {interchangeCard('1')}
            </FieldGroup>

            <FieldGroup title={t('panel.details.stations.gzmtrPaidAreaIntPair.station2')}>
                <RmgFields fields={stationFields('2')} />
                <FormLabel fontSize="xs">{t('panel.details.stations.interchange.within')}</FormLabel>
                {interchangeCard('2')}
            </FieldGroup>
        </>
    );
};

const gzmtrPaidAreaIntPairIcon = (
    <svg viewBox="0 0 40 26" height={40} width={40} focusable={false}>
        <rect x="2" y="2" width="9" height="15" rx="4.5" fill="white" stroke="currentColor" strokeWidth="2" />
        <rect x="22" y="10" width="9" height="15" rx="4.5" fill="white" stroke="currentColor" strokeWidth="2" />
        <path d="M6.5,17 V18.5 H26.5 V10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    </svg>
);

const gzmtrPaidAreaIntPair: Station<GzmtrPaidAreaIntPairStationAttributes> = {
    component: GzmtrPaidAreaIntPairStation,
    icon: gzmtrPaidAreaIntPairIcon,
    defaultAttrs: defaultGzmtrPaidAreaIntPairStationAttributes,
    attrsComponent: gzmtrPaidAreaIntPairAttrsComponents,
    metadata: {
        displayName: 'panel.details.stations.gzmtrPaidAreaIntPair.displayName',
        cities: [CityCode.Guangzhou],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

export default gzmtrPaidAreaIntPair;
