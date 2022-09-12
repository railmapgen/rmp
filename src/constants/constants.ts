import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { StationType, ExternalStationAttributes } from './stations';
import { LineType, ExternalLineAttributes } from './lines';
import { MiscNodeType, MiscNodeAttributes } from './node';

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

export type EdgeType = LineType;
export type EdgeAttributes = BaseAttributes & {
    color: Theme;
    type: EdgeType;
    /**
     * Unique ID to reconcile lines.
     */
    reconcileId: string;
} & Partial<ExternalLineAttributes>;

export type GraphAttributes = {
    name?: string;
};

export type ColourHex = `#${string}`;

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
export type MiscEdgeId = `misc_edge_${string}`;

/**
 * Indicate which station/line/node is currently in mouse control. (Runtime only)
 */
export type ActiveType = StnId | LineId | MiscNodeId | 'background';

/**
 * Indicate which element will be placed by next click. (Runtime only)
 */
export type RuntimeMode = 'free' | `line-${LineType}` | `station-${StationType}` | `misc-node-${MiscNodeType}`;

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
