import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { DEFAULT_MAP_STYLE } from '../../map/map-style';
import store from '../index';
import appReducer, {
    applyRedoAction,
    applyUndoAction,
    HistoryEntry,
    initializeProject,
    MAX_UNDO_SIZE,
    ParamGraph,
    saveGraph,
    setMapEnabled,
    setMapStyle,
} from './param-slice';

const realStore = store.getState();

const createGraph = (nodeId?: string): ParamGraph => {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    if (nodeId) {
        graph.addNode(nodeId, {
            visible: false,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Virtual,
        });
    }
    return graph.export();
};

const createMapStyle = (arterialColor: string) => {
    const mapStyle = structuredClone(DEFAULT_MAP_STYLE);
    mapStyle.roads.arterial.color = arterialColor;
    return mapStyle;
};

const createGraphEntry = (graph = createGraph()): HistoryEntry => ({
    scope: 'graph',
    ...realStore.param.present,
    graph,
});

describe('ParamSlice', () => {
    it('initializes a complete project with empty history', () => {
        const project = {
            ...realStore.param.present,
            mapEnabled: true,
            mapStyle: createMapStyle('#123456'),
            graph: createGraph('project'),
            svgViewBoxZoom: 75,
            svgViewBoxMin: { x: 10, y: 20 },
        };
        const history = [createGraphEntry()];
        const nextState = appReducer(
            { ...realStore.param, past: history, future: history },
            initializeProject(project)
        );

        expect(nextState).toEqual({ present: project, past: [], future: [] });
    });

    it('stores the previous project snapshot as graph history when saving a graph', () => {
        const nextGraph = createGraph('next');
        const nextState = appReducer(realStore.param, saveGraph(nextGraph));

        expect(nextState.present.graph).toEqual(nextGraph);
        expect(nextState.past).toEqual([createGraphEntry()]);
    });

    it('preserves existing past entries and clears redo history when saving a graph', () => {
        const previous = createGraphEntry(createGraph('previous'));
        const future = createGraphEntry(createGraph('future'));
        const nextState = appReducer(
            { ...realStore.param, past: [previous], future: [future] },
            saveGraph(createGraph('next'))
        );

        expect(nextState.past).toEqual([previous, createGraphEntry()]);
        expect(nextState.future).toEqual([]);
    });

    it('restores only the graph for a graph-scoped undo', () => {
        const previous = createGraphEntry(createGraph('previous'));
        const current = {
            ...realStore.param.present,
            mapEnabled: true,
            mapStyle: createMapStyle('#ABCDEF'),
            graph: createGraph('current'),
            svgViewBoxZoom: 75,
            svgViewBoxMin: { x: 30, y: 40 },
        };
        const nextState = appReducer(
            { ...realStore.param, present: current, past: [previous] },
            applyUndoAction('graph')
        );

        expect(nextState.present).toEqual({ ...current, graph: previous.graph });
        expect(nextState.past).toEqual([]);
        expect(nextState.future).toEqual([{ scope: 'graph', ...current }]);
    });

    it('restores the complete snapshot for a project-scoped undo', () => {
        const previous: HistoryEntry = {
            scope: 'project',
            ...realStore.param.present,
            mapEnabled: true,
            mapStyle: createMapStyle('#654321'),
            graph: createGraph('previous'),
            svgViewBoxZoom: 50,
            svgViewBoxMin: { x: 100, y: 200 },
        };
        const current = { ...realStore.param.present, graph: createGraph('current') };
        const nextState = appReducer(
            { ...realStore.param, present: current, past: [previous] },
            applyUndoAction('project')
        );
        const { scope: _scope, ...previousProject } = previous;

        expect(nextState.present).toEqual(previousProject);
        expect(nextState.future).toEqual([{ scope: 'project', ...current }]);
    });

    it('moves the next entry from future to past when redoing', () => {
        const next = createGraphEntry(createGraph('next'));
        const current = { ...realStore.param.present, graph: createGraph('current') };
        const nextState = appReducer(
            { ...realStore.param, present: current, future: [next] },
            applyRedoAction('graph')
        );

        expect(nextState.present).toEqual({ ...current, graph: next.graph });
        expect(nextState.past).toEqual([{ scope: 'graph', ...current }]);
        expect(nextState.future).toEqual([]);
    });

    it('ignores a history action whose scope does not match the stack head', () => {
        const previous = createGraphEntry(createGraph('previous'));
        const nextState = appReducer({ ...realStore.param, past: [previous] }, applyUndoAction('project'));

        expect(nextState).toEqual({ ...realStore.param, past: [previous] });
    });

    it('discards the oldest entry when history exceeds the limit', () => {
        const past: HistoryEntry[] = Array.from({ length: MAX_UNDO_SIZE }, (_, index) =>
            createGraphEntry(createGraph(`history-${index}`))
        );
        const nextState = appReducer({ ...realStore.param, past }, saveGraph(createGraph('next')));

        expect(nextState.past).toHaveLength(MAX_UNDO_SIZE);
        expect(nextState.past[0]?.graph).toEqual(past[1]?.graph);
    });

    it('stores map styles in the current project snapshot', () => {
        const style = createMapStyle('#ABCDEF');
        const nextState = appReducer(realStore.param, setMapStyle(style));

        expect(nextState.present.mapStyle).toEqual(style);
    });

    it('toggles the map without changing graph data, viewport, or history', () => {
        const initialParam = realStore.param;
        const nextState = appReducer(initialParam, setMapEnabled(true));

        expect(nextState.present.mapEnabled).toBe(true);
        expect(nextState.present.graph).toBe(initialParam.present.graph);
        expect(nextState.present.mapStyle).toBe(initialParam.present.mapStyle);
        expect(nextState.present.svgViewBoxZoom).toBe(initialParam.present.svgViewBoxZoom);
        expect(nextState.present.svgViewBoxMin).toBe(initialParam.present.svgViewBoxMin);
        expect(nextState.past).toBe(initialParam.past);
        expect(nextState.future).toBe(initialParam.future);
    });
});
