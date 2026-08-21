import { MultiDirectedGraph } from 'graphology';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultRadialTouchMenuState } from '../components/touch/radial-touch-menu';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { createStore } from '.';
import {
    initializeProject,
    ParamGraph,
    ProjectSnapshot,
    saveGraph,
    setMapEnabled,
    setMapStyle,
    setSvgViewport,
} from './param/param-slice';
import { redoAction, replaceProject, undoAction } from './project-history';
import {
    setActive,
    setMode,
    setPointerPosition,
    setRadialTouchMenu,
    setSelected,
    showDetailsPanel,
} from './runtime/runtime-slice';
import { setLiveViewport } from './viewport/viewport-slice';

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

const createProject = (
    mapEnabled: boolean,
    nodeId: string,
    arterialColor: string,
    svgViewBoxZoom: number,
    svgViewBoxMin: { x: number; y: number }
): ProjectSnapshot => ({
    mapEnabled,
    mapStyle: createMapStyle(arterialColor),
    graph: createGraph(nodeId),
    svgViewBoxZoom,
    svgViewBoxMin,
});

const createProjectStore = (project: ProjectSnapshot) => {
    const testStore = createStore();
    testStore.dispatch(initializeProject(project));
    window.graph = MultiDirectedGraph.from(project.graph);
    return testStore;
};

const expectCurrentProject = (testStore: ReturnType<typeof createStore>, project: ProjectSnapshot) => {
    expect(testStore.getState().param.present).toEqual(project);
    expect(window.graph.export()).toEqual(project.graph);
};

const setTransientInteractionState = (testStore: ReturnType<typeof createStore>) => {
    testStore.dispatch(setSelected(new Set<Id>(['misc_node_stale'])));
    testStore.dispatch(setPointerPosition({ x: 10, y: 20 }));
    testStore.dispatch(setMode('select'));
    testStore.dispatch(setMode('free'));
    testStore.dispatch(setMode('select'));
    testStore.dispatch(setActive('background'));
    testStore.dispatch(showDetailsPanel());
    testStore.dispatch(
        setRadialTouchMenu({
            ...defaultRadialTouchMenuState,
            visible: true,
            position: { x: 30, y: 40 },
        })
    );
    testStore.dispatch(setLiveViewport({ x: 700, y: 800, zoom: 90 }));
};

const expectTransientInteractionStateReset = (testStore: ReturnType<typeof createStore>) => {
    const state = testStore.getState();
    expect(state.runtime.selected.size).toBe(0);
    expect(state.runtime.pointerPosition).toBeUndefined();
    expect(state.runtime.active).toBeUndefined();
    expect(state.runtime.mode).toBe('free');
    expect(state.runtime.lastTool).toBeUndefined();
    expect(state.runtime.isDetailsOpen).toBe('close');
    expect(state.runtime.radialTouchMenu).toEqual(defaultRadialTouchMenuState);
    expect(state.viewport.liveViewport).toBeUndefined();
};

describe('project history', () => {
    beforeEach(() => {
        window.graph = MultiDirectedGraph.from(createGraph());
        window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    });

    it('undoes and redoes all persistent project fields while resetting transient state', async () => {
        const previousProject = createProject(false, 'previous', '#111111', 25, { x: 300, y: 400 });
        const nextProject = createProject(true, 'next', '#222222', 50, { x: 500, y: 600 });
        const testStore = createProjectStore(previousProject);

        setTransientInteractionState(testStore);
        await testStore.dispatch(replaceProject(nextProject));

        expectCurrentProject(testStore, nextProject);
        expect(testStore.getState().param.past.at(-1)).toEqual({
            scope: 'project',
            ...previousProject,
        });
        expectTransientInteractionStateReset(testStore);

        setTransientInteractionState(testStore);
        await testStore.dispatch(undoAction());

        expectCurrentProject(testStore, previousProject);
        expectTransientInteractionStateReset(testStore);

        setTransientInteractionState(testStore);
        await testStore.dispatch(redoAction());

        expectCurrentProject(testStore, nextProject);
        expectTransientInteractionStateReset(testStore);
    });

    it('keeps map settings, viewport, and transient state for graph-only undo', async () => {
        const projectBeforeEdit = createProject(true, 'before', '#777777', 25, { x: 10, y: 20 });
        const graphAfterEdit = createGraph('after');
        const styleAfterEdit = createMapStyle('#888888');
        const testStore = createProjectStore(projectBeforeEdit);

        window.graph.clear();
        window.graph.import(graphAfterEdit);
        testStore.dispatch(saveGraph(graphAfterEdit));
        testStore.dispatch(setMapEnabled(false));
        testStore.dispatch(setMapStyle(styleAfterEdit));
        testStore.dispatch(setSvgViewport({ zoom: 75, min: { x: 30, y: 40 } }));
        setTransientInteractionState(testStore);

        await testStore.dispatch(undoAction());

        expect(testStore.getState().param.present).toEqual({
            ...projectBeforeEdit,
            mapEnabled: false,
            mapStyle: styleAfterEdit,
            svgViewBoxZoom: 75,
            svgViewBoxMin: { x: 30, y: 40 },
        });
        expect(testStore.getState().runtime.selected).toEqual(new Set<Id>(['misc_node_stale']));
        expect(testStore.getState().runtime.pointerPosition).toEqual({ x: 10, y: 20 });
        expect(testStore.getState().runtime.active).toBe('background');
        expect(testStore.getState().runtime.mode).toBe('select');
        expect(testStore.getState().runtime.lastTool).toBe('select');
        expect(testStore.getState().runtime.isDetailsOpen).toBe('show');
        expect(testStore.getState().runtime.radialTouchMenu.visible).toBe(true);
        expect(testStore.getState().viewport.liveViewport).toEqual({ x: 700, y: 800, zoom: 90 });
    });

    it('keeps graph and project entries ordered across mixed undo and redo operations', async () => {
        const projectBeforeEdit = createProject(false, 'project-before', '#333333', 25, { x: 10, y: 20 });
        const graphAfterFirstEdit = createGraph('first-edit');
        const replacementProject = createProject(true, 'replacement', '#444444', 50, { x: 30, y: 40 });
        const graphAfterSecondEdit = createGraph('second-edit');
        const testStore = createProjectStore(projectBeforeEdit);

        window.graph.clear();
        window.graph.import(graphAfterFirstEdit);
        testStore.dispatch(saveGraph(graphAfterFirstEdit));
        await testStore.dispatch(replaceProject(replacementProject));
        window.graph.clear();
        window.graph.import(graphAfterSecondEdit);
        testStore.dispatch(saveGraph(graphAfterSecondEdit));

        await testStore.dispatch(undoAction());
        expectCurrentProject(testStore, replacementProject);

        await testStore.dispatch(undoAction());
        expect(testStore.getState().param.present).toEqual({
            ...projectBeforeEdit,
            graph: graphAfterFirstEdit,
        });

        await testStore.dispatch(undoAction());
        expectCurrentProject(testStore, projectBeforeEdit);

        await testStore.dispatch(redoAction());
        expect(testStore.getState().param.present).toEqual({
            ...projectBeforeEdit,
            graph: graphAfterFirstEdit,
        });

        await testStore.dispatch(redoAction());
        expectCurrentProject(testStore, replacementProject);

        await testStore.dispatch(redoAction());
        expect(testStore.getState().param.present).toEqual({
            ...replacementProject,
            graph: graphAfterSecondEdit,
        });
        expect(window.graph.export()).toEqual(graphAfterSecondEdit);
    });

    it('validates a replacement before changing the current project or transient state', () => {
        const currentProject = createProject(true, 'current', '#555555', 100, { x: 0, y: 0 });
        const testStore = createProjectStore(currentProject);
        const invalidGraph = {
            ...createGraph(),
            edges: [{ key: 'invalid', source: 'missing-a', target: 'missing-b', attributes: {} }],
        } as ParamGraph;
        setTransientInteractionState(testStore);

        expect(() =>
            testStore.dispatch(
                replaceProject({
                    mapEnabled: false,
                    mapStyle: createMapStyle('#666666'),
                    graph: invalidGraph,
                    svgViewBoxZoom: 10,
                    svgViewBoxMin: { x: 1, y: 2 },
                })
            )
        ).toThrow();

        expectCurrentProject(testStore, currentProject);
        expect(testStore.getState().param.past).toEqual([]);
        expect(testStore.getState().runtime.selected).toEqual(new Set<Id>(['misc_node_stale']));
        expect(testStore.getState().viewport.liveViewport).toEqual({ x: 700, y: 800, zoom: 90 });
    });
});
