import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import {
    EdgeAttributes,
    EdgeType,
    GraphAttributes,
    Id,
    LineId,
    NodeAttributes,
    NodeId,
    NodeType,
} from '../constants/constants';
import {
    ExternalLinePathAttributes,
    ExternalLineStyleAttributes,
    LinePathType,
    LineStyleType,
} from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { makeParallelIndex, NonSimpleLinePathAttributes } from './parallel';
import { CURRENT_VERSION } from './save';

type NodesWithAttrs = { [key in NodeId]: NodeAttributes };
type EdgesWithAttrs = {
    [key in LineId]: { attr: EdgeAttributes; source: NodeId; target: NodeId };
};

/**
 * Clipboard data type discriminator.
 * - 'elements': Copy of entire nodes/edges
 * - 'node-attrs': Copy of specific attributes for a node
 * - 'edge-attrs': Copy of specific attributes for an edge (line)
 */
export type ClipboardType = 'elements' | 'node-attrs' | 'edge-attrs';

/**
 * Current clipboard format version. Increment this when clipboard data structure changes.
 */
export const CLIPBOARD_VERSION = 1;

interface ClipboardData {
    app: 'rmp';
    version: number;
    saveVersion: number;
    type: ClipboardType;
    nodesWithAttrs: NodesWithAttrs;
    edgesWithAttrs: EdgesWithAttrs;
    avgX: number;
    avgY: number;
}

/**
 * Clipboard data for specific node attributes copy/paste.
 */
export interface NodeSpecificAttrsClipboardData {
    app: 'rmp';
    version: number;
    saveVersion: number;
    type: 'node-attrs';
    nodeType: NodeType;
    specificAttrs: Record<string, unknown>;
}

/**
 * Clipboard data for specific edge attributes copy/paste.
 * For edges, only roundCornerFactor from path (if present) and all style attributes are copied.
 */
export interface EdgeSpecificAttrsClipboardData {
    app: 'rmp';
    version: number;
    saveVersion: number;
    type: 'edge-attrs';
    pathType: EdgeType;
    styleType: LineStyleType;
    roundCornerFactor?: number;
    styleAttrs: Record<string, unknown>;
}

export type SpecificAttrsClipboardData = NodeSpecificAttrsClipboardData | EdgeSpecificAttrsClipboardData;

export const exportSelectedNodesAndEdges = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selected: Set<Id>
) => {
    const nodesWithAttrs: NodesWithAttrs = {};
    const edgesWithAttrs: EdgesWithAttrs = {};
    let [sumX, sumY] = [0, 0];
    let countNode = 0;
    selected.forEach(id => {
        if (graph.hasNode(id)) {
            const node = id as NodeId;
            const attr = graph.getNodeAttributes(node);
            nodesWithAttrs[node] = attr;
            sumX += attr.x;
            sumY += attr.y;
            countNode++;
        } else if (graph.hasEdge(id)) {
            const edge = id as LineId;
            const [source, target] = graph.extremities(edge) as [NodeId, NodeId];
            edgesWithAttrs[edge] = {
                attr: graph.getEdgeAttributes(edge),
                source,
                target,
            };
        }
    });
    const data: ClipboardData = {
        app: 'rmp',
        version: CLIPBOARD_VERSION,
        saveVersion: CURRENT_VERSION,
        type: 'elements',
        nodesWithAttrs,
        edgesWithAttrs,
        avgX: sumX / countNode,
        avgY: sumY / countNode,
    };
    return JSON.stringify(data);
};

/**
 * Import nodes and edges from the clipboard data.
 * Validates that clipboard version matches CLIPBOARD_VERSION and saveVersion matches CURRENT_VERSION.
 * @param s The text from the clipboard.
 * @param graph The graph.
 * @param isMasterDisabled Whether filter master nodes on paste (no subscription only).
 * @param isParallelDisabled Whether filter parallel lines on paste (no subscription only).
 * @param x The central x of the svg canvas. Nodes and edges added will repositioned around this point.
 * @param y The central y of the svg canvas. Nodes and edges added will repositioned around this point.
 * @returns The nodes and edges added to the graph.
 */
export const importSelectedNodesAndEdges = (
    s: string,
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    isMasterDisabled: boolean,
    isParallelDisabled: boolean,
    x: number,
    y: number
) => {
    const { nodesWithAttrs: nodes, edgesWithAttrs: edges, version, saveVersion } = JSON.parse(s) as ClipboardData;
    if (version !== CLIPBOARD_VERSION) throw Error(`Unrecognized clipboard version: ${version}`);
    if (saveVersion !== CURRENT_VERSION) throw Error(`Save version mismatch: ${saveVersion} vs ${CURRENT_VERSION}`);

    // rename id to be not existed in the current graph
    const renamedMap: { [key in string]: string } = {};
    Object.keys(nodes)
        .filter(node => graph.hasNode(node))
        .forEach(node => {
            const rand = nanoid(10);
            if (node.startsWith('stn_')) renamedMap[node] = `stn_${rand}`;
            else if (node.startsWith('misc_node_')) renamedMap[node] = `misc_node_${rand}`;
            else throw Error(`Unrecognized node id: ${node}`);
        });
    Object.keys(edges)
        .filter(edge => graph.hasEdge(edge))
        .forEach(edge => (renamedMap[edge] = `line_${nanoid(10)}`));
    const renamedS = Object.entries(renamedMap).reduce((_, [k, v]) => _.replaceAll(k, v), s);

    // Filter master nodes if requested.
    // Note users might exceed the current limit (3) if copy and paste 2 master nodes.
    // This will result in a 4 node situation. A finer solution may be implemented.
    const { nodesWithAttrs, edgesWithAttrs, avgX, avgY } = JSON.parse(renamedS) as ClipboardData;
    const filteredNodes = isMasterDisabled
        ? Object.fromEntries(Object.entries(nodesWithAttrs).filter(([_, attrs]) => attrs.type !== MiscNodeType.Master))
        : nodesWithAttrs;
    const filteredEdges = isMasterDisabled
        ? Object.fromEntries(
              Object.entries(edgesWithAttrs).filter(
                  ([_, { source, target }]) => source in filteredNodes && target in filteredNodes
              )
          )
        : edgesWithAttrs;

    // add nodes and edges into the graph
    const [offsetX, offsetY] = [x - avgX, y - avgY];
    Object.entries(filteredNodes).forEach(([node, attr]) => {
        attr.x += offsetX;
        attr.y += offsetY;
        graph.addNode(node, attr);
    });
    Object.entries(filteredEdges).forEach(([edge, { attr, source, target }]) => {
        // tweak parallel index
        if (isParallelDisabled) {
            // Set parallelIndex to -1 (disable) if not enabled.
            // Note users might exceed the current limit (5) if copy and paste 1...4 parallel lines.
            // This will result in a at max 8 parallel lines situation. A finer solution may be implemented.
            attr.parallelIndex = -1;
        } else {
            const { type } = attr;
            if (!(source in renamedMap || target in renamedMap)) {
                // When the user only copy the lines, not the nodes, from the current graph and paste back,
                // we should recalculate the parallel index to avoid overlap.
                const { startFrom } = attr[type] as NonSimpleLinePathAttributes;
                attr.parallelIndex = makeParallelIndex(graph, type, source, target, startFrom);
            }
        }

        graph.addDirectedEdgeWithKey(edge, source, target, attr);
    });

    return {
        nodes: new Set(Object.keys(filteredNodes)) as Set<NodeId>,
        edges: new Set(Object.keys(filteredEdges)) as Set<LineId>,
    };
};

/**
 * Export specific attributes of a single node.
 * @param graph The graph.
 * @param nodeId The ID of the node.
 * @returns JSON string of the specific attributes.
 */
export const exportNodeSpecificAttrs = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    nodeId: NodeId
): string => {
    const nodeType = graph.getNodeAttribute(nodeId, 'type');
    const specificAttrs = (graph.getNodeAttribute(nodeId, nodeType) ?? {}) as Record<string, unknown>;

    const data: NodeSpecificAttrsClipboardData = {
        app: 'rmp',
        version: CLIPBOARD_VERSION,
        saveVersion: CURRENT_VERSION,
        type: 'node-attrs',
        nodeType,
        specificAttrs,
    };
    return JSON.stringify(data);
};

/**
 * Export specific attributes of a single edge (line).
 * For edges, only roundCornerFactor from path (if present) and all style attributes are copied.
 * @param graph The graph.
 * @param edgeId The ID of the edge.
 * @returns JSON string of the specific attributes.
 */
export const exportEdgeSpecificAttrs = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    edgeId: LineId
): string => {
    const pathType = graph.getEdgeAttribute(edgeId, 'type');
    const styleType = graph.getEdgeAttribute(edgeId, 'style');
    const pathAttrs = (graph.getEdgeAttribute(edgeId, pathType) ?? {}) as Record<string, unknown>;
    const styleAttrs = (graph.getEdgeAttribute(edgeId, styleType) ?? {}) as Record<string, unknown>;

    const data: EdgeSpecificAttrsClipboardData = {
        app: 'rmp',
        version: CLIPBOARD_VERSION,
        saveVersion: CURRENT_VERSION,
        type: 'edge-attrs',
        pathType,
        styleType,
        styleAttrs,
    };

    // Only include roundCornerFactor if present in path attributes
    if ('roundCornerFactor' in pathAttrs) {
        data.roundCornerFactor = pathAttrs.roundCornerFactor as number;
    }

    return JSON.stringify(data);
};

/**
 * Parse clipboard text and determine its type.
 * @param s The clipboard text.
 * @returns The parsed clipboard data, or null if invalid or versions don't match.
 */
export const parseClipboardData = (
    s: string
): { type: ClipboardType; data: ClipboardData | SpecificAttrsClipboardData } | null => {
    try {
        const parsed = JSON.parse(s);
        if (parsed.app !== 'rmp') {
            return null;
        }
        // Validate clipboard version
        if (parsed.version !== CLIPBOARD_VERSION) {
            return null;
        }
        // Validate save version
        if (parsed.saveVersion !== CURRENT_VERSION) {
            return null;
        }

        if (parsed.type === 'node-attrs') {
            return { type: 'node-attrs', data: parsed as NodeSpecificAttrsClipboardData };
        } else if (parsed.type === 'edge-attrs') {
            return { type: 'edge-attrs', data: parsed as EdgeSpecificAttrsClipboardData };
        } else if (parsed.type === 'elements') {
            return { type: 'elements', data: parsed as ClipboardData };
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Import specific attributes to nodes.
 * @param graph The graph.
 * @param targetIds Set of node IDs to apply the attributes to.
 * @param data The clipboard data containing node-specific attributes.
 * @returns True if attributes were successfully applied.
 */
export const importNodeSpecificAttrs = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    targetIds: Set<NodeId>,
    data: NodeSpecificAttrsClipboardData
): boolean => {
    let success = false;
    targetIds.forEach(nodeId => {
        const targetNodeType = graph.getNodeAttribute(nodeId, 'type');
        // Only paste if the node types match
        if (targetNodeType === data.nodeType) {
            graph.mergeNodeAttributes(nodeId, { [targetNodeType]: data.specificAttrs });
            success = true;
        }
    });
    return success;
};

/**
 * Import specific attributes to edges.
 * For edges, roundCornerFactor is applied if the target path has this attribute.
 * Style attrs are only applied if the edge has the same style type.
 * @param graph The graph.
 * @param targetIds Set of edge IDs to apply the attributes to.
 * @param data The clipboard data containing edge-specific attributes.
 * @returns True if attributes were successfully applied.
 */
export const importEdgeSpecificAttrs = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    targetIds: Set<LineId>,
    data: EdgeSpecificAttrsClipboardData
): boolean => {
    let success = false;
    targetIds.forEach(edgeId => {
        const targetPathType = graph.getEdgeAttribute(edgeId, 'type');
        const targetStyleType = graph.getEdgeAttribute(edgeId, 'style');

        // Apply style attributes if style type matches (required for edge paste)
        if (targetStyleType === data.styleType) {
            graph.mergeEdgeAttributes(edgeId, { [targetStyleType]: data.styleAttrs });
            success = true;

            // Apply roundCornerFactor if clipboard has it AND target path supports this attribute
            if (data.roundCornerFactor !== undefined && hasRoundCornerFactor(targetPathType)) {
                const currentPathAttrs = (graph.getEdgeAttribute(edgeId, targetPathType) ?? {}) as Record<
                    string,
                    unknown
                >;
                graph.mergeEdgeAttributes(edgeId, {
                    [targetPathType]: { ...currentPathAttrs, roundCornerFactor: data.roundCornerFactor },
                });
            }
        }
    });
    return success;
};

/**
 * Check if a path type supports roundCornerFactor attribute.
 */
const hasRoundCornerFactor = (pathType: EdgeType): boolean => {
    // diagonal, perpendicular, and rotate-perpendicular paths have roundCornerFactor
    // simple path does NOT have roundCornerFactor
    return (
        pathType === LinePathType.Diagonal ||
        pathType === LinePathType.Perpendicular ||
        pathType === LinePathType.RotatePerpendicular
    );
};

/**
 * Check if all selected elements have the same type.
 * @param graph The graph.
 * @param selected Set of selected element IDs.
 * @returns Object containing whether all are same type, the type category ('node' or 'edge'), and the specific type.
 */
export const getSelectedElementsType = (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    selected: Set<Id>
): {
    allSameType: boolean;
    category: 'node' | 'edge' | 'mixed' | null;
    nodeType?: NodeType;
    edgeStyleType?: LineStyleType;
} => {
    if (selected.size === 0) {
        return { allSameType: false, category: null };
    }

    let hasNodes = false;
    let hasEdges = false;
    let nodeType: NodeType | undefined;
    let edgeStyleType: LineStyleType | undefined;
    let allSameNodeType = true;
    let allSameEdgeStyleType = true;

    selected.forEach(id => {
        if (graph.hasNode(id)) {
            hasNodes = true;
            const type = graph.getNodeAttribute(id, 'type');
            if (nodeType === undefined) {
                nodeType = type;
            } else if (nodeType !== type) {
                allSameNodeType = false;
            }
        } else if (graph.hasEdge(id)) {
            hasEdges = true;
            const style = graph.getEdgeAttribute(id, 'style');
            if (edgeStyleType === undefined) {
                edgeStyleType = style;
            } else if (edgeStyleType !== style) {
                allSameEdgeStyleType = false;
            }
        }
    });

    if (hasNodes && hasEdges) {
        return { allSameType: false, category: 'mixed' };
    } else if (hasNodes) {
        return { allSameType: allSameNodeType, category: 'node', nodeType };
    } else if (hasEdges) {
        return { allSameType: allSameEdgeStyleType, category: 'edge', edgeStyleType };
    }

    return { allSameType: false, category: null };
};
