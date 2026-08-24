import { SerializedGraph } from 'graphology-types';
import { NodeAttributes, EdgeAttributes, GraphAttributes, Id, NodeId, LineId } from './constants';

/**
 * 线路段元素 - 线路段中包含的单个图元素。
 */
export interface LineElement {
    /** 图元素ID (node 或 edge) */
    id: Id;
    /** 线段是否反转方向 */
    reverse?: boolean;
    /** 节点历史版本号 (仅节点有效) */
    version?: number;
}

/**
 * 日期行 - 时间轴上的日期阶段标记
 */
export interface DateRow {
    id: string;
    /** 开始时间 (秒) */
    startTime: number;
    /** 结束时间 (秒) */
    endTime: number;
    /** 备注文本 */
    remark: string;
    /** 徽章背景颜色 */
    badgeBgColor: string;
    /** 徽章显示文本 */
    badgeText: string;
    /** 日期字符串 */
    date: string;
}

/**
 * 线路 - 第一级结构，包含颜色和名称，下可包含多个线路段。
 */
export interface LineGroup {
    id: string;
    /** 线路颜色 */
    bgColor: string;
    /** 线路名称 */
    text: string;
    /** 线路备注 */
    remark?: string;
}

/**
 * 线路段 - 第二级结构，属于某条线路，包含图元素列表。
 */
export interface TimelineLine {
    id: string;
    /** 所属线路ID */
    groupId: string;
    /** 关联的图元素列表 */
    elements: LineElement[];
    /** 线路段备注 */
    remark?: string;
}

/**
 * 动作列表行 - 时间线编辑器下半部分的动作配置
 */
export interface ActionRow {
    id: string;
    /** 日期 (年月日) */
    date: string;
    /** 已开通线路ID列表 (引用 LineGroup.id) */
    activeLineIds: string[];
    /** 备注 */
    remark: string;
    /** 动作类型: 开通/停运/全览/等待/聚焦 */
    actionType: 'open' | 'close' | 'overview' | 'wait' | 'focus';
    /** 动作参数：开通/停运关联的线路段ID (引用 TimelineLine.id) */
    actionLineId?: string;
    /** 动作时长 (秒, 支持小数) - 所有动作类型都支持 */
    actionDuration?: number;
}

export type DiffAction = 'add' | 'update' | 'remove';

export interface NodeDiff {
    action: DiffAction;
    id: string;
    attrs?: Partial<NodeAttributes>;
}

export interface EdgeDiff {
    action: DiffAction;
    id: string;
    source?: string;
    target?: string;
    attrs?: Partial<EdgeAttributes>;
}

export interface GraphDiff {
    action: DiffAction;
    attrs?: Partial<GraphAttributes>;
}

export interface TimelineDiff {
    time: number;
    nodes: NodeDiff[];
    edges: EdgeDiff[];
    graph: GraphDiff[];
}

export interface TimelineState {
    enabled: boolean;
    totalDuration: number;
    currentTime: number;
    dateRows: DateRow[];
    /** 线路列表（第一级） */
    groups: LineGroup[];
    /** 线路段列表（第二级，每个段归属一个线路） */
    lines: TimelineLine[];
    /** 动作列表 */
    actionRows: ActionRow[];
    /** 未保存的新动作草稿日期（让撤销栈也能追踪未保存的表单数据） */
    unsavedDate: string;
    diffs: TimelineDiff[];
    baseGraph: SerializedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
    undoStack: Array<{
        dateRows: DateRow[];
        groups: LineGroup[];
        lines: TimelineLine[];
        actionRows: ActionRow[];
        unsavedDate: string;
        diffs: TimelineDiff[];
    }>;
    redoStack: Array<{
        dateRows: DateRow[];
        groups: LineGroup[];
        lines: TimelineLine[];
        actionRows: ActionRow[];
        unsavedDate: string;
        diffs: TimelineDiff[];
    }>;
    /** 撤销操作发生后标记，用于通知组件关闭校验开关避免数据冲突 */
    validationUndoPending: boolean;
}

export const TIMELINE_DEFAULTS: Omit<TimelineState, 'baseGraph'> = {
    enabled: false,
    totalDuration: 60,
    currentTime: 0,
    dateRows: [],
    groups: [],
    lines: [],
    actionRows: [],
    unsavedDate: '',
    diffs: [],
    undoStack: [],
    redoStack: [],
    validationUndoPending: false,
};
