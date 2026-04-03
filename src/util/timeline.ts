import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor, dynamicColorInjection } from '../components/panels/details/color-field';
import { DualColorAttributes } from '../components/svgs/lines/styles/dual-color';
import { GenericAttributes } from '../components/svgs/lines/styles/generic';
import { EdgeAttributes, GraphAttributes, Id, LineId, NodeAttributes, NodeId, Theme } from '../constants/constants';
import { LineStyleType } from '../constants/lines';

/**
 * Get the current timeline from graph attributes, or empty array if none.
 */
export const getTimeline = (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): Id[] => {
    return graph.getAttribute('timeline') ?? [];
};

/**
 * Set the timeline in graph attributes.
 */
export const setTimeline = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: Id[]
): void => {
    graph.setAttribute('timeline', timeline);
};

/**
 * Extract all color themes from a single edge's style attributes.
 * Handles dynamicColorInjection styles (.color), DualColor (.colorA/.colorB),
 * and Generic (.layers[].color).
 */
export const getEdgeThemes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edge: string
): Theme[] => {
    const attr = graph.getEdgeAttributes(edge);
    const style = attr.style;

    if (dynamicColorInjection.has(style)) {
        const color = (attr[style] as AttributesWithColor).color;
        return color ? [color] : [];
    }
    if (style === LineStyleType.DualColor) {
        const dc = attr[LineStyleType.DualColor] as DualColorAttributes | undefined;
        if (!dc) return [];
        const result: Theme[] = [];
        if (dc.colorA) result.push(dc.colorA);
        if (dc.colorB) result.push(dc.colorB);
        return result;
    }
    if (style === LineStyleType.Generic) {
        const ga = attr[LineStyleType.Generic] as GenericAttributes | undefined;
        if (!ga?.layers) return [];
        return ga.layers.map(l => l.color).filter(Boolean);
    }
    return [];
};

/**
 * Find all unique themes on edges connected to a given node.
 * Supports dynamicColorInjection, DualColor, and Generic styles.
 */
export const findThemesAtNode = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    node: NodeId
): Theme[] => {
    const themes: Theme[] = [];
    const seen = new Set<string>();
    for (const { edge } of graph.edgeEntries(node)) {
        for (const color of getEdgeThemes(graph, edge)) {
            const key = color.toString();
            if (!seen.has(key)) {
                seen.add(key);
                themes.push(color);
            }
        }
    }
    return themes;
};

/**
 * Check whether an edge's theme matches the target theme by hex color.
 * Supports dynamicColorInjection, DualColor, and Generic styles.
 */
const edgeMatchesTheme = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edge: string,
    targetTheme: Theme
): boolean => {
    return getEdgeThemes(graph, edge).some(color => color[2] === targetTheme[2]);
};

/**
 * BFS from startNode to endNode following only edges matching targetTheme.
 * Returns an interleaved array: [NodeId, LineId, NodeId, LineId, ..., NodeId]
 * or undefined if no path found.
 */
export const findPathByTheme = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    startNode: NodeId,
    endNode: NodeId,
    targetTheme: Theme,
    maxNodes: number = 200
): Id[] | undefined => {
    if (!graph.hasNode(startNode) || !graph.hasNode(endNode)) return undefined;
    if (startNode === endNode) return [startNode];

    const visited = new Map<NodeId, { parent: NodeId | null; edge: LineId | null }>();
    visited.set(startNode, { parent: null, edge: null });

    const queue: NodeId[] = [startNode];
    let found = false;

    while (queue.length > 0 && !found) {
        const current = queue.shift()!;
        if (visited.size > maxNodes) break;

        for (const { edge, source, target } of graph.edgeEntries(current)) {
            if (!edgeMatchesTheme(graph, edge, targetTheme)) continue;

            const neighbor = (source === current ? target : source) as NodeId;
            if (visited.has(neighbor)) continue;

            visited.set(neighbor, { parent: current, edge: edge as LineId });
            queue.push(neighbor);

            if (neighbor === endNode) {
                found = true;
                break;
            }
        }
    }

    if (!found) return undefined;

    // Reconstruct path: interleaved [NodeId, LineId, NodeId, ...]
    const path: Id[] = [];
    let current: NodeId = endNode;
    while (current !== startNode) {
        const entry = visited.get(current)!;
        path.unshift(current);
        path.unshift(entry.edge!);
        current = entry.parent!;
    }
    path.unshift(startNode);

    return path;
};

/**
 * Merge newPath into existing timeline with node-level deduplication.
 * If a NodeId already exists in the timeline, it and its adjacent edge are skipped.
 */
export const deduplicateTimeline = (existing: Id[], newPath: Id[]): Id[] => {
    const existingNodes = new Set<string>(existing.filter(id => !id.startsWith('line_')));
    const result = [...existing];

    for (let i = 0; i < newPath.length; i++) {
        const id = newPath[i];
        const isNode = !id.startsWith('line_');

        if (isNode && existingNodes.has(id)) {
            // Skip this node and also skip the edge before it (if we just added one)
            // and the edge after it
            if (i + 1 < newPath.length && newPath[i + 1].startsWith('line_')) {
                i++; // skip the next edge too
            }
            continue;
        }

        if (isNode) {
            existingNodes.add(id);
        }
        result.push(id);
    }

    return result;
};

/**
 * Get a display name for a node in the timeline.
 */
export const getNodeDisplayName = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
): string => {
    if (!graph.hasNode(nodeId)) return nodeId;
    const type = graph.getNodeAttribute(nodeId, 'type');
    const attr = graph.getNodeAttribute(nodeId, type) as Record<string, any> | undefined;
    if (attr && 'names' in attr && Array.isArray(attr.names) && attr.names.length > 0) {
        return attr.names[0];
    }
    return nodeId;
};

/**
 * Get all nodes (stn_* and misc_node_*) that are NOT in the current timeline.
 */
export const getUnaddedNodes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: Id[]
): NodeId[] => {
    const timelineNodes = new Set<string>(timeline);
    return graph.filterNodes(
        node => (node.startsWith('stn_') || node.startsWith('misc_node_')) && !timelineNodes.has(node)
    ) as NodeId[];
};
