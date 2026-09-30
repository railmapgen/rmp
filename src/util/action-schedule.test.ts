import { describe, expect, it } from 'vitest';
import type { ActionRow } from '../constants/timeline';
import {
    getActionDuration,
    getBatchAnchorIndex,
    normalizeInheritedActionFields,
    scheduleActionRows,
} from './action-schedule';

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

describe('getBatchAnchorIndex', () => {
    it('沿 withPrevious 链回溯到批次首个动作', () => {
        const rows = [action('a'), action('b', true), action('c', true), action('d')];
        expect(getBatchAnchorIndex(rows, 0)).toBe(0);
        expect(getBatchAnchorIndex(rows, 1)).toBe(0);
        expect(getBatchAnchorIndex(rows, 2)).toBe(0);
        expect(getBatchAnchorIndex(rows, 3)).toBe(3);
    });
});

describe('normalizeInheritedActionFields', () => {
    const openAction = (id: string, extra: Partial<ActionRow> = {}): ActionRow => ({
        ...action(id),
        actionType: 'open',
        ...extra,
    });

    it('后续 withPrevious 动作继承首动作的日期与备注，但目标线路段各自独立', () => {
        const rows = [
            openAction('a', { date: '2024-01-01', remark: '首动作备注', actionLineId: 'line1' }),
            openAction('b', {
                date: '2099-01-01',
                remark: '会被覆盖',
                actionLineId: 'line2',
                withPrevious: true,
            }),
            openAction('c', {
                date: '2099-01-02',
                remark: '同样继承',
                actionLineId: 'line3',
                withPrevious: true,
            }),
        ];
        const normalized = normalizeInheritedActionFields(rows);
        expect(normalized[1].date).toBe('2024-01-01');
        expect(normalized[1].remark).toBe('首动作备注');
        expect(normalized[1].actionLineId).toBe('line2');
        expect(normalized[2].date).toBe('2024-01-01');
        expect(normalized[2].remark).toBe('首动作备注');
        expect(normalized[2].actionLineId).toBe('line3');
    });

    it('元动作（全览/等待/聚焦）继承备注但日期始终为空', () => {
        const rows = [
            openAction('a', { date: '2024-01-01', remark: '首动作备注', actionLineId: 'line1' }),
            { ...action('b', true), actionType: 'wait', date: '2024-01-01' },
        ];
        const normalized = normalizeInheritedActionFields(rows);
        expect(normalized[1].date).toBe('');
        expect(normalized[1].remark).toBe('首动作备注');
    });

    it('非并行动作与首个动作保持不变', () => {
        const rows = [
            openAction('a', { remark: 'A', actionLineId: 'line1' }),
            openAction('b', { remark: 'B', actionLineId: 'line2' }),
        ];
        expect(normalizeInheritedActionFields(rows)).toEqual(rows);
    });
});
