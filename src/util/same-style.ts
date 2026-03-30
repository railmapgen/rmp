import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, LineId, NodeAttributes } from '../constants/constants';
import { lineStyles } from '../components/svgs/lines/lines';
import { isTheme } from './color';

/**
 * Default isSameStyle: compare all Theme-typed properties by their hex color (index [2]).
 * Non-Theme properties (numbers, booleans, strings) are ignored.
 * Returns true if no Theme properties exist (e.g., empty attrs).
 */
export function defaultIsSameStyle(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    for (const key of Object.keys(a)) {
        const va = a[key];
        const vb = b[key];
        if (isTheme(va) && isTheme(vb)) {
            if ((va as string[])[2] !== (vb as string[])[2]) return false;
        }
    }
    return true;
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
    const targetStyle = targetAttrs.style;
    const targetStyleAttrs = targetAttrs[targetStyle] as Record<string, unknown> | undefined;
    const styleEntry = lineStyles[targetStyle as keyof typeof lineStyles];
    const isSame =
        (styleEntry as { isSameStyle?: (a: unknown, b: unknown) => boolean })?.isSameStyle ?? defaultIsSameStyle;

    const visitedEdges = new Set<string>([targetEdgeId]);
    const visitedNodes = new Set<string>();

    const [source, target] = graph.extremities(targetEdgeId);
    const queue: string[] = [source, target];
    visitedNodes.add(source);
    visitedNodes.add(target);

    while (queue.length > 0) {
        const node = queue.shift()!;
        for (const edge of graph.edges(node)) {
            if (visitedEdges.has(edge)) continue;
            const edgeAttrs = graph.getEdgeAttributes(edge);
            if (edgeAttrs.style !== targetStyle) continue;
            if (!edgeAttrs.visible) continue;
            const edgeStyleAttrs = edgeAttrs[edgeAttrs.style] as Record<string, unknown> | undefined;
            if (!isSame(targetStyleAttrs ?? {}, edgeStyleAttrs ?? {})) continue;

            visitedEdges.add(edge);
            const [s, t] = graph.extremities(edge);
            for (const n of [s, t]) {
                if (!visitedNodes.has(n)) {
                    visitedNodes.add(n);
                    queue.push(n);
                }
            }
        }
    }

    return Array.from(visitedEdges) as LineId[];
}
