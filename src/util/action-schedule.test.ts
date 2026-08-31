import { describe, expect, it } from 'vitest';
import type { ActionRow } from '../constants/timeline';
import { getActionDuration, scheduleActionRows } from './action-schedule';

const action = (id: string, withPrevious = false): ActionRow => ({
    id,
    date: '',
    activeLineIds: [],
    remark: '',
    actionType: 'wait',
    actionDuration: 1,
    withPrevious,
});

describe('getActionDuration', () => {
    it('快速完成开通和停运固定为 1 秒', () => {
        expect(getActionDuration({ ...action('open'), actionType: 'open', quickComplete: true })).toBe(1);
        expect(getActionDuration({ ...action('close'), actionType: 'close', quickComplete: true })).toBe(1);
    });
});

describe('scheduleActionRows', () => {
    it('按顺序排程动作', () => {
        expect(scheduleActionRows([action('a'), action('b')], [2, 3])).toEqual({
            entries: [
                { actionRowIndex: 0, startTime: 0, endTime: 2, duration: 2, batchIndex: 0 },
                { actionRowIndex: 1, startTime: 2, endTime: 5, duration: 3, batchIndex: 1 },
            ],
            totalDuration: 5,
        });
    });

    it('让连续 withPrevious 动作共享同一批次开始时间并取最大结束时间', () => {
        expect(
            scheduleActionRows([action('a'), action('b', true), action('c', true), action('d')], [2, 3, 1, 4])
        ).toEqual({
            entries: [
                { actionRowIndex: 0, startTime: 0, endTime: 2, duration: 2, batchIndex: 0 },
                { actionRowIndex: 1, startTime: 0, endTime: 3, duration: 3, batchIndex: 0 },
                { actionRowIndex: 2, startTime: 0, endTime: 1, duration: 1, batchIndex: 0 },
                { actionRowIndex: 3, startTime: 3, endTime: 7, duration: 4, batchIndex: 1 },
            ],
            totalDuration: 7,
        });
    });

    it('第一行动作忽略 withPrevious', () => {
        expect(scheduleActionRows([action('a', true)], [2]).entries[0].startTime).toBe(0);
    });
});
