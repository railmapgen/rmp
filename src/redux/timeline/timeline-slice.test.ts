import { describe, expect, it } from 'vitest';
import { SerializedGraph } from 'graphology-types';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../../constants/constants';
import type { TimelineLine } from '../../constants/timeline';
import timelineReducer, { addActionRow, loadTimeline } from './timeline-slice';

const actionRow = {
    date: '',
    activeLineIds: [],
    remark: '',
    actionType: 'wait' as const,
    actionDuration: 1,
};

describe('timeline action row ids', () => {
    it('generates unique ids for rows added in the same update sequence', () => {
        let state = timelineReducer(undefined, { type: '@@init' });
        state = timelineReducer(state, addActionRow(actionRow));
        state = timelineReducer(state, addActionRow(actionRow));

        const ids = state.actionRows.map(row => row.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('discards legacy segment remarks when loading saved timeline data', () => {
        const state = timelineReducer(
            undefined,
            loadTimeline({
                enabled: true,
                totalDuration: 60,
                currentTime: 0,
                dateRows: [],
                groups: [],
                lines: [
                    { id: 'line_1', groupId: 'group_1', elements: [], remark: 'legacy remark' } as TimelineLine & {
                        remark: string;
                    },
                ],
                actionRows: [],
                diffs: [],
                baseGraph: {} as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
            })
        );

        expect(state.lines[0]).toEqual({ id: 'line_1', groupId: 'group_1', text: '#1', elements: [] });
    });

    it('keeps segment text and fills default names for legacy segments without text', () => {
        const state = timelineReducer(
            undefined,
            loadTimeline({
                enabled: true,
                totalDuration: 60,
                currentTime: 0,
                dateRows: [],
                groups: [],
                lines: [
                    { id: 'line_1', groupId: 'group_1', elements: [] } as TimelineLine,
                    { id: 'line_2', groupId: 'group_1', text: '一期工程', elements: [] } as TimelineLine,
                ],
                actionRows: [],
                diffs: [],
                baseGraph: {} as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
            })
        );

        expect(state.lines[0].text).toBe('#1');
        expect(state.lines[1].text).toBe('一期工程');
    });

    it('normalizes duplicate ids when loading saved timeline data', () => {
        const duplicateId = 'action_row_duplicate';
        const savedRows = [
            { ...actionRow, id: duplicateId },
            { ...actionRow, id: duplicateId },
        ];
        const state = timelineReducer(
            undefined,
            loadTimeline({
                enabled: true,
                totalDuration: 60,
                currentTime: 0,
                dateRows: [],
                groups: [],
                lines: [],
                actionRows: savedRows,
                diffs: [],
                baseGraph: {} as SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
            })
        );

        expect(state.actionRows.map(row => row.id)).toEqual([
            duplicateId,
            expect.not.stringMatching(`^${duplicateId}$`),
        ]);
    });
});
