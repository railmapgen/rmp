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

/**
 * 找到某动作所属并行批次的首个动作索引。
 * withPrevious 链上的动作向前回溯，直到遇到第一个非并行动作。
 */
export const getBatchAnchorIndex = (actionRows: ActionRow[], index: number): number => {
    if (index <= 0) return 0;
    let anchor = index;
    while (anchor > 0 && actionRows[anchor]?.withPrevious) {
        anchor -= 1;
    }
    return anchor;
};

/**
 * 归一化并行批次：首个动作完整设置日期、备注与"已开通线路"；
 * 后续 withPrevious 动作强制继承首动作的日期与备注。
 * 目标线路段（actionLineId）各动作独立选择、不共享；
 * 线路徽章与"已开通线路"由线路段归属和动作顺序按批次推导/显示锚点内容。
 */
export const normalizeInheritedActionFields = (actionRows: ActionRow[]): ActionRow[] =>
    actionRows.map((row, index) => {
        if (index === 0 || !row.withPrevious) return row;
        const anchor = actionRows[getBatchAnchorIndex(actionRows, index)];
        if (!anchor) return row;
        // 全览/等待/聚焦等元动作日期始终为空，不参与继承
        const isMetaAction = row.actionType === 'overview' || row.actionType === 'wait' || row.actionType === 'focus';
        return {
            ...row,
            date: isMetaAction ? '' : (anchor.date ?? ''),
            remark: anchor.remark ?? '',
        };
    });
