import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, Id, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType, LineStyleType } from '../constants/lines';
import { Path, makeLinearPath, makePoint } from '../constants/path';
import { checkSimplePathAvailability, reconcileSimplePathWithParallel } from './auto-simple';
import { classifyParallelLines, getBaseParallelLineID, makeParallelPaths, supportsParallelLinePath } from './parallel';
import { isOpenPath } from './path';
import { makeReconciledPath, reconcileLines } from './reconcile';
import { canReconcileLine } from './reconcile-ui';

/**
 * This file contains helper methods to extract stations/miscNodes/lines
 * from MultiDirectedGraph and return elements that svg-canvas can directly
 * pass them to corresponding stations/miscNodes/lines components.
 */

export interface Element {
    id: Id;
    type: 'station' | 'misc-node' | 'line';
    station?: NodeAttributes;
    miscNode?: NodeAttributes;
    line?: LineRenderElement;
}

export const getNodes = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Element[] =>
    [...graph.nodeEntries()].map(_ =>
        _.node.startsWith('stn')
            ? { id: _.node as StnId, type: 'station', station: _.attributes }
            : { id: _.node as MiscNodeId, type: 'misc-node', miscNode: _.attributes }
    );

export interface LineRenderElement {
    attr: EdgeAttributes;
    path: Path;
}

type NonNullableExternalLinePathAttribute = NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>;

export const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Element[] => {
    const resolvedLines: Element[] = [];
    const reconciledLines: Element[] = [];
    const danglingLines: Element[] = [];

    const cachedSimplePathAvailability: { [k in LineId]: ReturnType<typeof checkSimplePathAvailability> } = {};
    const cachedGeneratedPaths: Partial<Record<LineId, Path>> = {};
    const parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] } = {};
    const normalLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];

    // Precompute the values used to classify lines without regenerating their authored geometry.
    for (const lineEntry of graph.edgeEntries()) {
        const lineID = lineEntry.edge as LineId;
        const type = lineEntry.attributes.type;
        if (!Object.hasOwn(linePaths, type)) continue;
        const [x1, y1, x2, y2] = [
            lineEntry.sourceAttributes.x,
            lineEntry.sourceAttributes.y,
            lineEntry.targetAttributes.x,
            lineEntry.targetAttributes.y,
        ];
        const attr = lineEntry.attributes[type] as NonNullableExternalLinePathAttribute;
        cachedSimplePathAvailability[lineID] = checkSimplePathAvailability(type, x1, y1, x2, y2, attr);
        cachedGeneratedPaths[lineID] = linePaths[type].generatePath(x1, x2, y1, y2, attr as any);
    }

    // Generalize all the lines into parallel, reconcile, simple, and normal lines.
    for (const lineEntry of graph.edgeEntries()) {
        const lineID = lineEntry.edge as LineId;
        let simplePathAvailability = cachedSimplePathAvailability[lineID];

        const { parallelIndex, type, style } = lineEntry.attributes;
        if (!Object.hasOwn(linePaths, type)) {
            resolvedLines.push({
                id: lineID,
                type: 'line',
                line: {
                    attr: lineEntry.attributes,
                    path: makeLinearPath(
                        makePoint(lineEntry.sourceAttributes.x, lineEntry.sourceAttributes.y),
                        makePoint(lineEntry.targetAttributes.x, lineEntry.targetAttributes.y)
                    ),
                },
            });
            continue;
        }
        const generatedPath = cachedGeneratedPaths[lineID];
        if (generatedPath && !isOpenPath(generatedPath)) {
            // parallel, reconcile, and auto-simple operations cannot handle area path geometry
            normalLines.push(lineEntry);
            continue;
        }
        if (parallelIndex >= 0 && supportsParallelLinePath(type)) {
            // only find the base parallel line and see if it is a simple path
            const baseLineId = getBaseParallelLineID(graph, type, lineID);
            const baseSimplePathAvailability = cachedSimplePathAvailability[baseLineId];
            if (!baseSimplePathAvailability) {
                parallelLines.push(lineEntry);
                continue;
            }
            // here is the line that should enable auto simple
            // no parallel involved, just add some offset to the simple path
            // based on the parallelIndex and make it looks like parallel
            if (parallelIndex > 0) {
                const { x1, y1, x2, y2, offset } = baseSimplePathAvailability;
                simplePathAvailability = reconcileSimplePathWithParallel(x1, y1, x2, y2, offset, parallelIndex);
            }
        }
        if (lineEntry.attributes.reconcileId !== '' && canReconcileLine(type, style)) {
            const reconcileId = lineEntry.attributes.reconcileId;
            if (reconcileId in lineGroupsToReconcile) lineGroupsToReconcile[reconcileId].push(lineEntry);
            else lineGroupsToReconcile[reconcileId] = [lineEntry];
            continue;
        }
        if (simplePathAvailability) {
            // make simple path here so no more auto simple path needs to be checked later in normal lines
            const attr = lineEntry.attributes;
            const { x1, y1, x2, y2, offset } = simplePathAvailability;
            resolvedLines.push({
                id: lineID,
                type: 'line',
                line: {
                    attr,
                    path: linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset }),
                },
            });
            continue;
        }
        normalLines.push(lineEntry);
    }

    // Handle parallel lines.
    const resolvedParallelLinesID: Set<LineId> = new Set();
    while (parallelLines.length) {
        const lineEntry = parallelLines.pop()!;
        if (resolvedParallelLinesID.has(lineEntry.edge as LineId)) continue;

        // find all the parallel lines between source and target from lineEntry
        // `normal` are dropped as they are already handled in normalLines
        const { parallel: parallels } = classifyParallelLines(graph, lineEntry);
        if (!parallels.length) continue;
        parallels.forEach(_ => resolvedParallelLinesID.add(_.edge as LineId));

        const parallelPaths = makeParallelPaths(parallels);
        if (!parallelPaths) {
            // some of the parallel lines contain non-open paths
            normalLines.push(...parallels);
            continue;
        }
        for (const parallel of parallels) {
            const lineID = parallel.edge as LineId;
            resolvedLines.push({
                id: lineID,
                type: 'line',
                line: {
                    attr: parallel.attributes,
                    path: parallelPaths[lineID],
                },
            });
        }
    }

    // Handle reconcile lines.
    const { allReconciledLines, danglingLines: danglingLineIds } = reconcileLines(graph, lineGroupsToReconcile);
    for (const reconciledLine of allReconciledLines) {
        const path = makeReconciledPath(graph, reconciledLine);
        if (!path) continue;
        const lineID = reconciledLine[0].edge;
        reconciledLines.push({
            id: lineID,
            type: 'line',
            line: {
                attr: graph.getEdgeAttributes(lineID),
                path,
            },
        });
    }
    for (const danglingLine of danglingLineIds) {
        const attr = graph.getEdgeAttributes(danglingLine);
        const [source, target] = graph.extremities(danglingLine);
        const sourceAttr = graph.getNodeAttributes(source);
        const targetAttr = graph.getNodeAttributes(target);
        danglingLines.push({
            id: danglingLine,
            type: 'line',
            line: {
                attr: {
                    ...attr,
                    // Dangling reconciled lines will have a visual warning (unknown style).
                    // Mark only this render-time copy as unknown so the graph data stays unchanged.
                    style: LineStyleType.Unknown,
                    [LineStyleType.Unknown]: {},
                },
                path: linePaths[LinePathType.Simple].generatePath(
                    sourceAttr.x,
                    targetAttr.x,
                    sourceAttr.y,
                    targetAttr.y,
                    linePaths[LinePathType.Simple].defaultAttrs
                ),
            },
        });
    }

    // Handle normal lines.
    for (const lineEntry of normalLines) {
        const lineID = lineEntry.edge as LineId;
        const type = lineEntry.attributes.type;
        const attr = lineEntry.attributes;
        const [x1, y1, x2, y2] = [
            lineEntry.sourceAttributes.x,
            lineEntry.sourceAttributes.y,
            lineEntry.targetAttributes.x,
            lineEntry.targetAttributes.y,
        ];

        // regular line path type, call the corresponding generatePath function
        resolvedLines.push({
            id: lineID,
            type: 'line',
            line: {
                attr,
                path: cachedGeneratedPaths[lineID] ?? linePaths[type].generatePath(x1, x2, y1, y2, attr[type] as any),
            },
        });
    }

    return [...resolvedLines, ...reconciledLines, ...danglingLines];
};
