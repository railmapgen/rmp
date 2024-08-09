import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { SimplePathAttributes } from '../components/svgs/lines/paths/simple';
import { EdgeAttributes, GraphAttributes, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType, Path } from '../constants/lines';
import { makeShortPathParallel } from './bezier-parallel';

export type NonSimpleLinePathAttributes = NonNullable<
    Exclude<ExternalLinePathAttributes[keyof ExternalLinePathAttributes], SimplePathAttributes>
>;

const MIN_ROUND_CORNER_FACTOR = 1;

export const extractParallelLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineEntry: EdgeEntry<NodeAttributes, EdgeAttributes>
) => {
    const lineID = lineEntry.edge as LineId;
    const type = lineEntry.attributes.type;
    const attr = lineEntry.attributes[type];
    const parallelIndex = lineEntry.attributes.parallelIndex;

    if (type === LinePathType.Simple || parallelIndex < 0) {
        return { normal: [lineEntry], parallel: [] };
    }

    const normal: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const [source, target] = graph.extremities(lineID);
    const parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    for (const lineEntry of graph.edgeEntries(source, target)) {
        if (lineEntry.attributes.parallelIndex < 0) {
            normal.push(lineEntry);
            continue;
        }

        // edgeEntries will also return edges from target to source
        if (
            lineEntry.attributes.type === type &&
            source === lineEntry.source &&
            (lineEntry.attributes[type] as NonSimpleLinePathAttributes).startFrom ===
                (attr as NonSimpleLinePathAttributes).startFrom
        ) {
            parallelLines.push(lineEntry);
        } else if (
            lineEntry.attributes.type === type &&
            source === lineEntry.target &&
            (lineEntry.attributes[type] as NonSimpleLinePathAttributes).startFrom !==
                (attr as NonSimpleLinePathAttributes).startFrom
        ) {
            parallelLines.push(lineEntry);
        }
    }

    return { normal, parallel: parallelLines };
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
    const attr = baseLineEntry.attributes[type] as NonSimpleLinePathAttributes;
    const baseRoundCornerFactor = attr.roundCornerFactor >= 1 ? attr.roundCornerFactor : MIN_ROUND_CORNER_FACTOR;

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

    const parallelPaths: { [k in LineId]: Path } = {};
    for (const lineEntry of parallelLines) {
        const parallelIndex = lineEntry.attributes.parallelIndex > 0 ? lineEntry.attributes.parallelIndex : 0;

        // early return for already computed path
        if (parallelIndex === 0) {
            parallelPaths[lineEntry.edge as LineId] = basePath;
            continue;
        }

        const d = parallelIndex * -5;
        const [path, _] = makeShortPathParallel(basePath, type, d) ?? [`M ${x1} ${y1 + d} L ${x2} ${y2 + d}`, ''];
        parallelPaths[lineEntry.edge as LineId] = path;
        // console.log(lineEntry.edge, path);
    }

    return parallelPaths;
};

export const makeParallelIndex = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    type: LinePathType,
    source: StnId | MiscNodeId,
    target: StnId | MiscNodeId,
    startFrom: 'from' | 'to'
) => {
    if (type === LinePathType.Simple) return -1;

    // find all parallel lines that are either (source, target, from) or (target, source, to)
    const existingParallelIndex: number[] = [];
    for (const lineEntry of graph.edgeEntries(source, target)) {
        const attr = lineEntry.attributes;
        if (
            type === attr.type &&
            // edgeEntries will also return edges from target to source
            source === lineEntry.source &&
            (attr[type] as NonSimpleLinePathAttributes).startFrom === startFrom
        ) {
            existingParallelIndex.push(lineEntry.attributes.parallelIndex);
        } else if (
            type === attr.type &&
            // edgeEntries will also return edges from target to source
            source === lineEntry.target &&
            (attr[type] as NonSimpleLinePathAttributes).startFrom !== startFrom
        ) {
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
) => {
    if (type === LinePathType.Simple) return lineID;

    const parallelIndex = graph.getEdgeAttribute(lineID, 'parallelIndex');
    if (parallelIndex < 0) return lineID;

    const startFrom = graph.getEdgeAttribute(lineID, type)!['startFrom'];
    const [source, target] = graph.extremities(lineID);

    let minParallelIndex = Number.MAX_VALUE;
    let minLineID = lineID;
    for (const lineEntry of graph.edgeEntries(source, target)) {
        const attr = lineEntry.attributes;
        if (
            type === attr.type &&
            // edgeEntries will also return edges from target to source
            source === lineEntry.source &&
            (attr[type] as NonSimpleLinePathAttributes).startFrom === startFrom &&
            attr.parallelIndex >= 0 &&
            attr.parallelIndex < minParallelIndex
        ) {
            minParallelIndex = attr.parallelIndex;
            minLineID = lineEntry.edge as LineId;
        } else if (
            type === attr.type &&
            // edgeEntries will also return edges from target to source
            source === lineEntry.target &&
            (attr[type] as NonSimpleLinePathAttributes).startFrom !== startFrom &&
            attr.parallelIndex >= 0 &&
            attr.parallelIndex < minParallelIndex
        ) {
            minParallelIndex = attr.parallelIndex;
            minLineID = lineEntry.edge as LineId;
        }
    }
    return minParallelIndex == parallelIndex ? lineID : minLineID;
};

export const MAX_PARALLEL_LINES_FREE = 5;
export const MAX_PARALLEL_LINES_PRO = Infinity;

export const countParallelLines = () => {
    let parallelLinesCount = 0;
    for (const lineEntry of window.graph.edgeEntries()) {
        if (lineEntry.attributes.parallelIndex >= 0) {
            parallelLinesCount += 1;
        }
    }
    return parallelLinesCount;
};
