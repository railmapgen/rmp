import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { RayGuidedPathAttributes } from '../components/svgs/lines/paths/ray-guided';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { OpenPath, makeLinearPath, makePoint } from '../constants/path';
import { checkSimplePathAvailability } from './auto-simple';
import { concatOpenPaths } from './path';

/**
 * A reconciled line entry with its traversal direction.
 */
export interface ReconciledLineEntry {
    edge: LineId;
    /** The node where the chain enters this edge. */
    chainSource: NodeId;
    /** The node where the chain exits this edge. */
    chainTarget: NodeId;
}

/**
 * Only lines have a reconcileId will be considered.
 */
export const getAllLinesNeedToReconcile = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
) => {
    const lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] } = {};
    for (const lineEntry of graph.edgeEntries()) {
        if (lineEntry.edge.startsWith('line') && lineEntry.attributes.reconcileId !== '') {
            const reconcileId = lineEntry.attributes.reconcileId;
            if (reconcileId in lineGroupsToReconcile) lineGroupsToReconcile[reconcileId].push(lineEntry);
            else lineGroupsToReconcile[reconcileId] = [lineEntry];
        }
    }
    return lineGroupsToReconcile;
};

/**
 * Reconcile lines to a single path using **undirected** adjacency.
 *
 * Builds an undirected adjacency list so that a←b→c is treated
 * the same as a→b→c. Finds the two endpoints (degree-1 nodes)
 * and traverses from one to the other.
 */
export const reconcileLines = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineGroupsToReconcile: { [reconcileId: string]: EdgeEntry<NodeAttributes, EdgeAttributes>[] }
) => {
    const allReconciledLines: ReconciledLineEntry[][] = [];
    const danglingLines: LineId[] = [];
    Object.values(lineGroupsToReconcile).forEach(linesNeedToReconcile => {
        // it is not possible to reconcile a single line
        if (linesNeedToReconcile.length === 1) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }

        // all the lines in linesNeedToReconcile should be the same type and style
        const type = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'type');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'type') === type)) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }
        const style = graph.getEdgeAttribute(linesNeedToReconcile.at(0), 'style');
        if (!linesNeedToReconcile.every(line => graph.getEdgeAttribute(line, 'style') === style)) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }

        // Build undirected adjacency: each node maps to [{edge, neighbor}]
        const adjacency: { [node: string]: { edge: LineId; neighbor: string }[] } = {};
        for (const line of linesNeedToReconcile) {
            const [source, target] = graph.extremities(line);
            if (!adjacency[source]) adjacency[source] = [];
            if (!adjacency[target]) adjacency[target] = [];
            adjacency[source].push({ edge: line.edge as LineId, neighbor: target });
            adjacency[target].push({ edge: line.edge as LineId, neighbor: source });
        }

        // Find endpoints (nodes with degree 1 = chain ends)
        const endpoints = Object.keys(adjacency).filter(node => adjacency[node].length === 1);
        if (endpoints.length !== 2) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }

        // Traverse from one endpoint to the other
        const [start] = endpoints;
        const reconciledEntries: ReconciledLineEntry[] = [];
        const visitedEdges = new Set<string>();
        let current = start;

        while (reconciledEntries.length < linesNeedToReconcile.length) {
            const next = adjacency[current]?.find(({ edge }) => !visitedEdges.has(edge));
            if (!next) {
                // broken chain
                danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
                return;
            }
            visitedEdges.add(next.edge);
            reconciledEntries.push({
                edge: next.edge,
                chainSource: current as NodeId,
                chainTarget: next.neighbor as NodeId,
            });
            current = next.neighbor;
        }

        if (reconciledEntries.length !== linesNeedToReconcile.length) {
            danglingLines.push(...linesNeedToReconcile.map(_ => _.edge as LineId));
            return;
        }
        allReconciledLines.push(reconciledEntries);
    });

    return { allReconciledLines, danglingLines };
};

/**
 * Call each line's `generatePath` and merge all the paths to a single path.
 *
 * When a chain entry has its traversal direction opposite to the edge direction
 * (reversed), attributes like `startFrom` and RayGuided angles are flipped so the
 * generated segment visually connects chainSource → chainTarget.
 */
export const makeReconciledPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    reconciledLines: ReconciledLineEntry[]
): OpenPath | undefined => {
    if (!reconciledLines.every(line => graph.hasEdge(line.edge))) return undefined;

    // call each line's generatePath to generate its own path
    const paths = reconciledLines.map(({ edge, chainSource, chainTarget }) => {
        const sourceAttr = graph.getNodeAttributes(chainSource);
        const targetAttr = graph.getNodeAttributes(chainTarget);
        const { type } = graph.getEdgeAttributes(edge);
        const attr = structuredClone(graph.getEdgeAttribute(edge, type) ?? linePaths[type].defaultAttrs);

        const isReversed = graph.source(edge) !== chainSource;
        if (isReversed) {
            if ('startFrom' in attr) {
                attr.startFrom = attr.startFrom === 'from' ? 'to' : 'from';
            }
            if (type === LinePathType.RayGuided) {
                const rayGuidedAttr = attr as RayGuidedPathAttributes;
                [rayGuidedAttr.startAngle, rayGuidedAttr.endAngle] = [rayGuidedAttr.endAngle, rayGuidedAttr.startAngle];
                [rayGuidedAttr.offsetFrom, rayGuidedAttr.offsetTo] = [rayGuidedAttr.offsetTo, rayGuidedAttr.offsetFrom];
            }
            // no need to handle simple path as it is symmetrical
        }

        // TODO: disable parallel on reconciled lines, use offsetFrom to offsetTo instead
        const simplePathAvailability = checkSimplePathAvailability(
            type,
            sourceAttr.x,
            sourceAttr.y,
            targetAttr.x,
            targetAttr.y,
            attr
        );
        if (simplePathAvailability) {
            // simple path hook on matched situation
            const { x1, y1, x2, y2, offset } = simplePathAvailability;
            return linePaths[LinePathType.Simple].generatePath(x1, x2, y1, y2, { offset });
        }

        return (
            // @ts-ignore-error
            linePaths[type]?.generatePath(sourceAttr.x, targetAttr.x, sourceAttr.y, targetAttr.y, attr) ??
            makeLinearPath(makePoint(sourceAttr.x, sourceAttr.y), makePoint(targetAttr.x, targetAttr.y))
        );
    });

    return concatOpenPaths(paths);
};
