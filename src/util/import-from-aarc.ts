import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { linePaths, lineStyles } from '../components/svgs/lines/lines';
import miscNodes from '../components/svgs/nodes/misc-nodes';
import stations from '../components/svgs/stations/stations';
import {
    CityCode,
    EdgeAttributes,
    GraphAttributes,
    LineId,
    MiscNodeId,
    NodeAttributes,
    StnId,
    Theme,
} from '../constants/constants';
import { LineOperatingStatus } from '../constants/line-definitions';
import { ExternalLinePathAttributes, LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeAttributes, MiscNodeType } from '../constants/nodes';
import { ExternalStationAttributes, StationType } from '../constants/stations';
import { makePoint, PathPoint } from '../constants/path';
import { checkSimplePathAvailability } from './auto-simple';
import {
    emptyLineDefinition,
    getLineTopology,
    isOpeningDateValid,
    lineEdgeComponents,
    reconcileLineDefinitions,
} from './line-definitions';
import { autoPopulateTransfer, autoUpdateStationType, changeNodesColorInBatch } from './change-types';
import { TextLanguage } from './fonts';
import { getEndPoint, getStartPoint, isOpenPath } from './path';

const ScalingFactor = 0.3125;

/** AARC JSON fields consumed by the importer. See Aurouscia/aarc, aarc/src/models/save.ts. */
interface AarcSave {
    idIncre: number;
    points: Point[];
    pointLinks?: {
        pts: [number, number];
        type: number;
    }[];
    lines: Line[];
    timeSlices?: TimeSlice[];
    lineGroups?: {
        id: number;
        name?: string;
        lineType: number;
    }[];
    textTags: TextTag[];
    textTagIcons?: {
        id: number;
        name?: string;
        url?: string;
        width?: number;
    }[];
    cvsSize: [number, number];
    config: {
        // bgRefImage;
        lineWidth?: number;
        lineTurnAreaRadius?: number;
        snapOctaClingPtPtDist?: number;
        lineWidthMapped?: Record<string, { staSize?: number; staSnapSize?: number }>;
        textTagPlain?: {
            fontSize?: number;
            subFontSize?: number;
        };
        textTagForLine?: {
            fontSize?: number;
            subFontSize?: number;
        };
        textTagForTerrain?: {
            fontSize?: number;
            subFontSize?: number;
        };
    };
    // meta;
}

interface Point {
    id: number;
    pos: [number, number];
    dir: number;
    sta: number;
    name?: string;
    nameS?: string;
    nameP?: [number, number];
    nameSize?: number;
    anchorX?: 0 | 1 | -1;
    anchorY?: 0 | 1 | -1;
    noLeader?: boolean;
    free?: boolean;
}

interface Line {
    id: number;
    pts: number[];
    name: string;
    nameSub: string;
    color: string;
    colorPre?: number;
    group?: number;
    width?: number;
    ptNameSize?: number;
    ptSize?: number;
    ptSnapSize?: number;
    type: number;
    isFilled?: boolean;
    style?: number;
    tagTextColor?: string;
    zIndex?: number;
    parent?: number;
    isFake?: boolean;
    removeCarpet?: boolean;
    time?: AarcLineTime;
}

interface TextTag {
    id: number;
    pos: [number, number];
    forId?: number;
    text?: string;
    textS?: string;
    textOp?: {
        size: number;
        color: string;
        i?: boolean;
        b?: boolean;
        u?: boolean;
        weight?: string;
        style?: string;
    };
    textSOp?: {
        size: number;
        color: string;
        i?: boolean;
        b?: boolean;
        u?: boolean;
        weight?: string;
        style?: string;
    };
    padding?: number;
    textAlign?: 0 | 1 | -1;
    width?: number;
    anchorX?: 0 | 1 | -1;
    anchorY?: 0 | 1 | -1;
    dropCap?: boolean;
    icon?: number;
    opacity?: number;
}

interface AarcLineTime {
    propose?: number;
    construct?: number;
    open?: number;
    suspend?: [number, number][];
    abandon?: number;
}

interface TimeSlice {
    id: number;
    line: number;
    fromPt: number;
    toPt: number;
    time: AarcLineTime;
}

/** Match AARC's save normalization and sliceResolver for unique and repeated endpoints. */
const resolveSlice = (pts: number[], fromPt: number, toPt: number): [number, number] | undefined => {
    if (fromPt === toPt) return;
    let fromIndices = pts.flatMap((id, i) => (id === fromPt ? [i] : []));
    let toIndices = pts.flatMap((id, i) => (id === toPt ? [i] : []));
    if (!fromIndices.length || !toIndices.length || (fromIndices.length > 1 && toIndices.length > 1)) return;
    if (
        (fromIndices.length === 1 && toIndices.every(i => i < fromIndices[0])) ||
        (toIndices.length === 1 && fromIndices.every(i => i > toIndices[0]))
    ) {
        [fromIndices, toIndices] = [toIndices, fromIndices];
    }
    const from = fromIndices.length > 1 ? fromIndices.filter(i => i < toIndices[0]).pop() : fromIndices[0];
    const to = toIndices.length > 1 ? toIndices.find(i => i > fromIndices[0]) : toIndices[0];
    if (from === undefined || to === undefined) return;
    return from < to ? [from, to] : [to, from];
};

interface AarcTimeSpan {
    fromIndex: number;
    toIndex: number;
    time?: AarcLineTime;
}

/** AARC synchronizes a branch's appearance from its parent, but its name, style and dates stay independent. */
const normalizeAarcLines = (lines: Line[]): Line[] => {
    const source = new Map(lines.map(line => [line.id, line]));
    const normalized = new Map<number, Line>();
    const resolving = new Set<number>();
    const resolve = (line: Line): Line => {
        const cached = normalized.get(line.id);
        if (cached) return cached;
        if (resolving.has(line.id)) throw new Error('Invalid AARC parent cycle');
        resolving.add(line.id);
        const parent = source.get(line.parent!);
        const result = parent
            ? {
                  ...resolve(parent),
                  id: line.id,
                  name: line.name,
                  nameSub: line.nameSub,
                  parent: line.parent,
                  pts: line.pts,
                  style: line.style,
                  time: line.time,
              }
            : line;
        resolving.delete(line.id);
        normalized.set(line.id, result);
        return result;
    };
    return lines.map(resolve);
};

/** TimeSlice replaces the complete time object. An empty slice clears the line's dates. */
const getAarcTimeSpans = (line: Line, slices: TimeSlice[] = []): AarcTimeSpan[] => {
    if (line.pts.length < 2) return [];
    const resolved = slices
        .filter(slice => slice.line === line.id)
        .flatMap(slice => {
            const interval = resolveSlice(line.pts, slice.fromPt, slice.toPt);
            return interval ? [{ interval, time: slice.time }] : [];
        });
    const cuts = [...new Set([0, line.pts.length - 1, ...resolved.flatMap(slice => slice.interval)])].sort(
        (a, b) => a - b
    );
    const spans: AarcTimeSpan[] = [];
    for (let i = 1; i < cuts.length; i++) {
        const fromIndex = cuts[i - 1];
        const toIndex = cuts[i];
        // AARC uses the first covering slice, including for overlapping legacy data.
        const slice = resolved.find(({ interval: [from, to] }) => from <= fromIndex && toIndex <= to);
        const time = slice ? slice.time : line.time;
        const previous = spans.at(-1);
        if (previous && previous.time === time) previous.toIndex = toIndex;
        else spans.push({ fromIndex, toIndex, time });
    }
    return spans;
};

/** AARC's fromYMD/toYMD use local calendar dates, not UTC dates. Epoch zero is valid. */
const formatAarcDate = (timestamp: number | undefined): string => {
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.valueOf())) return '';
    const result = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return isOpeningDateValid(result) ? result : '';
};

/** Preserve lifecycle dates in notes; RMP has one opening date and one current status per section. */
const getAarcTimeMetadata = (time: AarcLineTime | undefined, now: number = Date.now()) => {
    const openingDate = formatAarcDate(time?.open);
    const notes: string[] = [];
    for (const key of ['propose', 'construct', 'abandon'] as const) {
        const date = formatAarcDate(time?.[key]);
        if (date) notes.push(`AARC ${key}: ${date}`);
    }
    const suspensions = Array.isArray(time?.suspend) ? time.suspend : [];
    for (const interval of suspensions) {
        if (!Array.isArray(interval)) continue;
        const [from, to] = interval.map(formatAarcDate);
        if (from || to) notes.push(`AARC suspend: ${from || '?'} — ${to || '?'}`);
    }
    const occurred = (value: number | undefined) => !!formatAarcDate(value) && value! <= now;
    let status: LineOperatingStatus = 'operating';
    if (
        occurred(time?.abandon) ||
        suspensions.some(
            interval =>
                Array.isArray(interval) && occurred(interval[0]) && !!formatAarcDate(interval[1]) && interval[1] > now
        )
    ) {
        status = 'closed';
    } else if (occurred(time?.open)) {
        status = 'operating';
    } else if (occurred(time?.construct)) {
        status = 'construction';
    } else if (formatAarcDate(time?.propose) || openingDate || formatAarcDate(time?.construct)) {
        status = 'planned';
    }
    return { openingDate, status, notes: notes.join('\n') };
};

interface AarcGeometrySegment {
    index: number;
    coordinates: [number, number][];
}

/** Reproduce AARC's formalizeSeg and neighbour-dependent illPosedSegJustify before choosing RMP paths. */
const getAarcLineGeometry = (line: Line, points: Map<number, Point>): AarcGeometrySegment[] => {
    type Coord = [number, number];
    interface Segment {
        a: Coord;
        b: Coord;
        itp: Coord[];
        ill: number;
        direct?: boolean;
    }
    const epsilon = 1e-4;
    const isZero = (value: number) => Math.abs(value) < epsilon;
    const sign = (value: number) => (isZero(value) ? 0 : Math.sign(value));
    const direction = (from: Coord, to: Coord): Coord => [sign(to[0] - from[0]), sign(to[1] - from[1])];
    const dot = (a: Coord, b: Coord) => a[0] * b[0] + a[1] * b[1];
    const cross = (a: Coord, b: Coord) => a[0] * b[1] - a[1] * b[0];
    const rayDistance = (source: Coord, way: Coord, point: Coord) => {
        const dx = source[0] - point[0];
        const dy = source[1] - point[1];
        if (way[0] === 0) return Math.abs(dx);
        if (way[1] === 0) return Math.abs(dy);
        return Math.abs(way[0] * way[1] > 0 ? dy - dx : dy + dx) * Math.SQRT1_2;
    };
    const intersectPerpendicular = (a: Coord, aWay: Coord, b: Coord, bWay: Coord): Coord | undefined => {
        if (isZero(cross(aWay, bWay)) || !isZero(dot(aWay, bWay))) return;
        const distance = rayDistance(b, bWay, a) * (aWay[0] && aWay[1] ? Math.SQRT1_2 : 1);
        const bias: Coord = [aWay[0] * distance, aWay[1] * distance];
        const intersection: Coord = [a[0] + bias[0], a[1] + bias[1]];
        if (!isZero(rayDistance(b, bWay, intersection))) {
            intersection[0] -= 2 * bias[0];
            intersection[1] -= 2 * bias[1];
        }
        return intersection;
    };
    const formalizeSegment = (a: Point, b: Point): Segment => {
        const segment: Segment = { a: a.pos, b: b.pos, itp: [], ill: 0 };
        if (a.free || b.free) return { ...segment, direct: true };
        const dx = b.pos[0] - a.pos[0];
        const dy = b.pos[1] - a.pos[1];
        const samePosition = isZero(dx) && isZero(dy);
        const axis = isZero(dx) || isZero(dy);
        const diagonal = !axis && (isZero(dx - dy) || isZero(dx + dy));
        if (samePosition) return segment;
        if (a.dir === b.dir) {
            if (axis || diagonal) {
                segment.ill = (a.dir === 1 ? axis : diagonal) ? 2 : 0;
                return segment;
            }
            let bias: Coord;
            if (a.dir === 1) {
                const distance = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
                bias = [sign(dx) * distance, sign(dy) * distance];
            } else {
                const distance = (Math.max(Math.abs(dx), Math.abs(dy)) - Math.min(Math.abs(dx), Math.abs(dy))) / 2;
                bias = Math.abs(dx) > Math.abs(dy) ? [sign(dx) * distance, 0] : [0, sign(dy) * distance];
            }
            segment.itp = [
                [a.pos[0] + bias[0], a.pos[1] + bias[1]],
                [b.pos[0] - bias[0], b.pos[1] - bias[1]],
            ];
            segment.ill = 1;
        } else if (!axis && !diagonal) {
            const [axisPoint, diagonalPoint] = a.dir === 1 ? [b.pos, a.pos] : [a.pos, b.pos];
            const xDiff = diagonalPoint[0] - axisPoint[0];
            const yDiff = diagonalPoint[1] - axisPoint[1];
            segment.itp = [
                Math.abs(xDiff) > Math.abs(yDiff)
                    ? [diagonalPoint[0] - sign(xDiff) * Math.abs(yDiff), axisPoint[1]]
                    : [axisPoint[0], diagonalPoint[1] - sign(yDiff) * Math.abs(xDiff)],
            ];
        }
        return segment;
    };

    const controlPoints = line.pts.map(id => {
        const point = points.get(id);
        if (!point) throw new Error(`Invalid AARC point ${id}`);
        return point;
    });
    if (controlPoints.length < 2) return [];
    const ring = controlPoints.length > 2 && controlPoints[0].id === controlPoints[controlPoints.length - 1].id;
    const segments: Segment[] = ring
        ? [formalizeSegment(controlPoints[controlPoints.length - 2], controlPoints[0])]
        : [];
    for (let i = 0; i < controlPoints.length - 1; i++) {
        segments.push(formalizeSegment(controlPoints[i], controlPoints[i + 1]));
    }
    if (ring) segments.push(formalizeSegment(controlPoints[controlPoints.length - 1], controlPoints[1]));

    const justifyEnd = (neighbourReference: Coord, shared: Coord, reference: Coord | undefined, tip: Coord) => {
        const neighbourWay = direction(neighbourReference, shared);
        if (reference) {
            return intersectPerpendicular(neighbourReference, neighbourWay, tip, direction(reference, shared));
        }
        // A tip already on its neighbour's supporting line needs no additional corner.
        if (isZero(rayDistance(neighbourReference, neighbourWay, tip))) return;
        return intersectPerpendicular(neighbourReference, neighbourWay, tip, [-neighbourWay[1], neighbourWay[0]]);
    };
    // AARC intentionally applies corrections in order, so later segments see earlier corrected interpolation.
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment.ill) continue;
        const prev = segments[i - 1];
        const next = segments[i + 1];
        let intersection: Coord | undefined;
        if (prev && next) {
            if (!prev.direct && !next.direct && prev.ill < segment.ill && next.ill < segment.ill) {
                const prevReference = prev.itp.length ? prev.itp[prev.itp.length - 1] : prev.a;
                const nextReference = next.itp.length ? next.itp[0] : next.b;
                intersection = intersectPerpendicular(
                    prevReference,
                    direction(prevReference, prev.b),
                    nextReference,
                    direction(nextReference, next.a)
                );
            }
        } else if (prev && !prev.direct && prev.ill <= segment.ill && prev.ill < 2) {
            intersection = justifyEnd(
                prev.itp.length ? prev.itp[prev.itp.length - 1] : prev.a,
                segment.a,
                segment.itp.length > 1 ? segment.itp[0] : undefined,
                segment.b
            );
        } else if (next && !next.direct && next.ill <= segment.ill && next.ill < 2) {
            intersection = justifyEnd(
                next.itp.length ? next.itp[0] : next.b,
                segment.b,
                segment.itp.length > 1 ? segment.itp[1] : undefined,
                segment.a
            );
        }
        if (intersection) segment.itp = [intersection];
    }
    const lineSegments = ring ? segments.slice(1, -1) : segments;
    return lineSegments.map((segment, index) => ({
        index,
        coordinates: [segment.a, ...segment.itp, segment.b].map(([x, y]) => [x, y]),
    }));
};

const defaultTextOp = {
    size: 10,
    color: '#000000',
};

export enum StationTypeOption {
    Beijing = 'beijing',
    Changsha = 'changsha',
    Chengdu = 'chengdu',
    Hangzhou = 'hangzhou',
    Kunming = 'kunming',
    Shanghai = 'shanghai',
    Suzhou = 'suzhou',
    Wuhan = 'wuhan',
}

export const stationTypeOptions: Record<StationTypeOption, { basic: StationType; int: StationType }> = {
    [StationTypeOption.Suzhou]: {
        basic: StationType.SuzhouRTBasic,
        int: StationType.SuzhouRTInt,
    },
    [StationTypeOption.Beijing]: {
        basic: StationType.BjsubwayBasic,
        int: StationType.BjsubwayInt,
    },
    [StationTypeOption.Shanghai]: {
        basic: StationType.ShmetroBasic,
        int: StationType.ShmetroInt,
    },
    [StationTypeOption.Kunming]: {
        basic: StationType.KunmingRTBasic,
        int: StationType.KunmingRTInt,
    },
    [StationTypeOption.Changsha]: {
        basic: StationType.CsmetroBasic,
        int: StationType.CsmetroInt,
    },
    [StationTypeOption.Chengdu]: {
        basic: StationType.ChengduRTBasic,
        int: StationType.ChengduRTInt,
    },
    [StationTypeOption.Wuhan]: {
        basic: StationType.WuhanRTBasic,
        int: StationType.WuhanRTInt,
    },
    [StationTypeOption.Hangzhou]: {
        basic: StationType.HzmetroBasic,
        int: StationType.HzmetroInt,
    },
};

const stationIds = new Map<number, StnId | MiscNodeId>();
const stationPoints = new Map<number, Point>();

const createStation = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    point: Point,
    type: StationType,
    registerPoint: boolean = true
) => {
    const id: StnId = `stn_${nanoid(10)}`;
    if (registerPoint) stationIds.set(point.id, id);
    const attr = {
        ...structuredClone(stations[type].defaultAttrs),
        names: [point.name ?? '', point.nameS ?? ''],
        nameOffsetX: point.nameP ? (point.nameP[0] > 0 ? 'right' : point.nameP[0] === 0 ? 'middle' : 'left') : 'right',
        nameOffsetY: point.nameP ? (point.nameP[1] > 0 ? 'bottom' : point.nameP[1] === 0 ? 'middle' : 'top') : 'top',
    } as ExternalStationAttributes[StationType];
    graph.addNode(id, {
        visible: true,
        zIndex: 0,
        x: point.pos[0] * ScalingFactor,
        y: point.pos[1] * ScalingFactor,
        type,
        [type]: attr,
    });
    return id;
};

interface CreateMiscNodeCommonAttrs {
    id: number;
    pos: [number, number];
}

const createMiscNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    point: CreateMiscNodeCommonAttrs,
    type: MiscNodeType,
    config: Partial<MiscNodeAttributes[MiscNodeType]> = {},
    zIndex: number = 0,
    registerPoint: boolean = true
) => {
    const id: MiscNodeId = `misc_node_${nanoid(10)}`;
    if (registerPoint) stationIds.set(point.id, id);
    const attr = {
        ...structuredClone(miscNodes[type].defaultAttrs),
        ...config,
    };
    graph.addNode(id, {
        visible: true,
        zIndex,
        x: point.pos[0] * ScalingFactor,
        y: point.pos[1] * ScalingFactor,
        type,
        [type]: attr,
    });
    return id;
};

const generateLineStyleType = (type: number, pre: number, color: string): { style: LineStyleType; theme: Theme } => {
    if (type === 0) {
        return {
            style: LineStyleType.SingleColor,
            theme: [CityCode.Other, 'other', (color as `#${string}`) || '#000000', MonoColour.white],
        };
    } else {
        if (pre === 0) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', (color as `#${string}`) || '#000000', MonoColour.white],
            };
        } else if (pre === 1) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#cccccc', MonoColour.white],
            };
        } else if (pre === 2) {
            return {
                style: LineStyleType.River,
                theme: [CityCode.Other, 'other', '#c3e5eb', MonoColour.white],
            };
        } else if (pre === 3) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#ceeda4', MonoColour.white],
            };
        } else if (pre === 4) {
            return {
                style: LineStyleType.SingleColor,
                theme: [CityCode.Other, 'other', '#ffffff', MonoColour.white],
            };
        }
    }
    return { style: LineStyleType.SingleColor, theme: [CityCode.Other, 'other', '#000000', MonoColour.white] };
};

type AarcTurnType = LinePathType.Diagonal | LinePathType.Perpendicular | LinePathType.RotatePerpendicular;
type AarcTurnAttributes = NonNullable<ExternalLinePathAttributes[AarcTurnType]>;

const aarcVector = (from: PathPoint, to: PathPoint): PathPoint => makePoint(to.x - from.x, to.y - from.y);
const aarcDot = (a: PathPoint, b: PathPoint) => a.x * b.x + a.y * b.y;
const aarcAxis = (vector: PathPoint) =>
    Math.abs(vector.x) < 1e-4 * ScalingFactor || Math.abs(vector.y) < 1e-4 * ScalingFactor;
const aarcAxisNormal = (vector: PathPoint) =>
    Math.abs(vector.x) < 1e-4 * ScalingFactor ? makePoint(1, 0) : makePoint(0, 1);
const aarcDiagonalNormal = (vector: PathPoint) =>
    makePoint(Math.SQRT1_2, -Math.SQRT1_2 * Math.sign(vector.x * vector.y));

/** Fit native RMP paths to AARC's actual supporting lines, after all interchange centres are known. */
interface AarcPathResult {
    attributes: Pick<EdgeAttributes, 'type'> & ExternalLinePathAttributes;
    expectedFrom: PathPoint;
    expectedTo: PathPoint;
    incoming: PathPoint;
    outgoing: PathPoint;
    straight: boolean;
}

const createAarcPath = (
    from: PathPoint,
    to: PathPoint,
    coordinates: [number, number][],
    line: Line,
    config: AarcSave['config']
): AarcPathResult => {
    const points = coordinates.map(([x, y]) => makePoint(x * ScalingFactor, y * ScalingFactor));
    const first = points[0];
    const last = points[points.length - 1];
    const incoming = aarcVector(first, points[1]);
    const outgoing = aarcVector(points[points.length - 2], last);
    const straight = points.length === 2;
    const firstAxis = aarcAxis(incoming);
    const lastAxis = aarcAxis(outgoing);
    const type: AarcTurnType = straight
        ? firstAxis
            ? LinePathType.Perpendicular
            : LinePathType.RotatePerpendicular
        : firstAxis && lastAxis
          ? LinePathType.Perpendicular
          : !firstAxis && !lastAxis
            ? LinePathType.RotatePerpendicular
            : LinePathType.Diagonal;
    const startFrom: 'from' | 'to' =
        type === LinePathType.Diagonal
            ? firstAxis
                ? 'from'
                : 'to'
            : type === LinePathType.Perpendicular
              ? Math.abs(incoming.y) < 1e-4 * ScalingFactor
                  ? 'from'
                  : 'to'
              : incoming.x * incoming.y > 0
                ? 'from'
                : 'to';
    const width = line.width || 1;
    let radius =
        ((config.lineTurnAreaRadius ?? 30) * (line.type === 0 ? width : 1) + ((config.lineWidth ?? 14) * width) / 2) *
        ScalingFactor;
    if (!straight) {
        const cosine =
            aarcDot(incoming, outgoing) / (Math.hypot(incoming.x, incoming.y) * Math.hypot(outgoing.x, outgoing.y));
        const turn45Ratio = 2.4142135 * 0.618;
        if (Math.abs(cosine - Math.SQRT1_2) < 1e-6) radius /= turn45Ratio;
        else if (Math.abs(cosine + Math.SQRT1_2) < 1e-6) radius *= turn45Ratio;
    }
    const offset = (original: PathPoint, centre: PathPoint, normal: PathPoint) =>
        aarcDot(aarcVector(centre, original), normal);

    let fromNormal: PathPoint;
    let toNormal: PathPoint;
    if (straight) {
        fromNormal = toNormal = firstAxis ? aarcAxisNormal(incoming) : aarcDiagonalNormal(incoming);
    } else if (type === LinePathType.RotatePerpendicular) {
        [fromNormal, toNormal] =
            startFrom === 'from'
                ? [makePoint(-Math.SQRT1_2, Math.SQRT1_2), makePoint(Math.SQRT1_2, Math.SQRT1_2)]
                : [makePoint(Math.SQRT1_2, Math.SQRT1_2), makePoint(-Math.SQRT1_2, Math.SQRT1_2)];
    } else {
        fromNormal = firstAxis ? aarcAxisNormal(incoming) : aarcDiagonalNormal(incoming);
        toNormal = lastAxis ? aarcAxisNormal(outgoing) : aarcDiagonalNormal(outgoing);
    }
    const fromOffset = offset(first, from, fromNormal);
    const toOffset = offset(last, to, toNormal);
    // The current Perpendicular/RoPerp 'to' generator exchanges the endpoint offset fields.
    const swap = !straight && type !== LinePathType.Diagonal && startFrom === 'to';
    const attributes: AarcTurnAttributes = {
        startFrom,
        offsetFrom: swap ? toOffset : fromOffset,
        offsetTo: swap ? fromOffset : toOffset,
        roundCornerFactor: radius,
    };
    const shifted = (centre: PathPoint, normal: PathPoint, value: number) =>
        makePoint(centre.x + normal.x * value, centre.y + normal.y * value);
    const diagonal = Math.abs(Math.abs(incoming.x) - Math.abs(incoming.y)) < 1e-4 * ScalingFactor;
    const pathAttributes: Pick<EdgeAttributes, 'type'> & ExternalLinePathAttributes =
        straight && !firstAxis && !diagonal
            ? { type: LinePathType.Simple, [LinePathType.Simple]: { offset: 0 } }
            : { type, [type]: { ...attributes, roundCornerFactor: straight ? 0 : radius } };
    return {
        attributes: pathAttributes,
        expectedFrom: shifted(from, fromNormal, fromOffset),
        expectedTo: shifted(to, toNormal, toOffset),
        incoming,
        outgoing,
        straight,
    };
};

/** Validate the exact existing renderer, including its legacy auto-simple offset inference. */
const aarcPathFits = (from: PathPoint, to: PathPoint, result: AarcPathResult): boolean => {
    const type = result.attributes.type;
    const attrs = result.attributes[type]!;
    const simple = checkSimplePathAvailability(type, from.x, from.y, to.x, to.y, attrs);
    const path = simple
        ? linePaths[LinePathType.Simple].generatePath(simple.x1, simple.x2, simple.y1, simple.y2, {
              offset: simple.offset,
          })
        : type === LinePathType.Simple
          ? linePaths[type].generatePath(from.x, to.x, from.y, to.y, result.attributes[type])
          : linePaths[type as AarcTurnType].generatePath(from.x, to.x, from.y, to.y, attrs as AarcTurnAttributes);
    if (!isOpenPath(path)) return false;
    const epsilon = 1e-4 * ScalingFactor;
    const close = (a: PathPoint, b: PathPoint) => Math.hypot(a.x - b.x, a.y - b.y) <= epsilon;
    if (!close(getStartPoint(path), result.expectedFrom) || !close(getEndPoint(path), result.expectedTo)) return false;
    const controlPoints = path.commands.flatMap(command =>
        command.cmd === 'C' ? [command.c1, command.c2, command.to] : [command.to]
    );
    const distanceToLine = (point: PathPoint, origin: PathPoint, tangent: PathPoint) => {
        const delta = aarcVector(origin, point);
        return Math.abs(delta.x * tangent.y - delta.y * tangent.x) / Math.hypot(tangent.x, tangent.y);
    };
    if (result.straight)
        return controlPoints.every(point => distanceToLine(point, result.expectedFrom, result.incoming) <= epsilon);
    const first = controlPoints.find(point => !close(point, result.expectedFrom));
    const last = [...controlPoints].reverse().find(point => !close(point, result.expectedTo));
    return (
        !!first &&
        !!last &&
        distanceToLine(first, result.expectedFrom, result.incoming) <= epsilon &&
        distanceToLine(last, result.expectedTo, result.outgoing) <= epsilon
    );
};

/** Only anonymous, unshared drawing bends may disappear; stations and section boundaries retain their identity. */
const getRemovableAarcBends = (save: AarcSave): Set<number> => {
    const occurrences = new Map<number, number>();
    save.lines.forEach(line => line.pts.forEach(id => occurrences.set(id, (occurrences.get(id) ?? 0) + 1)));
    const linked = new Set(save.pointLinks?.flatMap(link => link.pts));
    return new Set(
        save.points
            .filter(
                point =>
                    point.sta !== 1 &&
                    !point.name &&
                    !point.nameS &&
                    !point.free &&
                    !linked.has(point.id) &&
                    occurrences.get(point.id) === 1
            )
            .map(point => point.id)
    );
};

interface AarcDrawingSegment {
    fromIndex: number;
    toIndex: number;
    coordinates: [number, number][];
}

/** Normalize anonymous corner handles without touching graph nodes, so merge preflight sees the final geometry. */
const getAarcDrawingGeometry = (
    line: Line,
    removableBends: Set<number>,
    timeSlices?: TimeSlice[]
): AarcDrawingSegment[] => {
    const geometry = getAarcLineGeometry(line, stationPoints).map(segment => ({
        fromIndex: segment.index,
        toIndex: segment.index + 1,
        coordinates: segment.coordinates.filter(
            ([x, y], i, points) => i === 0 || Math.hypot(x - points[i - 1][0], y - points[i - 1][1]) > 1e-4
        ),
    }));
    const boundaries = new Set(
        getAarcTimeSpans(line, timeSlices)
            .slice(0, -1)
            .map(span => span.toIndex)
    );
    if (!line.isFilled) {
        for (let i = 0; i < geometry.length - 1; i++) {
            const current = geometry[i];
            const next = geometry[i + 1];
            const pointId = line.pts[current.toIndex];
            if (
                !removableBends.has(pointId) ||
                boundaries.has(current.toIndex) ||
                ![2, 3].includes(current.coordinates.length) ||
                next.coordinates.length !== 2
            )
                continue;
            const a = current.coordinates.at(-2)!;
            const corner = current.coordinates.at(-1)!;
            const b = next.coordinates[1];
            const first = makePoint(corner[0] - a[0], corner[1] - a[1]);
            const last = makePoint(b[0] - corner[0], b[1] - corner[1]);
            if (
                Math.abs(aarcDot(first, last)) > 1e-4 ||
                Math.hypot(first.x, first.y) < 1e-4 ||
                Math.hypot(last.x, last.y) < 1e-4
            )
                continue;
            if (current.coordinates.length === 3) {
                // Adjacent anonymous corners need two native turns. Move the retained handle to their straight join.
                const middle: [number, number] = [(a[0] + corner[0]) / 2, (a[1] + corner[1]) / 2];
                current.coordinates[2] = middle;
                next.coordinates = [middle, corner, b];
                continue;
            }
            current.toIndex = next.toIndex;
            current.coordinates = [a, corner, b];
            geometry.splice(i + 1, 1);
            i--;
        }
    }
    return geometry;
};

const createLine = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    line: Line,
    removableBends: Set<number>,
    config: AarcSave['config'],
    timeSlices: TimeSlice[] | undefined
) => {
    const { style, theme } = generateLineStyleType(line.type, line.colorPre ?? 0, line.color);
    const segments: LineId[][] = Array.from({ length: Math.max(0, line.pts.length - 1) }, () => []);
    if (line.pts.length < 2) return segments;
    const pointIds = new Map(stationIds);
    const geometry = getAarcDrawingGeometry(line, removableBends, timeSlices);
    for (const segment of geometry) {
        for (const [pointId, coordinate] of [
            [line.pts[segment.fromIndex], segment.coordinates[0]],
            [line.pts[segment.toIndex], segment.coordinates.at(-1)!],
        ] as [number, [number, number]][]) {
            const id = pointIds.get(pointId);
            if (id && removableBends.has(pointId)) {
                graph.mergeNodeAttributes(id, { x: coordinate[0] * ScalingFactor, y: coordinate[1] * ScalingFactor });
            }
        }
        for (let i = segment.fromIndex + 1; i < segment.toIndex; i++) {
            const pointId = line.pts[i];
            const id = pointIds.get(pointId);
            if (id && graph.hasNode(id)) graph.dropNode(id);
            stationIds.delete(pointId);
            pointIds.delete(pointId);
        }
    }
    if (line.isFilled) {
        const fillId = createMiscNode(
            graph,
            stationPoints.get(line.pts[0])!,
            MiscNodeType.Fill,
            { color: theme, opacity: 1 },
            line.zIndex ?? -1,
            false
        );
        pointIds.set(line.pts[0], fillId);
    }
    const addEdge = (source: string, target: string, coordinates: [number, number][], indices: number[]) => {
        if (source === target || coordinates.length < 2) return;
        const id: LineId = `line_${nanoid(10)}`;
        graph.addDirectedEdgeWithKey(id, source, target, {
            visible: true,
            zIndex: line.zIndex ?? 0,
            ...createAarcPath(
                graph.getNodeAttributes(source),
                graph.getNodeAttributes(target),
                coordinates,
                line,
                config
            ).attributes,
            style,
            [style]: { color: theme },
            reconcileId: '',
            parallelIndex: -1,
        });
        indices.forEach(index => segments[index].push(id));
        changeNodesColorInBatch(
            graph,
            'any',
            theme,
            [source, target].filter(id => id.startsWith('stn_')) as StnId[],
            []
        );
    };
    for (const segment of geometry) {
        const source = pointIds.get(line.pts[segment.fromIndex])!;
        const target = pointIds.get(line.pts[segment.toIndex])!;
        if (source === target) continue;
        const indices = Array.from({ length: segment.toIndex - segment.fromIndex }, (_, i) => segment.fromIndex + i);
        if (segment.coordinates.length === 4) {
            // A genuine two-corner S bend still needs a connection handle, placed on its straight middle leg.
            const [a, firstCorner, lastCorner, b] = segment.coordinates;
            const middle: [number, number] = [
                (firstCorner[0] + lastCorner[0]) / 2,
                (firstCorner[1] + lastCorner[1]) / 2,
            ];
            const midId = createMiscNode(graph, { id: 0, pos: middle }, MiscNodeType.Virtual, {}, 0, false);
            addEdge(source, midId, [a, firstCorner, middle], indices);
            addEdge(midId, target, [middle, lastCorner, b], indices);
        } else {
            addEdge(source, target, segment.coordinates, indices);
        }
    }
    if (line.isFilled && line.pts.at(-1) !== line.pts[0]) {
        const last = stationPoints.get(line.pts.at(-1)!)!;
        const first = stationPoints.get(line.pts[0])!;
        addEdge(pointIds.get(last.id)!, pointIds.get(first.id)!, [last.pos, first.pos], [segments.length - 1]);
    }
    return segments;
};

const createInterchange = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    index: number,
    ids: StnId[],
    stationTypeOption: StationTypeOption
) => {
    let sumX = 0;
    let sumY = 0;
    const primaryNames = new Set<string>();
    const secondaryNames = new Set<string>();
    ids.forEach(id => {
        sumX += graph.getNodeAttribute(id, 'x');
        sumY += graph.getNodeAttribute(id, 'y');
        const type = graph.getNodeAttribute(id, 'type') as StationType;
        const names = graph.getNodeAttributes(id)[type]!.names;
        if (names[0]) primaryNames.add(names[0]);
        if (names[1]) secondaryNames.add(names[1]);
    });
    const centerX = sumX / ids.length;
    const centerY = sumY / ids.length;
    const intId = createStation(
        graph,
        {
            id: 1e8 + index,
            name: [...primaryNames].join('/'),
            nameS: [...secondaryNames].join('/'),
            pos: [centerX / ScalingFactor, centerY / ScalingFactor],
            dir: 0,
            sta: 1,
        },
        stationTypeOptions[stationTypeOption].int,
        false
    );
    ids.forEach(id => {
        graph.dropNode(id);
    });
    // Retain each AARC endpoint's identity after collapsing an interchange.
    const merged = new Set(ids);
    for (const [pointId, nodeId] of stationIds) {
        if (merged.has(nodeId as StnId)) stationIds.set(pointId, intId);
    }
    return intId;
};

/** AARC clusters station points by distance and their largest line-defined snap size. */
const getAarcStationClinging = (save: AarcSave) => {
    const sizes = new Map<number, number>();
    for (const line of save.lines) {
        if (line.type !== 0 && line.type !== 1) continue;
        const width = line.width || 1;
        const mapped = Object.entries(save.config.lineWidthMapped ?? {}).find(
            ([key]) => Math.abs(parseFloat(key) - width) < 1e-4
        )?.[1];
        const size =
            line.type === 1
                ? Math.min(width, 1)
                : line.ptSnapSize && line.ptSnapSize > 0
                  ? line.ptSnapSize
                  : mapped?.staSnapSize !== undefined
                    ? mapped.staSnapSize
                    : line.ptSize && line.ptSize > 0
                      ? line.ptSize
                      : mapped?.staSize || width;
        for (const id of line.pts) sizes.set(id, Math.max(sizes.get(id) ?? -Infinity, size));
    }
    const points = new Map([...stationIds].map(([pointId, nodeId]) => [nodeId, stationPoints.get(pointId)!]));
    const baseDistance = save.config.snapOctaClingPtPtDist ?? 25;
    return (from: StnId, to: StnId): boolean => {
        if (baseDistance <= 0) return false;
        const a = points.get(from)!;
        const b = points.get(to)!;
        const dx = a.pos[0] - b.pos[0];
        const dy = a.pos[1] - b.pos[1];
        // Match AARC's standard-position neighbour scan and its floating-point tolerance.
        if (Math.abs(dx) > 2.5 * baseDistance || Math.abs(dy) > 2.5 * baseDistance) return false;
        const distance = (baseDistance * ((sizes.get(a.id) ?? 1) + (sizes.get(b.id) ?? 1))) / 2;
        return dx * dx + dy * dy < (distance + 0.001) ** 2;
    };
};

const findInterchangeGroups = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    clinging: (from: StnId, to: StnId) => boolean
) => {
    const groups = new Map<StnId, StnId[]>();
    const stnNodes = [...new Set(stationIds.values())].filter(id => id.startsWith('stn')) as StnId[];
    const visited = new Set<StnId>();
    const adj = new Map<StnId, StnId[]>();

    for (let i = 0; i < stnNodes.length; i++) {
        const u = stnNodes[i];
        for (let j = i + 1; j < stnNodes.length; j++) {
            const v = stnNodes[j];
            if (clinging(u, v)) {
                if (!adj.has(u)) adj.set(u, []);
                if (!adj.has(v)) adj.set(v, []);
                adj.get(u)!.push(v);
                adj.get(v)!.push(u);
            }
        }
    }

    stnNodes.forEach(u => {
        if (!visited.has(u) && adj.has(u)) {
            const group: StnId[] = [];
            const queue = [u];
            visited.add(u);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                group.push(curr);
                adj.get(curr)!.forEach(v => {
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                });
            }
            groups.set(u, group);
        }
    });

    return groups;
};

/** Keep station members separate whenever existing RMP offsets cannot preserve their incident paths. */
const planAarcInterchanges = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    groups: Map<StnId, StnId[]>,
    save: AarcSave,
    removableBends: Set<number>,
    clinging: (from: StnId, to: StnId) => boolean
) => {
    const rawPointIds = new Map([...stationIds].map(([pointId, nodeId]) => [nodeId, pointId]));
    const candidates = [...groups.values()].map(ids => ({
        ids,
        active: true,
        centre: makePoint(
            ids.reduce((sum, id) => sum + graph.getNodeAttribute(id, 'x'), 0) / ids.length,
            ids.reduce((sum, id) => sum + graph.getNodeAttribute(id, 'y'), 0) / ids.length
        ),
    }));
    const byPoint = new Map(candidates.flatMap(group => group.ids.map(id => [rawPointIds.get(id)!, group] as const)));
    const drawings = save.lines.map(line => ({
        line,
        geometry: getAarcDrawingGeometry(line, removableBends, save.timeSlices),
    }));
    const scaled = ([x, y]: [number, number]) => makePoint(x * ScalingFactor, y * ScalingFactor);
    let changed = true;
    while (changed) {
        changed = false;
        for (const { line, geometry } of drawings) {
            for (const segment of geometry) {
                if (segment.coordinates.length < 2) continue;
                const sourceGroup = byPoint.get(line.pts[segment.fromIndex]);
                const targetGroup = byPoint.get(line.pts[segment.toIndex]);
                if (sourceGroup?.active && sourceGroup === targetGroup) continue;
                const from = sourceGroup?.active ? sourceGroup.centre : scaled(segment.coordinates[0]);
                const to = targetGroup?.active ? targetGroup.centre : scaled(segment.coordinates.at(-1)!);
                const fits = (a: PathPoint, b: PathPoint, coordinates: [number, number][]) =>
                    aarcPathFits(a, b, createAarcPath(a, b, coordinates, line, save.config));
                let valid: boolean;
                if (segment.coordinates.length === 4) {
                    const [a, firstCorner, lastCorner, b] = segment.coordinates;
                    const middle: [number, number] = [
                        (firstCorner[0] + lastCorner[0]) / 2,
                        (firstCorner[1] + lastCorner[1]) / 2,
                    ];
                    valid =
                        fits(from, scaled(middle), [a, firstCorner, middle]) &&
                        fits(scaled(middle), to, [middle, lastCorner, b]);
                } else {
                    valid = fits(from, to, segment.coordinates);
                }
                if (!valid) {
                    for (const group of [sourceGroup, targetGroup]) {
                        if (group?.active) {
                            group.active = false;
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    // Link retained members along their original adjacency, using the existing free interchange style.
    const links = [...(save.pointLinks ?? [])];
    const existing = new Set(links.map(link => [...link.pts].sort((a, b) => a - b).join('/')));
    for (const group of candidates.filter(group => !group.active)) {
        const visited = new Set([group.ids[0]]);
        const pending = [group.ids[0]];
        for (let i = 0; i < pending.length; i++) {
            for (const id of group.ids) {
                if (visited.has(id)) continue;
                if (!clinging(pending[i], id)) continue;
                visited.add(id);
                pending.push(id);
                const pts: [number, number] = [rawPointIds.get(pending[i])!, rawPointIds.get(id)!];
                const key = [...pts].sort((a, b) => a - b).join('/');
                if (!existing.has(key)) {
                    links.push({ pts, type: 0 });
                    existing.add(key);
                }
            }
        }
    }
    save.pointLinks = links;
    return candidates.filter(group => group.active).map(group => group.ids);
};

/** Resolve names after interchange collapse, so linked points can also reach names elsewhere in a station group. */
const populateLinkedStationNames = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    save: AarcSave
) => {
    const neighbours = new Map<string, string[]>();
    for (const link of save.pointLinks ?? []) {
        const from = stationIds.get(link.pts[0]);
        const to = stationIds.get(link.pts[1]);
        if (!from || !to || from === to) continue;
        neighbours.set(from, [...(neighbours.get(from) ?? []), to]);
        neighbours.set(to, [...(neighbours.get(to) ?? []), from]);
    }
    const names = (id: string) => {
        const attributes = graph.getNodeAttributes(id);
        return (attributes[attributes.type] as { names?: string[] }).names;
    };
    // Resolve against the original names so traversal order cannot change the nearest named station.
    const originalNames = new Map(graph.nodes().map(id => [id, names(id)]));
    for (const id of graph.nodes().filter(id => id.startsWith('stn_'))) {
        const ownNames = originalNames.get(id)!;
        if (ownNames[0]) continue;
        const pending = [id];
        const visited = new Set(pending);
        for (let i = 0; i < pending.length; i++) {
            const candidate = originalNames.get(pending[i]);
            if (candidate?.[0]) {
                const type = graph.getNodeAttribute(id, 'type') as StationType;
                graph.setNodeAttribute(id, type, {
                    ...graph.getNodeAttribute(id, type)!,
                    names: [candidate[0], ownNames[1] || candidate[1] || ''],
                });
                break;
            }
            for (const next of neighbours.get(pending[i]) ?? []) {
                if (visited.has(next)) continue;
                visited.add(next);
                pending.push(next);
            }
        }
    }
};

/** Native free interchange styles approximate AARC's links; distant stations remain separate. */
const createPointLinks = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    save: AarcSave
) => {
    for (const link of save.pointLinks ?? []) {
        const source = stationIds.get(link.pts[0]);
        const target = stationIds.get(link.pts[1]);
        if (!source || !target || source === target || link.type < 0 || link.type > 4) continue;
        const style =
            link.type === 0
                ? LineStyleType.ShmetroVirtualInt
                : link.type === 2 || link.type === 3
                  ? LineStyleType.GzmtrVirtualInt
                  : LineStyleType.MTRPaidArea;
        // These styles carry no railway theme, so reconciliation never claims the links as lines.
        graph.addDirectedEdgeWithKey(`line_${nanoid(10)}`, source, target, {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: structuredClone(linePaths[LinePathType.Simple].defaultAttrs),
            style,
            [style]: structuredClone(lineStyles[style].defaultAttrs),
            reconcileId: '',
            parallelIndex: -1,
        });
    }
};

const createTextTag = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    p: CreateMiscNodeCommonAttrs,
    text: string,
    textOp: Exclude<TextTag['textOp'], undefined>,
    anchorX: number,
    anchorY: number,
    globalFontBase: number,
    theme?: Theme
) => {
    const attr: MiscNodeAttributes[MiscNodeType.Text] = {
        content: text,
        color: theme ?? [CityCode.Other, 'other', (textOp.color as `#${string}`) || '#000000', MonoColour.white],
        fontSize: 30 * (textOp.size || 1) * globalFontBase * 1.2 * ScalingFactor,
        lineHeight: 30 * (textOp.size || 1) * globalFontBase * 1.2 * ScalingFactor,
        textAnchor: anchorX === 0 ? 'middle' : anchorX === 1 ? 'start' : 'end',
        dominantBaseline: anchorY === 0 ? 'central' : anchorY === 1 ? 'hanging' : 'text-before-edge',
        language: TextLanguage.en,
        rotate: 0,
        italic: textOp.i || textOp.style === 'italic' ? 'italic' : 'normal',
        bold: textOp.b || textOp.weight === 'bold' || Number(textOp.weight) >= 600 ? 'bold' : 'normal',
        outline: 0,
    };
    createMiscNode(graph, p, MiscNodeType.Text, attr, 0, false);
};

const handleTextTag = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    tag: TextTag,
    config: AarcSave['config'],
    theme?: Theme
) => {
    const p1: CreateMiscNodeCommonAttrs = { id: tag.id, pos: tag.pos };
    const p2: CreateMiscNodeCommonAttrs = { id: tag.id + 1e9, pos: tag.pos };
    const t1 = tag.text?.trim();
    const t2 = tag.textS?.trim();
    if (t1) {
        createTextTag(
            graph,
            p1,
            tag.text ?? '',
            tag.textOp ?? defaultTextOp,
            tag.anchorX ?? 0,
            tag.anchorY ?? 0,
            config.textTagPlain && config.textTagPlain.fontSize ? config.textTagPlain.fontSize : 1,
            theme
        );
    }
    if (t2) {
        createTextTag(
            graph,
            p2,
            tag.textS ?? '',
            tag.textSOp ?? defaultTextOp,
            tag.anchorX ?? 0,
            tag.anchorY ?? 0,
            config.textTagPlain && config.textTagPlain.subFontSize ? config.textTagPlain.subFontSize : 1,
            theme
        );
    }
};

const isAarcSave = (data: any): data is AarcSave => {
    return (
        data &&
        typeof data === 'object' &&
        typeof data.idIncre === 'number' &&
        Array.isArray(data.points) &&
        Array.isArray(data.lines) &&
        Array.isArray(data.textTags) &&
        Array.isArray(data.cvsSize) &&
        data.config &&
        typeof data.config === 'object'
    );
};

const createLineDefinitions = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    save: AarcSave,
    lineSegments: Map<number, LineId[][]>
) => {
    const snapshot = graph.export();
    const edges = new Map(snapshot.edges.map(edge => [edge.key!, edge]));
    const unassigned: string[] = [];
    const definitions = save.lines.flatMap(line => {
        const segments = lineSegments.get(line.id) ?? [];
        if (line.type !== 0 || line.isFake || line.isFilled) {
            unassigned.push(...segments.flat());
            return [];
        }
        return getAarcTimeSpans(line, save.timeSlices).flatMap(span => {
            const ids = segments.slice(span.fromIndex, span.toIndex).flat();
            const components = lineEdgeComponents(ids.flatMap(id => (edges.has(id) ? [edges.get(id)!] : [])));
            const metadata = getAarcTimeMetadata(span.time);
            const group = save.lineGroups?.find(group => group.id === line.group);
            const parent = save.lines.find(parent => parent.id === line.parent);
            const notes = [
                metadata.notes,
                group?.name ? `AARC group: ${group.name}` : '',
                parent ? `AARC parent: ${parent.name || parent.id}` : '',
            ]
                .filter(Boolean)
                .join('\n');
            // A date may occur in disconnected sections. Each keeps its metadata through reconciliation.
            return components.map(edgeIds => {
                const definition = {
                    ...emptyLineDefinition(edgeIds),
                    ...metadata,
                    name: [line.name || '', line.nameSub || ''] as [string, string],
                    notes,
                };
                const topology = getLineTopology(snapshot, definition);
                definition.exportStartStationId =
                    line.pts
                        .slice(span.fromIndex, span.toIndex + 1)
                        .map(id => stationIds.get(id))
                        .find(id => id && topology.startCandidates.includes(id)) ??
                    topology.startCandidates[0] ??
                    '';
                return definition;
            });
        });
    });
    graph.replaceAttributes({ lineDefinitions: definitions, unassignedLineEdgeIds: unassigned });
    graph.replaceAttributes(reconcileLineDefinitions(graph.export()).attributes!);
};

export const convertAARCToRmp = (
    aarc: string,
    targetGraph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    stationTypeOption: StationTypeOption = StationTypeOption.Suzhou
) => {
    stationIds.clear();
    stationPoints.clear();
    const aarcSave = JSON.parse(aarc);

    if (!isAarcSave(aarcSave)) {
        throw new Error('Invalid AARC save data');
    }
    aarcSave.lines = normalizeAarcLines(aarcSave.lines);
    // Build off-canvas so an invalid file cannot partially replace the caller's graph.
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

    // Create stations and virtual nodes.
    aarcSave.points.forEach(point => {
        stationPoints.set(point.id, point);
        if (point.sta === 1) {
            createStation(graph, point, stationTypeOptions[stationTypeOption].basic);
        } else {
            createMiscNode(graph, point, MiscNodeType.Virtual);
        }
    });

    // Establish every station centre before deriving path directions and signed endpoint offsets.
    const removableBends = getRemovableAarcBends(aarcSave);
    const clinging = getAarcStationClinging(aarcSave);
    const groups = planAarcInterchanges(
        graph,
        findInterchangeGroups(graph, clinging),
        aarcSave,
        removableBends,
        clinging
    );
    const importedInterchanges = new Set<StnId>();
    let index = 0;
    groups.forEach(ids => {
        importedInterchanges.add(createInterchange(graph, index, ids, stationTypeOption));
        index++;
    });
    const lineSegments = new Map(
        aarcSave.lines.map(line => [
            line.id,
            createLine(graph, line, removableBends, aarcSave.config, aarcSave.timeSlices),
        ])
    );
    populateLinkedStationNames(graph, aarcSave);
    createLineDefinitions(graph, aarcSave, lineSegments);
    createPointLinks(graph, aarcSave);

    // Create text tags.
    aarcSave.textTags.forEach(tag => {
        if (tag.forId === undefined) {
            handleTextTag(graph, tag, aarcSave.config);
        } else {
            const forId = tag.forId!;
            const line = aarcSave.lines.find(l => l.id === forId);
            if (line) {
                const { theme } = generateLineStyleType(line.type, line.colorPre ?? 0, line.color);
                if (line.type === 1) {
                    handleTextTag(graph, tag, aarcSave.config, theme);
                } else {
                    createMiscNode(
                        graph,
                        { id: tag.id, pos: tag.pos },
                        MiscNodeType.GzmtrLineBadge,
                        {
                            names: [tag.text ?? (line.name || ''), tag.textS ?? (line.nameSub || '')],
                            color: theme,
                        },
                        0,
                        false
                    );
                }
            }
        }
    });

    // Update station types and populate transfers.
    new Set(stationIds.values()).forEach(id => {
        if (graph.hasNode(id) && id.startsWith('stn')) {
            // An explicit AARC station cluster remains an interchange even when its parallel lines share a colour.
            if (!importedInterchanges.has(id as StnId)) autoUpdateStationType(graph, id as StnId);
            autoPopulateTransfer(graph, id as StnId);
        }
    });
    targetGraph.clear();
    targetGraph.import(graph);
    // Graphology's instance import omits graph attributes.
    targetGraph.replaceAttributes(graph.getAttributes());
};
