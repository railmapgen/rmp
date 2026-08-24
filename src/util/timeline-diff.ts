import { SerializedGraph } from 'graphology-types';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { TimelineDiff, NodeDiff, EdgeDiff, GraphDiff } from '../constants/timeline';

/**
 * 计算两个图快照之间的差异。
 * 在 rmp-timeline 中，对比 prevGraph 和 currGraph，生成不含 time 字段的差异对象。
 */
export const calculateDiff = (
    prevGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    currGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): Omit<TimelineDiff, 'time'> => {
    const nodeDiffs: NodeDiff[] = [];
    const edgeDiffs: EdgeDiff[] = [];
    const graphDiffs: GraphDiff[] = [];

    // 节点差异检测
    const prevNodes = new Map<string, any>();
    const currNodes = new Map<string, any>();

    prevGraph.nodes?.forEach(n => prevNodes.set(n.key, n.attributes));
    currGraph.nodes?.forEach(n => currNodes.set(n.key, n.attributes));

    currNodes.forEach((attrs, id) => {
        if (!prevNodes.has(id)) {
            nodeDiffs.push({ action: 'add', id, attrs: deepCloneAttrs(attrs) });
        } else {
            const prevAttrs = prevNodes.get(id);
            const diffAttrs = diffAttributes(prevAttrs, attrs);
            if (Object.keys(diffAttrs).length > 0) {
                nodeDiffs.push({ action: 'update', id, attrs: deepCloneAttrs(diffAttrs) });
            }
        }
    });

    prevNodes.forEach((_, id) => {
        if (!currNodes.has(id)) {
            nodeDiffs.push({ action: 'remove', id });
        }
    });

    // 边差异检测
    const prevEdges = new Map<string, any>();
    const currEdges = new Map<string, any>();

    prevGraph.edges?.forEach(e => {
        if (e.key) {
            prevEdges.set(e.key, { source: e.source, target: e.target, attributes: e.attributes });
        }
    });
    currGraph.edges?.forEach(e => {
        if (e.key) {
            currEdges.set(e.key, { source: e.source, target: e.target, attributes: e.attributes });
        }
    });

    currEdges.forEach((edge, id) => {
        if (!prevEdges.has(id)) {
            edgeDiffs.push({
                action: 'add',
                id,
                source: edge.source,
                target: edge.target,
                attrs: deepCloneAttrs(edge.attributes),
            });
        } else {
            const prevEdge = prevEdges.get(id);
            const diffAttrs = diffAttributes(prevEdge.attributes, edge.attributes);
            if (
                Object.keys(diffAttrs).length > 0 ||
                prevEdge.source !== edge.source ||
                prevEdge.target !== edge.target
            ) {
                edgeDiffs.push({
                    action: 'update',
                    id,
                    source: prevEdge.source !== edge.source ? edge.source : undefined,
                    target: prevEdge.target !== edge.target ? edge.target : undefined,
                    attrs: diffAttrs,
                });
            }
        }
    });

    prevEdges.forEach((_, id) => {
        if (!currEdges.has(id)) {
            edgeDiffs.push({ action: 'remove', id });
        }
    });

    // 图级别属性差异
    if (prevGraph.attributes && currGraph.attributes) {
        const diffAttrs = diffAttributes(prevGraph.attributes, currGraph.attributes);
        if (Object.keys(diffAttrs).length > 0) {
            graphDiffs.push({ action: 'update', attrs: diffAttrs });
        }
    } else if (!prevGraph.attributes && currGraph.attributes) {
        graphDiffs.push({ action: 'add', attrs: currGraph.attributes });
    } else if (prevGraph.attributes && !currGraph.attributes) {
        graphDiffs.push({ action: 'remove' });
    }

    return { nodes: nodeDiffs, edges: edgeDiffs, graph: graphDiffs };
};

/**
 * 逐键对比两对象，返回变更部分。
 */
const diffAttributes = (prev: Record<string, unknown>, curr: Record<string, unknown>): Record<string, unknown> => {
    const diff: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    allKeys.forEach(key => {
        const prevVal = prev[key];
        const currVal = curr[key];
        if (!isEqual(prevVal, currVal)) {
            diff[key] = currVal;
        }
    });
    return diff;
};

/**
 * 深度相等比较，支持数组和嵌套对象。
 */
const isEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => isEqual(val, b[idx]));
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every(key => isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
    }
    return false;
};

/**
 * 深拷贝以避免 Immer 冻结对象污染应用的图。
 */
const deepCloneAttrs = <T>(attrs: T): T => {
    return JSON.parse(JSON.stringify(attrs));
};

/**
 * 将单个 TimelineDiff 应用到序列化图上。
 */
export const applyDiff = (
    baseGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    diff: TimelineDiff
): SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> => {
    const newGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> = structuredClone(baseGraph);

    diff.nodes.forEach(nodeDiff => {
        const nodes = newGraph.nodes || [];
        const index = nodes.findIndex(n => n.key === nodeDiff.id);

        switch (nodeDiff.action) {
            case 'add':
                if (nodeDiff.attrs && index === -1) {
                    nodes.push({ key: nodeDiff.id, attributes: deepCloneAttrs(nodeDiff.attrs as any) });
                }
                break;
            case 'update':
                if (nodeDiff.attrs && index !== -1) {
                    const attrs = nodes[index].attributes as any;
                    const diffAttrs = deepCloneAttrs(nodeDiff.attrs) as Record<string, unknown>;
                    Object.keys(diffAttrs).forEach(key => {
                        if (diffAttrs[key] !== undefined) {
                            attrs[key] = diffAttrs[key];
                        }
                    });
                }
                break;
            case 'remove':
                if (index !== -1) {
                    nodes.splice(index, 1);
                }
                break;
        }
    });

    diff.edges.forEach(edgeDiff => {
        const edges = newGraph.edges || [];
        const index = edges.findIndex(e => e.key === edgeDiff.id);

        switch (edgeDiff.action) {
            case 'add':
                if (edgeDiff.attrs && index === -1) {
                    edges.push({
                        key: edgeDiff.id,
                        source: edgeDiff.source || '',
                        target: edgeDiff.target || '',
                        attributes: deepCloneAttrs(edgeDiff.attrs as any),
                    });
                }
                break;
            case 'update':
                if (index !== -1) {
                    if (edgeDiff.source !== undefined) edges[index].source = edgeDiff.source;
                    if (edgeDiff.target !== undefined) edges[index].target = edgeDiff.target;
                    if (edgeDiff.attrs) {
                        const attrs = edges[index].attributes as any;
                        const diffAttrs = deepCloneAttrs(edgeDiff.attrs) as Record<string, unknown>;
                        Object.keys(diffAttrs).forEach(key => {
                            if (diffAttrs[key] !== undefined) {
                                attrs[key] = diffAttrs[key];
                            }
                        });
                    }
                }
                break;
            case 'remove':
                if (index !== -1) {
                    edges.splice(index, 1);
                }
                break;
        }
    });

    diff.graph.forEach(graphDiff => {
        switch (graphDiff.action) {
            case 'add':
                if (graphDiff.attrs) {
                    newGraph.attributes = deepCloneAttrs(graphDiff.attrs as any);
                }
                break;
            case 'update':
                if (graphDiff.attrs) {
                    const attrs = (newGraph.attributes as any) || {};
                    const diffAttrs = deepCloneAttrs(graphDiff.attrs) as Record<string, unknown>;
                    Object.keys(diffAttrs).forEach(key => {
                        if (diffAttrs[key] !== undefined) {
                            attrs[key] = diffAttrs[key];
                        }
                    });
                    newGraph.attributes = attrs as any;
                }
                break;
            case 'remove':
                (newGraph as any).attributes = undefined;
                break;
        }
    });

    return newGraph;
};

/**
 * 按时间顺序应用所有差异直到 targetTime，返回该时刻的图状态。
 */
export const applyDiffs = (
    baseGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    diffs: TimelineDiff[],
    targetTime: number
): SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> => {
    let currentGraph = structuredClone(baseGraph);
    const sortedDiffs = [...diffs].sort((a, b) => a.time - b.time);

    for (const diff of sortedDiffs) {
        if (diff.time <= targetTime) {
            currentGraph = applyDiff(currentGraph, diff);
        } else {
            break;
        }
    }

    return currentGraph;
};

/**
 * 获取当前时间点所影响的时间范围。
 */
export const getAffectedTimeRange = (diffs: TimelineDiff[], currentTime: number): { start: number; end: number } => {
    const sortedDiffs = [...diffs].sort((a, b) => a.time - b.time);
    const currentIndex = sortedDiffs.findIndex(d => d.time === currentTime);

    let start = currentTime;
    let end = Infinity;

    if (currentIndex !== -1) {
        const prevDiff = sortedDiffs[currentIndex - 1];
        if (prevDiff) {
            start = prevDiff.time;
        } else {
            start = 0;
        }

        const nextDiff = sortedDiffs[currentIndex + 1];
        if (nextDiff) {
            end = nextDiff.time;
        }
    }

    return { start, end };
};
