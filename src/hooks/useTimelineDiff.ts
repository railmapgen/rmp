import { SerializedGraph } from 'graphology-types';
import { useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootSelector, useRootDispatch } from '../redux';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { addDiff, removeDiff, setBaseGraph } from '../redux/timeline/timeline-slice';
import { clearSelected, refreshNodesThunk, refreshEdgesThunk } from '../redux/runtime/runtime-slice';
import { calculateDiff, applyDiffs } from '../util/timeline-diff';

/**
 * 强制深拷贝序列化图中的所有属性，消除 Immer 的 Object.freeze() 引用。
 * graphology 的 MultiDirectedGraph.from() 通过引用存储属性，
 * I18nText 会直接修改节点属性导致 "Cannot assign to read only property" 错误。
 */
const purgeFrozenAttrs = (
    graph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>
): SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> => ({
    ...graph,
    nodes: (graph.nodes || []).map(n => ({
        ...n,
        attributes: JSON.parse(JSON.stringify(n.attributes ?? {})),
    })),
    edges: (graph.edges || []).map(e => ({
        ...e,
        attributes: JSON.parse(JSON.stringify(e.attributes ?? {})),
    })),
    attributes: graph.attributes ? JSON.parse(JSON.stringify(graph.attributes)) : undefined,
});

export const useTimelineDiff = () => {
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const toast = useToast();
    const timelineEnabled = useRootSelector(state => state.timeline.enabled);
    const currentTime = useRootSelector(state => state.timeline.currentTime);
    const diffs = useRootSelector(state => state.timeline.diffs);
    const baseGraph = useRootSelector(state => state.timeline.baseGraph);
    const refreshNodes = useRootSelector(state => state.runtime.refresh.nodes);
    const refreshEdges = useRootSelector(state => state.runtime.refresh.edges);

    const prevSnapshotRef = useRef<SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> | null>(null);
    const prevTimeRef = useRef<number | null>(null);
    const prevDiffCountRef = useRef<number>(0);
    const restoringRef = useRef(false);
    const initializedRef = useRef(false);

    // Effect 1: 当时间变化或差异变化时重建图
    useEffect(() => {
        if (!timelineEnabled) {
            prevSnapshotRef.current = null;
            prevTimeRef.current = 0;
            prevDiffCountRef.current = 0;
            restoringRef.current = false;
            return;
        }

        const timeChanged = prevTimeRef.current !== currentTime;
        const diffsChanged = prevDiffCountRef.current !== diffs.length;

        if (!timeChanged && !diffsChanged) {
            return;
        }

        restoringRef.current = true;

        dispatch(clearSelected());

        const versionState = new Map<string, { versions: any[] }>();
        window.graph.forEachNode((id, attrs) => {
            if (attrs.versions) {
                versionState.set(id, {
                    versions: structuredClone(attrs.versions),
                });
            }
        });

        const restoredGraph = applyDiffs(baseGraph, diffs, currentTime);

        versionState.forEach(({ versions }, id) => {
            const node = restoredGraph.nodes?.find(n => n.key === id);
            if (node) {
                node.attributes = {
                    ...node.attributes,
                    versions,
                };
            }
        });

        // 消除 Immer 冻结引用
        const safeGraph = purgeFrozenAttrs(restoredGraph);

        window.graph.clear();
        window.graph.import(structuredClone(safeGraph));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());

        prevSnapshotRef.current = structuredClone(safeGraph);
        prevTimeRef.current = currentTime;
        prevDiffCountRef.current = diffs.length;
        restoringRef.current = false;
    }, [timelineEnabled, currentTime, diffs, baseGraph, dispatch]);

    // Effect 2: 检测用户编辑并捕获差异到当前时间点
    useEffect(() => {
        if (!timelineEnabled) return;
        if (restoringRef.current) return;

        const currentGraph = window.graph.toJSON() as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

        if (!prevSnapshotRef.current) {
            prevSnapshotRef.current = structuredClone(currentGraph);
            if (Object.keys(baseGraph).length === 0) {
                dispatch(setBaseGraph(purgeFrozenAttrs(structuredClone(currentGraph))));
            }
            initializedRef.current = true;
            return;
        }

        const diff = calculateDiff(prevSnapshotRef.current, currentGraph);

        if (diff.nodes.length > 0 || diff.edges.length > 0 || diff.graph.length > 0) {
            // 前向隔离：仅影响当前及之后的时间点
            const expectedGraph = applyDiffs(
                baseGraph,
                diffs.filter(d => d.time < currentTime),
                currentTime
            );
            const actualDiff = calculateDiff(expectedGraph, currentGraph);

            // 移除该时间点已有的差异
            const existingDiff = diffs.find(d => d.time === currentTime);
            if (existingDiff) {
                dispatch(removeDiff(currentTime));
            }

            // 添加新的隔离差异
            if (actualDiff.nodes.length > 0 || actualDiff.edges.length > 0 || actualDiff.graph.length > 0) {
                const safeDiff = {
                    nodes: actualDiff.nodes.map(n => ({
                        ...n,
                        attrs: n.attrs ? JSON.parse(JSON.stringify(n.attrs)) : undefined,
                    })),
                    edges: actualDiff.edges.map(e => ({
                        ...e,
                        attrs: e.attrs ? JSON.parse(JSON.stringify(e.attrs)) : undefined,
                    })),
                    graph: actualDiff.graph,
                    time: currentTime,
                };
                dispatch(addDiff(safeDiff));

                if (initializedRef.current) {
                    toast({
                        title: t('timeline.savedAtTimePoint'),
                        description: `${currentTime.toFixed(1)}s - ${t('timeline.futurePointsAffected')}`,
                        status: 'info',
                        duration: 2000,
                        isClosable: true,
                    });
                }
            }
        }

        prevSnapshotRef.current = structuredClone(currentGraph);
    }, [timelineEnabled, refreshNodes, refreshEdges, currentTime, diffs, baseGraph, dispatch, t, toast]);
};
