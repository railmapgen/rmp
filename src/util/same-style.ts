import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes, NodeId } from '../constants/constants';
import { lineStyles } from '../components/svgs/lines/lines';
import { isTheme } from './color';

/**
 * Default isSameStyle: both sides must have a Theme-typed `color` property
 * with the same hex value (index [2]).
 */
export function defaultIsSameStyle(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const ca = a['color'];
    const cb = b['color'];
    if (!isTheme(ca) || !isTheme(cb)) return false;
    return (ca as string[])[2] === (cb as string[])[2];
}

/** Compare two edges using the exact LineStyleType + isSameStyle contract shared by editor features. */
export function areSameLineStyles(a: EdgeAttributes, b: EdgeAttributes): boolean {
    if (a.style !== b.style) return false;

    const aStyleAttrs = a[a.style];
    const bStyleAttrs = b[b.style];
    if (!aStyleAttrs || !bStyleAttrs) return false;

    const styleEntry = lineStyles[a.style as keyof typeof lineStyles];
    if (!styleEntry) return false;
    const isSame = styleEntry.isSameStyle ?? defaultIsSameStyle;
    // @ts-expect-error both attrs belong to the same LineStyleType after the equality check above
    return isSame(aStyleAttrs, bStyleAttrs);
}

/**
 * BFS from targetEdgeId, collecting all connected edges with the same style.
 * Two edges are "connected" if they share a node, and both match the target's
 * LineStyleType + isSameStyle check.
 */
export function findConnectedSameStyleEdges(
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    targetEdgeId: LineId
): LineId[] {
    const targetAttrs = graph.getEdgeAttributes(targetEdgeId);
    if (!targetAttrs[targetAttrs.style]) return [targetEdgeId];

    const visitedEdges = new Set<LineId>([targetEdgeId]);
    const visitedNodes = new Set<NodeId>();

    const [source, target] = graph.extremities(targetEdgeId) as [NodeId, NodeId];
    const queue: NodeId[] = [source, target];
    visitedNodes.add(source);
    visitedNodes.add(target);

    let qi = 0;
    while (qi < queue.length) {
        const node = queue[qi++];
        for (const edge of graph.edges(node)) {
            if (visitedEdges.has(edge as LineId)) continue;
            const edgeAttrs = graph.getEdgeAttributes(edge);
            if (!edgeAttrs.visible) continue;
            if (!areSameLineStyles(targetAttrs, edgeAttrs)) continue;

            visitedEdges.add(edge as LineId);
            const [s, t] = graph.extremities(edge) as [NodeId, NodeId];
            for (const n of [s, t]) {
                if (!visitedNodes.has(n)) {
                    visitedNodes.add(n);
                    queue.push(n);
                }
            }
        }
    }

    return Array.from(visitedEdges);
}
