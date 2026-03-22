import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
    Path,
} from '../../../../constants/lines';
import { makeShortPathOutline } from '../../../../util/bezier-parallel';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const PATTERN_LEN = LINE_WIDTH * Math.SQRT1_2;
const PATTERN_WIDTH = 0.25;
const PATTERN_CLIP_PATH_D = ((PATTERN_LEN * Math.SQRT2 - PATTERN_WIDTH) / 2) * Math.SQRT2;
const THIN_TAIL_LENGTH = 8;
const THIN_TAIL_WIDTH = 1.6;
const THIN_TAIL_MARKER_BOX = 20;
const BLACK_BLOCK_FILL_LENGTH = 1;
const SIDE_STROKE_WIDTH = 0.1;
const DECORATED_BORDER_STROKE_WIDTH = 0.1;
const EMPTY_PATH = 'M 0 0 Z' as Path;
const EPSILON = 1e-6;

type DecorationType = 'none' | 'thin-tail' | 'black-block';
type DecorationAt = 'from' | 'to';

type Point = { x: number; y: number };
type LineSegment = { type: 'L'; start: Point; end: Point };
type CurveSegment = { type: 'C'; start: Point; c1: Point; c2: Point; end: Point };
type Segment = LineSegment | CurveSegment;

interface ParsedSidePath {
    start: Point;
    end: Point;
    segments: Segment[];
    reverseSegments: Segment[];
    firstDirectionPoint: Point;
    lastDirectionPoint: Point;
}

interface DecorationPaths {
    [key: string]: Path;
    outline: Path;
    pA: Path;
    pB: Path;
    center: Path;
    border: Path;
    blackBlockFill: Path;
    tailFill: Path;
}

const parseShortPath = (path: Path): ParsedSidePath | undefined => {
    const tokens = [...path.matchAll(/([MLC])([^MLC]*)/g)];
    if (!tokens.length || tokens[0][1] !== 'M') return;

    const parseNumbers = (value: string) => (value.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const startNumbers = parseNumbers(tokens[0][2]);
    if (startNumbers.length < 2) return;

    const start = { x: startNumbers[0], y: startNumbers[1] };
    let current = start;
    const segments: Segment[] = [];

    for (const [, command, value] of tokens.slice(1)) {
        const numbers = parseNumbers(value);
        if (command === 'L') {
            for (let i = 0; i < numbers.length; i += 2) {
                const end = { x: numbers[i], y: numbers[i + 1] };
                segments.push({ type: 'L', start: current, end });
                current = end;
            }
        } else if (command === 'C') {
            for (let i = 0; i < numbers.length; i += 6) {
                const c1 = { x: numbers[i], y: numbers[i + 1] };
                const c2 = { x: numbers[i + 2], y: numbers[i + 3] };
                const end = { x: numbers[i + 4], y: numbers[i + 5] };
                segments.push({ type: 'C', start: current, c1, c2, end });
                current = end;
            }
        }
    }

    if (!segments.length) return;

    const lastSegment = segments.at(-1)!;

    return {
        start,
        end: current,
        segments,
        reverseSegments: segments
            .slice()
            .reverse()
            .map(segment =>
                segment.type === 'L'
                    ? { type: 'L', start: segment.end, end: segment.start }
                    : { type: 'C', start: segment.end, c1: segment.c2, c2: segment.c1, end: segment.start }
            ),
        firstDirectionPoint: segments[0].type === 'L' ? segments[0].end : segments[0].c1,
        lastDirectionPoint: lastSegment.type === 'L' ? lastSegment.start : lastSegment.c2,
    };
};

const serializePoint = (point: Point) => `${point.x} ${point.y}`;

const serializeSegments = (segments: Segment[]) =>
    segments
        .map(segment =>
            segment.type === 'L'
                ? `L ${serializePoint(segment.end)}`
                : `C ${serializePoint(segment.c1)} ${serializePoint(segment.c2)} ${serializePoint(segment.end)}`
        )
        .join(' ');

const makeClosedPolygonPath = (points: Point[]): Path =>
    `M ${serializePoint(points[0])} ${points
        .slice(1)
        .map(point => `L ${serializePoint(point)}`)
        .join(' ')} Z` as Path;

const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (point: Point, factor: number): Point => ({ x: point.x * factor, y: point.y * factor });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const normalize = (vector: Point): Point => {
    const length = Math.hypot(vector.x, vector.y);
    if (length < EPSILON) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
};

const getTerminalFrame = (sideA: ParsedSidePath, sideB: ParsedSidePath, decorationAt: DecorationAt) => {
    const terminalA = decorationAt === 'to' ? sideA.end : sideA.start;
    const terminalB = decorationAt === 'to' ? sideB.end : sideB.start;
    const bodyDirectionPointA = decorationAt === 'to' ? sideA.lastDirectionPoint : sideA.firstDirectionPoint;
    const outward = normalize(subtract(terminalA, bodyDirectionPointA));
    return { terminalA, terminalB, outward };
};

const getThinTailMarkerId = (id: string, decorationAt: DecorationAt) =>
    `jr_east_pattern_thin_tail_${decorationAt}_${id}`;

const getThinTailMarkerProps = (markerId: string, decorationAt: DecorationAt) =>
    decorationAt === 'from' ? { markerStart: `url(#${markerId})` } : { markerEnd: `url(#${markerId})` };

const makeDecorationPaths = (
    outline: Path,
    pA: Path,
    pB: Path,
    decoration: DecorationType,
    decorationAt: DecorationAt,
    center: Path
): DecorationPaths => {
    const sideA = parseShortPath(pA);
    const sideB = parseShortPath(pB);

    if (!sideA || !sideB) {
        return {
            outline,
            pA,
            pB,
            center,
            border: outline,
            blackBlockFill: EMPTY_PATH,
            tailFill: EMPTY_PATH,
        };
    }

    if (decoration === 'none') {
        return {
            outline,
            pA,
            pB,
            center,
            border: outline,
            blackBlockFill: EMPTY_PATH,
            tailFill: EMPTY_PATH,
        };
    }

    if (decoration === 'thin-tail') {
        return {
            outline,
            pA,
            pB,
            center,
            border: EMPTY_PATH,
            blackBlockFill: EMPTY_PATH,
            tailFill: EMPTY_PATH,
        };
    }

    const { terminalA, terminalB, outward } = getTerminalFrame(sideA, sideB, decorationAt);

    if (decoration === 'black-block') {
        const insetA = add(terminalA, scale(outward, -BLACK_BLOCK_FILL_LENGTH));
        const insetB = add(terminalB, scale(outward, -BLACK_BLOCK_FILL_LENGTH));

        return {
            outline,
            pA,
            pB,
            center,
            border: outline,
            blackBlockFill: makeClosedPolygonPath([terminalA, terminalB, insetB, insetA]),
            tailFill: EMPTY_PATH,
        };
    }

    return {
        outline,
        pA,
        pB,
        center,
        border: EMPTY_PATH,
        blackBlockFill: EMPTY_PATH,
        tailFill: EMPTY_PATH,
    };
};

const jrEastSingleColorPatternPathGenerator = (
    path: Path,
    type: LinePathType,
    attrs: JREastSingleColorPatternAttributes
) => {
    const base = makeShortPathOutline(path, type, -2.5, 2.5);
    if (!base) {
        return {
            outline: path,
            pA: path,
            pB: path,
            center: path,
            border: path,
            blackBlockFill: EMPTY_PATH,
            tailFill: EMPTY_PATH,
        };
    }

    const decoration = attrs.decoration ?? defaultJREastSingleColorPatternAttributes.decoration;
    const decorationAt = attrs.decorationAt ?? defaultJREastSingleColorPatternAttributes.decorationAt;
    return makeDecorationPaths(base.outline, base.pA, base.pB, decoration, decorationAt, path);
};

const JREastSingleColorPatternPre = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const decoration = styleAttrs?.decoration ?? defaultJREastSingleColorPatternAttributes.decoration;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            {decoration !== 'black-block' ? (
                <>
                    <path
                        id={`${LineStyleType.JREastSingleColorPattern}_pA_${id}`}
                        d={paths.pA}
                        fill="none"
                        stroke="black"
                        strokeWidth={SIDE_STROKE_WIDTH}
                    />
                    <path
                        id={`${LineStyleType.JREastSingleColorPattern}_pB_${id}`}
                        d={paths.pB}
                        fill="none"
                        stroke="black"
                        strokeWidth={SIDE_STROKE_WIDTH}
                    />
                </>
            ) : null}
        </g>
    );
};

const JREastSingleColorPatternPost = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const decoration = styleAttrs?.decoration ?? defaultJREastSingleColorPatternAttributes.decoration;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );

    if (decoration !== 'black-block') return null;

    return (
        <path
            id={`${LineStyleType.JREastSingleColorPattern}_border_${id}`}
            d={paths.border}
            fill="none"
            stroke="black"
            strokeWidth={DECORATED_BORDER_STROKE_WIDTH}
            onPointerDown={onPointerDown}
            cursor="pointer"
        />
    );
};

const JREastSingleColorPattern = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultJREastSingleColorPatternAttributes.color,
        decoration = defaultJREastSingleColorPatternAttributes.decoration,
        decorationAt = defaultJREastSingleColorPatternAttributes.decorationAt,
    } = styleAttrs ?? defaultJREastSingleColorPatternAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );
    const thinTailMarkerId = React.useMemo(() => getThinTailMarkerId(id, decorationAt), [id, decorationAt]);
    const thinTailMarkerProps = React.useMemo(
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt),
        [thinTailMarkerId, decorationAt]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            <defs>
                <clipPath id={`jr_east_fill_pattern_clip_path_${id}`} patternUnits="userSpaceOnUse">
                    <polygon points={`0,0 0,${PATTERN_CLIP_PATH_D} ${PATTERN_CLIP_PATH_D},0`} />
                    <polygon
                        points={`${PATTERN_LEN},${PATTERN_LEN} ${
                            PATTERN_LEN - PATTERN_CLIP_PATH_D
                        },${PATTERN_LEN} ${PATTERN_LEN},${PATTERN_LEN - PATTERN_CLIP_PATH_D}`}
                    />
                </clipPath>
                <pattern
                    id={`jr_east_${id}_fill_pattern_${color[2]}`}
                    width={PATTERN_LEN}
                    height={PATTERN_LEN}
                    patternUnits="userSpaceOnUse"
                >
                    <rect width={PATTERN_LEN} height={PATTERN_LEN} fill={color[2]} />
                    <line
                        x1="0"
                        y1="0"
                        x2={PATTERN_LEN}
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="50%"
                        clipPath={`url(#jr_east_fill_pattern_clip_path_${id})`}
                    />
                    <line
                        x1={PATTERN_LEN}
                        y1="0"
                        x2="0"
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="50%"
                    />
                </pattern>
                {decoration === 'thin-tail' && (
                    <marker
                        id={thinTailMarkerId}
                        viewBox={`${-THIN_TAIL_MARKER_BOX} ${-THIN_TAIL_MARKER_BOX} ${
                            THIN_TAIL_MARKER_BOX * 2
                        } ${THIN_TAIL_MARKER_BOX * 2}`}
                        markerWidth={THIN_TAIL_MARKER_BOX * 2}
                        markerHeight={THIN_TAIL_MARKER_BOX * 2}
                        refX={0}
                        refY={0}
                        orient="auto-start-reverse"
                        markerUnits="userSpaceOnUse"
                    >
                        <rect
                            x={0}
                            y={-THIN_TAIL_WIDTH / 2}
                            width={THIN_TAIL_LENGTH}
                            height={THIN_TAIL_WIDTH}
                            fill={color[2]}
                        />
                    </marker>
                )}
            </defs>
            <path
                id={`${LineStyleType.JREastSingleColorPattern}_outline_${id}`}
                d={paths.outline}
                fill={`url(#jr_east_${id}_fill_pattern_${color[2]})`}
            />
            {decoration === 'thin-tail' && (
                <path
                    id={`${LineStyleType.JREastSingleColorPattern}_center_${id}`}
                    d={paths.center}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="0.01"
                    {...thinTailMarkerProps}
                />
            )}
            {decoration === 'black-block' && (
                <path
                    id={`${LineStyleType.JREastSingleColorPattern}_blackBlockFill_${id}`}
                    d={paths.blackBlockFill}
                    fill="black"
                />
            )}
        </g>
    );
};

/**
 * JREastSingleColorPattern specific props.
 */
export interface JREastSingleColorPatternAttributes extends LinePathAttributes, ColorAttribute {
    decoration: DecorationType;
    decorationAt: DecorationAt;
}

const defaultJREastSingleColorPatternAttributes: JREastSingleColorPatternAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
    decoration: 'none',
    decorationAt: 'to',
};

const jrEastSingleColorPatternAttrsComponent = (props: AttrsProps<JREastSingleColorPatternAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.JREastSingleColorPattern}
                    defaultTheme={defaultJREastSingleColorPatternAttributes.color}
                />
            ),
        },
        {
            type: 'select',
            label: t('panel.details.lines.jrEastSingleColorPattern.decoration.displayName'),
            value: attrs.decoration ?? defaultJREastSingleColorPatternAttributes.decoration,
            options: {
                none: t('panel.details.lines.jrEastSingleColorPattern.decoration.none'),
                'thin-tail': t('panel.details.lines.jrEastSingleColorPattern.decoration.thinTail'),
                'black-block': t('panel.details.lines.jrEastSingleColorPattern.decoration.blackBlock'),
            },
            onChange: val => {
                attrs.decoration = val as DecorationType;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            hidden: (attrs.decoration ?? defaultJREastSingleColorPatternAttributes.decoration) === 'none',
            label: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.displayName'),
            value: attrs.decorationAt ?? defaultJREastSingleColorPatternAttributes.decorationAt,
            options: {
                from: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.from'),
                to: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.to'),
            },
            onChange: val => {
                attrs.decorationAt = val as DecorationAt;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastSingleColorPattern: LineStyle<JREastSingleColorPatternAttributes> = {
    preComponent: JREastSingleColorPatternPre,
    component: JREastSingleColorPattern,
    postComponent: JREastSingleColorPatternPost,
    defaultAttrs: defaultJREastSingleColorPatternAttributes,
    attrsComponent: jrEastSingleColorPatternAttrsComponent,
    pathGenerator: jrEastSingleColorPatternPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColorPattern.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default jrEastSingleColorPattern;
