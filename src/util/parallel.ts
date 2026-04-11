import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType } from '../constants/lines';
import { OpenPath, makeLinearPath, makePoint } from '../constants/path';
import { makeShortPathParallel } from './bezier-parallel';
import { isShortOpenPath } from './path';

type ParallelLinePathType = Exclude<LinePathType, LinePathType.Simple | LinePathType.RayGuided>;
export type ParallelLinePathAttributes = NonNullable<ExternalLinePathAttributes[ParallelLinePathType]>;

const MIN_ROUND_CORNER_FACTOR = 1;

export const supportsParallelLinePath = (type: LinePathType): type is ParallelLinePathType =>
    type !== LinePathType.Simple && type !== LinePathType.RayGuided;

/**
 * Classify all the lines between source and target of the provided line
 * into lines that should be parallel to the provided line and lines that should not.
 * Based on parallelIndex, type, and path grouping attributes of the provided line.
 * @param graph The graph.
 * @param baseLineEntry The base line entry.
 * @returns An object containing normal and parallel lines.
 */
export const classifyParallelLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    baseLineEntry: EdgeEntry<NodeAttributes, EdgeAttributes>
) => {
    const { type: baseType, parallelIndex: baseParallelIndex } = baseLineEntry.attributes;
    // safe guard for invalid cases
    if (!supportsParallelLinePath(baseType) || baseParallelIndex < 0) {
        return { normal: [baseLineEntry], parallel: [] };
    }

    const { source, target, attributes } = baseLineEntry;
    const { startFrom: baseStartFrom } = attributes[baseType] as ParallelLinePathAttributes;
    const normal: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    for (const lineEntry of graph.edgeEntries(source, target)) {
        const { type, parallelIndex } = lineEntry.attributes;

        if (!supportsParallelLinePath(type) || parallelIndex < 0) {
            normal.push(lineEntry);
            continue;
        }

        if (checkParallels(baseType, source as NodeId, baseStartFrom, lineEntry)) {
            parallelLines.push(lineEntry);
        }
    }

    return { normal, parallel: parallelLines };
};

/**
 * Not sure how to make bezier-js.scale(positive number) always on the outer side,
 * so just find all the cases that the parallel curves will be in side and flip them.
 */
const checkPathFlip = (type: LinePathType, x1: number, y1: number, x2: number, y2: number) => {
    let pathFlip = false;
    if (type === LinePathType.Diagonal) {
        if (
            (Math.abs(x2 - x1) < Math.abs(y2 - y1) && ((x2 < x1 && y2 < y1) || (x2 > x1 && y2 > y1))) ||
            (Math.abs(x2 - x1) > Math.abs(y2 - y1) && ((x2 > x1 && y2 < y1) || (x2 < x1 && y2 > y1)))
        ) {
            pathFlip = true;
        }
    } else if (type === LinePathType.Perpendicular) {
        if ((x2 > x1 && y2 < y1) || (x2 < x1 && y2 > y1)) {
            pathFlip = true;
        }
    } else if (type === LinePathType.RotatePerpendicular) {
        const [rx1, ry1, rx2, ry2] = [
            x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
            -x1 * Math.SQRT1_2 + y1 * Math.SQRT1_2,
            x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
            -x2 * Math.SQRT1_2 + y2 * Math.SQRT1_2,
        ];
        if ((rx2 > rx1 && ry2 < ry1) || (rx2 < rx1 && ry2 > ry1)) {
            pathFlip = true;
        }
    }
    return pathFlip;
};

export const makeParallelPaths = (parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[]) => {
    let baseLineEntry = parallelLines.at(0);
    if (!baseLineEntry) return {};
    for (const lineEntry of parallelLines) {
        if (lineEntry.attributes.parallelIndex < baseLineEntry.attributes.parallelIndex) {
            baseLineEntry = lineEntry;
        }
    }
    const type = baseLineEntry.attributes.type;
    const attr = baseLineEntry.attributes[type] as ParallelLinePathAttributes;
    const baseRoundCornerFactor = Math.max(MIN_ROUND_CORNER_FACTOR, attr.roundCornerFactor);

    const [x1, y1, x2, y2] = [
        baseLineEntry.sourceAttributes.x,
        baseLineEntry.sourceAttributes.y,
        baseLineEntry.targetAttributes.x,
        baseLineEntry.targetAttributes.y,
    ];
    const basePath = linePaths[type].generatePath(x1, x2, y1, y2, {
        ...attr,
        roundCornerFactor: baseRoundCornerFactor,
    } as any);
    // console.log(basePath, x1, y1, x2, y2);

    const pathFlip = checkPathFlip(type, x1, y1, x2, y2);

    const parallelPaths: { [k in LineId]: OpenPath } = {};
    for (const lineEntry of parallelLines) {
        const parallelIndex = lineEntry.attributes.parallelIndex > 0 ? lineEntry.attributes.parallelIndex : 0;

        // early return for already computed path
        if (parallelIndex === 0) {
            parallelPaths[lineEntry.edge as LineId] = basePath;
            continue;
        }

        const d = parallelIndex * 5;
        const defaultSimpleParallelPath = [
            makeLinearPath(makePoint(x1, y1 + d), makePoint(x2, y2 + d)),
            makeLinearPath(makePoint(x1, y1 - d), makePoint(x2, y2 - d)),
        ] as const;
        const [pathA, pathB] =
            (isShortOpenPath(basePath) ? makeShortPathParallel(basePath, d) : undefined) ?? defaultSimpleParallelPath;

        parallelPaths[lineEntry.edge as LineId] = pathFlip ? pathA : pathB;
    }

    return parallelPaths;
};

/**
 * Check if the given lineEntry is in the same parallel group as the baseLineEntry.
 * Which are either (source, target, from) or (target, source, to) for startFrom-based paths.
 * Base line entry is determined by type, source, and startFrom.
 * @param type The base line type.
 * @param source The base line source.
 * @param startFrom The base line startFrom.
 * @param lineEntry The line entry to check.
 * @returns Whether the lineEntry is in the same parallel group as the baseLineEntry.
 */
const checkParallels = (
    type: ParallelLinePathType,
    source: NodeId,
    startFrom: 'from' | 'to',
    lineEntry: EdgeEntry<NodeAttributes, EdgeAttributes>
) => {
    const lineEntryType = lineEntry.attributes.type;
    if (!supportsParallelLinePath(lineEntryType)) return false;

    if (type !== lineEntryType) return false;

    const { startFrom: lineEntryStartFrom } = lineEntry.attributes[lineEntryType] as ParallelLinePathAttributes;
    if (source === lineEntry.source && startFrom === lineEntryStartFrom) {
        return true;
    } else if (
        // edgeEntries will also return edges from target to source
        source === lineEntry.target &&
        startFrom !== lineEntryStartFrom
    ) {
        return true;
    }
    return false;
};

export const makeParallelIndex = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    type: LinePathType,
    source: NodeId,
    target: NodeId,
    startFrom: 'from' | 'to'
) => {
    if (!supportsParallelLinePath(type)) return -1;

    // find all parallel lines that are either (source, target, from) or (target, source, to)
    const existingParallelIndex: number[] = [];
    for (const lineEntry of graph.edgeEntries(source, target)) {
        if (checkParallels(type, source, startFrom, lineEntry)) {
            existingParallelIndex.push(lineEntry.attributes.parallelIndex);
        }
    }

    // find the smallest missing non-negative integers
    existingParallelIndex.sort();
    let parallelIndex = 0;
    for (const i of existingParallelIndex) {
        if (i > parallelIndex) {
            break;
        }
        parallelIndex = i + 1;
    }
    return parallelIndex;
};

/**
 * Return the base parallel line if the provided line is not the base parallel line, otherwise itself.
 * @param graph The graph.
 * @param type The line type.
 * @param lineID The id of the line.
 * @returns Base parallel line id.
 */
export const getBaseParallelLineID = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    type: LinePathType,
    lineID: LineId
): LineId => {
    if (!supportsParallelLinePath(type)) return lineID;

    const parallelIndex = graph.getEdgeAttribute(lineID, 'parallelIndex');
    if (parallelIndex < 0) return lineID;

    const { startFrom } = graph.getEdgeAttribute(lineID, type)! as ParallelLinePathAttributes;
    const [source, target] = graph.extremities(lineID);

    let minParallelIndex = parallelIndex;
    let minLineID = lineID;
    for (const lineEntry of graph.edgeEntries(source, target)) {
        const attr = lineEntry.attributes;
        if (
            checkParallels(type, source as NodeId, startFrom, lineEntry) &&
            attr.parallelIndex >= 0 &&
            attr.parallelIndex < minParallelIndex
        ) {
            minParallelIndex = attr.parallelIndex;
            minLineID = lineEntry.edge as LineId;
        }
    }
    return minLineID;
};

export const MAX_PARALLEL_LINES_FREE = 5;
export const MAX_PARALLEL_LINES_PRO = Infinity;

export const countParallelLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => {
    let parallelLinesCount = 0;
    for (const lineEntry of graph.edgeEntries()) {
        if (supportsParallelLinePath(lineEntry.attributes.type) && lineEntry.attributes.parallelIndex >= 0) {
            parallelLinesCount += 1;
        }
    }
    return parallelLinesCount;
};
