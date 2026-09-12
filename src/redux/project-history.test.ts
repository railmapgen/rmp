import { MultiDirectedGraph } from 'graphology';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultRadialTouchMenuState } from '../components/touch/radial-touch-menu';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { appendTimelineEntry } from '../util/timeline';
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
import { redoTimeline, setTimelineDocument, undoTimeline } from './timeline/timeline-slice';
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
        const previousTimeline = {
            version: 1 as const,
            mode: 'quick' as const,
            track: [
                {
                    id: 'clip_previous',
                    kind: 'node' as const,
                    refId: 'misc_node_previous' as const,
                    phase: 'enter' as const,
                    showAnimation: true,
                },
            ],
        };
        const nextTimeline = {
            version: 1 as const,
            mode: 'quick' as const,
            track: [
                {
                    id: 'clip_next',
                    kind: 'node' as const,
                    refId: 'misc_node_next' as const,
                    phase: 'enter' as const,
                    showAnimation: true,
                },
            ],
        };
        const testStore = createProjectStore(previousProject);
        testStore.dispatch(setTimelineDocument(previousTimeline));

        setTransientInteractionState(testStore);
        await testStore.dispatch(replaceProject({ ...nextProject, timeline: nextTimeline }));

        expectCurrentProject(testStore, nextProject);
        expect(testStore.getState().timeline.present).toEqual(nextTimeline);
        expect(testStore.getState().param.past.at(-1)).toEqual({
            scope: 'project',
            ...previousProject,
            timeline: previousTimeline,
        });
        expectTransientInteractionStateReset(testStore);

        setTransientInteractionState(testStore);
        await testStore.dispatch(undoAction());

        expectCurrentProject(testStore, previousProject);
        expect(testStore.getState().timeline.present).toEqual(previousTimeline);
        expectTransientInteractionStateReset(testStore);

        setTransientInteractionState(testStore);
        await testStore.dispatch(redoAction());

        expectCurrentProject(testStore, nextProject);
        expect(testStore.getState().timeline.present).toEqual(nextTimeline);
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

    it('keeps project snapshots paired with their timelines across independent timeline edits', async () => {
        const first = createProject(false, 'misc_node_first', '#111111', 100, { x: 0, y: 0 });
        const second = createProject(false, 'misc_node_second', '#222222', 100, { x: 0, y: 0 });
        const firstTimeline = appendTimelineEntry(createEmptyTimelineDocument(), 'misc_node_first');
        const secondTimeline = appendTimelineEntry(createEmptyTimelineDocument(), 'misc_node_second');
        const editedSecond = { ...secondTimeline, mode: 'pro' as const };
        const testStore = createProjectStore(first);
        testStore.dispatch(setTimelineDocument(firstTimeline));
        await testStore.dispatch(replaceProject({ ...second, timeline: secondTimeline }));

        testStore.dispatch(undoTimeline());
        expect(testStore.getState().timeline.present).toEqual(secondTimeline);
        testStore.dispatch(setTimelineDocument(editedSecond));
        testStore.dispatch(undoTimeline());
        testStore.dispatch(redoTimeline());
        expectCurrentProject(testStore, second);

        await testStore.dispatch(undoAction());
        expectCurrentProject(testStore, first);
        expect(testStore.getState().timeline).toEqual({ present: firstTimeline, past: [], future: [] });
        await testStore.dispatch(redoAction());
        expectCurrentProject(testStore, second);
        expect(testStore.getState().timeline).toEqual({ present: editedSecond, past: [], future: [] });
    });

    it('preserves timeline redo through graph edits and restores later timeline edits on project redo', async () => {
        const first = createProject(false, 'misc_node_first', '#111111', 100, { x: 0, y: 0 });
        const testStore = createProjectStore(first);
        const timeline = appendTimelineEntry(createEmptyTimelineDocument(), 'misc_node_first');
        testStore.dispatch(setTimelineDocument(timeline));
        testStore.dispatch(undoTimeline());
        testStore.dispatch(saveGraph(first.graph));
        testStore.dispatch(redoTimeline());
        expect(testStore.getState().timeline.present).toEqual(timeline);

        const second = createProject(false, 'misc_node_second', '#222222', 100, { x: 0, y: 0 });
        await testStore.dispatch(replaceProject(second));
        await testStore.dispatch(undoAction());
        const editedFirst = { ...timeline, mode: 'pro' as const };
        testStore.dispatch(setTimelineDocument(editedFirst));
        await testStore.dispatch(redoAction());
        await testStore.dispatch(undoAction());
        expectCurrentProject(testStore, first);
        expect(testStore.getState().timeline.present).toEqual(editedFirst);
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
