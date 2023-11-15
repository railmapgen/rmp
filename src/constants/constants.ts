import { CityCode, ColourHex, MonoColour } from '@railmapgen/rmg-palette-resources';
import { MiscEdgeType } from './edges';
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
export type NodeAttributes = BaseAttributes & {
    x: number;
    y: number;
    type: NodeType;
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
} & Partial<ExternalLinePathAttributes> &
    Partial<ExternalLineStyleAttributes>;

export type GraphAttributes = {
    name?: string;
};

/**
 * A props interface for all specific attributes components
 * that give users an input (UI) to change attributes.
 */
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
/**
 * @deprecated
 */
export type MiscEdgeId = `misc_edge_${string}`;

/**
 * Indicate which station/line/node/edge is currently in mouse control. (Runtime only)
 */
export type ActiveType = StnId | LineId | MiscNodeId | MiscEdgeId | 'background';

/**
 * Indicate which element will be placed by next click. (Runtime only)
 */
export type RuntimeMode =
    | 'free'
    | 'select'
    | `line-${LinePathType}`
    | `station-${StationType}`
    | `misc-node-${MiscNodeType}`
    | `misc-edge-${MiscEdgeType}`;

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
    DOWNLOAD_PARAM = 'DOWNLOAD_PARAM',
    DOWNLOAD_IMAGES = 'DOWNLOAD_IMAGES',
}

export enum LocalStorageKey {
    APP = 'rmp__app',
    PARAM = 'rmp__param',
    PARAM_BACKUP = 'rmp__param__backup',
    DO_NOT_SHOW_RMT_MSG = 'rmp__doNotShowRMTMsg',
}
