import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, Id, LineId, MiscNodeId, NodeAttributes, StnId } from '../constants/constants';
import { ExternalLinePathAttributes, LinePathType, Path } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { checkSimplePathAvailability } from './auto-simple';
import { extractParallelLines, makeParallelPaths } from './parallel';
import { makeReconciledPath, reconcileLines } from './reconcile';

/**
 * This file contains helper methods to extract stations/miscNodes/lines
 * from MultiDirectedGraph and return elements that svg-canvas can directly
 * pass them to corresponding stations/miscNodes/lines components.
 */

export interface Element {
    id: Id;
    type: 'station' | 'misc-node' | 'line';
    station?: StationElem;
    miscNode?: MiscNodeElem;
    line?: LinePathElem;
}

type StationElem = NodeAttributes & { node: StnId; type: StationType };
export const getStations = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): StationElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('stn'))
        .map(node => [node, graph.getNodeAttributes(node)] as [StnId, NodeAttributes])
        .filter(([node, attr]) => attr.visible)
        .sort((a, b) => a[1].zIndex - b[1].zIndex)
        .map(([node, attr]) => ({
            node: node as StnId,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as StationType,
            [attr.type]: attr[attr.type],
        }));

type MiscNodeElem = NodeAttributes & { node: MiscNodeId; type: MiscNodeType };
export const getMiscNodes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): MiscNodeElem[] =>
    graph
        .filterNodes((node, attr) => node.startsWith('misc_node'))
        .map(node => [node, graph.getNodeAttributes(node)] as [MiscNodeId, NodeAttributes])
        .filter(([node, attr]) => attr.visible)
        .sort((a, b) => a[1].zIndex - b[1].zIndex)
        .map(([node, attr]) => ({
            node,
            visible: attr.visible,
            zIndex: attr.zIndex,
            x: attr.x,
            y: attr.y,
            type: attr.type as MiscNodeType,
            [attr.type]: attr[attr.type],
        }));

interface LinePathElem {
    id: LineId; // TODO: may be remove this?
    attr: EdgeAttributes;
    path: Path;
}
type NonNullableExternalLinePathAttribute = NonNullable<ExternalLinePathAttributes[keyof ExternalLinePathAttributes]>;

export const getLines = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Element[] => {
    const resolvedLines: { [k in LineId]: LinePathElem } = {};

    const parallelLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] } = {};
    // const reconciledLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    const normalLines: EdgeEntry<NodeAttributes, EdgeAttributes>[] = [];
    for (const lineEntry of graph.edgeEntries()) {
        const [x1, y1, x2, y2] = [
            lineEntry.sourceAttributes.x,
            lineEntry.sourceAttributes.y,
            lineEntry.targetAttributes.x,
            lineEntry.targetAttributes.y,
        ];
        const simplePathAvailability = checkSimplePathAvailability(
            lineEntry.edge as LineId,
            lineEntry.attributes.type,
            x1,
            y1,
            x2,
            y2,
            lineEntry.attributes[lineEntry.attributes.type] as NonNullableExternalLinePathAttribute
        );
        if (simplePathAvailability) {
            // if it could be a simple path, it must not be a parallel line
        } else if (lineEntry.attributes.parallelIndex >= 0) {
            parallelLines.push(lineEntry);
            continue;
        }
        if (lineEntry.attributes.reconcileId !== '') {
            const reconcileId = lineEntry.attributes.reconcileId;
            if (reconcileId in lineGroupsToReconcile) lineGroupsToReconcile[reconcileId].push(lineEntry);
            else lineGroupsToReconcile[reconcileId] = [lineEntry];
            // reconciledLines.push(lineEntry);
            continue;
        }
        if (simplePathAvailability) {
            // make simple path here so no more auto simple path needs to be checked later in normal lines
            const lineID = lineEntry.edge as LineId;
            const attr = lineEntry.attributes;
            const { x1, y1, x2, y2, offset } = simplePathAvailability;
            resolvedLines[lineID] = {
                id: lineID,
                attr,
                path: linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset }),
            };
            continue;
        }
        normalLines.push(lineEntry);
    }

    const resolvedLinesID: Set<LineId> = new Set();

    while (parallelLines.length) {
        const lineEntry = parallelLines.pop()!;
        if (resolvedLinesID.has(lineEntry.edge as LineId)) continue;

        const { normal, parallel } = extractParallelLines(graph, lineEntry);
        if (!parallel.length) continue;
        parallel.forEach(_ => resolvedLinesID.add(_.edge as LineId));
        normalLines.push(...normal);

        const parallelPaths = makeParallelPaths(parallel);
        for (const lineEntry of parallel) {
            const lineID = lineEntry.edge as LineId;
            resolvedLines[lineID] = {
                id: lineEntry.edge as LineId,
                attr: lineEntry.attributes,
                path: parallelPaths[lineID],
            };
        }
    }

    const { allReconciledLines, danglingLines } = reconcileLines(graph, lineGroupsToReconcile);
    for (const reconciledLine of allReconciledLines) {
        const path = makeReconciledPath(graph, reconciledLine);
        if (!path) continue;
        const lineID = reconciledLine[0];
        resolvedLines[lineID] = { id: lineID, attr: graph.getEdgeAttributes(lineID), path };
    }
    for (const danglingLine of danglingLines) {
        const attr = graph.getEdgeAttributes(danglingLine);
        const [source, target] = graph.extremities(danglingLine);
        const sourceAttr = graph.getNodeAttributes(source);
        const targetAttr = graph.getNodeAttributes(target);
        resolvedLines[danglingLine] = {
            id: danglingLine,
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
            resolvedLines[lineID] = { id: lineID, attr, path: `M ${x1} ${y1} L ${x2} ${y2}` };
            continue;
        }

        // console.log(lineID, x1, y1, x2, y2, attr);

        // regular line path type, call the corresponding generatePath function
        resolvedLines[lineID] = {
            id: lineID,
            attr,
            path: linePaths[type].generatePath(x1, x2, y1, y2, attr[type] as any),
        };
    }

    return Object.values(resolvedLines).map(_ => ({ id: _.id, type: 'line', line: _ }));
};
