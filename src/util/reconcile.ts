import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { Path } from '../constants/lines';
import { generateEdgePathSegment, mergePathSegments } from './graph-path';

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
 * Call each line's path generator and merge all the paths to a single path.
 * Uses `generateEdgePathSegment` to correctly handle reversed edges.
 */
export const makeReconciledPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    reconciledLines: ReconciledLineEntry[]
): Path | undefined => {
    if (!reconciledLines.every(line => graph.hasEdge(line.edge))) return undefined;

    const segments = reconciledLines.map(line =>
        generateEdgePathSegment(graph, line.edge, line.chainSource, line.chainTarget)
    );

    return mergePathSegments(segments);
};
