import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { StationType, ExternalStationAttributes } from './stations';
import { LineType, ExternalLineAttributes } from './lines';
import { MiscNodeType, MiscNodeAttributes } from './node';

export enum LanguageCode {
    Azerbaijani = 'az',
    Arabic = 'ar',
    Catalan = 'ca',
    Chinese = 'zh',
    ChineseCN = 'zh-CN',
    ChineseSimp = 'zh-Hans',
    ChineseTrad = 'zh-Hant',
    ChineseHK = 'zh-HK',
    ChineseTW = 'zh-TW',
    English = 'en',
    French = 'fr',
    Gaelic = 'ga',
    German = 'de',
    Hindi = 'hi',
    Japanese = 'ja',
    Korean = 'ko',
    Malay = 'ms',
    Norwegian = 'no',
    Spanish = 'es',
    Persian = 'fa',
    Portuguese = 'pt',
    Russian = 'ru',
    Swedish = 'sv',
    Turkish = 'tr',
}

export type Translation = { [l in LanguageCode]?: string };

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

export type EdgeAttributes = BaseAttributes & {
    color: Theme;
    type: LineType;
    /**
     * Unique ID to reconcile lines.
     */
    reconcileId: string;
} & Partial<ExternalLineAttributes>;

export type GraphAttributes = {
    name?: string;
};

export type RuntimeMode = 'free' | `line-${LineType}` | `station-${StationType}` | `misc-node-${MiscNodeType}`;

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
export type ActiveType = StnId | LineId | MiscNodeId | 'background';
