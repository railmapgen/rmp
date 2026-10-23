import { MultiDirectedGraph } from 'graphology';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { subscription_endpoint } from '../constants/server';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { createTimelineOverlayModule } from '../constants/timeline-overlays';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { setActiveSubscriptions, setToken } from '../redux/account/account-slice';
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
    setAnnotationEditing,
    clearRuntime,
    setCursor,
    setFixedResourceEditing,
    setProjectName,
} from './timeline-store';

const makeProject = (): TimelineProjectRecord => ({
    id: 'history',
    name: 'History',
    version: 2,
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
    it('stages fixed resources without permitting any project writes until the picker finishes', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));
        store.dispatch(
            replaceTimeline({
                ...makeProject().revision.timeline,
                track: [{ id: 'pause', kind: 'pause', position: 'after', duration: 2 }],
            })
        );
        store.dispatch(
            replaceTimeline({
                ...store.getState().project.active!.revision.timeline,
                settings: { ...makeProject().revision.timeline.settings!, speedMultiplier: 2 },
            })
        );
        store.dispatch(undo());
        const original = store.getState().project.active!;
        const overlayModules = [createTimelineOverlayModule('date', 'top-left', 'date')];
        store.dispatch(setFixedResourceEditing(true));
        store.dispatch(replaceTimeline({ ...original.revision.timeline, overlayModules }));
        store.dispatch(commitRevision({ ...original.revision, mapEnabled: true }));
        store.dispatch(setProjectName('Blocked rename'));
        store.dispatch(undo());
        store.dispatch(redo());
        expect(store.getState().project.active).toBe(original);
        expect(store.getState().project.past).toHaveLength(1);
        expect(store.getState().project.future).toHaveLength(1);
        store.dispatch(setCursor(1));
        expect(store.getState().runtime.cursor).toBe(1);
        store.dispatch(setFixedResourceEditing(false));
        store.dispatch(replaceTimeline({ ...original.revision.timeline, overlayModules }));
        expect(store.getState().project.active!.revision.timeline.overlayModules).toEqual(overlayModules);
        expect(store.getState().project.past).toHaveLength(2);
    });

    it('makes the two edit modes mutually exclusive and resets both on project changes', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));
        store.dispatch(setAnnotationEditing(true));
        store.dispatch(setFixedResourceEditing(true));
        expect(store.getState().runtime.annotationEditing).toBe(false);
        expect(store.getState().runtime.fixedResourceEditing).toBe(true);
        store.dispatch(setAnnotationEditing(true));
        expect(store.getState().runtime.annotationEditing).toBe(true);
        expect(store.getState().runtime.fixedResourceEditing).toBe(false);
        for (const reset of [clearRuntime(), closeProject(), openProject(makeProject())]) {
            store.dispatch(setFixedResourceEditing(true));
            store.dispatch(reset);
            expect(store.getState().runtime.fixedResourceEditing).toBe(false);
            expect(store.getState().runtime.annotationEditing).toBe(false);
        }
    });

    it('upgrades the envelope and annotations when opening a legacy record directly', () => {
        const store = createTimelineStore();
        const current = makeProject();
        const { overlayModules: _modules, ...timeline } = current.revision.timeline;
        const legacy = {
            ...current,
            version: 1,
            revision: {
                ...current.revision,
                timeline: { ...timeline, version: 1, settings: { ...timeline.settings, showYear: true } },
            },
        };
        const before = structuredClone(legacy);
        store.dispatch(openProject(legacy as unknown as TimelineProjectRecord));
        const active = store.getState().project.active!;
        expect(active.version).toBe(2);
        expect(active.revision.timeline.version).toBe(2);
        expect(active.revision.timeline.overlayModules?.map(module => module.type)).toEqual(['date', 'timed-text']);
        expect(legacy).toEqual(before);
    });

    it('rejects future envelope or document versions without replacing the open project', () => {
        const store = createTimelineStore();
        const project = makeProject();
        store.dispatch(openProject(project));
        const before = store.getState();
        expect(() =>
            store.dispatch(openProject({ ...project, version: 999 } as unknown as TimelineProjectRecord))
        ).toThrow('Unsupported Timeline project version');
        expect(() =>
            store.dispatch(
                openProject({
                    ...project,
                    revision: { ...project.revision, timeline: { ...project.revision.timeline, version: 999 } },
                } as unknown as TimelineProjectRecord)
            )
        ).toThrow('Unsupported Timeline document version');
        expect(store.getState()).toBe(before);
    });

    it('locks project content while permitting persistent annotation edits and cursor seeking', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));
        const original = store.getState().project.active!.revision;
        store.dispatch(setAnnotationEditing(true));
        store.dispatch(
            replaceTimeline({
                ...original.timeline,
                track: [{ id: 'pause', kind: 'pause', duration: 2, position: 'after' }],
            })
        );
        store.dispatch(
            replaceTimeline({
                ...original.timeline,
                audioTrack: [{ id: 'music', kind: 'audio', name: 'Music', blobId: 'blob', startSlot: 0, endSlot: 1 }],
            })
        );
        store.dispatch(
            replaceTimeline({
                ...original.timeline,
                labelTrack: [{ id: 'label', kind: 'label', text: 'Changed', startSlot: 0, endSlot: 1 }],
            })
        );
        store.dispatch(
            replaceTimeline({ ...original.timeline, settings: { ...original.timeline.settings!, speedMultiplier: 2 } })
        );
        store.dispatch(commitRevision({ ...original, mapEnabled: true }));
        expect(store.getState().project.active!.revision).toEqual(original);

        const overlayModules = [createTimelineOverlayModule('date', 'top-left', 'date')];
        store.dispatch(replaceTimeline({ ...original.timeline, overlayModules }));
        expect(store.getState().project.active!.revision.timeline.overlayModules).toHaveLength(1);
        const updated = store.getState().project.active!.revision;
        store.dispatch(undo());
        store.dispatch(redo());
        expect(store.getState().project.active!.revision).toEqual(updated);
        store.dispatch(setCursor(1));
        expect(store.getState().runtime.cursor).toBe(1);
        store.dispatch(setAnnotationEditing(false));
        store.dispatch(undo());
        expect(store.getState().project.active!.revision.timeline.overlayModules).toEqual(
            original.timeline.overlayModules
        );
    });

    it('clears annotation editing when runtime or active project changes', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));
        store.dispatch(setAnnotationEditing(true));
        store.dispatch(clearRuntime());
        expect(store.getState().runtime.annotationEditing).toBe(false);
        store.dispatch(setAnnotationEditing(true));
        store.dispatch(closeProject());
        expect(store.getState().runtime.annotationEditing).toBe(false);
        store.dispatch(setAnnotationEditing(true));
        store.dispatch(openProject(makeProject()));
        expect(store.getState().runtime.annotationEditing).toBe(false);
    });
    it('keeps account changes outside project data and undo history', () => {
        const store = createTimelineStore();
        store.dispatch(openProject(makeProject()));
        const projectState = store.getState().project;

        store.dispatch(setToken('account-token'));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: true }));
        expect(store.getState().account.activeSubscriptions.RMP_EXPORT).toBe(true);
        expect(store.getState().project).toBe(projectState);

        store.dispatch(setToken(undefined));
        store.dispatch(setActiveSubscriptions({ RMP_CLOUD: false, RMP_EXPORT: false }));
        expect(store.getState().account.activeSubscriptions.RMP_EXPORT).toBe(false);
        expect(store.getState().project).toBe(projectState);
    });

    it('starts on the project home with live account access without loading the painter project', async () => {
        timelineStore.dispatch(closeProject());
        const listSpy = vi.spyOn(timelineProjectDB, 'listProjects').mockResolvedValue([]);
        const lastSpy = vi.spyOn(timelineProjectDB, 'getLastProjectId').mockResolvedValue('recent-project');
        const getSpy = vi.spyOn(timelineProjectDB, 'getProject');
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            status: 200,
            json: async () => ({ subscriptions: [{ type: 'RMP_EXPORT', expires: '2099-01-01T00:00:00Z' }] }),
        } as Response);
        localStorage.setItem(LocalStorageKey.ACCOUNT, JSON.stringify({ token: 'timeline-account-token' }));
        const storageMethods = localStorage instanceof Storage ? Storage.prototype : localStorage;
        const storageSpy = vi.spyOn(storageMethods, 'getItem');
        const painterGraph = window.graph;

        await initTimelineStore();
        await waitFor(() => expect(timelineStore.getState().account.activeSubscriptions.RMP_EXPORT).toBe(true));

        expect(timelineStore.getState().project.active).toBeUndefined();
        expect(timelineStore.getState().project.lastProjectId).toBe('recent-project');
        expect(getSpy).not.toHaveBeenCalled();
        expect(storageSpy).toHaveBeenCalledWith(LocalStorageKey.ACCOUNT);
        expect(storageSpy).not.toHaveBeenCalledWith(LocalStorageKey.PARAM);
        expect(window.graph).toBe(painterGraph);
        expect(fetchSpy).toHaveBeenCalledWith(subscription_endpoint, {
            headers: expect.objectContaining({ Authorization: 'Bearer timeline-account-token' }),
        });

        localStorage.removeItem(LocalStorageKey.ACCOUNT);
        window.onstorage?.call(window, new StorageEvent('storage', { key: LocalStorageKey.ACCOUNT }));
        expect(timelineStore.getState().account.activeSubscriptions.RMP_EXPORT).toBe(false);
        storageSpy.mockRestore();
        fetchSpy.mockRestore();
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
