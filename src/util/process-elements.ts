import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, Id, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType, Path } from '../constants/lines';
import { checkSimplePathAvailability, reconcileSimplePathWithParallel } from './auto-simple';
import { classifyParallelLines, getBaseParallelLineID, makeParallelPaths } from './parallel';
import { makeReconciledPath, reconcileLines } from './reconcile';

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
    line?: LinePathElement;
}

export const getNodes = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Element[] =>
    [...graph.nodeEntries()].map(_ =>
        _.node.startsWith('stn')
            ? { id: _.node as StnId, type: 'station', station: _.attributes }
            : { id: _.node as MiscNodeId, type: 'misc-node', miscNode: _.attributes }
    );

interface LinePathElement {
    attr: EdgeAttributes;
    path: Path;
}
type NonNullableExternalLinePathAttribute = NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>;

export const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Element[] => {
    const resolvedLines: { [k in LineId]: LinePathElement } = {};

    const cachedSimplePathAvailability: { [k in LineId]: ReturnType<typeof checkSimplePathAvailability> } = {};
    const parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] } = {};
    const normalLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];

    // Check and cache all the lines if they can be a simple path.
    for (const lineEntry of graph.edgeEntries()) {
        const [x1, y1, x2, y2] = [
            lineEntry.sourceAttributes.x,
            lineEntry.sourceAttributes.y,
            lineEntry.targetAttributes.x,
            lineEntry.targetAttributes.y,
        ];
        const attr = lineEntry.attributes[lineEntry.attributes.type] as NonNullableExternalLinePathAttribute;
        const simplePathAvailability = checkSimplePathAvailability(lineEntry.attributes.type, x1, y1, x2, y2, attr);
        cachedSimplePathAvailability[lineEntry.edge as LineId] = simplePathAvailability;
    }

    // Generalize all the lines into parallel, reconcile, simple, and normal lines.
    for (const lineEntry of graph.edgeEntries()) {
        let simplePathAvailability = cachedSimplePathAvailability[lineEntry.edge as LineId];

        const { parallelIndex } = lineEntry.attributes;
        if (parallelIndex >= 0) {
            // only find the base parallel line and see if it is a simple path
            const baseLineId = getBaseParallelLineID(graph, lineEntry.attributes.type, lineEntry.edge as LineId);
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
        if (lineEntry.attributes.reconcileId !== '') {
            const reconcileId = lineEntry.attributes.reconcileId;
            if (reconcileId in lineGroupsToReconcile) lineGroupsToReconcile[reconcileId].push(lineEntry);
            else lineGroupsToReconcile[reconcileId] = [lineEntry];
            continue;
        }
        if (simplePathAvailability) {
            // make simple path here so no more auto simple path needs to be checked later in normal lines
            const lineID = lineEntry.edge as LineId;
            const attr = lineEntry.attributes;
            const { x1, y1, x2, y2, offset } = simplePathAvailability;
            resolvedLines[lineID] = {
                attr,
                path: linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset }),
            };
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
        for (const parallel of parallels) {
            const lineID = parallel.edge as LineId;
            resolvedLines[lineID] = {
                attr: parallel.attributes,
                path: parallelPaths[lineID],
            };
        }
    }

    // Handle reconcile lines.
    const { allReconciledLines, danglingLines } = reconcileLines(graph, lineGroupsToReconcile);
    for (const reconciledLine of allReconciledLines) {
        const path = makeReconciledPath(graph, reconciledLine);
        if (!path) continue;
        const lineID = reconciledLine[0];
        resolvedLines[lineID] = { attr: graph.getEdgeAttributes(lineID), path };
    }
    for (const danglingLine of danglingLines) {
        const attr = graph.getEdgeAttributes(danglingLine);
        const [source, target] = graph.extremities(danglingLine);
        const sourceAttr = graph.getNodeAttributes(source);
        const targetAttr = graph.getNodeAttributes(target);
        resolvedLines[danglingLine] = {
            attr,
            path: linePaths[LinePathType.Simple].generatePath(
                sourceAttr.x,
                targetAttr.x,
                sourceAttr.y,
                targetAttr.y,
                linePaths[LinePathType.Simple].defaultAttrs
            ),
        };
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
        if (!(type in linePaths)) {
            // unknown line path type
            resolvedLines[lineID] = { attr, path: `M ${x1} ${y1} L ${x2} ${y2}` };
            continue;
        }

        // regular line path type, call the corresponding generatePath function
        resolvedLines[lineID] = { attr, path: linePaths[type].generatePath(x1, x2, y1, y2, attr[type] as any) };
    }

    return Object.entries(resolvedLines).map(([id, line]) => ({ id: id as LineId, type: 'line', line }));
};
