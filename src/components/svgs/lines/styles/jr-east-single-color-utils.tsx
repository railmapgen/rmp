import { RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AttrsProps } from '../../../../constants/constants';
import type { LinePathAttributes, LinePathType, LineStyleType, Path } from '../../../../constants/lines';
import { makeShortPathOutline } from '../../../../util/bezier-parallel';
import { ColorField } from '../../../panels/details/color-field';
import type { ColorAttribute } from '../../../panels/details/color-field';

const BLACK_BLOCK_FILL_LENGTH = 1;
const EMPTY_PATH = 'M 0 0 Z' as Path;
const EPSILON = 1e-6;

export const THIN_TAIL_LENGTH = 8;
export const THIN_TAIL_WIDTH = 1.6;
export const THIN_TAIL_MARKER_BOX = 20;

export type DecorationType = 'none' | 'thin-tail' | 'black-block';
export type DecorationAt = 'from' | 'to';

export interface JREastSingleColorDecorationAttributes {
    decoration: DecorationType;
    decorationAt: DecorationAt;
}

export interface JREastSingleColorSharedAttributes
    extends LinePathAttributes,
        ColorAttribute,
        JREastSingleColorDecorationAttributes {}

export interface JREastSingleColorPatternPaths {
    [key: string]: Path;
    outline: Path;
    pA: Path;
    pB: Path;
    center: Path;
    border: Path;
    blackBlockFill: Path;
    tailFill: Path;
}

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

export const defaultJREastSingleColorDecorationAttributes: JREastSingleColorDecorationAttributes = {
    decoration: 'none',
    decorationAt: 'to',
};

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

const makeClosedPolygonPath = (points: Point[]): Path =>
    `M ${serializePoint(points[0])} ${points
        .slice(1)
        .map(point => `L ${serializePoint(point)}`)
        .join(' ')} Z` as Path;

const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (point: Point, factor: number): Point => ({ x: point.x * factor, y: point.y * factor });

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

export const getThinTailMarkerId = (id: string, decorationAt: DecorationAt) =>
    `jr_east_pattern_thin_tail_${decorationAt}_${id}`;

export const getThinTailMarkerProps = (markerId: string, decorationAt: DecorationAt) =>
    decorationAt === 'from' ? { markerStart: `url(#${markerId})` } : { markerEnd: `url(#${markerId})` };

const makeDecorationPaths = (
    outline: Path,
    pA: Path,
    pB: Path,
    decoration: DecorationType,
    decorationAt: DecorationAt,
    center: Path
): JREastSingleColorPatternPaths => {
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

export const jrEastSingleColorPatternPathGenerator = (
    path: Path,
    type: LinePathType,
    attrs: JREastSingleColorDecorationAttributes
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

    const decoration = attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration;
    const decorationAt = attrs.decorationAt ?? defaultJREastSingleColorDecorationAttributes.decorationAt;
    return makeDecorationPaths(base.outline, base.pA, base.pB, decoration, decorationAt, path);
};

interface JREastThinTailMarkerProps {
    id: string;
    fill: string;
    length?: number;
    thickness?: number;
}

export const JREastThinTailMarker = ({
    id,
    fill,
    length = THIN_TAIL_LENGTH,
    thickness = THIN_TAIL_WIDTH,
}: JREastThinTailMarkerProps) => (
    <marker
        id={id}
        viewBox={`${-THIN_TAIL_MARKER_BOX} ${-THIN_TAIL_MARKER_BOX} ${THIN_TAIL_MARKER_BOX * 2} ${
            THIN_TAIL_MARKER_BOX * 2
        }`}
        markerWidth={THIN_TAIL_MARKER_BOX * 2}
        markerHeight={THIN_TAIL_MARKER_BOX * 2}
        refX={0}
        refY={0}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
    >
        <rect x={0} y={-thickness / 2} width={length} height={thickness} fill={fill} />
    </marker>
);

export const makeJREastDecorationFields = <T extends JREastSingleColorSharedAttributes>(
    props: AttrsProps<T>,
    styleType: LineStyleType,
    defaultTheme: T['color']
): RmgFieldsField[] => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    return [
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={styleType} defaultTheme={defaultTheme} />,
        },
        {
            type: 'select',
            label: t('panel.details.lines.jrEastSingleColorPattern.decoration.displayName'),
            value: attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration,
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
            hidden: (attrs.decoration ?? defaultJREastSingleColorDecorationAttributes.decoration) === 'none',
            label: t('panel.details.lines.jrEastSingleColorPattern.decorationAt.displayName'),
            value: attrs.decorationAt ?? defaultJREastSingleColorDecorationAttributes.decorationAt,
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
};
