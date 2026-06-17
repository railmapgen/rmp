import { MultiDirectedGraph } from 'graphology';
import { EdgeEntry } from 'graphology-types';
import { linePaths } from '../components/svgs/lines/lines';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { LinePathType } from '../constants/lines';
import { OpenPath, makeLinearPath, makePoint } from '../constants/path';
import { checkSimplePathAvailability } from './auto-simple';
import { reverseEdgePathAttrs } from './edge-path-attrs';
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

        // Build undirected adjacency: each node maps to [{edge, neighbor}]
        const adjacency: { [node: string]: { edge: LineId; neighbor: string }[] } = {};
        for (const line of linesNeedToReconcile) {
            const { source, target } = line;
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
 * Return the valid reconcile chain that contains this line.
 * Dangling groups and non-reconciled lines return undefined.
 */
const getReconciledLineChain = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineId: LineId
): ReconciledLineEntry[] | undefined => {
    const reconcileId = graph.getEdgeAttribute(lineId, 'reconcileId');
    if (!reconcileId) return undefined;

    const group = getAllLinesNeedToReconcile(graph)[reconcileId];
    if (!group || group.length < 2) return undefined;

    const { allReconciledLines } = reconcileLines(graph, { [reconcileId]: group });
    return allReconciledLines.find(chain => chain.some(e => e.edge === lineId));
};

/**
 * Returns true if the edge belongs to a valid (non-dangling) reconcile chain.
 *
 * A chain renders as one combined path, so per-segment offsets are stripped at
 * render time — even chain-end offsets would distort the connection because the
 * underlying path generators (e.g. diagonal) can introduce inner kinks. Attrs
 * UIs use this to disable the offset fields entirely while inside a chain.
 */
export const isInReconcileChain = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineId: LineId
): boolean => !!getReconciledLineChain(graph, lineId);

/**
 * Return the first line of a valid reconcile chain, otherwise the provided line itself.
 *
 * Reconciled chains render with the first line's style attributes, so attrs UIs use
 * this to direct style edits to the line that actually controls the rendered style.
 */
export const getBaseReconciledLineID = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    lineId: LineId
): LineId => getReconciledLineChain(graph, lineId)?.[0].edge ?? lineId;

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

        if (graph.source(edge) !== chainSource) {
            reverseEdgePathAttrs(type, attr);
        }

        // Chains render as one combined path — strip every segment's offsets so users
        // get a predictable shape. Chain-end offsets would distort segment-internal
        // kinks (e.g. diagonal's M L L), and interior offsets would warp the joints.
        if ('offsetFrom' in attr) attr.offsetFrom = 0;
        if ('offsetTo' in attr) attr.offsetTo = 0;

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
