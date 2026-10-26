import { combineReducers, configureStore, createSlice, PayloadAction, UnknownAction } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { Id } from '../constants/constants';
import { TimelineDocument } from '../constants/timeline';
import accountReducer from '../redux/account/account-slice';
import { MAX_UNDO_SIZE } from '../redux/param/param-slice';
import { onLocalStorageChangeRMT } from '../util/account-sync';
import { normalizeTimelineDocument } from '../util/timeline';
import type { VideoExportOptions } from '../util/video-export/video-export';
import { timelineProjectDB } from './timeline-project-db';
import { TimelineProjectRecord, TimelineProjectRevision, TimelineProjectSummary } from './timeline-project';
import { upgradeTimelineProject } from './timeline-project-upgrade';

enableMapSet();

interface ProjectState {
    projects: TimelineProjectSummary[];
    active?: TimelineProjectRecord;
    past: TimelineProjectRevision[];
    future: TimelineProjectRevision[];
    lastProjectId?: string;
    ready: boolean;
    error?: string;
}

const initialProjectState: ProjectState = { projects: [], past: [], future: [], ready: false };
const cloneRevision = (revision: TimelineProjectRevision): TimelineProjectRevision =>
    JSON.parse(JSON.stringify(revision)) as TimelineProjectRevision;

const projectSlice = createSlice({
    name: 'timelineProject',
    initialState: initialProjectState,
    reducers: {
        setProjects: (state, action: PayloadAction<TimelineProjectSummary[]>) => {
            state.projects = action.payload;
            state.ready = true;
        },
        openProject: (state, action: PayloadAction<TimelineProjectRecord>) => {
            const active = upgradeTimelineProject(action.payload) as unknown as TimelineProjectRecord;
            state.active = active;
            state.past = [];
            state.future = [];
            state.error = undefined;
        },
        closeProject: state => {
            state.active = undefined;
            state.past = [];
            state.future = [];
        },
        replaceProjectList: (state, action: PayloadAction<TimelineProjectSummary[]>) => {
            state.projects = action.payload;
        },
        setLastProjectId: (state, action: PayloadAction<string | undefined>) => {
            state.lastProjectId = action.payload;
        },
        setProjectName: (state, action: PayloadAction<string>) => {
            if (state.active) {
                state.active.name = action.payload;
                state.active.updatedAt = Date.now();
            }
        },
        commitRevision: (state, action: PayloadAction<TimelineProjectRevision>) => {
            if (!state.active || JSON.stringify(state.active.revision) === JSON.stringify(action.payload)) return;
            state.past.push(cloneRevision(state.active.revision as TimelineProjectRevision));
            if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
            state.future = [];
            state.active.revision = cloneRevision(action.payload);
            state.active.updatedAt = Date.now();
        },
        replaceTimeline: (state, action: PayloadAction<TimelineDocument>) => {
            const timeline = normalizeTimelineDocument(action.payload);
            if (!state.active || JSON.stringify(state.active.revision.timeline) === JSON.stringify(timeline)) return;
            state.past.push(cloneRevision(state.active.revision as TimelineProjectRevision));
            if (state.past.length > MAX_UNDO_SIZE) state.past.shift();
            state.future = [];
            state.active.revision.timeline = structuredClone(timeline);
            state.active.updatedAt = Date.now();
        },
        undo: state => {
            if (!state.active) return;
            const previous = state.past.pop();
            if (!previous) return;
            state.future.unshift(cloneRevision(state.active.revision as TimelineProjectRevision));
            state.active.revision = previous;
            state.active.updatedAt = Date.now();
        },
        redo: state => {
            if (!state.active) return;
            const next = state.future.shift();
            if (!next) return;
            state.past.push(cloneRevision(state.active.revision as TimelineProjectRevision));
            state.active.revision = next;
            state.active.updatedAt = Date.now();
        },
        setError: (state, action: PayloadAction<string | undefined>) => {
            state.error = action.payload;
        },
    },
});

interface RuntimeState {
    annotationEditing: boolean;
    fixedResourceEditing: boolean;
    cursor: number;
    selected: Set<Id>;
    viewport?: { x: number; y: number; zoom: number };
    videoOptions?: Pick<
        VideoExportOptions,
        'format' | 'resolution' | 'fps' | 'isTransparent' | 'isSystemFontsOnly' | 'hideWatermark'
    >;
}
const runtimeSlice = createSlice({
    name: 'timelineRuntime',
    initialState: {
        cursor: 0,
        selected: new Set<Id>(),
        annotationEditing: false,
        fixedResourceEditing: false,
    } as RuntimeState,
    reducers: {
        setAnnotationEditing: (state, action: PayloadAction<boolean>) => {
            state.annotationEditing = action.payload;
            if (action.payload) {
                state.fixedResourceEditing = false;
                state.selected = new Set();
            }
        },
        setFixedResourceEditing: (state, action: PayloadAction<boolean>) => {
            state.fixedResourceEditing = action.payload;
            if (action.payload) {
                state.annotationEditing = false;
                state.selected = new Set();
            }
        },
        setCursor: (state, action: PayloadAction<number>) => {
            state.cursor = Math.max(0, Math.floor(action.payload));
        },
        setSelected: (state, action: PayloadAction<Set<Id>>) => {
            state.selected = action.payload;
        },
        setViewport: (state, action: PayloadAction<{ x: number; y: number; zoom: number }>) => {
            state.viewport = action.payload;
        },
        setVideoOptions: (state, action: PayloadAction<RuntimeState['videoOptions']>) => {
            state.videoOptions = action.payload;
        },
        clearRuntime: state => {
            state.annotationEditing = false;
            state.fixedResourceEditing = false;
            state.cursor = 0;
            state.selected = new Set();
            state.viewport = undefined;
            state.videoOptions = undefined;
        },
    },
    extraReducers: builder => {
        builder.addCase(projectSlice.actions.openProject, state => {
            state.annotationEditing = false;
            state.fixedResourceEditing = false;
        });
        builder.addCase(projectSlice.actions.closeProject, state => {
            state.annotationEditing = false;
            state.fixedResourceEditing = false;
        });
    },
});

const combinedReducer = combineReducers({
    account: accountReducer,
    project: projectSlice.reducer,
    runtime: runtimeSlice.reducer,
});
const revisionContentKey = (revision: TimelineProjectRevision) =>
    JSON.stringify({ ...revision, timeline: { ...revision.timeline, overlayModules: undefined } });

// Layout editing can only change annotations, including through delayed callbacks.
const reducer = (state: ReturnType<typeof combinedReducer> | undefined, action: UnknownAction) => {
    const current = state?.project.active?.revision;
    if (
        state?.runtime.fixedResourceEditing &&
        (projectSlice.actions.replaceTimeline.match(action) ||
            projectSlice.actions.commitRevision.match(action) ||
            projectSlice.actions.undo.match(action) ||
            projectSlice.actions.redo.match(action) ||
            projectSlice.actions.setProjectName.match(action))
    )
        return state;
    if (state?.runtime.annotationEditing && current) {
        let candidate: TimelineProjectRevision | undefined;
        if (projectSlice.actions.replaceTimeline.match(action)) {
            candidate = { ...current, timeline: normalizeTimelineDocument(action.payload) };
        } else if (
            projectSlice.actions.commitRevision.match(action) ||
            projectSlice.actions.undo.match(action) ||
            projectSlice.actions.redo.match(action)
        ) {
            return state;
        }
        if (candidate && revisionContentKey(candidate) !== revisionContentKey(current)) return state;
    }
    return combinedReducer(state, action);
};
export const createTimelineStore = () =>
    configureStore({
        reducer,
        middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
    });
export const timelineStore = createTimelineStore();
export type TimelineRootState = ReturnType<typeof reducer>;
export type TimelineDispatch = typeof timelineStore.dispatch;
export const useTimelineDispatch = () => useDispatch<TimelineDispatch>();
export const useTimelineSelector: TypedUseSelectorHook<TimelineRootState> = useSelector;

export const {
    setProjects,
    openProject,
    closeProject,
    replaceProjectList,
    setLastProjectId,
    setProjectName,
    commitRevision,
    replaceTimeline,
    undo,
    redo,
    setError,
} = projectSlice.actions;
export const {
    setAnnotationEditing,
    setFixedResourceEditing,
    setCursor,
    setSelected,
    setViewport,
    setVideoOptions,
    clearRuntime,
} = runtimeSlice.actions;

let unsubscribePersistence: (() => void) | undefined;
let accountInitialized = false;
export const initTimelineStore = async () => {
    if (!accountInitialized) {
        onLocalStorageChangeRMT(timelineStore);
        accountInitialized = true;
    }
    const [projects, lastProjectId] = await Promise.all([
        timelineProjectDB.listProjects(),
        timelineProjectDB.getLastProjectId(),
    ]);
    timelineStore.dispatch(setProjects(projects));
    timelineStore.dispatch(setLastProjectId(lastProjectId));
    if (!unsubscribePersistence) {
        let previous = timelineStore.getState().project.active;
        unsubscribePersistence = timelineStore.subscribe(() => {
            const active = timelineStore.getState().project.active;
            if (active && active !== previous) {
                void timelineProjectDB
                    .saveProject(active)
                    .catch(error =>
                        timelineStore.dispatch(setError(error instanceof Error ? error.message : String(error)))
                    );
            }
            previous = active;
        });
    }
};

export const refreshTimelineProjects = async () => {
    const [projects, lastProjectId] = await Promise.all([
        timelineProjectDB.listProjects(),
        timelineProjectDB.getLastProjectId(),
    ]);
    timelineStore.dispatch(replaceProjectList(projects));
    timelineStore.dispatch(setLastProjectId(lastProjectId));
};
