import { ColourHex, MonoColour } from '@railmapgen/rmg-palette-resources';
import { ExternalLinePathAttributes, ExternalLineStyleAttributes, LinePathType, LineStyleType } from './lines';
import { MiscNodeAttributes, MiscNodeType } from './nodes';
import { ExternalStationAttributes, StationType } from './stations';

/**
 * Attributes shared both in nodes and edges.
 */
interface BaseAttributes {
    visible: boolean;
    zIndex: number;
}

export type NodeType = StationType | MiscNodeType;

/**
 * Historical version of a node.
 * Used to represent the same node at different stages (e.g. before/after line opening).
 */
export interface NodeVersion extends Partial<ExternalStationAttributes>, Partial<MiscNodeAttributes> {
    version: number;
    /** 版本名称，初始版本默认为 "basic" */
    name: string;
    x: number;
    y: number;
    type: NodeType;
}

export type NodeAttributes = BaseAttributes & {
    x: number;
    y: number;
    type: NodeType;
    /**
     * Historical versions of this node. If undefined, only the current version (v1) exists.
     */
    versions?: NodeVersion[];
    /**
     * The version number that is currently applied to this node.
     * Defaults to 1 (basic) when not set or when the node is in its original state.
     */
    currentVersion?: number;
    /**
     * 时间线属性：是否视为车站，勾选后参与车站数统计。
     */
    isStation?: boolean;
} & Partial<ExternalStationAttributes> &
    Partial<MiscNodeAttributes>;

export type EdgeType = LinePathType;
export type EdgeAttributes = BaseAttributes & {
    type: EdgeType;
    style: LineStyleType;
    /**
     * Unique ID to reconcile lines.
     */
    reconcileId: string;
    /**
     * Index for the line position in a parallel group. Leave it -1 for deactivation of parallel.
     */
    parallelIndex: number;
    /**
     * 时间线属性：里程长度（公里）。
     */
    mileage?: number;
    /**
     * 时间线动画属性：线是否正在绘制中。
     */
    isDrawing?: boolean;
    /**
     * 时间线动画属性：出现动画的方向。
     */
    appearDirection?: 'forward' | 'backward';
    /**
     * 时间线动画属性：消失动画的方向。
     */
    disappearDirection?: 'forward' | 'backward';
} & Partial<ExternalLinePathAttributes> &
    Partial<ExternalLineStyleAttributes>;

export interface AttrsProps<T> {
    /**
     * Type should be StnId | LineId | MiscNodeId, need another generic parameter.
     */
    id: string;
    attrs: T;
    /**
     * Update the modified attrs with this helper method.
     * It will take care of all the update and refresh things.
     */
    handleAttrsUpdate: (id: string, attrs: T) => void;
}

/**
 * Colour theme of line, derived from `LineEntry`.
 * @property 0 - city id
 * @property 1 - line id
 * @property 2 - background colour
 * @property 3 - foreground colour
 */
export type Theme = [CityCode, string, ColourHex, MonoColour];

export type StnId = `stn_${string}`;
export type LineId = `line_${string}`;
export type MiscNodeId = `misc_node_${string}`;
export type NodeId = StnId | MiscNodeId;

export type Id = NodeId | LineId;

export interface TimelineEntry {
    id: Id;
    reverse?: boolean;
    /**
     * Historical version of the node to use at this timeline position.
     * Only applicable when id is a node. If undefined, the current version (v1) is used.
     */
    version?: number;
}

export type GraphAttributes = {
    name?: string;
    timeline?: Array<Id | TimelineEntry>;
};
export type ActiveType = Id | 'background';

/**
 * Indicate which element will be placed by next click. (Runtime only)
 */
export type RuntimeMode =
    | 'free'
    | 'select'
    | `line-${LinePathType}/${LineStyleType}`
    | `station-${StationType}`
    | `misc-node-${MiscNodeType}`
    | `reconcile-${string}`;

/**
 * Helper function to extract path and style from mode
 * @param mode The current runtime mode.
 * @returns The line path and style extracted from the mode.
 */
export const getLinePathAndStyle = (
    mode: RuntimeMode
): { path: LinePathType | undefined; style: LineStyleType | undefined } => {
    if (mode.startsWith('line-')) {
        const parts = mode.slice(5).split('/');
        return {
            path: parts[0] as LinePathType,
            style: parts[1] as LineStyleType,
        };
    }
    return { path: undefined, style: undefined };
};

/**
 * Stations and lines may be in different displaying format.
 * E.g. Station's icon of Rail map and platform are different in Shanghai metro.
 */
export enum CanvasType {
    RailMap = 'railmap',
    Platform = 'platform',
}

/**
 * Categories of different railway class.
 */
export enum CategoriesType {
    Metro = 'metro',
    NationalRail = 'nationalrail',
    LightRail = 'lightrail',
    Footpath = 'footpath',
}

/**
 * RmgRuntime statistics event.
 */
export enum Events {
    APP_LOAD = 'APP_LOAD',
    ADD_STATION = 'ADD_STATION',
    ADD_LINE = 'ADD_LINE',
    IMPORT_RMG_PARAM = 'IMPORT_RMG_PARAM',
    IMPORT_WORK_FROM_GALLERY = 'IMPORT_WORK_FROM_GALLERY',
    IMPORT_WORK_FROM_SHARE = 'IMPORT_WORK_FROM_SHARE',
    DOWNLOAD_PARAM = 'DOWNLOAD_PARAM',
    DOWNLOAD_IMAGES = 'DOWNLOAD_IMAGES',
    LOAD_TUTORIAL = 'LOAD_TUTORIAL',
}

export enum LocalStorageKey {
    LOGIN_STATE = 'login_state',
    APP = 'app',
    PARAM = 'rmp__param',
    PARAM_BACKUP = 'rmp__param__backup',
    DO_NOT_SHOW_RMT_MSG = 'rmp__doNotShowRMTMsg',
    ACCOUNT = 'rmg-home__account',
    LANGUAGE = 'rmp__language',
}

export enum CityCode {
    Other = 'other',
    Beijing = 'beijing',
    Berlin = 'berlin',
    Chongqing = 'chongqing',
    Chengdu = 'chengdu',
    Foshan = 'foshan',
    Guangzhou = 'guangzhou',
    Hongkong = 'hongkong',
    Kunming = 'kunming',
    London = 'london',
    Osaka = 'osaka',
    Qingdao = 'qingdao',
    Shanghai = 'shanghai',
    Shenzhen = 'shenzhen',
    Singapore = 'singapore',
    Suzhou = 'suzhou',
    Taipei = 'taipei',
    Tokyo = 'tokyo',
    Wuhan = 'wuhan',
    Changsha = 'changsha',
    Hangzhou = 'hangzhou',
}

export enum StationCity {
    Shmetro = 'shmetro',
    Bjsubway = 'bjsubway',
}
