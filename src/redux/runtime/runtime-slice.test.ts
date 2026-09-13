import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { GlobalAlertId } from '../../constants/global-alerts';
import { LinePathType, LineStyleType } from '../../constants/lines';
import { MAX_MASTER_NODE_FREE } from '../../constants/master';
import { MiscNodeType } from '../../constants/nodes';
import { MAX_PARALLEL_LINES_FREE } from '../../util/parallel';
import store, { createStore } from '../index';
import { applyRedoAction, applyUndoAction, replaceProjectState } from '../param/param-slice';
import appReducer, {
    closeGlobalAlert,
    refreshEdgesThunk,
    refreshNodesThunk,
    setGlobalAlert,
    setMode,
} from './runtime-slice';

const realStore = store.getState();

describe('ParamSlice', () => {
    it('Can update refresh indicators on undo actions', () => {
        const nextState = appReducer(realStore.runtime, applyUndoAction('graph'));
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });

    it('Can update refresh indicators on redo actions', () => {
        const nextState = appReducer(realStore.runtime, applyRedoAction('graph'));
        expect(nextState.refresh.nodes).not.toEqual(realStore.runtime.refresh.nodes);
        expect(nextState.refresh.edges).not.toEqual(realStore.runtime.refresh.edges);
    });

    it.each([false, true])('resets drawing tools when replacing a project with mapEnabled=%s', mapEnabled => {
        const firstDrawingState = appReducer(
            realStore.runtime,
            setMode(`line-${LinePathType.Diagonal}/${LineStyleType.SingleColor}`)
        );
        const secondDrawingState = appReducer(
            firstDrawingState,
            setMode(`line-${LinePathType.Freeform}/${LineStyleType.SingleColor}`)
        );
        const nextState = appReducer(
            secondDrawingState,
            replaceProjectState({
                mapEnabled,
                graph: realStore.param.present.graph,
                mapStyle: realStore.param.present.mapStyle,
                svgViewBoxZoom: realStore.param.present.svgViewBoxZoom,
                svgViewBoxMin: realStore.param.present.svgViewBoxMin,
            })
        );

        expect(nextState.mode).toBe('free');
        expect(nextState.lastTool).toBeUndefined();
    });

    it('resets project-specific interaction state for project undo and redo', () => {
        const withActiveTool = appReducer(
            appReducer(realStore.runtime, setMode(`line-${LinePathType.Freeform}/${LineStyleType.SingleColor}`)),
            setMode('free')
        );
        const interactiveState = {
            ...withActiveTool,
            selected: new Set(['misc_node_test'] as const),
            active: 'background' as const,
            pointerPosition: { x: 10, y: 20 },
        };

        for (const action of [applyUndoAction('project'), applyRedoAction('project')]) {
            const nextState = appReducer(interactiveState, action);

            expect(nextState.mode).toBe('free');
            expect(nextState.lastTool).toBeUndefined();
            expect(nextState.selected.size).toBe(0);
            expect(nextState.active).toBeUndefined();
            expect(nextState.pointerPosition).toBeUndefined();
            expect(nextState.isDetailsOpen).toBe('close');
        }
    });

    it('preserves interaction state for graph-only undo', () => {
        const withActiveTool = appReducer(
            appReducer(realStore.runtime, setMode(`line-${LinePathType.Freeform}/${LineStyleType.SingleColor}`)),
            setMode('free')
        );
        const nextState = appReducer(withActiveTool, applyUndoAction('graph'));

        expect(nextState.mode).toBe('free');
        expect(nextState.lastTool).toBe(`line-${LinePathType.Freeform}/${LineStyleType.SingleColor}`);
    });
});

describe('global alerts', () => {
    it('clears the master limit warning after the graph returns within the free limit', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        for (let index = 0; index <= MAX_MASTER_NODE_FREE; index += 1) {
            graph.addNode(`misc_node_master_${index}`, { type: MiscNodeType.Master } as NodeAttributes);
        }
        window.graph = graph;
        const testStore = createStore();

        await testStore.dispatch(refreshNodesThunk());
        expect(testStore.getState().runtime.globalAlerts).toHaveProperty(GlobalAlertId.MasterNodeLimitExceeded);

        graph.dropNode('misc_node_master_0');
        await testStore.dispatch(refreshNodesThunk());
        expect(testStore.getState().runtime.globalAlerts).not.toHaveProperty(GlobalAlertId.MasterNodeLimitExceeded);
    });

    it('clears the parallel limit warning after the graph returns within the free limit', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const nodeAttributes = { type: MiscNodeType.Virtual } as NodeAttributes;
        graph.addNode('misc_node_from', nodeAttributes);
        graph.addNode('misc_node_to', nodeAttributes);
        for (let index = 0; index <= MAX_PARALLEL_LINES_FREE; index += 1) {
            graph.addDirectedEdgeWithKey(`line_parallel_${index}`, 'misc_node_from', 'misc_node_to', {
                type: LinePathType.Diagonal,
                parallelIndex: index,
            } as EdgeAttributes);
        }
        window.graph = graph;
        const testStore = createStore();

        await testStore.dispatch(refreshEdgesThunk());
        expect(testStore.getState().runtime.globalAlerts).toHaveProperty(GlobalAlertId.ParallelLineLimitExceeded);

        graph.dropEdge('line_parallel_0');
        await testStore.dispatch(refreshEdgesThunk());
        expect(testStore.getState().runtime.globalAlerts).not.toHaveProperty(GlobalAlertId.ParallelLineLimitExceeded);
    });

    it('keeps alerts from different businesses even when their statuses match', () => {
        const withMasterAlert = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.MasterNodeLimitExceeded,
                status: 'warning',
                message: 'Master limit exceeded',
            })
        );
        const withBothAlerts = appReducer(
            withMasterAlert,
            setGlobalAlert({
                id: GlobalAlertId.ParallelLineLimitExceeded,
                status: 'warning',
                message: 'Parallel limit exceeded',
            })
        );

        expect(withBothAlerts.globalAlerts).toMatchObject({
            [GlobalAlertId.MasterNodeLimitExceeded]: {
                status: 'warning',
                message: 'Master limit exceeded',
            },
            [GlobalAlertId.ParallelLineLimitExceeded]: {
                status: 'warning',
                message: 'Parallel limit exceeded',
            },
        });
    });

    it('replaces an existing alert with the same id', () => {
        const firstState = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.OpenFileFailed,
                status: 'error',
                message: 'First failure',
                url: 'https://example.com/first',
            })
        );
        const nextState = appReducer(
            firstState,
            setGlobalAlert({
                id: GlobalAlertId.OpenFileFailed,
                status: 'warning',
                message: 'Updated failure',
            })
        );

        expect(nextState.globalAlerts).toEqual({
            [GlobalAlertId.OpenFileFailed]: {
                status: 'warning',
                message: 'Updated failure',
                url: undefined,
                linkedApp: undefined,
            },
        });
    });

    it('closes only the requested alert and ignores an unknown id', () => {
        const withMasterAlert = appReducer(
            realStore.runtime,
            setGlobalAlert({
                id: GlobalAlertId.MasterNodeLimitExceeded,
                status: 'warning',
                message: 'Master limit exceeded',
            })
        );
        const withBothAlerts = appReducer(
            withMasterAlert,
            setGlobalAlert({
                id: GlobalAlertId.ParallelLineLimitExceeded,
                status: 'warning',
                message: 'Parallel limit exceeded',
            })
        );

        const afterUnknownId = appReducer(withBothAlerts, closeGlobalAlert(GlobalAlertId.DownloadImageTooBig));
        expect(afterUnknownId).toBe(withBothAlerts);

        const afterClose = appReducer(afterUnknownId, closeGlobalAlert(GlobalAlertId.MasterNodeLimitExceeded));
        expect(afterClose.globalAlerts).toEqual({
            [GlobalAlertId.ParallelLineLimitExceeded]: {
                status: 'warning',
                message: 'Parallel limit exceeded',
                url: undefined,
                linkedApp: undefined,
            },
        });
    });
});
