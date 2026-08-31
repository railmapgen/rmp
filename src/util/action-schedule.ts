import type { ActionRow } from '../constants/timeline';

export const isQuickCompleteAction = (action: ActionRow): boolean =>
    Boolean(action.quickComplete && (action.actionType === 'open' || action.actionType === 'close'));

export const getActionDuration = (action: ActionRow): number =>
    isQuickCompleteAction(action)
        ? 1
        : (action.actionDuration ?? (action.actionType === 'overview' || action.actionType === 'focus' ? 4 : 2));

export interface ActionScheduleEntry {
    actionRowIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
    batchIndex: number;
}

export interface ActionSchedule {
    entries: ActionScheduleEntry[];
    totalDuration: number;
}

/** 根据动作时长计算时间轴；withPrevious 动作与上一动作共享开始时间。 */
export const scheduleActionRows = (actionRows: ActionRow[], durations: number[]): ActionSchedule => {
    let cursor = 0;
    let batchIndex = -1;
    const entries: ActionScheduleEntry[] = [];
    actionRows.forEach((action, index) => {
        const duration = Math.max(0, durations[index] ?? getActionDuration(action));
        const startTime = index > 0 && action.withPrevious ? entries[index - 1].startTime : cursor;
        const endTime = startTime + duration;
        if (index === 0 || !action.withPrevious) batchIndex += 1;
        cursor = Math.max(cursor, endTime);
        entries.push({ actionRowIndex: index, startTime, endTime, duration, batchIndex });
    });

    return {
        entries,
        totalDuration: entries.reduce((max, entry) => Math.max(max, entry.endTime), 0),
    };
};
