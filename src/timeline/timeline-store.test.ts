import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { TimelineProjectRecord } from './timeline-project';
import { timelineProjectDB } from './timeline-project-db';
import {
    closeProject,
    commitRevision,
    createTimelineStore,
    initTimelineStore,
    openProject,
    redo,
    replaceTimeline,
    timelineStore,
    undo,
} from './timeline-store';

const makeProject = (): TimelineProjectRecord => ({
    id: 'history',
    name: 'History',
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    revision: {
        rmpVersion: 80,
        graph: new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export(),
        mapEnabled: false,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: 100,
        svgViewBoxMin: { x: 0, y: 0 },
        timeline: createEmptyTimelineDocument(),
    },
});

describe('Timeline session history', () => {
    it('drops the legacy quick/pro mode when opening a project', () => {
        const store = createTimelineStore();
        const project = makeProject();
        (project.revision.timeline as typeof project.revision.timeline & { mode: string }).mode = 'quick';

        store.dispatch(openProject(project));

        expect(store.getState().project.active?.revision.timeline).not.toHaveProperty('mode');
    });

    it('starts on the project home while remembering the most recent project', async () => {
        timelineStore.dispatch(closeProject());
        const listSpy = vi.spyOn(timelineProjectDB, 'listProjects').mockResolvedValue([]);
        const lastSpy = vi.spyOn(timelineProjectDB, 'getLastProjectId').mockResolvedValue('recent-project');
        const getSpy = vi.spyOn(timelineProjectDB, 'getProject');

        await initTimelineStore();

        expect(timelineStore.getState().project.active).toBeUndefined();
        expect(timelineStore.getState().project.lastProjectId).toBe('recent-project');
        expect(getSpy).not.toHaveBeenCalled();
        listSpy.mockRestore();
        lastSpy.mockRestore();
        getSpy.mockRestore();
    });

    it('undoes and redoes a complete sync revision', () => {
        const store = createTimelineStore();
        const project = makeProject();
        store.dispatch(openProject(project));
        store.dispatch(
            commitRevision({
                ...project.revision,
                mapEnabled: true,
                svgViewBoxZoom: 180,
            })
        );

        expect(store.getState().project.active?.revision.mapEnabled).toBe(true);
        store.dispatch(undo());
        expect(store.getState().project.active?.revision.mapEnabled).toBe(false);
        expect(store.getState().project.active?.revision.svgViewBoxZoom).toBe(100);
        store.dispatch(redo());
        expect(store.getState().project.active?.revision.mapEnabled).toBe(true);
        expect(store.getState().project.active?.revision.svgViewBoxZoom).toBe(180);
    });

    it('retains at most 49 undo revisions', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));

        for (let index = 0; index < 55; index++) {
            store.dispatch(
                replaceTimeline({
                    ...createEmptyTimelineDocument(),
                    track: [
                        {
                            id: `pause-${index}`,
                            kind: 'pause',
                            position: 'after',
                            duration: index + 1,
                        },
                    ],
                })
            );
        }

        expect(store.getState().project.past).toHaveLength(49);
        expect(store.getState().project.future).toHaveLength(0);
        store.dispatch(undo());
        expect(store.getState().project.future).toHaveLength(1);
    });

    it('preserves playback settings through edits, undo, redo, and reopening a saved project', () => {
        const store = createTimelineStore();
        const project = makeProject();
        const initialSettings = project.revision.timeline.settings;
        const settings = {
            cameraZoom: 8 as const,
            speedMultiplier: 1.8,
            autoChangeStationType: false,
            showYear: true,
            showLineName: true,
        };
        store.dispatch(openProject(project));
        store.dispatch(replaceTimeline({ ...project.revision.timeline, settings }));
        expect(store.getState().project.active?.revision.timeline.settings).toEqual(settings);
        store.dispatch(undo());
        expect(store.getState().project.active?.revision.timeline.settings).toEqual(initialSettings);
        store.dispatch(redo());
        expect(store.getState().project.active?.revision.timeline.settings).toEqual(settings);
        const saved = JSON.parse(JSON.stringify(store.getState().project.active!)) as TimelineProjectRecord;
        const reopenedStore = createTimelineStore();
        reopenedStore.dispatch(openProject(saved));
        expect(reopenedStore.getState().project.active?.revision.timeline.settings).toEqual(settings);
    });
});
