import { MultiDirectedGraph } from 'graphology';
import { AttributesWithColor, dynamicColorInjection } from '../components/panels/details/color-field';
import { DualColorAttributes } from '../components/svgs/lines/styles/dual-color';
import { GenericAttributes } from '../components/svgs/lines/styles/generic';
import {
    EdgeAttributes,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    NodeVersion,
    Theme,
    TimelineEntry,
} from '../constants/constants';
import { ActionRow } from '../constants/timeline';
import { LineStyleType } from '../constants/lines';

/**
 * Get the current timeline from graph attributes, or empty array if none.
 */
export const normalizeTimeline = (timeline: Array<Id | TimelineEntry> | undefined): TimelineEntry[] => {
    return (timeline ?? []).map(item =>
        typeof item === 'string'
            ? { id: item }
            : {
                  id: item.id,
                  ...(item.reverse ? { reverse: true } : {}),
                  ...(item.version ? { version: item.version } : {}),
              }
    );
};

export const getTimeline = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): TimelineEntry[] => {
    return normalizeTimeline(graph.getAttribute('timeline'));
};

/**
 * Set the timeline in graph attributes.
 */
export const setTimeline = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineEntry[]
): void => {
    graph.setAttribute(
        'timeline',
        timeline.map(item => ({
            id: item.id,
            ...(item.reverse ? { reverse: true } : {}),
            ...(item.version ? { version: item.version } : {}),
        }))
    );
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
 * Merge newPath into existing timeline with deduplication.
 * Skips nodes and edges that already exist in the timeline.
 * When a node is skipped, its adjacent edge in newPath is also skipped.
 */
export const deduplicateTimeline = (existing: Id[], newPath: Id[]): Id[] => {
    const seen = new Set<string>(existing);
    const result = [...existing];
    let skipNextEdge = false;

    for (const id of newPath) {
        const isEdge = id.startsWith('line_');

        if (isEdge) {
            if (skipNextEdge || seen.has(id)) {
                skipNextEdge = false;
                continue;
            }
            seen.add(id);
            result.push(id);
        } else {
            // Node: if already seen, skip this node and the following edge
            if (seen.has(id)) {
                skipNextEdge = true;
                continue;
            }
            seen.add(id);
            result.push(id);
        }
    }

    return result;
};

/**
 * Merge new timeline entries into existing timeline with deduplication.
 * Skips nodes and edges that already exist in the timeline.
 * Preserves the reverse property for new edges.
 */
export const deduplicateTimelineEntries = (existing: TimelineEntry[], newEntries: TimelineEntry[]): TimelineEntry[] => {
    const existingEdges = new Set<string>(existing.filter(item => item.id.startsWith('line_')).map(item => item.id));

    const result = [...existing];

    for (const entry of newEntries) {
        const isEdge = entry.id.startsWith('line_');

        if (isEdge) {
            if (existingEdges.has(entry.id)) continue;

            existingEdges.add(entry.id);
            result.push(entry);
        } else {
            result.push(entry);
        }
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
    if (attr && Array.isArray(attr.names)) {
        const validName = attr.names.find(name => typeof name === 'string' && name.trim().length > 0);
        if (validName) return validName.trim();
    }
    return nodeId;
};

/**
 * Get all nodes (stn_* and misc_node_*) that are NOT in the current timeline.
 */
export const getUnaddedNodes = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    timeline: TimelineEntry[]
): NodeId[] => {
    const normalized = normalizeTimeline(timeline as Array<Id | TimelineEntry>);
    const timelineNodes = new Set<string>(normalized.map(item => item.id));
    return graph.filterNodes(
        node => (node.startsWith('stn_') || node.startsWith('misc_node_')) && !timelineNodes.has(node)
    ) as NodeId[];
};

/**
 * Build a NodeVersion object from the current node attributes.
 */
export const syncCurrentNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
): void => {
    if (!graph.hasNode(nodeId)) return;

    const currentVersion = graph.getNodeAttribute(nodeId, 'currentVersion') ?? 1;
    const versions = graph.getNodeAttribute(nodeId, 'versions');
    const currentSnapshot = versions?.find(version => version.version === currentVersion);
    if (!currentSnapshot) return;

    const attributes = graph.getNodeAttributes(nodeId);
    const typeAttrs = attributes[attributes.type];
    const nextSnapshot: NodeVersion = {
        version: currentVersion,
        name: currentSnapshot.name,
        x: attributes.x,
        y: attributes.y,
        type: attributes.type,
        ...(typeAttrs ? { [attributes.type]: structuredClone(typeAttrs) } : {}),
    } as NodeVersion;

    if (JSON.stringify(currentSnapshot) !== JSON.stringify(nextSnapshot)) {
        graph.updateNodeAttribute(nodeId, 'versions', versions =>
            versions.map(version => (version.version === currentVersion ? nextSnapshot : version))
        );
    }
};

export const getCurrentNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
): NodeVersion | undefined => {
    if (!graph.hasNode(nodeId)) return undefined;

    const attr = graph.getNodeAttributes(nodeId);
    const type = attr.type;
    const typeAttrs = attr[type];

    return {
        version: 1,
        name: 'basic',
        x: attr.x,
        y: attr.y,
        type,
        ...(typeAttrs ? { [type]: structuredClone(typeAttrs) } : {}),
    } as NodeVersion;
};

/**
 * Get a specific historical version of a node.
 * Returns undefined if the node or version does not exist.
 * Every version, including basic (version 1), is looked up in the stored versions array.
 */
export const getNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    version: number
): NodeVersion | undefined => {
    if (!graph.hasNode(nodeId)) return undefined;
    if (version <= 0) return undefined;

    // Before reading any target version, persist edits made while another version was active.
    // This keeps direct graph edits and Redux save paths consistent without requiring every editor
    // to know about the version snapshot mechanism.
    syncCurrentNodeVersion(graph, nodeId);

    const versions = graph.getNodeAttribute(nodeId, 'versions');
    const stored = versions?.find(v => v.version === version);
    if (stored) {
        // Return a deep clone so callers cannot mutate stored version data.
        return structuredClone(stored);
    }

    return undefined;
};

/**
 * Apply a historical version to a node, replacing its current x, y, type and type-specific attributes.
 */
export const applyNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    version: NodeVersion
): void => {
    if (!graph.hasNode(nodeId)) return;

    const currentType = graph.getNodeAttribute(nodeId, 'type');
    const newType = version.type;

    // Remove current type-specific attributes if type changes
    if (currentType !== newType) {
        graph.removeNodeAttribute(nodeId, currentType);
    }

    // Build the updates object dynamically to satisfy TypeScript's index signature.
    const updates: Record<string, unknown> = {
        x: version.x,
        y: version.y,
        type: newType,
        currentVersion: version.version,
    };

    // Add type-specific attributes
    const typeAttrs = (version as unknown as Record<string, unknown>)[newType];
    if (typeAttrs) {
        updates[newType] = structuredClone(typeAttrs);
    }

    graph.mergeNodeAttributes(nodeId, updates as Partial<NodeAttributes>);
};

/**
 * Add a new historical version to a node.
 * The new version is assigned the next available version number and copies the current node attributes.
 *
 * If `originalSnapshot` is provided (typically captured before user edits) and no v1 snapshot is
 * yet stored in the `versions` array, it will be persisted first as version=1 (name="basic"), so
 * that v1 continues to refer to the *original* node state even after later versions are applied.
 *
 * Returns the new version number, or undefined if the node does not exist.
 */
export const addNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    originalSnapshot?: NodeVersion
): number | undefined => {
    if (!graph.hasNode(nodeId)) return undefined;

    const versions = graph.getNodeAttribute(nodeId, 'versions') ?? [];

    // basic 与其他版本一样，始终以 versions 中的 v1 快照为准。
    const newVersions: NodeVersion[] = [...versions];
    if (!newVersions.some(v => v.version === 1)) {
        const basicSnapshot = originalSnapshot ?? getCurrentNodeVersion(graph, nodeId);
        if (!basicSnapshot) return undefined;
        newVersions.push({
            ...structuredClone(basicSnapshot),
            version: 1,
            name: 'basic',
        });
    }

    const maxVersion = newVersions.reduce((max, v) => Math.max(max, v.version), 1);
    const newVersionNumber = maxVersion + 1;

    const currentAttrs = getCurrentNodeVersion(graph, nodeId);
    if (!currentAttrs) return undefined;

    const newVersion: NodeVersion = {
        ...currentAttrs,
        version: newVersionNumber,
        name: `v${newVersionNumber}`,
    };

    newVersions.push(newVersion);
    graph.mergeNodeAttributes(nodeId, { versions: newVersions });
    return newVersionNumber;
};

/**
 * Update a specific historical version of a node.
 * Does not affect the current node attributes.
 */
export const updateNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    version: NodeVersion
): boolean => {
    if (!graph.hasNode(nodeId)) return false;

    const versions = graph.getNodeAttribute(nodeId, 'versions') ?? [];
    const index = versions.findIndex(v => v.version === version.version);
    if (index === -1) return false;

    const newVersions = [...versions];
    newVersions[index] = version;
    graph.mergeNodeAttributes(nodeId, { versions: newVersions });
    return true;
};

/**
 * Remove a historical version from a node.
 * Version 1 (basic) can be removed when there are stored versions — the first stored version's
 * state replaces the current node state, and that stored version is removed from history.
 * Returns false if the node does not exist or if version 1 is the only remaining version.
 */
export const removeNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    version: number
): boolean => {
    if (!graph.hasNode(nodeId)) return false;

    if (version <= 1) {
        // Removing v1 (basic): apply the first stored version's state, then remove it
        const storedVersions = graph.getNodeAttribute(nodeId, 'versions') ?? [];
        if (storedVersions.length === 0) return false;

        // Find the first stored version (lowest version number)
        const sortedVersions = [...storedVersions].sort((a, b) => a.version - b.version);
        const firstVersion = sortedVersions[0];

        // Apply the first stored version's state to the current node
        applyNodeVersion(graph, nodeId, firstVersion);

        // Remove that version from stored versions and reset currentVersion to 1
        const newVersions = storedVersions.filter(v => v.version !== firstVersion.version);
        graph.mergeNodeAttributes(nodeId, {
            versions: newVersions,
            currentVersion: 1,
        });
        return true;
    }

    const versions = graph.getNodeAttribute(nodeId, 'versions') ?? [];
    const newVersions = versions.filter(v => v.version !== version);
    if (newVersions.length === versions.length) return false;

    graph.mergeNodeAttributes(nodeId, { versions: newVersions });
    return true;
};

/**
 * Rename a historical version of a node.
 */
export const renameNodeVersion = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId,
    version: number,
    newName: string
): boolean => {
    if (!graph.hasNode(nodeId)) return false;
    if (version <= 1) {
        // For v1, update directly since it's stored in current attributes
        return false;
    }

    const versions = graph.getNodeAttribute(nodeId, 'versions') ?? [];
    const index = versions.findIndex(v => v.version === version);
    if (index === -1) return false;

    const newVersions = [...versions];
    newVersions[index] = { ...newVersions[index], name: newName };
    graph.mergeNodeAttributes(nodeId, { versions: newVersions });
    return true;
};

/**
 * Get the actual direction of an edge's path geometry.
 * Returns the tuple [fromNode, toNode] representing the natural drawing direction.
 *
 * All line path generators (diagonal / perpendicular / ro-perp / ray-guided / simple)
 * always emit a path starting from the graph source and ending at the graph target;
 * the `startFrom` / `startAngle` attributes only change the path SHAPE (which side the
 * corner/offset is on), not the path's start point. Therefore the natural drawing
 * direction is always source -> target, regardless of startFrom.
 */
export const getLineDirection = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId
): [NodeId, NodeId] | undefined => {
    if (!graph.hasEdge(edgeId)) return undefined;

    const [source, target] = graph.extremities(edgeId);
    return [source as NodeId, target as NodeId];
};

/**
 * Calculate auto-reverse settings for a path.
 * The path is an interleaved array: [NodeId, LineId, NodeId, LineId, ..., NodeId]
 * For each edge in the path, determines if it needs to be reversed to match the path direction.
 *
 * @param graph - The graph instance
 * @param path - Interleaved array of node and edge IDs
 * @returns Array of TimelineEntry with auto-calculated reverse properties
 */
export const calculateAutoReverseForPath = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    path: Id[]
): TimelineEntry[] => {
    const result: TimelineEntry[] = [];

    for (let i = 0; i < path.length; i++) {
        const id = path[i];

        // Nodes are always added as-is (no reverse property)
        if (!id.startsWith('line_')) {
            result.push({ id });
            continue;
        }

        // For edges, calculate if reverse is needed
        const edgeId = id as LineId;
        const prevNode = path[i - 1] as NodeId; // Previous node in path
        const nextNode = path[i + 1] as NodeId; // Next node in path

        // Get the actual direction of this edge based on startFrom
        const lineDirection = getLineDirection(graph, edgeId);

        if (!lineDirection) {
            // Edge not found, add without reverse
            result.push({ id: edgeId });
            continue;
        }

        const [lineFrom, lineTo] = lineDirection;

        // The desired path direction is: prevNode -> nextNode
        // Check if the line's actual direction matches the path direction
        // Line direction matches if: lineFrom === prevNode AND lineTo === nextNode
        // Line direction is opposite if: lineFrom === nextNode AND lineTo === prevNode
        // If neither (shouldn't happen in valid paths), default to no reverse

        const matchesPathDirection = lineFrom === prevNode && lineTo === nextNode;
        const oppositeToPathDirection = lineFrom === nextNode && lineTo === prevNode;

        if (matchesPathDirection) {
            // Line direction matches path direction, no reverse needed
            result.push({ id: edgeId, reverse: false });
        } else if (oppositeToPathDirection) {
            // Line direction is opposite to path direction, reverse needed
            result.push({ id: edgeId, reverse: true });
        } else {
            // Edge doesn't connect these nodes as expected (shouldn't happen in valid paths)
            result.push({ id: edgeId });
        }
    }

    return result;
};

export interface ActionConstraintState {
    /** 是否允许在插入位置添加聚焦动作 */
    canAddFocus: boolean;
    /** 是否允许在插入位置添加全览动作 */
    canAddOverview: boolean;
}

/**
 * 聚焦 / 全览互斥约束状态计算（纯函数，便于测试与复用）。
 *
 * 判定依据：插入位置（insertionIndex）之前的动作序列。
 * - 无全览：       可以添加全览；不可以添加聚焦（聚焦必须紧跟在全览之后使用）。
 * - 有全览且最近一次全览之后已有聚焦：可以添加全览；不可以再添加聚焦。
 * - 有全览且最近一次全览之后没有聚焦：可以添加聚焦；不可以再添加全览。
 *
 * 约束（需求 2c）：
 *   1. 前面没有全览 或 最近全览之后已有聚焦 → 禁止添加聚焦；
 *   2. 前面有全览 且 最近全览之后没有聚焦 → 禁止添加全览。
 * 注意：最近一次全览的索引必须用"正向扫描记录最后一个全览下标"的方式计算，
 * 不能写成 rowsBeforeInsertion.map(...).at(-1) —— 那会取到"最后一个元素是否为全览"
 * 的映射值，当列表以非全览动作结尾时会被误判为 -1，从而把"有全览"错判成"无全览"。
 */
export const getActionConstraintState = (rows: ActionRow[], insertionIndex: number): ActionConstraintState => {
    const rowsBeforeInsertion = rows.slice(0, insertionIndex);
    let previousOverviewIndex = -1;
    rowsBeforeInsertion.forEach((row, index) => {
        if (row.actionType === 'overview') previousOverviewIndex = index;
    });
    const hasPreviousOverview = previousOverviewIndex >= 0;
    const hasFocusAfterPreviousOverview =
        hasPreviousOverview &&
        rowsBeforeInsertion.slice(previousOverviewIndex + 1).some(row => row.actionType === 'focus');
    return {
        canAddFocus: hasPreviousOverview && !hasFocusAfterPreviousOverview,
        canAddOverview: !hasPreviousOverview || hasFocusAfterPreviousOverview,
    };
};
