import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SerializedGraph } from 'graphology-types';
import { nanoid } from 'nanoid';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../../constants/constants';
import {
    ActionRow,
    DateRow,
    TimelineDiff,
    TimelineLine,
    LineGroup,
    TimelineState,
    TIMELINE_DEFAULTS,
} from '../../constants/timeline';
import { applyUndoAction, applyRedoAction } from '../param/param-slice';

const initialState: TimelineState = {
    ...TIMELINE_DEFAULTS,
    baseGraph: {} as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
};

const createActionRowId = (existingIds: Set<string>, suffix = ''): string => {
    let id = `action_row_${nanoid(10)}${suffix}`;
    while (existingIds.has(id)) {
        id = `action_row_${nanoid(10)}${suffix}`;
    }
    existingIds.add(id);
    return id;
};

const normalizeActionRowIds = (actionRows: ActionRow[]): ActionRow[] => {
    const existingIds = new Set<string>();
    return actionRows.map(row => {
        if (!existingIds.has(row.id)) {
            existingIds.add(row.id);
            return row;
        }
        return { ...row, id: createActionRowId(existingIds) };
    });
};

const timelineSlice = createSlice({
    name: 'timeline',
    initialState,
    reducers: {
        setTimelineEnabled: (state, action: PayloadAction<boolean>) => {
            state.enabled = action.payload;
        },
        setTotalDuration: (state, action: PayloadAction<number>) => {
            state.totalDuration = action.payload;
        },
        setCurrentTime: (state, action: PayloadAction<number>) => {
            state.currentTime = Math.max(0, Math.min(action.payload, state.totalDuration));
        },

        // DateRow actions
        addDateRow: (state, action: PayloadAction<Omit<DateRow, 'id'>>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const newRow: DateRow = {
                ...action.payload,
                id: `date_row_${Date.now()}`,
            };
            state.dateRows.push(newRow);
            state.dateRows.sort((a, b) => a.startTime - b.startTime);
        },
        updateDateRow: (state, action: PayloadAction<{ id: string; updates: Partial<DateRow> }>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const index = state.dateRows.findIndex(row => row.id === action.payload.id);
            if (index !== -1) {
                state.dateRows[index] = { ...state.dateRows[index], ...action.payload.updates };
                state.dateRows.sort((a, b) => a.startTime - b.startTime);
            }
        },
        removeDateRow: (state, action: PayloadAction<string>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            state.dateRows = state.dateRows.filter(row => row.id !== action.payload);
        },

        // LineGroup actions
        addLineGroup: (state, action: PayloadAction<Omit<LineGroup, 'id'>>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const newGroup: LineGroup = {
                ...action.payload,
                id: `line_group_${Date.now()}`,
            };
            state.groups.push(newGroup);
        },
        updateLineGroup: (state, action: PayloadAction<{ id: string; updates: Partial<LineGroup> }>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const index = state.groups.findIndex(g => g.id === action.payload.id);
            if (index !== -1) {
                state.groups[index] = { ...state.groups[index], ...action.payload.updates };
            }
        },
        removeLineGroup: (state, action: PayloadAction<string>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const groupId = action.payload;
            state.groups = state.groups.filter(g => g.id !== groupId);
            // 同时删除该线路下的所有线路段
            state.lines = state.lines.filter(line => line.groupId !== groupId);
        },

        // TimelineLine (segment) actions
        addTimelineLine: (state, action: PayloadAction<Omit<TimelineLine, 'id'>>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const newLine: TimelineLine = {
                ...action.payload,
                id: `timeline_line_${Date.now()}`,
            };
            state.lines.push(newLine);
        },
        updateTimelineLine: (state, action: PayloadAction<{ id: string; updates: Partial<TimelineLine> }>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const index = state.lines.findIndex(line => line.id === action.payload.id);
            if (index !== -1) {
                state.lines[index] = { ...state.lines[index], ...action.payload.updates };
            }
        },
        removeTimelineLine: (state, action: PayloadAction<string>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const lineId = action.payload;
            state.lines = state.lines.filter(line => line.id !== lineId);
            // 同时清理 actionRows 中的引用
            state.actionRows.forEach(row => {
                if (row.actionLineId === lineId) {
                    row.actionLineId = undefined;
                }
            });
        },

        // ActionRow actions
        addActionRow: (state, action: PayloadAction<Omit<ActionRow, 'id'>>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const existingIds = new Set(state.actionRows.map(row => row.id));
            const newRow: ActionRow = {
                ...action.payload,
                id: createActionRowId(existingIds),
            };
            state.actionRows.push(newRow);
        },
        updateActionRow: (state, action: PayloadAction<{ id: string; updates: Partial<ActionRow> }>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const index = state.actionRows.findIndex(row => row.id === action.payload.id);
            if (index !== -1) {
                state.actionRows[index] = { ...state.actionRows[index], ...action.payload.updates };
            }
        },
        removeActionRow: (state, action: PayloadAction<string>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            state.actionRows = state.actionRows.filter(row => row.id !== action.payload);
        },
        reorderActionRows: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const { fromIndex, toIndex } = action.payload;
            if (
                fromIndex < 0 ||
                fromIndex >= state.actionRows.length ||
                toIndex < 0 ||
                toIndex >= state.actionRows.length
            ) {
                return;
            }
            const [removed] = state.actionRows.splice(fromIndex, 1);
            state.actionRows.splice(toIndex, 0, removed);
        },

        // Batch action: clear dates for multiple action rows (one undo entry)
        batchClearActionRowDates: (state, action: PayloadAction<string[]>) => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            const ids = new Set(action.payload);
            state.actionRows.forEach(row => {
                if (ids.has(row.id)) {
                    row.date = '';
                }
            });
        },

        // Diff actions
        addDiff: (state, action: PayloadAction<TimelineDiff>) => {
            const index = state.diffs.findIndex(d => d.time === action.payload.time);
            if (index !== -1) {
                state.diffs[index] = action.payload;
            } else {
                state.diffs.push(action.payload);
                state.diffs.sort((a, b) => a.time - b.time);
            }
        },
        removeDiff: (state, action: PayloadAction<number>) => {
            state.diffs = state.diffs.filter(d => d.time !== action.payload);
        },
        setBaseGraph: (
            state,
            action: PayloadAction<SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>>
        ) => {
            state.baseGraph = action.payload;
        },
        clearTimelineData: state => {
            state.enabled = false;
            state.dateRows = [];
            state.groups = [];
            state.lines = [];
            state.actionRows = [];
            state.diffs = [];
            state.currentTime = 0;
            state.totalDuration = TIMELINE_DEFAULTS.totalDuration;
            state.baseGraph = {} as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
            state.undoStack = [];
            state.redoStack = [];
            state.unsavedDate = '';
            state.validationUndoPending = false;
        },
        loadTimeline: (
            state,
            action: PayloadAction<{
                enabled: boolean;
                totalDuration: number;
                currentTime: number;
                dateRows: DateRow[];
                groups: Array<LineGroup & { remark?: unknown }>;
                lines: Array<TimelineLine & { remark?: unknown }>;
                actionRows: ActionRow[];
                diffs: TimelineDiff[];
                baseGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
            }>
        ) => {
            state.enabled = action.payload.enabled;
            state.totalDuration = action.payload.totalDuration;
            state.currentTime = action.payload.currentTime;
            state.dateRows = action.payload.dateRows ?? [];
            state.groups = (action.payload.groups ?? []).map(({ remark: _, ...group }) => group);
            state.lines = (action.payload.lines ?? []).map(({ remark: _, ...line }) => line);
            state.actionRows = normalizeActionRowIds(action.payload.actionRows ?? []);
            state.diffs = action.payload.diffs ?? [];
            state.baseGraph = action.payload.baseGraph;
            state.undoStack = [];
            state.redoStack = [];
        },
        undoTimeline: state => {
            const prev = state.undoStack.pop();
            if (prev) {
                state.redoStack.push({
                    dateRows: [...state.dateRows],
                    groups: [...state.groups],
                    lines: [...state.lines],
                    actionRows: [...state.actionRows],
                    unsavedDate: state.unsavedDate,
                    diffs: [...state.diffs],
                });
                state.dateRows = prev.dateRows;
                state.groups = prev.groups;
                state.lines = prev.lines;
                state.actionRows = prev.actionRows;
                state.unsavedDate = prev.unsavedDate;
                state.diffs = prev.diffs;
            }
        },
        redoTimeline: state => {
            const next = state.redoStack.pop();
            if (next) {
                state.undoStack.push({
                    dateRows: [...state.dateRows],
                    groups: [...state.groups],
                    lines: [...state.lines],
                    actionRows: [...state.actionRows],
                    unsavedDate: state.unsavedDate,
                    diffs: [...state.diffs],
                });
                state.dateRows = next.dateRows;
                state.groups = next.groups;
                state.lines = next.lines;
                state.actionRows = next.actionRows;
                state.unsavedDate = next.unsavedDate;
                state.diffs = next.diffs;
            }
        },
        clearValidationUndoPending: state => {
            state.validationUndoPending = false;
        },
        setUnsavedDate: (state, action: PayloadAction<string>) => {
            state.unsavedDate = action.payload;
        },
        clearUnsavedDraft: state => {
            state.undoStack.push({
                dateRows: [...state.dateRows],
                groups: [...state.groups],
                lines: [...state.lines],
                actionRows: [...state.actionRows],
                unsavedDate: state.unsavedDate,
                diffs: [...state.diffs],
            });
            state.redoStack = [];
            state.unsavedDate = '';
        },
    },
    extraReducers: builder => {
        builder
            .addCase(applyUndoAction, state => {
                const prev = state.undoStack.pop();
                if (prev) {
                    state.redoStack.push({
                        dateRows: [...state.dateRows],
                        groups: [...state.groups],
                        lines: [...state.lines],
                        actionRows: [...state.actionRows],
                        unsavedDate: state.unsavedDate,
                        diffs: [...state.diffs],
                    });
                    state.dateRows = prev.dateRows;
                    state.groups = prev.groups;
                    state.lines = prev.lines;
                    state.actionRows = prev.actionRows;
                    state.unsavedDate = prev.unsavedDate;
                    state.diffs = prev.diffs;
                    state.validationUndoPending = true;
                }
            })
            .addCase(applyRedoAction, state => {
                const next = state.redoStack.pop();
                if (next) {
                    state.undoStack.push({
                        dateRows: [...state.dateRows],
                        groups: [...state.groups],
                        lines: [...state.lines],
                        actionRows: [...state.actionRows],
                        unsavedDate: state.unsavedDate,
                        diffs: [...state.diffs],
                    });
                    state.dateRows = next.dateRows;
                    state.groups = next.groups;
                    state.lines = next.lines;
                    state.actionRows = next.actionRows;
                    state.unsavedDate = next.unsavedDate;
                    state.diffs = next.diffs;
                    state.validationUndoPending = true;
                }
            });
    },
});

export const {
    setTimelineEnabled,
    setTotalDuration,
    setCurrentTime,
    addDateRow,
    updateDateRow,
    removeDateRow,
    addLineGroup,
    updateLineGroup,
    removeLineGroup,
    addTimelineLine,
    updateTimelineLine,
    removeTimelineLine,
    addActionRow,
    updateActionRow,
    removeActionRow,
    reorderActionRows,
    batchClearActionRowDates,
    addDiff,
    removeDiff,
    setBaseGraph,
    clearTimelineData,
    undoTimeline,
    redoTimeline,
    clearValidationUndoPending,
    setUnsavedDate,
    clearUnsavedDraft,
    loadTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;
